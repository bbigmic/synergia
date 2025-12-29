import { NextResponse } from "next/server";
import { getServerUser } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST() {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Nieautoryzowany" }, { status: 401 });

    const subscription = await prisma.subscription.findFirst({
      where: { userId: user.id, NOT: { stripeSubscriptionId: null } },
      orderBy: { createdAt: "desc" },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return NextResponse.json({ error: "Brak aktywnej subskrypcji do anulowania" }, { status: 400 });
    }

    // Cancel at period end - subskrypcja pozostanie aktywna do końca opłaconego okresu,
    // ale nie będzie pobierane za następny okres
    try {
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, { 
        cancel_at_period_end: true 
      });
      
      // Pobierz zaktualizowaną subskrypcję, aby uzyskać aktualne dane
      const updatedSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      
      // Webhook automatycznie zaktualizuje status gdy subskrypcja zostanie anulowana na końcu okresu
      // Na razie pozostawiamy status "active" w bazie, bo subskrypcja jest nadal aktywna do końca okresu
      await prisma.subscription.update({
        where: { id: subscription.id },
        data: { 
          currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000),
          // Status pozostaje "active" do końca okresu - webhook zaktualizuje go na "canceled" gdy okres się skończy
        },
      });
    } catch (stripeErr) {
      console.error("Stripe cancel error:", stripeErr);
      return NextResponse.json(
        { error: "Nie udało się anulować subskrypcji w Stripe" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      message: "Subskrypcja zostanie anulowana na końcu bieżącego okresu rozliczeniowego. Nie będzie pobierane za następny okres." 
    }, { status: 200 });
  } catch (err) {
    console.error("cancel subscription error:", err);
    return NextResponse.json({ error: "Nie udało się anulować subskrypcji" }, { status: 500 });
  }
}


