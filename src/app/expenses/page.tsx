'use client'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold, useExpenses } from '@/hooks/useHomebase'
import { createClient } from '@/lib/supabase/client'
import type { ExpenseCategory } from '@/types'
import { Plus, Receipt, Paperclip, Clock, Check, X, Upload } from 'lucide-react'

const CATEGORIES: { value: ExpenseCategory; label: string; emoji: string }[] = [
  { value: 'medical',  label: 'Medical',   emoji: '🏥' },
  { value: 'school',   label: 'School',    emoji: '🎒' },
  { value: 'sports',   label: 'Sports',    emoji: '⚾' },
  { value: 'clothing', label: 'Clothing',  emoji: '👕' },
  { value: 'food',     label: 'Food',      emoji: '🍕' },
  { value: 'other',    label: 'Other',     emoji: '📦' },
]

function buildVenmoUrl(venmoHandle: string, amount: number, month: string) {
  const note = encodeURIComponent(`Homebase - ${month} balance`)
  return `venmo://paycharge?txn=pay&recipients=${venmoHandle}&amount=${amount.toFixed(2)}&note=${note}`
}

function buildVenmoWebUrl(venmoHandle: string, amount: number, month: string) {
  const note = encodeURIComponent(`Homebase - ${month} balance`)
  return `https://venmo.com/${venmoHandle}?txn=pay&amount=${amount.toFixed(2)}&note=${note}`
}

export default function ExpensesPage() {
  const supabase = createClient()
  const { members, householdId, currentMember } = useHousehold()
  const { expenses, loading, markPaid } = useExpenses(householdId)
  const [filter, setFilter]   = useState<'all' | ExpenseCategory | 'pending'>('all')
  const [showModal, setShowModal] = useState(false)
  const [threshold, setThreshold] = useState<number>(50)
  const [desc, setDesc]       = useState('')
  const [amount, setAmount]   = useState('')
  const [category, setCategory] = useState<ExpenseCategory>('sports')
  const [date, setDate]       = useState(new Date().toISOString().split('T')[0])
  const [paidBy, setPaidBy]   = useState('')
  const [splitPct, setSplitPct] = useState(50)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [saving, setSaving]   = useState(false)

  // Load threshold from household
  useState(() => {
    if (!householdId) return
    supabase.from('households').select('payment_threshold').eq('id', householdId).single()
      .then(({ data }) => { if (data?.payment_threshold) setThreshold(data.payment_threshold) })
  })

  const otherMember = members.find(m => m.id !== currentMember?.id)
  const memberMap   = Object.fromEntries(members.map(m => [m.id, m]))

  // Balance calc
  let balance = 0
  if (currentMember && otherMember) {
    expenses.filter(e => e.status === 'pending').forEach(e => {
      if (e.paid_by === currentMember.id) {
        balance += e.amount * (100 - e.split_pct) / 100
      } else {
        balance -= e.amount * e.split_pct / 100
      }
    })
  }

  const iOwe       = balance < 0
  const amountOwed = Math.abs(balance)
  const whoIsOwed  = iOwe ? otherMember?.display_name : currentMember?.display_name
  const venmoTarget = iOwe ? (otherMember as any)?.venmo_handle : null
  const meetsThreshold = amountOwed >= threshold
  const currentMonth = new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })
  const ytd    = expenses.reduce((s, e) => s + e.amount, 0)
  const pending = expenses.filter(e => e.status === 'pending')
  const filtered = expenses.filter(e => {
    if (filter === 'all')     return true
    if (filter === 'pending') return e.status === 'pending'
    return e.category === filter
  })

  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault()
    if (!householdId || !currentMember) return
    setSaving(true)
    let receiptUrl = null
    if (receipt) {
      const ext  = receipt.name.split('.').pop()
      const path = `${householdId}/${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage.from('receipts').upload(path, receipt)
      if (upload) {
        const { data: { publicUrl } } = supabase.storage.from('receipts').getPublicUrl(path)
        receiptUrl = publicUrl
      }
    }
    await supabase.from('expenses').insert({
      household_id: householdId,
      description:  desc,
      amount:       parseFloat(amount),
      category,
      expense_date: date,
      paid_by:      paidBy || currentMember.id,
      split_pct:    splitPct,
      receipt_url:  receiptUrl,
      created_by:   currentMember.id,
    })
    setShowModal(false)
    setDesc(''); setAmount(''); setReceipt(null)
    setSaving(false)
    window.location.reload()
  }

  return (
    <AppLayout>
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between py-4">
          <h1 className="font-semibold text-gray-900 text-lg">Expenses</h1>
          <button onClick={() => setShowModal(true)} className="btn-primary py-2 px-3 text-xs">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="card px-3 py-2.5">
            <div className="text-xs text-gray-400 mb-0.5">YTD total</div>
            <div className="font-semibold text-gray-900 text-sm">${ytd.toFixed(0)}</div>
          </div>
          <div className="card px-3 py-2.5">
            <div className="text-xs text-gray-400 mb-0.5">Pending</div>
            <div className="font-semibold text-amber-600 text-sm">{pending.length}</div>
          </div>
          <div className="card px-3 py-2.5">
            <div className="text-xs text-gray-400 mb-0.5">{iOwe ? 'You owe' : 'Owed to you'}</div>
            <div className={`font-semibold text-sm ${iOwe ? 'text-red-600' : 'text-green-600'}`}>
              ${amountOwed.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Settle up banner */}
        {iOwe && amountOwed > 0 && (
          <div className="card px-4 py-3 mb-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium text-gray-900">
                  You owe {whoIsOwed} <span className={iOwe ? 'text-red-600' : 'text-green-600'}>${amountOwed.toFixed(2)}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {meetsThreshold
                    ? `${currentMonth} · ready to settle`
                    : `$${(threshold - amountOwed).toFixed(2)} away from $${threshold} threshold`
                  }
                </div>
                {/* Threshold progress bar */}
                {!meetsThreshold && (
                  <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden w-40">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${Math.min((amountOwed / threshold) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Venmo button — active or greyed out */}
              {venmoTarget ? (
                meetsThreshold ? (
                  <a
                    href={buildVenmoUrl(venmoTarget, amountOwed, currentMonth)}
                    onClick={() => {
                      setTimeout(() => {
                        window.location.href = buildVenmoWebUrl(venmoTarget, amountOwed, currentMonth)
                      }, 1500)
                    }}
                    className="flex items-center gap-2 bg-[#008CFF] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#0070CC] transition-colors flex-shrink-0"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 2C20.29 3.95 20.8 5.95 20.8 8.44c0 7.37-6.3 16.94-11.43 16.94C4.17 25.38 3.7 21.12 2.38 14.18c-.48-2.6-1.38-5.4-3.38-5.67L1.57 6C3.73 6.17 6.1 8.8 6.63 11.93c.55 3.24.92 5.96 1.75 5.96.99 0 2.72-3.5 2.72-6.12 0-2.5-1-3.7-2.18-3.7-.62 0-1.26.26-1.68.5C8.12 5.27 10.66 2 14.54 2H19.14z"/>
                    </svg>
                    Settle up
                  </a>
                ) : (
                  <div className="flex items-center gap-2 bg-gray-100 text-gray-400 text-xs font-semibold px-4 py-2.5 rounded-xl flex-shrink-0 cursor-not-allowed">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19.14 2C20.29 3.95 20.8 5.95 20.8 8.44c0 7.37-6.3 16.94-11.43 16.94C4.17 25.38 3.7 21.12 2.38 14.18c-.48-2.6-1.38-5.4-3.38-5.67L1.57 6C3.73 6.17 6.1 8.8 6.63 11.93c.55 3.24.92 5.96 1.75 5.96.99 0 2.72-3.5 2.72-6.12 0-2.5-1-3.7-2.18-3.7-.62 0-1.26.26-1.68.5C8.12 5.27 10.66 2 14.54 2H19.14z"/>
                    </svg>
                    Settle up
                  </div>
                )
              ) : (
                <a href="/settings"
                  className="text-xs text-[#008CFF] hover:underline flex-shrink-0">
                  Add Venmo →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-3">
          {(['all', 'pending', ...CATEGORIES.map(c => c.value)] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filter === f ? 'bg-sage-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}>
              {f === 'all' ? 'All' : f === 'pending' ? 'Pending' : CATEGORIES.find(c => c.value === f)?.label}
            </button>
          ))}
        </div>

        {/* Expense list */}
        {loading ? (
          <div className="text-center py-8 text-sm text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <div className="text-sm text-gray-400">No expenses yet</div>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(exp => {
              const payer      = memberMap[exp.paid_by]
              const myShare    = (exp.amount * exp.split_pct / 100).toFixed(2)
              const theirShare = (exp.amount * (100 - exp.split_pct) / 100).toFixed(2)
              const cat        = CATEGORIES.find(c => c.value === exp.category)
              return (
                <div key={exp.id} className="card px-4 py-3 flex items-center gap-3">
                  <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center text-lg flex-shrink-0">
                    {cat?.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">{exp.description}</div>
                    <div className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                      <span>{new Date(exp.expense_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      <span>•</span>
                      <span>Paid by {payer?.display_name}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {members[0]?.display_name}: ${myShare} / {members[1]?.display_name}: ${theirShare}
                    </div>
                    {exp.receipt_url && (
                      <a href={exp.receipt_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-sage-600 flex items-center gap-1 mt-0.5 hover:text-sage-700">
                        <Paperclip className="w-3 h-3" /> View receipt
                      </a>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-gray-900 text-sm">${exp.amount.toFixed(2)}</div>
                    <button onClick={() => markPaid(exp.id, exp.status === 'paid' ? 'pending' : 'paid')}
                      className={`mt-1 text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${
                        exp.status === 'paid' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                      {exp.status === 'paid' ? <><Check className="w-3 h-3" /> Paid</> : <><Clock className="w-3 h-3" /> Mark paid</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Add expense modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">Add expense</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="px-5 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
                <input className="input" placeholder="e.g. Soccer registration" value={desc} onChange={e => setDesc(e.target.value)} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Amount ($)</label>
                  <input type="number" step="0.01" min="0" className="input" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Date</label>
                  <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {CATEGORIES.map(c => (
                    <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                      className={`py-2 px-2 rounded-lg text-xs font-medium border transition-all text-center ${
                        category === c.value ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}>
                      {c.emoji} {c.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Paid by</label>
                <div className="flex gap-2">
                  {members.map(m => (
                    <button key={m.id} type="button" onClick={() => setPaidBy(m.id)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                        (paidBy || currentMember?.id) === m.id ? 'border-2' : 'border-gray-200 text-gray-600'
                      }`}
                      style={(paidBy || currentMember?.id) === m.id ? { borderColor: m.color, background: m.color + '18', color: m.color } : {}}>
                      {m.display_name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Split: {splitPct}% / {100 - splitPct}%
                </label>
                <input type="range" min="0" max="100" step="5" value={splitPct}
                  onChange={e => setSplitPct(Number(e.target.value))}
                  className="w-full accent-sage-500" />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{members[0]?.display_name}: ${((parseFloat(amount)||0) * splitPct / 100).toFixed(2)}</span>
                  <span>{members[1]?.display_name}: ${((parseFloat(amount)||0) * (100-splitPct) / 100).toFixed(2)}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Receipt (optional)</label>
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg py-4 cursor-pointer hover:border-sage-300 hover:bg-sage-50 transition-colors">
                  <Upload className="w-5 h-5 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">{receipt ? receipt.name : 'Tap to upload photo or PDF'}</span>
                  <input type="file" accept="image/*,application/pdf" className="hidden"
                    onChange={e => setReceipt(e.target.files?.[0] || null)} />
                </label>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving…' : 'Log expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  )
}
