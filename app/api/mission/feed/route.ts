import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/serverAuth";

export const dynamic = 'force-dynamic';

const DAILY_FEED_LIMIT = 50;

export async function GET(req: Request) {
  try {
    const userObj = await getServerUser();
    const userId = userObj?.id || null;

    if (!userId) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }

    // Get today's date range (start of day to end of day in user's timezone)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    // Count today's swipes (with fallback if FeedSwipe model doesn't exist yet)
    let todaySwipesCount = 0;
    let todaySwipedIds: string[] = [];
    
    try {
      if (prisma.feedSwipe) {
        todaySwipesCount = await prisma.feedSwipe.count({
          where: {
            userId,
            createdAt: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
        });

        // Get IDs of missions user already swiped today
        const todaySwipedMissionIds = await prisma.feedSwipe.findMany({
          where: {
            userId,
            createdAt: {
              gte: todayStart,
              lt: todayEnd,
            },
          },
          select: { missionId: true },
        });

        todaySwipedIds = todaySwipedMissionIds.map((s) => s.missionId);
      }
    } catch (error) {
      // If FeedSwipe table doesn't exist yet, continue with 0 swipes
      console.warn("FeedSwipe model not available, continuing without daily limit tracking:", error);
    }

    const remainingSwipes = Math.max(0, DAILY_FEED_LIMIT - todaySwipesCount);
    const hasReachedLimit = todaySwipesCount >= DAILY_FEED_LIMIT;

    // Get IDs of missions user already liked
    const likedMissionIds = await prisma.missionLike.findMany({
      where: { userId },
      select: { missionId: true },
    });

    const likedIds = likedMissionIds.map((lm) => lm.missionId);

    // Get missions that user hasn't liked yet and hasn't swiped today, excluding their own missions
    const missions = hasReachedLimit
      ? []
      : await prisma.mission.findMany({
          where: {
            userId: { not: userId }, // Exclude user's own missions
            id: { notIn: [...likedIds, ...todaySwipedIds] }, // Exclude already liked and today swiped missions
          },
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: remainingSwipes,
        });

    return NextResponse.json({
      missions,
      dailyLimit: DAILY_FEED_LIMIT,
      used: todaySwipesCount,
      remaining: remainingSwipes,
      hasReachedLimit,
    });
  } catch (error) {
    console.error("Error fetching feed missions:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać misji" },
      { status: 500 }
    );
  }
}

