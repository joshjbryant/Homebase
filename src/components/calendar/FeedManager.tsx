'use client'
import { useState } from 'react'
import type { CalendarFeed } from '@/types'
import { Plus, Rss, Trash2, Info } from 'lucide-react'

const COLORS = ['#4a7c59','#2a7fba','#c17a2a','#7c5abf','#c45a99','#3d8c8c','#e05c5c','#e07c3a']

interface Props {
  feeds: CalendarFeed[]
  onAdd: (feed: { name: string; url: string; color: string }) => Promise<void>
  onToggle: (id: string, enabled: boolean) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export default function FeedManager({ feeds, onAdd, onToggle, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [url, setUrl]   = useState('')
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) { setError('Paste an iCal URL'); return }
    if (!name.trim()) { setError('Give this calendar a name'); return }
    const normalized = url.replace(/^webcal:\/\//i, 'https://')
    try { new URL(normalized) } catch { setError('That doesn\'t look like a valid URL'); return }

    setAdding(true)
    setError('')
    await onAdd({ name: name.trim(), url: url.trim(), color })
    setUrl('')
    setName('')
    setAdding(false)
  }

  return (
    <div className="card">
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <Rss className="w-4 h-4 text-sage-600" />
          <span className="text-sm font-medium text-gray-900">Sports &amp; activity calendars</span>
          {feeds.filter(f => f.enabled).length > 0 && (
            <span className="bg-sage-100 text-sage-700 text-xs px-1.5 py-0.5 rounded-full">
              {feeds.filter(f => f.enabled).length} active
            </span>
          )}
        </div>
        <span className="text-gray-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-50">
          {/* Existing feeds */}
          {feeds.length > 0 && (
            <div className="space-y-2 my-3">
              {feeds.map(feed => (
                <div key={feed.id} className="flex items-center gap-3 py-2 px-3 bg-gray-50 rounded-lg">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: feed.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{feed.name}</div>
                    <div className="text-xs text-gray-400 truncate">{feed.url}</div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {feed.last_synced_at && (
                      <span className="text-xs text-gray-400 hidden sm:block">
                        {new Date(feed.last_synced_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {/* Toggle */}
                    <button
                      onClick={() => onToggle(feed.id, !feed.enabled)}
                      className={`w-9 h-5 rounded-full transition-colors relative ${feed.enabled ? 'bg-sage-500' : 'bg-gray-200'}`}
                      aria-label={feed.enabled ? 'Disable feed' : 'Enable feed'}
                    >
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${feed.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <button onClick={() => onDelete(feed.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add feed form */}
          <form onSubmit={handleAdd} className="space-y-2.5 mt-3">
            <input
              type="text"
              className="input text-xs"
              placeholder="iCal URL (webcal:// or https://…)"
              value={url}
              onChange={e => setUrl(e.target.value)}
            />
            <div className="flex gap-2">
              <input
                type="text"
                className="input text-xs flex-1"
                placeholder="Calendar name"
                value={name}
                onChange={e => setName(e.target.value)}
              />
              <div className="flex gap-1.5 items-center">
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setColor(c)}
                    className={`w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0 ${color === c ? 'ring-2 ring-offset-1 ring-gray-700 scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button type="submit" className="btn-primary w-full text-xs py-2" disabled={adding}>
              <Plus className="w-3.5 h-3.5" />
              {adding ? 'Adding…' : 'Add calendar'}
            </button>
          </form>

          <div className="flex items-start gap-1.5 mt-3 bg-blue-50 rounded-lg px-3 py-2">
            <Info className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600">
              Works with TeamSnap, SportsEngine, GameChanger, school districts, and any .ics URL. Calendars sync automatically every 6 hours.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
