import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Podaj aktualne i nowe hasło" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
    if (!dbUser || !dbUser.password) {
      return NextResponse.json({ error: "Brak hasła do porównania" }, { status: 400 });
    }

    const match = await bcrypt.compare(currentPassword, dbUser.password);
    if (!match) {
      return NextResponse.json({ error: "Aktualne hasło jest nieprawidłowe" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });

    return NextResponse.json({ message: "Hasło zmienione" }, { status: 200 });
  } catch (err) {
    console.error("change password error:", err);
    return NextResponse.json({ error: "Nie udało się zmienić hasła" }, { status: 500 });
  }
}


