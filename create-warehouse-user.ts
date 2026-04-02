import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
const prisma = new PrismaClient();
async function main() {
  const passwordHash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.upsert({
    where: { username: 'kho' },
    update: { role: Role.WAREHOUSE, isActive: true },
    create: {
      username: 'kho',
      passwordHash,
      fullName: 'Nhân viên Kho',
      role: Role.WAREHOUSE,
      isActive: true
    }
  });
  console.log('User created:', user.username);
}
main();
