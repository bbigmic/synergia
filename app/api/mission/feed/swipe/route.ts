import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/serverAuth";
import { awardXP, BASE_XP } from "@/lib/experience";

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }

    const { missionId, direction } = await req.json();

    if (!missionId || !direction || !["left", "right"].includes(direction)) {
      return NextResponse.json({ error: "Nieprawidłowe dane" }, { status: 400 });
    }

    // Check if FeedSwipe model is available
    if (!prisma.feedSwipe) {
      // If model doesn't exist yet, just return success (graceful degradation)
      return NextResponse.json({ success: true, warning: "Daily limit tracking not available yet" });
    }

    // Get today's date range
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Check if user already swiped this mission today
    const existingSwipe = await prisma.feedSwipe.findFirst({
      where: {
        userId: user.id,
        missionId,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (existingSwipe) {
      return NextResponse.json({ error: "Już przesunąłeś tę misję dzisiaj" }, { status: 400 });
    }

    // Count today's swipes
    const todaySwipesCount = await prisma.feedSwipe.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    if (todaySwipesCount >= 50) {
      return NextResponse.json({ error: "Osiągnięto dzienny limit" }, { status: 403 });
    }

    // Create swipe record
    await prisma.feedSwipe.create({
      data: {
        userId: user.id,
        missionId,
        direction,
      },
    });

    // Count today's swipes after creating this one
    const todaySwipesCountAfter = await prisma.feedSwipe.count({
      where: {
        userId: user.id,
        createdAt: {
          gte: todayStart,
          lt: todayEnd,
        },
      },
    });

    // Award XP for swipe
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, experience: true },
    });

    if (userData) {
      // Award regular swipe XP
      const updatedUser = await awardXP(prisma, user.id, BASE_XP.SWIPE, userData.level, userData.experience);
      
      // Check if this is the 50th swipe (100% completion bonus)
      if (todaySwipesCountAfter === 50) {
        // Award bonus XP for completing daily feed limit
        const updatedUserData = await prisma.user.findUnique({
          where: { id: user.id },
          select: { level: true, experience: true },
        });
        
        if (updatedUserData) {
          await awardXP(prisma, user.id, BASE_XP.FEED_COMPLETE, updatedUserData.level, updatedUserData.experience);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving swipe:", error);
    return NextResponse.json(
      { error: "Nie udało się zapisać przesunięcia" },
      { status: 500 }
    );
  }
}

