import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';

const router = Router();

// 1. Lấy danh sách PR / PO
router.get('/', async (req: Request, res: Response): Promise<void> => {
  const requests = await prisma.purchaseOrder.findMany({
    include: {
      requester: { select: { fullName: true } },
      approver: { select: { fullName: true } },
      _count: { select: { lines: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const formatted = requests.map(r => ({
    id: r.id,
    type: r.type,
    title: r.title,
    supplier: r.supplier,
    status: r.status,
    totalAmount: r.totalAmount,
    createdAt: r.createdAt,
    expectedDate: r.expectedDate,
    requesterName: r.requester?.fullName || 'Tự động',
    approverName: r.approver?.fullName,
    lineCount: r._count.lines
  }));

  res.json(formatted);
});

// 2. Chi tiết 1 thẻ PO
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: String(id) },
    include: {
      lines: {
        include: { item: true }
      },
      requester: { select: { fullName: true } },
      approver: { select: { fullName: true } },
      receipts: {
        include: {
           receiver: { select: { fullName: true } }
        }
      }
    }
  });

  if (!po) {
    res.status(404).json({ error: 'Không tìm thấy Phiếu mua hàng' });
    return;
  }

  res.json(po);
});

// 3. Khởi tạo Đề nghị mua (PR)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { title, purpose, expectedDate, lines, status } = req.body;
  const user = (req as any).user;
  
  try {
    const id = `PR-${Date.now().toString().slice(-6)}`;
    let totalAmount = 0;
    
    // Resolve lines to calc amount
    const parsedLines = await Promise.all((lines || []).map(async (l: any) => {
       const item = await prisma.item.findUnique({ where: { id: l.itemId } });
       const price = l.estimatedPrice !== undefined ? l.estimatedPrice : (l.unitPrice || item?.price || 0);
       const amt = Number(price) * Number(l.qty || l.qtyRequested);
       totalAmount += amt;
       return {
           itemId: l.itemId,
           qtyRequested: Number(l.qty || l.qtyRequested),
           unitPrice: price,
           lineAmount: amt,
           supplier: l.suggestedVendor || l.supplier || '',
           note: l.note || ''
       };
    }));

    const finalStatus = status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'DRAFT';

    const requesterFull = await prisma.user.findUnique({
      where: { id: user.userId },
      include: { 
        department: { select: { name: true } }
      }
    });

    const pr = await prisma.purchaseOrder.create({
      data: {
        id,
        type: 'PR',
        source: 'MANUAL',
        title,
        purpose,
        department: requesterFull?.department?.name || 'N/A',
        requesterId: user.userId,
        status: finalStatus,
        expectedDate: expectedDate ? new Date(expectedDate) : null,
        totalAmount,
        lines: {
          create: parsedLines
        }
      }
    });

    res.status(201).json(pr);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 3.5 Cập nhật Đề nghị mua (PR) đang nháp
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
   const { title, purpose, expectedDate, lines, status } = req.body;
   const poId = req.params.id;
   
   try {
      const po = await prisma.purchaseOrder.findUnique({ where: { id: String(poId) } });
      if (!po || !['DRAFT', 'RETURNED'].includes(po.status)) {
         res.status(400).json({ error: 'Chỉ có thể sửa khi Phiếu đang Nháp hoặc bị Trả Lại' }); 
         return;
      }

      let totalAmount = 0;
      const finalStatus = status === 'PENDING_APPROVAL' ? 'PENDING_APPROVAL' : 'DRAFT';

      await prisma.$transaction(async (tx) => {
         // Xoá lines cũ
         await tx.purchaseLine.deleteMany({ where: { poId: String(poId) } });
         
         // Tạo lines mới
         const parsedLines = await Promise.all((lines || []).map(async (l: any) => {
             const item = await tx.item.findUnique({ where: { id: l.itemId } });
             const price = l.estimatedPrice !== undefined ? l.estimatedPrice : (l.unitPrice || item?.price || 0);
             const amt = Number(price) * Number(l.qty || l.qtyRequested);
             totalAmount += amt;
             return {
                 itemId: l.itemId,
                 qtyRequested: Number(l.qty || l.qtyRequested),
                 unitPrice: price,
                 lineAmount: amt,
                 supplier: l.suggestedVendor || l.supplier || '',
                 note: l.note || ''
             };
         }));

         await tx.purchaseOrder.update({
            where: { id: String(poId) },
            data: {
               title,
               purpose,
               status: finalStatus,
               expectedDate: expectedDate ? new Date(expectedDate) : null,
               totalAmount,
               lines: {
                 create: parsedLines
               }
            }
         });
      });

      res.json({ success: true, message: 'Đã cập nhật Đề nghị Mua sắm' });
   } catch (err: any) {
      res.status(400).json({ error: err.message });
   }
});

// 4. Submit Đề nghị mua lên cấp duyệt
router.post('/:id/submit', async (req: Request, res: Response): Promise<void> => {
  const po = await prisma.purchaseOrder.findUnique({ where: { id: String(req.params.id) } });
  if (!po || po.status !== 'DRAFT') {
      res.status(400).json({ error: 'Chỉ phiếu nháp mới có thể Trình duyệt' }); return;
  }
  
  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: { status: 'PENDING_APPROVAL' }
  });
  
  res.json({ success: true, message: 'Đã trình duyệt đề nghị mua sắm' });
});

// 5. Duyệt Đề nghị Mua
router.post('/:id/approve', async (req: Request, res: Response): Promise<void> => {
  const { lines } = req.body; // { lineId, qtyApproved, unitPrice, supplier }
  const po = await prisma.purchaseOrder.findUnique({ where: { id: String(req.params.id) } });
  const user = (req as any).user;
  
  if (!po || po.status !== 'PENDING_APPROVAL') {
    res.status(400).json({ error: 'Phiếu không ở trạng thái chờ duyệt' }); return;
  }

  await prisma.$transaction(async (tx) => {
    let newAmount = 0;
    for (const l of lines) {
        newAmount += Number(l.qtyApproved) * Number(l.unitPrice);
        await tx.purchaseLine.update({
            where: { id: l.lineId },
            data: { 
               qtyApproved: Number(l.qtyApproved),
               qtyOrdered: Number(l.qtyApproved),
               unitPrice: Number(l.unitPrice),
               lineAmount: Number(l.qtyApproved) * Number(l.unitPrice),
               supplier: l.supplier
            }
        });
    }

    await tx.purchaseOrder.update({
        where: { id: po.id },
        data: {
           status: 'APPROVED',
           approvedById: user?.userId,
           approvedAt: new Date(),
           totalAmount: newAmount
        }
    });
  });

  res.json({ success: true, message: 'Đã phê duyệt đề nghị mua' });
});

// 6. Chốt Đơn Đặt Hàng (Phát hành PO)
router.post('/:id/place_order', async (req: Request, res: Response): Promise<void> => {
  const { supplier, expectedDate } = req.body;
  const po = await prisma.purchaseOrder.findUnique({ where: { id: String(req.params.id) } });
  
  if (!po || !['APPROVED', 'PR'].includes(po.status) && po.type !== 'PR') { // Allow raw approved PRs to become PO
    res.status(400).json({ error: 'Trạng thái không hợp lệ' }); return;
  }

  const payload: any = { status: 'ORDERED', orderedAt: new Date() };
  if (supplier) payload.supplier = supplier;
  if (expectedDate) payload.expectedDate = new Date(expectedDate);

  // Nếu ID gốc là PR-, đổi thành PO- cho xịn? Không cần, cứ giữ ID cũ cũng được. Thay type = PO
  payload.type = 'PO';

  await prisma.purchaseOrder.update({
    where: { id: po.id },
    data: payload
  });

  res.json({ success: true, message: 'Đã chốt phát hành Đơn đặt hàng (PO) thành công!' });
});

export default router;
