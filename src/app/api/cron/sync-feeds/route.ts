import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { parseICalFeed } from '@/lib/ical'

// Vercel Cron: runs every 6 hours
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/sync-feeds", "schedule": "0 */6 * * *" }] }
export async function GET(req: NextRequest) {
  // Verify this is a legitimate cron call
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get all enabled feeds
  const { data: feeds, error } = await supabase
    .from('calendar_feeds')
    .select('*, households(subscription_status)')
    .eq('enabled', true)

  if (error || !feeds) {
    return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 })
  }

  let synced = 0, failed = 0

  for (const feed of feeds) {
    // Skip inactive households
    const status = (feed.households as { subscription_status: string } | null)?.subscription_status
    if (!status || !['trialing', 'active'].includes(status)) continue

    try {
      const events = await parseICalFeed(feed)

      // Delete stale events for this feed
      await supabase.from('calendar_feed_events').delete().eq('feed_id', feed.id)

      // Insert fresh events
      if (events.length > 0) {
        await supabase.from('calendar_feed_events').insert(
          events.map(e => ({
            feed_id: feed.id,
            household_id: feed.household_id,
            title: e.title,
            event_date: e.date,
            start_time: e.startTime || null,
            end_time: e.endTime || null,
            all_day: e.allDay,
          }))
        )
      }

      // Update last synced timestamp
      await supabase.from('calendar_feeds')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', feed.id)

      synced++
    } catch (err) {
      console.error(`Failed to sync feed ${feed.id} (${feed.name}):`, err)
      failed++
    }
  }

  return NextResponse.json({ synced, failed, total: feeds.length })
}
