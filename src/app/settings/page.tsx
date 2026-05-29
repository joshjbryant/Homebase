'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold } from '@/hooks/useHomebase'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, LogOut, Copy, Check, Eye, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const THRESHOLD_OPTIONS = [0, 25, 50, 100, 250, 500]

export default function SettingsPage() {
  const supabase = createClient()
  const router   = useRouter()
  const { members, currentMember, householdId } = useHousehold()
  const [household, setHousehold]           = useState<any>(null)
  const [viewers, setViewers]               = useState<any[]>([])
  const [inviteLink, setInviteLink]         = useState('')
  const [viewerInviteLink, setViewerInviteLink] = useState('')
  const [copied, setCopied]                 = useState('')
  const [portalLoading, setPortalLoading]   = useState(false)
  const [venmoHandle, setVenmoHandle]       = useState('')
  const [venmoSaved, setVenmoSaved]         = useState(false)
  const [savingVenmo, setSavingVenmo]       = useState(false)
  const [threshold, setThreshold]           = useState<number>(50)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [thresholdSaved, setThresholdSaved] = useState(false)

  useEffect(() => {
    if (!householdId) return
    supabase.from('households')
      .select('subscription_status, trial_ends_at, payment_threshold')
      .eq('id', householdId).single()
      .then(({ data }) => {
        if (data) { setHousehold(data); setThreshold(data.payment_threshold ?? 50) }
      })
    // Load viewers
    supabase.from('household_members')
      .select('*')
      .eq('household_id', householdId)
      .eq('role', 'viewer')
      .then(({ data }) => setViewers(data || []))
  }, [householdId])

  useEffect(() => {
    if (currentMember) setVenmoHandle((currentMember as any).venmo_handle || '')
  }, [currentMember])

  async function saveVenmoHandle() {
    if (!currentMember) return
    setSavingVenmo(true)
    await supabase.from('household_members')
      .update({ venmo_handle: venmoHandle.replace('@', '').trim() })
      .eq('id', currentMember.id)
    setSavingVenmo(false)
    setVenmoSaved(true)
    setTimeout(() => setVenmoSaved(false), 2000)
  }

  async function saveThreshold(val: number) {
    if (!householdId) return
    setSavingThreshold(true)
    setThreshold(val)
    await supabase.from('households').update({ payment_threshold: val }).eq('id', householdId)
    setSavingThreshold(false)
    setThresholdSaved(true)
    setTimeout(() => setThresholdSaved(false), 2000)
  }

  async function generateInvite(role: 'member' | 'viewer') {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !householdId) return
    const { data } = await supabase.from('invite_tokens')
      .insert({ household_id: householdId, created_by: user.id, role })
      .select('token').single()
    if (data) {
      const link = `${window.location.origin}/auth/invite?token=${data.token}`
      if (role === 'member') setInviteLink(link)
      else setViewerInviteLink(link)
    }
  }

  async function copyLink(link: string, key: string) {
    await navigator.clipboard.writeText(link)
    setCopied(key)
    setTimeout(() => setCopied(''), 2000)
  }

  async function removeViewer(memberId: string) {
    await supabase.from('household_members').delete().eq('id', memberId)
    setViewers(prev => prev.filter(v => v.id !== memberId))
  }

  async function openBillingPortal() {
    setPortalLoading(true)
    const res = await fetch('/api/billing/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setPortalLoading(false)
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const coParents = members.filter(m => m.role !== 'viewer')

  const statusLabel: Record<string, { label: string; color: string }> = {
    trialing: { label: 'Free trial',  color: 'text-blue-600 bg-blue-50' },
    active:   { label: 'Active',      color: 'text-green-700 bg-green-50' },
    past_due: { label: 'Payment due', color: 'text-red-700 bg-red-50' },
    canceled: { label: 'Canceled',    color: 'text-gray-600 bg-gray-100' },
  }

  return (
    <AppLayout>
      <div className="px-4 pb-4">
        <h1 className="font-semibold text-gray-900 text-lg py-4">Settings</h1>

        {/* Profile */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Your profile</div>
          {currentMember && (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                style={{ background: currentMember.color }}>
                {currentMember.display_name[0].toUpperCase()}
              </div>
              <div>
                <div className="font-medium text-gray-900">{currentMember.display_name}</div>
                <div className="text-xs text-gray-400">{currentMember.role === 'owner' ? 'Account owner' : 'Co-parent'}</div>
              </div>
            </div>
          )}
        </div>

        {/* Co-parents */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Co-parents</div>
          <div className="space-y-3">
            {coParents.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: m.color }}>
                  {m.display_name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{m.display_name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {m.role === 'owner' ? 'Owner' : 'Co-parent'}
                    {(m as any).venmo_handle && <span className="ml-2 text-[#008CFF]">@{(m as any).venmo_handle}</span>}
                  </div>
                </div>
              </div>
            ))}

            {coParents.length < 2 && (
              <div className="pt-1">
                <div className="text-xs text-gray-500 mb-2">Your co-parent hasn't joined yet.</div>
                {!inviteLink ? (
                  <button onClick={() => generateInvite('member')} className="btn-secondary text-xs w-full py-2">
                    Generate co-parent invite
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono flex-1 truncate">{inviteLink}</div>
                    <button onClick={() => copyLink(inviteLink, 'coparent')} className="text-sage-600 px-2">
                      {copied === 'coparent' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Family viewers */}
        <div className="card p-4 mb-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Family viewers</div>
            <div className="flex items-center gap-1 bg-blue-50 text-blue-600 text-xs px-2 py-0.5 rounded-full">
              <Eye className="w-3 h-3" /> Read-only
            </div>
          </div>
          <p className="text-xs text-gray-400 mb-3">
            Grandparents, step-parents, or others who can view the calendar and schedule but not expenses or messages.
          </p>

          {viewers.length > 0 && (
            <div className="space-y-2 mb-3">
              {viewers.map(v => (
                <div key={v.id} className="flex items-center gap-3 py-1.5">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-xs font-semibold">
                    {v.display_name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 text-sm text-gray-900">{v.display_name}</div>
                  <button onClick={() => removeViewer(v.id)} className="text-gray-300 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!viewerInviteLink ? (
            <button onClick={() => generateInvite('viewer')} className="btn-secondary text-xs w-full py-2">
              <Eye className="w-3.5 h-3.5" /> Generate viewer invite
            </button>
          ) : (
            <div>
              <div className="text-xs text-gray-500 mb-1.5">Share this link — it grants read-only calendar access:</div>
              <div className="flex gap-2">
                <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono flex-1 truncate">{viewerInviteLink}</div>
                <button onClick={() => copyLink(viewerInviteLink, 'viewer')} className="text-sage-600 px-2">
                  {copied === 'viewer' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Link expires in 7 days · single use</p>
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment</div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Your Venmo username</label>
            <div className="text-xs text-gray-400 mb-2">So your co-parent can pay you directly from the Expenses tab.</div>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">@</span>
                <input type="text" className="input pl-7" placeholder="your-venmo-username"
                  value={venmoHandle} onChange={e => setVenmoHandle(e.target.value.replace('@', ''))} />
              </div>
              <button onClick={saveVenmoHandle} disabled={savingVenmo} className="btn-primary px-4 text-xs">
                {venmoSaved ? <><Check className="w-3.5 h-3.5" /> Saved</> : savingVenmo ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Payment threshold
              {thresholdSaved && <span className="ml-2 text-green-600">✓ Saved</span>}
            </label>
            <div className="text-xs text-gray-400 mb-2">Venmo button activates when balance reaches this amount.</div>
            <div className="flex gap-2 flex-wrap">
              {THRESHOLD_OPTIONS.map(opt => (
                <button key={opt} type="button" onClick={() => saveThreshold(opt)} disabled={savingThreshold}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    threshold === opt ? 'bg-sage-50 border-sage-300 text-sage-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {opt === 0 ? 'Always' : `$${opt}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Billing */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Subscription</div>
          {household && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Status</span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusLabel[household.subscription_status]?.color || 'bg-gray-100 text-gray-600'}`}>
                  {statusLabel[household.subscription_status]?.label || household.subscription_status}
                </span>
              </div>
              {household.subscription_status === 'trialing' && household.trial_ends_at && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">Trial ends</span>
                  <span className="text-sm text-gray-900">
                    {new Date(household.trial_ends_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Plan</span>
                <span className="text-sm text-gray-900">$9.99 / month</span>
              </div>
              <button onClick={openBillingPortal} disabled={portalLoading} className="btn-secondary w-full text-xs py-2 mt-1">
                <CreditCard className="w-4 h-4" />
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            </div>
          )}
        </div>

        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 py-3 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </AppLayout>
  )
}
