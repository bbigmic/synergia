import { NextResponse } from "next/server";
import { stripe, WEEKLY_PRICE_ID } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getServerUser } from "@/lib/serverAuth";

export async function POST(req: Request) {
  try {
    const userObj = await getServerUser();

    if (!userObj?.id) {
      return NextResponse.json({ error: "Musisz być zalogowany" }, { status: 401 });
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

    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: WEEKLY_PRICE_ID,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/?canceled=true`,
      metadata: {
        userId: userId,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json(
      { error: "Nie udało się utworzyć sesji płatności" },
      { status: 500 }
    );
  }
}


