import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Departments
  const deptIT = await prisma.department.upsert({
    where: { code: 'IT' },
    update: {},
    create: { code: 'IT', name: 'Kỹ Thuật', isActive: true },
  });

  const deptHR = await prisma.department.upsert({
    where: { code: 'HR' },
    update: {},
    create: { code: 'HR', name: 'Hành Chính', isActive: true },
  });

  const deptSales = await prisma.department.upsert({
    where: { code: 'SALES' },
    update: {},
    create: { code: 'SALES', name: 'Kinh Doanh', isActive: true },
  });

  console.log('✅ Departments created');

  // Users
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: { passwordHash: await hashPassword('Admin@123') },
    create: {
      username: 'admin',
      passwordHash: await hashPassword('Admin@123'),
      fullName: 'Quản Trị Viên',
      departmentId: deptHR.id,
      role: 'ADMIN',
    },
  });

  const manager = await prisma.user.upsert({
    where: { username: 'truong.phong' },
    update: { passwordHash: await hashPassword('Manager@123') },
    create: {
      username: 'truong.phong',
      passwordHash: await hashPassword('Manager@123'),
      fullName: 'Nguyễn Văn Manager',
      departmentId: deptIT.id,
      role: 'MANAGER',
    },
  });

  await prisma.user.upsert({
    where: { username: 'nv.an' },
    update: { passwordHash: await hashPassword('Employee@123'), managerId: manager.id },
    create: {
      username: 'nv.an',
      passwordHash: await hashPassword('Employee@123'),
      fullName: 'Trần Văn An',
      departmentId: deptIT.id,
      role: 'EMPLOYEE',
      managerId: manager.id,
    },
  });

  await prisma.user.upsert({
    where: { username: 'nv.binh' },
    update: { passwordHash: await hashPassword('Employee@123'), managerId: manager.id },
    create: {
      username: 'nv.binh',
      passwordHash: await hashPassword('Employee@123'),
      fullName: 'Lê Thị Bình',
      departmentId: deptSales.id,
      role: 'EMPLOYEE',
      managerId: manager.id,
    },
  });

  console.log('✅ Users created');

  // VPP Items
  const itemsData = [
    { mvpp: 'VPP001', name: 'Giấy in A4 SPEED', category: 'Giấy', unit: 'Ram', price: 95000 },
    { mvpp: 'VPP002', name: 'Bút bi Thiên Long 045', category: 'Bút viết', unit: 'Cái', price: 5000 },
    { mvpp: 'VPP003', name: 'Bút dạ quang Stabilo', category: 'Bút viết', unit: 'Cái', price: 15000 },
    { mvpp: 'VPP004', name: 'Bìa hồ sơ cứng A4', category: 'Dụng cụ lưu trữ', unit: 'Cái', price: 12000 },
    { mvpp: 'VPP005', name: 'Ghim kẹp tài liệu Kenko', category: 'Văn phòng', unit: 'Hộp', price: 18000 },
    { mvpp: 'VPP006', name: 'Stapler bấm kim Deli', category: 'Văn phòng', unit: 'Cái', price: 55000 },
    { mvpp: 'VPP007', name: 'Kim bấm số 10', category: 'Văn phòng', unit: 'Hộp', price: 10000 },
    { mvpp: 'VPP008', name: 'Keo dán UHU stic', category: 'Văn phòng', unit: 'Cái', price: 25000 },
    { mvpp: 'VS001', name: 'Nước lau kiếng Sunlight', category: 'Vệ sinh', unit: 'Chai', price: 35000, itemType: 'VS' },
    { mvpp: 'VS002', name: 'Giấy lau tay Pulppy', category: 'Vệ sinh', unit: 'Gói', price: 45000, itemType: 'VS' },
    { mvpp: 'VS003', name: 'Xà phòng rửa tay Lifebuoy', category: 'Vệ sinh', unit: 'Bình', price: 65000, itemType: 'VS' },
  ];

  for (const data of itemsData) {
    const item = await prisma.item.upsert({
      where: { mvpp: data.mvpp },
      update: {},
      create: {
        mvpp: data.mvpp,
        name: data.name,
        category: data.category,
        unit: data.unit,
        price: data.price,
        itemType: data.itemType ?? 'VPP',
        quota: 100,
      },
    });

    // Khởi tạo Stock cho kho MAIN
    await prisma.stock.upsert({
      where: { itemId_warehouseCode: { itemId: item.id, warehouseCode: 'MAIN' } },
      update: {},
      create: {
        itemId: item.id,
        warehouseCode: 'MAIN',
        quantityOnHand: Math.floor(Math.random() * 200 + 50),
        quantityReserved: 0,
      },
    });
  }

  console.log('✅ Items & Stock created');

  // Tạo 1 Request mẫu
  const req = await prisma.request.upsert({
    where: { id: 'PDX-SEED-001' },
    update: {},
    create: {
      id: 'PDX-SEED-001',
      requesterId: manager.id,
      department: deptIT.name,
      requestType: 'Định kỳ',
      priority: 'Thường',
      purpose: 'Yêu cầu VPP tháng 3/2026 cho phòng Kỹ Thuật',
      status: 'PENDING_MANAGER',
      currentApproverId: null, // Manager created this, goes to PENDING_ADMIN soon
    },
  });

  const paper = await prisma.item.findUnique({ where: { mvpp: 'VPP001' } });
  const pen = await prisma.item.findUnique({ where: { mvpp: 'VPP002' } });

  if (paper) {
    await prisma.requestLine.upsert({
      where: { requestId_itemId: { requestId: req.id, itemId: paper.id } },
      update: {},
      create: { requestId: req.id, itemId: paper.id, qtyRequested: 5, note: 'In tài liệu dự án Q2' },
    });
  }

  if (pen) {
    await prisma.requestLine.upsert({
      where: { requestId_itemId: { requestId: req.id, itemId: pen.id } },
      update: {},
      create: { requestId: req.id, itemId: pen.id, qtyRequested: 10 },
    });
  }

  console.log('✅ Sample Request seeded');
  console.log('');
  console.log('🎉 Seeding complete!');
  console.log('');
  console.log('👤 Test accounts:');
  console.log('   admin / Admin@123 (ADMIN)');
  console.log('   truong.phong / Manager@123 (MANAGER)');
  console.log('   nv.an / Employee@123 (EMPLOYEE)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
