'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CustodyDay, HouseholdMember, CalendarFeed } from '@/types'
import { Home, X } from 'lucide-react'

interface DayDetailProps {
  date: string
  custodyDays: CustodyDay[]
  members: HouseholdMember[]
  feeds: CalendarFeed[]
  currentMember: HouseholdMember | null
  householdId: string | null
  onClose: () => void
}

export function DayDetail({ date, custodyDays, members, currentMember, householdId, onClose }: DayDetailProps) {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)

  const existing = custodyDays.find(d => d.date === date)
  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const assignedMember = existing ? memberMap[existing.assigned_to] : null

  const displayDate = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric'
  })

  async function assignDay(memberId: string) {
    if (!householdId || !currentMember) return
    setSaving(true)

    if (existing) {
      await supabase.from('custody_days').update({
        assigned_to: memberId,
        updated_at: new Date().toISOString()
      }).eq('id', existing.id)
    } else {
      await supabase.from('custody_days').insert({
        household_id: householdId,
        date,
        assigned_to: memberId,
        created_by: currentMember.id,
      })
    }
    setSaving(false)
    onClose()
    window.location.reload() // simple refresh — replace with optimistic update in production
  }

  async function clearDay() {
    if (!existing) return
    setSaving(true)
    await supabase.from('custody_days').delete().eq('id', existing.id)
    setSaving(false)
    onClose()
    window.location.reload()
  }

  return (
    <div className="card mt-3 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="font-medium text-gray-900 text-sm">{displayDate}</div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Current custody */}
      <div className="mb-3">
        {assignedMember ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium"
            style={{ background: assignedMember.color + '22', color: assignedMember.color }}>
            <Home className="w-4 h-4" />
            {assignedMember.display_name} has custody
          </div>
        ) : (
          <div className="text-xs text-gray-400 px-1">No custody assigned for this day</div>
        )}
      </div>

      {/* Assign buttons */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">Assign to:</div>
        <div className="flex gap-2 flex-wrap">
          {members.map(m => (
            <button key={m.id} onClick={() => assignDay(m.id)} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: m.color + '22', color: m.color, border: `1px solid ${m.color}44` }}>
              {m.display_name}
            </button>
          ))}
          {existing && (
            <button onClick={clearDay} disabled={saving}
              className="px-3 py-1.5 rounded-lg text-sm text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default DayDetail
