import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// 1. Lấy danh sách Phiếu Nhập Kho
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  const receipts = await prisma.receipt.findMany({
    include: {
      receiver: { select: { fullName: true } },
      _count: { select: { lines: true } }
    },
    orderBy: { createdAt: 'desc' }
  });
  
  const formatted = receipts.map(r => ({
    id: r.id,
    poId: r.poId,
    supplier: r.supplier,
    status: r.status,
    receiveDate: r.receiveDate,
    receiverName: r.receiver?.fullName,
    lineCount: r._count.lines,
    warehouseCode: r.warehouseCode
  }));

  res.json(formatted);
});

// 2. Chi tiết 1 phiếu nhập
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  const receipt = await prisma.receipt.findUnique({
    where: { id: req.params.id },
    include: {
      lines: {
        include: { item: true }
      },
      receiver: { select: { fullName: true } }
    }
  });

  if (!receipt) {
    res.status(404).json({ error: 'Không tìm thấy Phiếu nhập kho' });
    return;
  }

  res.json(receipt);
});

// 3. Tạo phiếu nhập từ Đơn mua hàng (PO)
router.post('/from_po', async (req: AuthRequest, res: Response): Promise<void> => {
  const { poId } = req.body;
  const user = req.user!;
  
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { lines: true }
    });

    if (!po) { res.status(404).json({ error: 'Không tìm thấy Đơn đặt hàng (PO)' }); return; }

    const receiptId = `RC-${Date.now().toString().slice(-6)}`;
    
    const receiptLines = po.lines.map(l => ({
        itemId: l.itemId,
        purchaseLineId: l.id,
        qtyOrdered: l.qtyOrdered || l.qtyApproved || l.qtyRequested,
        qtyDelivered: l.qtyOrdered || l.qtyApproved || l.qtyRequested,
        qtyAccepted: l.qtyOrdered || l.qtyApproved || l.qtyRequested, // Default assume full receipt
        unitPrice: l.unitPrice,
        lineAmount: l.lineAmount
    }));

    const receipt = await prisma.receipt.create({
      data: {
        id: receiptId,
        poId: po.id,
        supplier: po.supplier,
        receiverId: user.userId,
        status: 'PENDING', // Đang kiểm hàng
        totalAmount: po.totalAmount, // Giá trị ban đầu, có thể update sau khi chênh lệch
        lines: {
          create: receiptLines
        }
      }
    });

    res.status(201).json(receipt);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// 4. Lưu kết quả kiểm hàng (Update Receipt Lines)
router.put('/:id/check', async (req: AuthRequest, res: Response): Promise<void> => {
  const { lines } = req.body; // Array of { id, qtyDelivered, qtyAccepted, qtyDefective, note, location }
  const receipt = await prisma.receipt.findUnique({ where: { id: req.params.id } });
  
  if (!receipt || receipt.status !== 'PENDING') {
    res.status(400).json({ error: 'Phiếu nhập không hợp lệ hoặc đã chốt' }); return;
  }

  await prisma.$transaction(async (tx) => {
    let newTotal = 0;
    for (const l of lines) {
       await tx.receiptLine.update({
           where: { id: l.id },
           data: {
               qtyDelivered: Number(l.qtyDelivered),
               qtyAccepted: Number(l.qtyAccepted),
               qtyDefective: Number(l.qtyDefective),
               note: l.note,
               location: l.location
           }
       });
       // Lấy lại uniPrice gốc nếu cần tính tiền, tạm bỏ qua để đơn giản, re-calc totalAmount
       const lineData = await tx.receiptLine.findUnique({ where: { id: l.id } });
       if (lineData && lineData.unitPrice) {
           newTotal += Number(lineData.unitPrice) * Number(l.qtyAccepted);
       }
    }
    
    await tx.receipt.update({
        where: { id: receipt.id },
        data: { totalAmount: newTotal }
    });
  });

  res.json({ success: true, message: 'Đã lưu kết quả kiểm hàng' });
});

// 5. Chốt Nhập Kho Thực Tế (Confirm)
router.post('/:id/confirm', async (req: AuthRequest, res: Response): Promise<void> => {
  const receipt = await prisma.receipt.findUnique({ 
      where: { id: req.params.id },
      include: { lines: true }
  });
  
  if (!receipt || receipt.status !== 'PENDING') {
    res.status(400).json({ error: 'Phiếu nhập không tồn tại hoặc đã chốt kho' }); return;
  }

  await prisma.$transaction(async (tx) => {
    let hasDiscrepancy = false;
    
    for (const rl of receipt.lines) {
        if (rl.qtyAccepted !== rl.qtyOrdered || rl.qtyDefective > 0) {
            hasDiscrepancy = true;
        }

        if (rl.qtyAccepted > 0) {
            // 1. Cập nhật Tồn Kho (Stock)
            const stock = await tx.stock.findUnique({
                where: { itemId_warehouseCode: { itemId: rl.itemId, warehouseCode: receipt.warehouseCode } }
            });
            
            const beforeQty = stock ? stock.quantityOnHand : 0;
            const afterQty = beforeQty + rl.qtyAccepted;

            await tx.stock.upsert({
                where: { itemId_warehouseCode: { itemId: rl.itemId, warehouseCode: receipt.warehouseCode } },
                update: { quantityOnHand: { increment: rl.qtyAccepted } },
                create: { itemId: rl.itemId, warehouseCode: receipt.warehouseCode, quantityOnHand: rl.qtyAccepted }
            });

            // 2. Ghi nhận Biến Động (StockMovement)
            await tx.stockMovement.create({
                data: {
                    itemId: rl.itemId,
                    warehouseCode: receipt.warehouseCode,
                    movementType: 'RECEIVE',
                    qty: rl.qtyAccepted,
                    beforeQty,
                    afterQty,
                    refType: 'Receipt',
                    refId: receipt.id,
                    refLineId: rl.id,
                    createdById: req.user!.userId,
                    reason: `Nhập kho từ PO ${receipt.poId}`
                }
            });
        }

        // 3. Cập nhật PurchaseLine nếu có reference
        if (rl.purchaseLineId) {
            await tx.purchaseLine.update({
                where: { id: rl.purchaseLineId },
                data: {
                    qtyReceived: { increment: rl.qtyAccepted },
                    qtyDefective: { increment: rl.qtyDefective }
                }
            });
        }
    }

    const finalStatus = hasDiscrepancy ? 'DISCREPANCY' : 'COMPLETED';

    await tx.receipt.update({
        where: { id: receipt.id },
        data: { status: finalStatus, receiveDate: new Date() }
    });

    // 4. Update PO Status
    if (receipt.poId) {
        const poLines = await tx.purchaseLine.findMany({ where: { poId: receipt.poId } });
        const allReceived = poLines.every(l => l.qtyReceived >= (l.qtyOrdered || 0));
        
        await tx.purchaseOrder.update({
            where: { id: receipt.poId },
            data: { status: allReceived ? 'COMPLETED' : 'PARTIALLY_DELIVERED' }
        });
    }
  });

  res.json({ success: true, message: 'Đã nhập kho chính thức và cộng tồn thành công!' });
});

export default router;
