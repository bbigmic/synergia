import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

    const { name, email } = await req.json();
    if (!name && !email) {
      return NextResponse.json({ error: "Brak danych do aktualizacji" }, { status: 400 });
    }

    // If email changed, ensure not used by another user
    if (email && email !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email jest już zajęty" }, { status: 400 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: name ?? undefined,
        email: email ?? undefined,
      },
    });

    return NextResponse.json({ user: { id: updated.id, email: updated.email, name: updated.name } }, { status: 200 });
  } catch (err) {
    console.error("user update error:", err);
    return NextResponse.json({ error: "Nie udało się zaktualizować danych" }, { status: 500 });
  }
}


