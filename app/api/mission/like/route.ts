import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/serverAuth";

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }

    const { missionId } = await req.json();

    if (!missionId) {
      return NextResponse.json({ error: "Brak ID misji" }, { status: 400 });
    }

    // Check if mission exists
    const mission = await prisma.mission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      return NextResponse.json({ error: "Misja nie znaleziona" }, { status: 404 });
    }

    // Check if already liked
    const existingLike = await prisma.missionLike.findUnique({
      where: {
        userId_missionId: {
          userId: user.id,
          missionId: missionId,
        },
      },
    });

    if (existingLike) {
      return NextResponse.json({ error: "Już polubiłeś tę misję" }, { status: 400 });
    }

    // Create like and increment rating score in a transaction
    await prisma.$transaction([
      prisma.missionLike.create({
        data: {
          userId: user.id,
          missionId: missionId,
        },
      }),
      prisma.mission.update({
        where: { id: missionId },
        data: {
          ratingScore: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error liking mission:", error);
    return NextResponse.json(
      { error: "Nie udało się polubić misji" },
      { status: 500 }
    );
  }
}

