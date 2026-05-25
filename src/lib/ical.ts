import ICAL from 'ical.js'
import icalGenerator from 'ical-generator'
import type { CalendarFeed, CalendarFeedEvent, CustodyDay, HouseholdMember } from '@/types'

// ─── Parse external iCal feed URL → events ────────────────────────────────────
export async function parseICalFeed(
  feed: CalendarFeed
): Promise<Omit<CalendarFeedEvent, 'feedName' | 'feedColor'>[]> {
  // Normalize webcal:// → https://
  const url = feed.url.replace(/^webcal:\/\//i, 'https://')

  const res = await fetch(url, {
    next: { revalidate: 0 }, // always fresh on server fetches
    headers: { 'User-Agent': 'Homebase/1.0' },
  })

  if (!res.ok) throw new Error(`Failed to fetch iCal feed: ${res.status}`)

  const text = await res.text()
  const jcal = ICAL.parse(text)
  const comp = new ICAL.Component(jcal)
  const vevents = comp.getAllSubcomponents('vevent')

  const events: Omit<CalendarFeedEvent, 'feedName' | 'feedColor'>[] = []
  const now = new Date()
  const cutoff = new Date(now.getFullYear(), now.getMonth() - 1, 1) // 1 month back
  const future = new Date(now.getFullYear() + 1, now.getMonth(), 1)  // 1 year forward

  for (const vevent of vevents) {
    try {
      const event = new ICAL.Event(vevent)
      const startDate = event.startDate.toJSDate()

      if (startDate < cutoff || startDate > future) continue

      const dateStr = startDate.toISOString().split('T')[0]
      const allDay = event.startDate.isDate

      events.push({
        feedId: feed.id,
        title: event.summary || 'Event',
        date: dateStr,
        startTime: allDay ? undefined : startDate.toTimeString().slice(0, 5),
        endTime: allDay ? undefined : event.endDate?.toJSDate().toTimeString().slice(0, 5),
        allDay,
      })
    } catch {
      // Skip malformed events
    }
  }

  return events
}

// ─── Generate custody calendar iCal feed ─────────────────────────────────────
export function generateCustodyICal(
  custodyDays: CustodyDay[],
  members: HouseholdMember[],
  householdId: string
): string {
  const cal = icalGenerator({
    name: 'Homebase Custody Calendar',
    prodId: '//Homebase//Co-Parenting//EN',
    url: `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/${householdId}/feed.ics`,
  })

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))

  for (const day of custodyDays) {
    const member = memberMap[day.assigned_to]
    if (!member) continue

    cal.createEvent({
      id: day.id,
      start: new Date(day.date + 'T00:00:00'),
      end: new Date(day.date + 'T23:59:59'),
      allDay: true,
      summary: `${member.display_name} — custody day`,
      description: `Jack is with ${member.display_name} today.`,
    })
  }

  return cal.toString()
}

// ─── Validate that a URL looks like a valid iCal feed ─────────────────────────
export function isValidICalUrl(url: string): boolean {
  try {
    const normalized = url.replace(/^webcal:\/\//i, 'https://')
    const parsed = new URL(normalized)
    return ['http:', 'https:'].includes(parsed.protocol)
  } catch {
    return false
  }
}
