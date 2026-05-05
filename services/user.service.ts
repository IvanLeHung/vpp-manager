import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

type CreateUserInput = {
  username: string;
  password: string;
  fullName: string;
  role?: Role;
  departmentId?: string;
  managerId?: string;
  avatar?: string;
};

export async function createUser(input: CreateUserInput) {
  const existing = await prisma.user.findUnique({
    where: { username: input.username },
  });

  if (existing) {
    throw new Error("Username đã tồn tại");
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  const user = await prisma.user.create({
    data: {
      username: input.username,
      passwordHash,
      fullName: input.fullName,
      role: input.role ?? "EMPLOYEE",
      departmentId: input.departmentId,
      managerId: input.managerId,
      avatar: input.avatar,
      isActive: true,
    },
    select: {
      id: true,
      username: true,
      fullName: true,
      role: true,
      departmentId: true,
      managerId: true,
      isActive: true,
      createdAt: true,
    },
  });

  return user;
}
