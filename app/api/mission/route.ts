import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { openai } from "@/lib/openai";
import { getServerUser } from "@/lib/serverAuth";
import { awardXP, BASE_XP } from "@/lib/experience";

export const dynamic = 'force-dynamic';

const SYSTEM_PROMPT = `
Jesteś projektantem misji dla par.
Tworzysz krótkie, przemyślane misje dla par.
Misje muszą być bezpieczne, pełne szacunku i promować połączenie między partnerami.
`;

const FREE_LIMIT = 3;
const SUBSCRIBED_LIMIT = 30;
const CREDITS_PER_USE = 60;

async function checkUsageLimit(userId: string | null, sessionId: string | null) {
  if (userId) {
    // Check subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        status: "active",
        OR: [
          { currentPeriodEnd: null },
          { currentPeriodEnd: { gte: new Date() } },
        ],
      },
    });

    const baseLimit = subscription ? SUBSCRIBED_LIMIT : FREE_LIMIT;

    // Count usage in current weekly period (last 7 days) - only base usage (without purchases)
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const baseUsageCount = await prisma.usage.count({
      where: {
        userId,
        createdAt: { gte: periodStart },
        purchaseId: null, // Only count base usage, not purchased
      },
    });

    // Get total purchased usage available
    const purchasedUsageResult = await prisma.usagePurchase.aggregate({
      where: {
        userId,
        status: "completed",
      },
      _sum: {
        amount: true,
      },
    });

    const totalPurchased = purchasedUsageResult._sum.amount || 0;

    // Count how many purchased usages have been used
    const purchasedUsedCount = await prisma.usage.count({
      where: {
        userId,
        purchaseId: { not: null },
      },
    });

    const purchasedRemaining = Math.max(0, totalPurchased - purchasedUsedCount);

    // Total available = base limit (if not exceeded) + purchased remaining
    const baseRemaining = Math.max(0, baseLimit - baseUsageCount);
    const totalRemaining = baseRemaining + purchasedRemaining;
    const totalUsageCount = baseUsageCount + purchasedUsedCount;

    return { 
      allowed: baseUsageCount < baseLimit || purchasedRemaining > 0, 
      remaining: totalRemaining, 
      isSubscribed: !!subscription 
    };
  } else if (sessionId) {
    // Anonymous user - check session-based usage
    const usageCount = await prisma.usage.count({
      where: {
        sessionId,
        createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
      },
    });

    return { allowed: usageCount < FREE_LIMIT, remaining: Math.max(0, FREE_LIMIT - usageCount), isSubscribed: false };
  }

  return { allowed: false, remaining: 0, isSubscribed: false };
}

export async function POST(req: Request) {
  try {
    const { category, extraMode, sessionId } = await req.json();
    const userObj = await getServerUser();
    const userId = userObj?.id || null;

    // Check usage limits and subscription status
    const { allowed, remaining, isSubscribed } = await checkUsageLimit(userId, sessionId || null);

    if (!allowed) {
      return NextResponse.json(
        {
          error: "Osiągnięto limit użyć. Dokup dodatkowe użycia lub wykup subskrypcję Premium, aby kontynuować.",
        },
        { status: 403 }
      );
    }

    // Enforce extraMode only for subscribed users
    if (extraMode && !isSubscribed) {
      return NextResponse.json(
        { error: "Tryb ekstra dostępny jest tylko dla użytkowników z aktywną subskrypcją." },
        { status: 403 }
      );
    }

    let previousMissionsText = "";
    if (extraMode) {
      const previousMissions = await prisma.mission.findMany({
        where: { category },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { content: true },
      });

      if (previousMissions.length > 0) {
        previousMissionsText = `- niekonwencjonalny pomysł\n\nPoprzednie misje z tej kategorii (${previousMissions.length}):\n${previousMissions.map((m, i) => `${i + 1}. ${m.content}`).join("\n")}\n\nWAŻNE: Stwórz misję, która RÓŻNI SIĘ od powyższych. Unikaj powtarzania podobnych pomysłów, tematów lub struktur.`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini-2024-07-18",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `
Wygeneruj JEDNĄ misję dla pary.
Kategoria: ${category}

Zasady:
- 1–3 zdania
- możliwa do wykonania dzisiaj
- bez języka terapeutycznego
- bez banałów
- ciepły, ludzki ton
- odpowiedź wyłącznie po polsku
${previousMissionsText}
        `,
        },
      ],
    });

    const content =
      completion.choices[0]?.message?.content ?? "Nie udało się wygenerować misji.";

    // Create mission
    const mission = await prisma.mission.create({
      // Cast to any briefly if Prisma client types are not yet regenerated
      data: {
        category,
        content,
        userId: userId || null,
        extraMode: !!extraMode,
      } as any,
    });

    // Track usage - check if we should use purchased usage first
    let purchaseId: string | null = null;
    
    if (userId) {
      // Check if user has base usage left
      const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const baseUsageCount = await prisma.usage.count({
        where: {
          userId,
          createdAt: { gte: periodStart },
          purchaseId: null,
        },
      });
      
      const subscription = await prisma.subscription.findFirst({
        where: {
          userId,
          status: "active",
          OR: [
            { currentPeriodEnd: null },
            { currentPeriodEnd: { gte: new Date() } },
          ],
        },
      });
      
      const baseLimit = subscription ? SUBSCRIBED_LIMIT : FREE_LIMIT;
      
      // If base limit is exceeded, use purchased usage
      if (baseUsageCount >= baseLimit) {
        // Find an available purchase
        const availablePurchase = await prisma.usagePurchase.findFirst({
          where: {
            userId,
            status: "completed",
          },
          include: {
            _count: {
              select: { usages: true },
            },
          },
          orderBy: {
            createdAt: "asc", // Use oldest purchase first
          },
        });
        
        if (availablePurchase && (availablePurchase._count.usages < availablePurchase.amount)) {
          purchaseId = availablePurchase.id;
        }
      }
    }
    
    await prisma.usage.create({
      data: {
        userId: userId || null,
        sessionId: userId ? null : (sessionId || null),
        purchaseId: purchaseId,
      },
    });

    // Add credits if user is logged in
    // Subscribers get 3x more credits (180 instead of 60)
    if (userId) {
      const creditsToAdd = isSubscribed ? CREDITS_PER_USE * 3 : CREDITS_PER_USE;
      await prisma.credit.create({
        data: {
          userId,
          amount: creditsToAdd,
        },
      });

      // Award XP for generating mission
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { level: true, experience: true },
      });

      if (user) {
        const baseXP = extraMode ? BASE_XP.GENERATE_MISSION_EXTRA : BASE_XP.GENERATE_MISSION;
        await awardXP(prisma, userId, baseXP, user.level, user.experience);
      }
    }

    return NextResponse.json({
      ...mission,
      remaining,
      isSubscribed,
    });
  } catch (error) {
    console.error("Error in POST /api/mission:", error);
    return NextResponse.json(
      { error: "Nie udało się wygenerować misji" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const userObj = await getServerUser();
    const userId = userObj?.id || null;

    const { searchParams } = new URL(req.url);
    const scope = searchParams.get("scope"); // 'general' | 'mine' | undefined

    // Get pagination parameters
    const skip = parseInt(searchParams.get("skip") || "0", 10);
    const take = parseInt(searchParams.get("take") || "20", 20);

    // Default behavior:
    // - anonymous or scope=general => return global recent missions (limit 3)
    // - logged-in & scope=mine => return user's missions (with pagination)
    // - logged-in & no scope => return user's missions (with pagination) (backwards compat)
    if (scope === "general") {
      const missions = await prisma.mission.findMany({
        where: {},
        orderBy: { createdAt: "desc" },
        take: 3,
      });

      return NextResponse.json(missions);
    }

    if (scope === "mine") {
      if (!userId) {
        return NextResponse.json([], { status: 200 });
      }

      const missions = await prisma.mission.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      return NextResponse.json(missions);
    }

    if (scope === "liked") {
      if (!userId) {
        return NextResponse.json([], { status: 200 });
      }

      const likedMissions = await prisma.missionLike.findMany({
        where: { userId },
        include: {
          mission: true,
        },
        orderBy: { createdAt: "desc" },
        skip,
        take,
      });

      const missions = likedMissions.map((lm) => lm.mission);
      return NextResponse.json(missions);
    }

    // Fallback / default: behave as before (user -> their missions, anon -> global limited)
    const defaultTake = userId ? take : 3;

    const missions = await prisma.mission.findMany({
      where: userId ? { userId } : {},
      orderBy: { createdAt: "desc" },
      skip: userId ? skip : 0,
      take: defaultTake,
    });

    return NextResponse.json(missions);
  } catch (error) {
    console.error("Error in GET /api/mission:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać misji" },
      { status: 500 }
    );
  }
}
