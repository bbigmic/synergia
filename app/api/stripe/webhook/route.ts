import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import Stripe from "stripe";
import { awardXP, BASE_XP } from "@/lib/experience";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "No signature" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed:", err.message);
    return NextResponse.json(
      { error: `Webhook Error: ${err.message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;

        // Handle subscription purchase
        if (userId && session.subscription) {
          const subscription = (await stripe.subscriptions.retrieve(
            session.subscription as string
          )) as Stripe.Subscription;

          // Używamy bracket notation, aby uniknąć problemów z typami TypeScript na Vercel
          const currentPeriodEnd = (subscription as any).current_period_end as number;
          await prisma.subscription.updateMany({
            where: { stripeCustomerId: session.customer as string },
            data: {
              stripeSubscriptionId: subscription.id,
              status: subscription.status === "active" ? "active" : "pending",
              currentPeriodEnd: new Date(currentPeriodEnd * 1000),
            },
          });

          // Award XP for subscribing to Premium
          if (subscription.status === "active") {
            const user = await prisma.user.findUnique({
              where: { id: userId },
              select: { level: true, experience: true },
            });

            if (user) {
              await awardXP(prisma, userId, BASE_XP.SUBSCRIBE_PREMIUM, user.level, user.experience);
            }
          }
        }

        // Handle usage purchase (one-time payment)
        if (userId && session.mode === "payment" && session.metadata?.purchaseId) {
          const purchaseId = session.metadata.purchaseId;
          
          await prisma.usagePurchase.update({
            where: { id: purchaseId },
            data: {
              status: "completed",
              completedAt: new Date(),
              stripePaymentIntentId: session.payment_intent as string,
            },
          });

          // Award XP for purchasing usage
          const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { level: true, experience: true },
          });

          if (user) {
            await awardXP(prisma, userId, BASE_XP.PURCHASE_USAGE, user.level, user.experience);
          }
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        // Używamy bracket notation, aby uniknąć problemów z typami TypeScript na Vercel
        const currentPeriodEnd = (subscription as any).current_period_end as number;
        await prisma.subscription.updateMany({
          where: { stripeCustomerId: customerId },
          data: {
            status:
              subscription.status === "active"
                ? "active"
                : subscription.status === "canceled"
                ? "canceled"
                : "past_due",
            currentPeriodEnd: new Date(currentPeriodEnd * 1000),
          },
        });
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}


