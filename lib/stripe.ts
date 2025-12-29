import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-12-18.acacia",
});

export const WEEKLY_PRICE_ID = process.env.STRIPE_WEEKLY_PRICE_ID || "";

// Usage purchase packages
export const USAGE_PACKAGES = {
  small: {
    amount: 30,
    priceId: process.env.STRIPE_PRICE_30_ID || "",
    price: 8.99,
  },
  medium: {
    amount: 300,
    priceId: process.env.STRIPE_PRICE_300_ID || "",
    price: 79.99,
  },
  large: {
    amount: 3000,
    priceId: process.env.STRIPE_PRICE_3000_ID || "",
    price: 699.99,
  },
};


