import { Router } from "express";
import { createUser } from "../services/user.service";

const router = Router();

router.post("/users", async (req, res) => {
  try {
    const { username, password, fullName, role, departmentId, managerId, avatar } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({
        message: "username, password, fullName là bắt buộc",
      });
    }

    const user = await createUser({
      username,
      password,
      fullName,
      role,
      departmentId,
      managerId,
      avatar,
    });

    return res.status(201).json({
      message: "Tạo user thành công",
      data: user,
    });
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Tạo user thất bại",
    });
  }
});

export default router;
