/**
 * Backfill script: migrate old PENDING requests to PENDING_MANAGER or PENDING_ADMIN
 * Run: node backfill-pending-requests.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Backfill: Chuyen PENDING → PENDING_MANAGER / PENDING_ADMIN ===\n');

  const pendingRequests = await prisma.request.findMany({
    where: { status: 'PENDING' },
    include: {
      requester: {
        select: { id: true, role: true, managerId: true, fullName: true }
      }
    }
  });

  console.log(`Tim thay ${pendingRequests.length} phieu PENDING can backfill\n`);

  let migratedToManager = 0;
  let migratedToAdmin = 0;
  let orphaned = 0;

  for (const req of pendingRequests) {
    const { requester } = req;

    if (!requester) {
      console.log(`  [SKIP] ${req.id}: Requester khong ton tai`);
      orphaned++;
      continue;
    }

    let nextStatus;
    let nextApproverId = null;

    if (requester.role === 'EMPLOYEE') {
      if (!requester.managerId) {
        console.log(`  [ORPHAN] ${req.id}: Employee ${requester.fullName} chua co managerId — can xu ly thu cong`);
        orphaned++;
        continue;
      }

      // Verify manager is valid
      const mgr = await prisma.user.findUnique({
        where: { id: requester.managerId },
        select: { id: true, role: true, isActive: true, fullName: true }
      });

      if (!mgr || mgr.role !== 'MANAGER' || !mgr.isActive) {
        console.log(`  [ORPHAN] ${req.id}: Manager ${requester.managerId} khong hop le — can xu ly thu cong`);
        orphaned++;
        continue;
      }

      nextStatus = 'PENDING_MANAGER';
      nextApproverId = requester.managerId;
      console.log(`  [→ PENDING_MANAGER] ${req.id}: Employee ${requester.fullName} → Manager ${mgr.fullName}`);
      migratedToManager++;
    } else {
      // MANAGER, ADMIN, WAREHOUSE → go directly to admin
      nextStatus = 'PENDING_ADMIN';
      nextApproverId = null;
      console.log(`  [→ PENDING_ADMIN] ${req.id}: ${requester.role} ${requester.fullName}`);
      migratedToAdmin++;
    }

    await prisma.$transaction([
      prisma.request.update({
        where: { id: req.id },
        data: {
          status: nextStatus,
          currentApproverId: nextApproverId,
          rowVersion: { increment: 1 }
        }
      }),
      prisma.approvalHistory.create({
        data: {
          requestId: req.id,
          approverId: requester.id,
          action: 'BACKFILL_MIGRATED',
          reason: `Backfill: PENDING → ${nextStatus} (migration script 2026-03-27)`,
        }
      })
    ]);
  }

  console.log(`\n=== Ket qua ===`);
  console.log(`  → PENDING_MANAGER: ${migratedToManager}`);
  console.log(`  → PENDING_ADMIN:   ${migratedToAdmin}`);
  console.log(`  Orphaned (can manual fix): ${orphaned}`);
  console.log(`\nDone.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
