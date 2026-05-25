'use client'
import type { CustodyDay, HouseholdMember, CalendarFeed } from '@/types'

interface Props {
  year: number
  month: number
  custodyDays: CustodyDay[]
  members: HouseholdMember[]
  feeds: CalendarFeed[]
  selectedDate: string | null
  onSelectDate: (date: string) => void
}

const DOW = ['Su','Mo','Tu','We','Th','Fr','Sa']

export default function CalendarGrid({ year, month, custodyDays, members, feeds, selectedDate, onSelectDate }: Props) {
  const today = new Date()
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const prevMonthDays = new Date(year, month, 0).getDate()

  const memberMap = Object.fromEntries(members.map(m => [m.id, m]))
  const custodyMap = Object.fromEntries(
    custodyDays.map(d => [d.date, memberMap[d.assigned_to]])
  )

  function getDateStr(day: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }

  function isToday(day: number) {
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  // Build grid cells: leading blanks + current month + trailing blanks
  const cells: Array<{ day: number; isCurrentMonth: boolean }> = []
  for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevMonthDays - i, isCurrentMonth: false })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, isCurrentMonth: true })
  const remaining = 42 - cells.length
  for (let i = 1; i <= remaining; i++) cells.push({ day: i, isCurrentMonth: false })

  return (
    <div>
      {/* Day-of-week header */}
      <div className="grid grid-cols-7 mb-1">
        {DOW.map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((cell, i) => {
          if (!cell.isCurrentMonth) {
            return <div key={i} className="aspect-square flex items-start justify-center pt-1.5">
              <span className="text-xs text-gray-300">{cell.day}</span>
            </div>
          }

          const dateStr = getDateStr(cell.day)
          const custodyMember = custodyMap[dateStr]
          const isSelected = selectedDate === dateStr
          const isTd = isToday(cell.day)

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`aspect-square rounded-lg flex flex-col items-center justify-start pt-1.5 pb-1 transition-all relative
                ${custodyMember ? '' : 'hover:bg-gray-100'}
                ${isSelected ? 'ring-2 ring-gray-900 ring-offset-1' : ''}
              `}
              style={custodyMember ? { background: custodyMember.color + '28' } : {}}
            >
              <span className={`text-xs font-medium leading-none w-6 h-6 flex items-center justify-center rounded-full
                ${isTd ? 'bg-sage-500 text-white' : custodyMember ? '' : 'text-gray-700'}
              `}
              style={isTd ? {} : custodyMember ? { color: custodyMember.color } : {}}>
                {cell.day}
              </span>
              {/* Feed event dots */}
              <div className="flex gap-0.5 mt-1 flex-wrap justify-center px-1">
                {feeds
                  .filter(f => f.enabled)
                  .slice(0, 3)
                  .map(f => (
                    // Show dot placeholder — real events come from feed_events query
                    <div key={f.id} className="w-1 h-1 rounded-full opacity-0" style={{ background: f.color }} />
                  ))
                }
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
