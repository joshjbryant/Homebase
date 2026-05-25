'use client'
import { useState } from 'react'
import { Share2, Download, Copy, Check } from 'lucide-react'

export default function CalendarExport({ householdId }: { householdId: string | null }) {
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!householdId) return null

  const token = Buffer.from(`${householdId}:${process.env.NEXT_PUBLIC_ICAL_TOKEN_HINT || 'token'}`).toString('base64').replace(/[^a-z0-9]/gi, '').slice(0, 32)
  const feedUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/calendar/${householdId}/feed.ics?token=${token}`
  const webcalUrl = feedUrl.replace('https://', 'webcal://')

  async function copyLink() {
    await navigator.clipboard.writeText(webcalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card">
      <button onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <Share2 className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-900">Export to Fantastical / Outlook</span>
        </div>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50 space-y-2 pt-3">
          <p className="text-xs text-gray-500">
            Subscribe to your custody calendar in any app — it updates automatically as you make changes.
          </p>

          {/* Subscribe link */}
          <div className="bg-gray-50 rounded-lg p-2.5 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-mono flex-1 truncate">{webcalUrl}</span>
            <button onClick={copyLink} className="flex-shrink-0 text-sage-600 hover:text-sage-700">
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <a href={webcalUrl}
              className="btn-secondary text-xs py-2 justify-center">
              Open in Fantastical
            </a>
            <a href={`https://calendar.google.com/calendar/r?cid=${encodeURIComponent(feedUrl)}`}
              target="_blank" rel="noopener noreferrer"
              className="btn-secondary text-xs py-2 justify-center">
              Add to Google
            </a>
          </div>

          <a href={feedUrl} download="homebase-custody.ics"
            className="btn-secondary w-full text-xs py-2">
            <Download className="w-3.5 h-3.5" />
            Download .ics snapshot
          </a>
        </div>
      )}
    </div>
  )
}
