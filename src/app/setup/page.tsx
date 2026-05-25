'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, Mail, Copy, Check, ChevronRight } from 'lucide-react'

export default function SetupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'invite' | 'kid' | 'done'>('invite')
  const [kidName, setKidName] = useState('')
  const [inviteLink, setInviteLink] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [inviteCreated, setInviteCreated] = useState(false)

  async function generateInvite() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: member } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .single()

    if (!member) { setLoading(false); return }

    const { data: token } = await supabase
      .from('invite_tokens')
      .insert({ household_id: member.household_id, created_by: user.id })
      .select('token')
      .single()

    if (token) {
      const link = `${window.location.origin}/auth/invite?token=${token.token}`
      setInviteLink(link)
      setInviteCreated(true)
    }
    setLoading(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(inviteLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleSkipInvite() {
    setStep('kid')
  }

  async function handleSaveKid(e: React.FormEvent) {
    e.preventDefault()
    // Store kid name in household metadata (or just proceed)
    // For now, navigate to dashboard — kid name shown in UI
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            home<span className="text-sage-500">base</span>
          </span>
        </div>

        {step === 'invite' && (
          <div className="card p-6">
            <div className="w-10 h-10 bg-sage-50 rounded-xl flex items-center justify-center mb-4">
              <Mail className="w-5 h-5 text-sage-600" />
            </div>
            <h1 className="text-lg font-semibold text-gray-900 mb-1">Invite your co-parent</h1>
            <p className="text-sm text-gray-500 mb-6">
              Send them a link to join your Homebase. They'll set up their own profile and calendar color.
            </p>

            {!inviteCreated ? (
              <button onClick={generateInvite} className="btn-primary w-full" disabled={loading}>
                {loading ? 'Generating link…' : 'Generate invite link'}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex-1 truncate font-mono">{inviteLink}</span>
                  <button onClick={copyLink} className="flex-shrink-0 text-sage-600 hover:text-sage-700">
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">Link expires in 7 days</p>
                <button onClick={() => setStep('kid')} className="btn-primary w-full">
                  Continue <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button onClick={handleSkipInvite} className="w-full text-sm text-gray-400 hover:text-gray-600 mt-3 text-center">
              Skip for now, I'll invite them later
            </button>
          </div>
        )}

        {step === 'kid' && (
          <div className="card p-6">
            <h1 className="text-lg font-semibold text-gray-900 mb-1">One last thing</h1>
            <p className="text-sm text-gray-500 mb-6">What's your child's name? We'll use it throughout the app.</p>
            <form onSubmit={handleSaveKid} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Child's name</label>
                <input type="text" className="input" placeholder="e.g. Jack"
                  value={kidName} onChange={e => setKidName(e.target.value)} required maxLength={30} autoFocus />
              </div>
              <button type="submit" className="btn-primary w-full">
                Go to Homebase <ChevronRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
