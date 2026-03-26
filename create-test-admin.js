const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmin() {
  const username = 'admin_test';
  const password = 'admin@123';
  const fullName = 'Administrator Test';

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Clean up if exists
    await prisma.user.deleteMany({ where: { username } });

    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        fullName,
        role: 'ADMIN',
        isActive: true,
      }
    });

    console.log('✅ Success! Test Admin created:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: ${user.role}`);
  } catch (error) {
    console.error('❌ Error creating test admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
