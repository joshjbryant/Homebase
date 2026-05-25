import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
  typescript: true,
})

export const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID! // monthly $9.99 price

// Create a Stripe customer for a new household
export async function createStripeCustomer(email: string, householdId: string) {
  return stripe.customers.create({
    email,
    metadata: { household_id: householdId },
  })
}

// Create a Checkout Session for new subscriptions
export async function createCheckoutSession({
  customerId,
  householdId,
  returnUrl,
}: {
  customerId: string
  householdId: string
  returnUrl: string
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
    subscription_data: {
      trial_period_days: 14,
      metadata: { household_id: householdId },
    },
    success_url: `${returnUrl}/dashboard?subscribed=true`,
    cancel_url: `${returnUrl}/settings/billing`,
    allow_promotion_codes: true,
  })
}

// Create a billing portal session for self-serve management
export async function createBillingPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${returnUrl}/settings/billing`,
  })
}
