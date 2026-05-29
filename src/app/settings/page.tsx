'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold } from '@/hooks/useHomebase'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, LogOut, Copy, Check } from 'lucide-react'
import { useRouter } from 'next/navigation'

const THRESHOLD_OPTIONS = [0, 25, 50, 100, 250, 500]

export default function SettingsPage() {
  const supabase = createClient()
  const router   = useRouter()
  const { members, currentMember, householdId } = useHousehold()
  const [household, setHousehold]         = useState<{ subscription_status: string; trial_ends_at: string | null; payment_threshold: number } | null>(null)
  const [inviteLink, setInviteLink]       = useState('')
  const [copied, setCopied]               = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)
  const [venmoHandle, setVenmoHandle]     = useState('')
  const [venmoSaved, setVenmoSaved]       = useState(false)
  const [savingVenmo, setSavingVenmo]     = useState(false)
  const [threshold, setThreshold]         = useState<number>(50)
  const [savingThreshold, setSavingThreshold] = useState(false)
  const [thresholdSaved, setThresholdSaved]   = useState(false)

  useEffect(() => {
    if (!householdId) return
    supabase.from('households')
      .select('subscription_status, trial_ends_at, payment_threshold')
      .eq('id', householdId).single()
      .then(({ data }) => {
        if (data) {
          setHousehold(data)
          setThreshold(data.payment_threshold ?? 50)
        }
      })
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

  async function generateInvite() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !householdId) return
    const { data } = await supabase.from('invite_tokens')
      .insert({ household_id: householdId, created_by: user.id })
      .select('token').single()
    if (data) setInviteLink(`${window.location.origin}/auth/invite?token=${data.token}`)
  }

  async function copyInvite() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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

        {/* Payment settings */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Payment</div>

          {/* Venmo handle */}
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

          {/* Payment threshold */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Payment threshold
              {thresholdSaved && <span className="ml-2 text-green-600">✓ Saved</span>}
            </label>
            <div className="text-xs text-gray-400 mb-2">
              The Venmo button activates when the balance reaches this amount. Set to $0 to always show it.
            </div>
            <div className="flex gap-2 flex-wrap">
              {THRESHOLD_OPTIONS.map(opt => (
                <button key={opt} type="button"
                  onClick={() => saveThreshold(opt)}
                  disabled={savingThreshold}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    threshold === opt
                      ? 'bg-sage-50 border-sage-300 text-sage-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}>
                  {opt === 0 ? 'Always' : `$${opt}`}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Household */}
        <div className="card p-4 mb-3">
          <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Household</div>
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold"
                  style={{ background: m.color }}>
                  {m.display_name[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{m.display_name}</div>
                  <div className="text-xs text-gray-400 flex items-center gap-1">
                    {m.role === 'owner' ? 'Owner' : 'Co-parent'}
                    {(m as any).venmo_handle && (
                      <span className="ml-2 text-[#008CFF]">@{(m as any).venmo_handle}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {members.length < 2 && (
              <div className="pt-1">
                <div className="text-xs text-gray-500 mb-2">Your co-parent hasn't joined yet.</div>
                {!inviteLink ? (
                  <button onClick={generateInvite} className="btn-secondary text-xs w-full py-2">Generate invite link</button>
                ) : (
                  <div className="flex gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono flex-1 truncate">{inviteLink}</div>
                    <button onClick={copyInvite} className="text-sage-600 px-2">
                      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                )}
              </div>
            )}
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
