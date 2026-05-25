import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { generateCustodyICal } from '@/lib/ical'

// GET /api/calendar/[householdId]/feed.ics?token=xxx
// This is the URL Fantastical, Outlook, Google Calendar subscribe to
export async function GET(
  req: NextRequest,
  { params }: { params: { householdId: string } }
) {
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 401 })

  const supabase = createServiceClient()

  // Validate token matches household
  const { data: household } = await supabase
    .from('households')
    .select('id, subscription_status')
    .eq('id', params.householdId)
    .single()

  if (!household) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!['trialing', 'active'].includes(household.subscription_status)) {
    return NextResponse.json({ error: 'Subscription inactive' }, { status: 402 })
  }

  // Simple HMAC token validation
  const expectedToken = Buffer.from(
    `${params.householdId}:${process.env.ICAL_FEED_SECRET}`
  ).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 32)

  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }

  // Fetch custody days (next 6 months)
  const from = new Date()
  from.setMonth(from.getMonth() - 1)
  const to = new Date()
  to.setMonth(to.getMonth() + 6)

  const { data: custodyDays } = await supabase
    .from('custody_days')
    .select('*')
    .eq('household_id', params.householdId)
    .gte('date', from.toISOString().split('T')[0])
    .lte('date', to.toISOString().split('T')[0])

  const { data: members } = await supabase
    .from('household_members')
    .select('*')
    .eq('household_id', params.householdId)

  const icalString = generateCustodyICal(
    custodyDays || [],
    members || [],
    params.householdId
  )

  return new NextResponse(icalString, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="homebase-custody.ics"',
      'Cache-Control': 'no-cache, no-store',
    },
  })
}
