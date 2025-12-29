import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "10", 10);

    // Get top missions ordered by rating score
    const missions = await prisma.mission.findMany({
      where: {
        ratingScore: { gt: 0 }, // Only missions with at least 1 like
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        ratingScore: "desc",
      },
      skip,
      take,
    });

    return NextResponse.json(missions);
  } catch (error) {
    console.error("Error fetching ranking:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać rankingu" },
      { status: 500 }
    );
  }
}

