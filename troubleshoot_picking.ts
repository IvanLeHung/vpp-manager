import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const requestId = 'PDX-09483149';
const actorId = '8a6fe85e-64d5-4eb2-b0e5-121b0afd5998'; // User 'kho' ID

async function completePickingDirectly() {
  try {
    // 1. Get request
    const request = await prisma.request.findUnique({
      where: { id: requestId },
      include: { lines: { include: { item: { include: { stocks: { where: { warehouseCode: 'MAIN' } } } } } } },
    });

    if (!request) throw new Error('Request not found');
    console.log('Current status:', request.status);

    if (request.status !== 'PICKING') {
       // Force status to PICKING if it's not (for testing)
       await prisma.request.update({ where: { id: requestId }, data: { status: 'PICKING' } });
       console.log('Forced status to PICKING');
    }

    const issues = request.lines.map(l => ({
      lineId: l.id,
      qtyDelivered: l.qtyApproved || l.qtyRequested,
    }));

    console.log('Executing transaction...');
    
    await prisma.$transaction(async (tx) => {
      for (const lineIssue of issues) {
        if (lineIssue.qtyDelivered === 0) continue;
        const line = request.lines.find(l => l.id === lineIssue.lineId);
        if (!line) continue;
        
        const currentStock = await tx.stock.findUnique({
          where: { itemId_warehouseCode: { itemId: line.itemId, warehouseCode: request.warehouseCode } },
        });

        if (!currentStock || currentStock.quantityOnHand < lineIssue.qtyDelivered) {
          throw new Error(`Insufficient stock for "${(line as any).item?.name}".`);
        }

        const beforeQty = currentStock.quantityOnHand;
        const afterQty = beforeQty - lineIssue.qtyDelivered;

        await tx.stock.update({
          where: { id: currentStock.id },
          data: { quantityOnHand: afterQty, rowVersion: { increment: 1 } },
        });

        await tx.stockMovement.create({
          data: {
            itemId: line.itemId,
            warehouseCode: request.warehouseCode,
            movementType: 'ISSUE',
            qty: -lineIssue.qtyDelivered,
            beforeQty,
            afterQty,
            refType: 'Request',
            refId: request.id,
            refLineId: line.id,
            createdById: actorId, 
          },
        });

        await tx.reservation.updateMany({ 
          where: { lineId: line.id, status: 'ACTIVE' }, 
          data: { status: 'FULFILLED' } 
        });

        await tx.requestLine.update({
          where: { id: line.id },
          data: {
            qtyDelivered: { increment: lineIssue.qtyDelivered },
            availableQtyAtIssue: beforeQty,
            status: 'CLOSED',
            rowVersion: { increment: 1 },
          },
        });
      }

      await tx.request.update({
        where: { id: request.id },
        data: { status: 'READY_TO_HANDOVER', issuedAt: new Date(), rowVersion: { increment: 1 } },
      });

      // Simple audit log
      await tx.approvalHistory.create({
        data: {
          requestId: request.id,
          approverId: actorId,
          action: 'PICKING_COMPLETED',
          metadata: { fromStatus: 'PICKING', toStatus: 'READY_TO_HANDOVER' },
        },
      });
    });

    console.log('Success! Request reached READY_TO_HANDOVER');
  } catch (err: any) {
    console.error('FAILED:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

completePickingDirectly();
