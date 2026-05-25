'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import CalendarGrid from '@/components/calendar/CalendarGrid'
import FeedManager from '@/components/calendar/FeedManager'
import CalendarExport from '@/components/calendar/CalendarExport'
import DayDetail from '@/components/calendar/DayDetail'
import { useHousehold, useCustodyDays, useCalendarFeeds } from '@/hooks/useHomebase'
import { ChevronLeft, ChevronRight } from 'lucide-react'

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function DashboardPage() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const { members, householdId, currentMember, loading: hhLoading } = useHousehold()
  const { days: custodyDays, loading: calLoading } = useCustodyDays(householdId, year, month)
  const { feeds, addFeed, toggleFeed, deleteFeed } = useCalendarFeeds(householdId)

  function changeMonth(dir: number) {
    setSelectedDate(null)
    setMonth(prev => {
      const next = prev + dir
      if (next > 11) { setYear(y => y + 1); return 0 }
      if (next < 0)  { setYear(y => y - 1); return 11 }
      return next
    })
  }

  if (hhLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400">Loading…</div>
        </div>
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="px-4 pb-4">
        {/* Month nav */}
        <div className="flex items-center justify-between py-4">
          <button onClick={() => changeMonth(-1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <div className="font-semibold text-gray-900">{MONTHS[month]} {year}</div>
            <div className="flex items-center justify-center gap-3 mt-1">
              {members.map(m => (
                <div key={m.id} className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: m.color }} />
                  <span className="text-xs text-gray-500">{m.display_name}</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => changeMonth(1)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Calendar grid */}
        <CalendarGrid
          year={year}
          month={month}
          custodyDays={custodyDays}
          members={members}
          feeds={feeds}
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
        />

        {/* Day detail */}
        {selectedDate && (
          <DayDetail
            date={selectedDate}
            custodyDays={custodyDays}
            members={members}
            feeds={feeds}
            currentMember={currentMember}
            householdId={householdId}
            onClose={() => setSelectedDate(null)}
          />
        )}

        {/* Sports feeds */}
        <div className="mt-4">
          <FeedManager
            feeds={feeds}
            onAdd={addFeed}
            onToggle={toggleFeed}
            onDelete={deleteFeed}
          />
        </div>

        {/* Export */}
        <div className="mt-3">
          <CalendarExport householdId={householdId} />
        </div>
      </div>
    </AppLayout>
  )
}
