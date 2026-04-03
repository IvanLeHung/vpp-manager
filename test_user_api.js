require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    const user = await prisma.user.create({
      data: {
        username: 'test_create_user_' + Date.now(),
        passwordHash: 'dummy',
        fullName: 'Test User',
        department: 'Test Dept',
        role: 'EMPLOYEE'
      }
    });
    console.log('Created User:', user);
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'MANAGER' }
    });
    console.log('Updated User:', updated);
  } catch (e) {
    console.error('Test Failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}
test();
