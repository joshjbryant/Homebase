'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Home, AlertCircle } from 'lucide-react'

const COLORS = ['#4a7c59','#2a7fba','#c17a2a','#7c5abf','#c45a99','#3d8c8c','#e05c5c','#e07c3a']

export default function InvitePage() {
  const router = useRouter()
  const params = useSearchParams()
  const token = params.get('token')
  const supabase = createClient()

  const [step, setStep] = useState<'auth' | 'profile'>('auth')
  const [mode, setMode] = useState<'login' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [color, setColor] = useState(COLORS[1])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)
  const [householdId, setHouseholdId] = useState('')

  useEffect(() => {
    if (!token) { setTokenValid(false); return }
    async function validateToken() {
      const { data } = await supabase
        .from('invite_tokens')
        .select('household_id, expires_at, used_at')
        .eq('token', token)
        .single()
      if (!data || data.used_at || new Date(data.expires_at) < new Date()) {
        setTokenValid(false)
      } else {
        setTokenValid(true)
        setHouseholdId(data.household_id)
      }
    }
    validateToken()
  }, [token])

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    let userId: string
    if (mode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password })
      if (error || !data.user) { setError(error?.message || 'Signup failed'); setLoading(false); return }
      userId = data.user.id
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error || !data.user) { setError(error?.message || 'Login failed'); setLoading(false); return }
      userId = data.user.id
    }

    setLoading(false)
    setStep('profile')
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Not authenticated'); setLoading(false); return }

    // Add as household member
    const { error: memberError } = await supabase.from('household_members').insert({
      household_id: householdId,
      user_id: user.id,
      display_name: displayName,
      color,
      role: 'member',
    })

    if (memberError) { setError('Failed to join household'); setLoading(false); return }

    // Mark invite as used
    await supabase.from('invite_tokens').update({ used_at: new Date().toISOString() }).eq('token', token)

    router.push('/dashboard')
  }

  if (tokenValid === null) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-sm text-gray-500">Checking invite…</div>
    </div>
  }

  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm card p-6 text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Invite not valid</h1>
          <p className="text-sm text-gray-500">This invite link has expired or already been used. Ask your co-parent to send a new one.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">home<span className="text-sage-500">base</span></span>
        </div>

        <div className="card p-6">
          {step === 'auth' ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">You've been invited</h1>
              <p className="text-sm text-gray-500 mb-5">
                {mode === 'signup' ? 'Create an account to join your co-parent on Homebase.' : 'Sign in to join your co-parent on Homebase.'}
              </p>

              {/* Mode toggle */}
              <div className="flex bg-gray-100 rounded-lg p-1 mb-5">
                {(['signup', 'login'] as const).map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`flex-1 text-sm py-1.5 rounded-md transition-all ${mode === m ? 'bg-white font-medium shadow-sm text-gray-900' : 'text-gray-500'}`}>
                    {m === 'signup' ? 'New account' : 'Sign in'}
                  </button>
                ))}
              </div>

              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input type="email" className="input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                  <input type="password" className="input" placeholder={mode === 'signup' ? '8+ characters' : '••••••••'}
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Continuing…' : 'Continue'}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Set up your profile</h1>
              <p className="text-sm text-gray-500 mb-5">How should you appear on the shared calendar?</p>
              <form onSubmit={handleJoin} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Your name</label>
                  <input type="text" className="input" placeholder="e.g. Jes or Mom"
                    value={displayName} onChange={e => setDisplayName(e.target.value)} required maxLength={20} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Your calendar color</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative"
                        style={{ background: c }}>
                        {color === c && <div className="absolute inset-0 rounded-full border-2 border-white ring-2 ring-gray-900" />}
                      </button>
                    ))}
                  </div>
                </div>
                {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>}
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Joining…' : 'Join Homebase'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
