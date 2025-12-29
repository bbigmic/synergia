import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { awardXP, BASE_XP } from "@/lib/experience";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email i hasło są wymagane" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "Użytkownik z tym emailem już istnieje" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null,
        level: 1,
        experience: 0,
      },
    });

    // Initialize credits for new user (if Credit model exists)
    try {
      await prisma.credit.create({
        data: {
          userId: user.id,
          amount: 0,
        },
      });
    } catch (e) {
      // ignore if credits table not available or creation fails
      console.warn("Could not initialize credits for user:", e);
    }

    // Award XP for registration
    await awardXP(prisma, user.id, BASE_XP.REGISTER, 1, 0);

    return NextResponse.json({ message: "Konto utworzone pomyślnie", userId: user.id }, { status: 201 });
  } catch (error) {
    console.error("Error in register:", error);
    return NextResponse.json({ error: "Nie udało się utworzyć konta" }, { status: 500 });
  }
}


