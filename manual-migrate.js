const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Final schema refinement on Neon...');

    const columns = [
      ['Request', 'managerApprovedAt', 'TIMESTAMP(3)'],
      ['Request', 'adminApprovedAt', 'TIMESTAMP(3)'],
      ['Request', 'issuedAt', 'TIMESTAMP(3)'],
      ['Request', 'currentApproverId', 'TEXT'],
      ['Request', 'handoverAt', 'TIMESTAMP(3)'],
      ['Request', 'closedAt', 'TIMESTAMP(3)']
    ];

    for (const [table, col, type] of columns) {
      try {
        console.log(`Ensuring ${table}.${col} exists and is nullable...`);
        // Add if not exists
        try { await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ADD COLUMN "${col}" ${type};`); } catch (e) {}
        // Drop NOT NULL
        await prisma.$executeRawUnsafe(`ALTER TABLE "${table}" ALTER COLUMN "${col}" DROP NOT NULL;`);
      } catch (error) {
        console.log(`Could not update ${table}.${col}:`, error.message);
      }
    }

    console.log('Refinement complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
