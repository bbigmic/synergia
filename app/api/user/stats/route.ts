import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";

const FREE_LIMIT = 3;
const SUBSCRIBED_LIMIT = 30;

export async function GET(req: Request) {
  try {
    const user = await getServerUser();
    const userId = user?.id;
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("sessionId");

    if (!userId) {
      // Anonymous user - check session-based usage
      if (sessionId) {
        const used = await prisma.usage.count({
          where: {
            sessionId,
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24 hours
          },
        });

        return NextResponse.json({
          isLoggedIn: false,
          usage: {
            used,
            limit: FREE_LIMIT,
            remaining: Math.max(0, FREE_LIMIT - used),
          },
          credits: 0,
          isSubscribed: false,
        });
      }

      return NextResponse.json({
        isLoggedIn: false,
        usage: { used: 0, limit: FREE_LIMIT, remaining: FREE_LIMIT },
        credits: 0,
        isSubscribed: false,
      });
    }

    // Get subscription
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

    const isSubscribed = !!subscription;
    const baseLimit = isSubscribed ? SUBSCRIBED_LIMIT : FREE_LIMIT;

    // Count base usage in current period (last 7 days) - only base usage (without purchases)
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const baseUsed = await prisma.usage.count({
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
    const purchasedUsed = await prisma.usage.count({
      where: {
        userId,
        purchaseId: { not: null },
      },
    });

    const purchasedRemaining = Math.max(0, totalPurchased - purchasedUsed);

    // Total available = base limit (if not exceeded) + purchased remaining
    const baseRemaining = Math.max(0, baseLimit - baseUsed);
    const totalLimit = baseLimit + purchasedRemaining;
    const totalUsed = baseUsed + purchasedUsed;

    // Get total credits
    const creditsResult = await prisma.credit.aggregate({
      where: { userId },
      _sum: { amount: true },
    });

    const credits = creditsResult._sum.amount || 0;

    return NextResponse.json({
      isLoggedIn: true,
      usage: {
        used: totalUsed,
        limit: totalLimit,
        remaining: Math.max(0, baseRemaining + purchasedRemaining),
      },
      credits,
      isSubscribed,
      subscriptionEnd: subscription?.currentPeriodEnd || null,
    });
  } catch (error) {
    console.error("Error fetching user stats:", error);
    return NextResponse.json(
      { error: "Nie udało się pobrać statystyk" },
      { status: 500 }
    );
  }
}

