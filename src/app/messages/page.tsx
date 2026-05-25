'use client'
import { useState, useEffect, useRef } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold, useMessages } from '@/hooks/useHomebase'
import { Send } from 'lucide-react'

export default function MessagesPage() {
  const { members, householdId, currentMember } = useHousehold()
  const { messages, loading, sendMessage } = useMessages(householdId)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  const otherMember = members.find(m => m.id !== currentMember?.id)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !currentMember) return
    setSending(true)
    await sendMessage(input.trim(), currentMember.id)
    setInput('')
    setSending(false)
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 bg-white flex items-center gap-3">
          {otherMember && (
            <>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                style={{ background: otherMember.color }}>
                {otherMember.display_name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900 text-sm">{otherMember.display_name}</div>
                <div className="text-xs text-gray-400">Co-parent</div>
              </div>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {loading ? (
            <div className="text-center text-sm text-gray-400 pt-8">Loading messages…</div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-gray-400 pt-8">
              No messages yet — say hi to {otherMember?.display_name || 'your co-parent'}
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.sender_id === currentMember?.id
              const sender = members.find(m => m.id === msg.sender_id)
              const time = new Date(msg.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })

              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] ${isMe ? 'items-end' : 'items-start'} flex flex-col gap-0.5`}>
                    <div className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-sage-500 text-white rounded-br-sm'
                        : 'bg-white border border-gray-100 text-gray-900 rounded-bl-sm'
                    }`}>
                      {msg.body}
                    </div>
                    <span className="text-xs text-gray-400 px-1">{time}</span>
                  </div>
                </div>
              )
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-3 bg-white border-t border-gray-100 safe-bottom">
          <form onSubmit={handleSend} className="flex gap-2 items-end">
            <input
              className="input flex-1 resize-none"
              placeholder={`Message ${otherMember?.display_name || 'co-parent'}…`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e) } }}
            />
            <button type="submit" disabled={!input.trim() || sending}
              className="w-10 h-10 bg-sage-500 rounded-full flex items-center justify-center text-white flex-shrink-0 disabled:opacity-40 hover:bg-sage-600 transition-colors">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  )
}
