'use client'
import { useState, useEffect } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import { useHousehold } from '@/hooks/useHomebase'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, LogOut, User, Copy, Check, RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function SettingsPage() {
  const supabase = createClient()
  const router = useRouter()
  const { members, currentMember, householdId } = useHousehold()
  const [household, setHousehold] = useState<{ subscription_status: string; trial_ends_at: string | null } | null>(null)
  const [inviteLink, setInviteLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    if (!householdId) return
    supabase.from('households').select('subscription_status, trial_ends_at')
      .eq('id', householdId).single().then(({ data }) => setHousehold(data))
  }, [householdId])

  async function generateInvite() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !householdId) return
    const { data } = await supabase.from('invite_tokens')
      .insert({ household_id: householdId, created_by: user.id })
      .select('token').single()
    if (data) {
      const link = `${window.location.origin}/auth/invite?token=${data.token}`
      setInviteLink(link)
    }
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
    trialing: { label: 'Free trial', color: 'text-blue-600 bg-blue-50' },
    active:   { label: 'Active', color: 'text-green-700 bg-green-50' },
    past_due: { label: 'Payment due', color: 'text-red-700 bg-red-50' },
    canceled: { label: 'Canceled', color: 'text-gray-600 bg-gray-100' },
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
                  <div className="text-xs text-gray-400">{m.role === 'owner' ? 'Owner' : 'Co-parent'}</div>
                </div>
              </div>
            ))}

            {members.length < 2 && (
              <div className="pt-1">
                <div className="text-xs text-gray-500 mb-2">Your co-parent hasn't joined yet.</div>
                {!inviteLink ? (
                  <button onClick={generateInvite} className="btn-secondary text-xs w-full py-2">
                    Generate invite link
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-600 font-mono flex-1 truncate">
                      {inviteLink}
                    </div>
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
              <button onClick={openBillingPortal} disabled={portalLoading}
                className="btn-secondary w-full text-xs py-2 mt-1">
                <CreditCard className="w-4 h-4" />
                {portalLoading ? 'Opening…' : 'Manage billing'}
              </button>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 text-sm text-red-600 hover:text-red-700 py-3 transition-colors">
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </AppLayout>
  )
}
