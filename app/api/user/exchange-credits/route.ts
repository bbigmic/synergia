import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { awardXP, BASE_XP } from "@/lib/experience";

const CREDITS_PER_USAGE = 300;

export async function POST(req: Request) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });
    }

    // Get total credits
    const creditsResult = await prisma.credit.aggregate({
      where: { userId: user.id },
      _sum: { amount: true },
    });

    const totalCredits = creditsResult._sum.amount || 0;

    if (totalCredits < CREDITS_PER_USAGE) {
      return NextResponse.json(
        { error: `Niewystarczająca ilość kredytów. Wymagane: ${CREDITS_PER_USAGE}, posiadasz: ${totalCredits}` },
        { status: 400 }
      );
    }

    // Create a usage purchase record for credit exchange
    // This allows the usage to be tracked separately from base usage
    const usagePurchase = await prisma.usagePurchase.create({
      data: {
        userId: user.id,
        amount: 1,
        status: "completed",
        completedAt: new Date(),
      },
    });

    // Deduct credits by creating a negative credit entry
    await prisma.credit.create({
      data: {
        userId: user.id,
        amount: -CREDITS_PER_USAGE,
      },
    });

    // Award XP for exchanging credits
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { level: true, experience: true },
    });

    if (userData) {
      await awardXP(prisma, user.id, BASE_XP.EXCHANGE_CREDITS, userData.level, userData.experience);
    }

    return NextResponse.json({
      success: true,
      message: `Wymieniono ${CREDITS_PER_USAGE} kredytów na 1 użycie`,
      remainingCredits: totalCredits - CREDITS_PER_USAGE,
    });
  } catch (error) {
    console.error("Error exchanging credits:", error);
    return NextResponse.json(
      { error: "Nie udało się wymienić kredytów" },
      { status: 500 }
    );
  }
}

