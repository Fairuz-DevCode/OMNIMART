import prisma from "../config/prisma.js";
import bcrypt from "bcryptjs";

const seedAdmin = async () => {
  try {
    const name = "admin1";
    const email = "admin@streetwear.com";
    const password = "admin123";

    const existingAdmin = await prisma.users.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      console.log("Akun admin sudah ada di database.");
      process.exit(0);
    }

    const saltRound = 10;
    const hashedPassword = await bcrypt.hash(password, saltRound);

    await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "admin",
      },
    });

    console.log("Berhasil membuat akun admin baru!");
    process.exit(0);
  } catch (error) {
    console.error("Gagal seeding admin:", error);
    process.exit(1);
  }
};

seedAdmin();
