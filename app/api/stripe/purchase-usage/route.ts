import { NextResponse } from "next/server";
import { stripe, USAGE_PACKAGES } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/serverAuth";

export async function POST(req: Request) {
  try {
    const userObj = await getServerUser();

    if (!userObj?.id) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
    }

    const { packageType } = await req.json();

    if (!packageType || !["small", "medium", "large"].includes(packageType)) {
      return NextResponse.json(
        { error: "Nieprawidłowy typ pakietu" },
        { status: 400 }
      );
    }

    const packageData = USAGE_PACKAGES[packageType as keyof typeof USAGE_PACKAGES];

    if (!packageData.priceId) {
      return NextResponse.json(
        { error: "Konfiguracja płatności nie jest dostępna" },
        { status: 500 }
      );
    }

    const userId = userObj.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { subscriptions: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Użytkownik nie znaleziony" },
        { status: 404 }
      );
    }

    // Get or create Stripe customer
    let customerId = user.subscriptions[0]?.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: {
          userId: userId,
        },
      });
      customerId = customer.id;

      await prisma.subscription.create({
        data: {
          userId: userId,
          stripeCustomerId: customerId,
          status: "pending",
        },
      });
    }

    // Create usage purchase record
    const usagePurchase = await prisma.usagePurchase.create({
      data: {
        userId: userId,
        amount: packageData.amount,
        status: "pending",
      },
    });

    // Create checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price: packageData.priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile?success=purchase`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/profile?canceled=true`,
      metadata: {
        userId: userId,
        purchaseId: usagePurchase.id,
        packageType: packageType,
        amount: packageData.amount.toString(),
      },
    });

    // Update usage purchase with session ID
    await prisma.usagePurchase.update({
      where: { id: usagePurchase.id },
      data: { stripeSessionId: checkoutSession.id },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error: any) {
    console.error("Error creating usage purchase checkout session:", error);
    console.error("Error details:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    return NextResponse.json(
      { 
        error: "Nie udało się utworzyć sesji płatności",
        details: process.env.NODE_ENV === "development" ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

