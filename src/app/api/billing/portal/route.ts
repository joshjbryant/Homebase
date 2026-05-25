import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: household } = await supabase
    .from('households')
    .select('stripe_customer_id')
    .eq('created_by', user.id)
    .single()

  if (!household?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 })
  }

  const session = await createBillingPortalSession(
    household.stripe_customer_id,
    process.env.NEXT_PUBLIC_APP_URL!
  )

  return NextResponse.json({ url: session.url })
}
