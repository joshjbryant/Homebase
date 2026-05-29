'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Home, Check } from 'lucide-react'

const COLORS = ['#4a7c59','#2a7fba','#c17a2a','#7c5abf','#c45a99','#3d8c8c','#e05c5c','#e07c3a']

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'account' | 'profile'>('account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [color, setColor] = useState(COLORS[0])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleAccountStep(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setError('')
    setStep('profile')
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!displayName.trim()) { setError('Please enter your name'); return }
    setLoading(true)
    setError('')

    // Step 1 — Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password })
    if (authError || !authData.user) {
      setError(authError?.message || 'Signup failed — please try again')
      setLoading(false)
      return
    }

    const userId = authData.user.id

    // Step 2 — Create household
    const { data: household, error: hhError } = await supabase
      .from('households')
      .insert({
        created_by: userId,
        subscription_status: 'trialing',
      })
      .select()
      .single()

    if (hhError || !household) {
      setError('Failed to create your household. Please contact support.')
      setLoading(false)
      return
    }

    // Step 3 — Create household member record
    const { error: memberError } = await supabase
      .from('household_members')
      .insert({
        household_id: household.id,
        user_id: userId,
        display_name: displayName.trim(),
        color,
        role: 'owner',
      })

    if (memberError) {
      setError('Failed to set up your profile. Please contact support.')
      setLoading(false)
      return
    }

    // All good — go to setup
    router.push('/setup')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-10 h-10 bg-sage-500 rounded-xl flex items-center justify-center">
            <Home className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-semibold text-gray-900">
            home<span className="text-sage-500">base</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6 justify-center">
          {(['account', 'profile'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step === s
                  ? 'bg-sage-500 text-white'
                  : step === 'profile' && s === 'account'
                  ? 'bg-sage-100 text-sage-600'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {step === 'profile' && s === 'account' ? <Check className="w-3 h-3" /> : i + 1}
              </div>
              {i === 0 && <div className="w-8 h-px bg-gray-200" />}
            </div>
          ))}
        </div>

        <div className="card p-6">
          {step === 'account' ? (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Create your account</h1>
              <p className="text-sm text-gray-500 mb-6">14-day free trial · No credit card needed</p>
              <form onSubmit={handleAccountStep} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Email</label>
                  <input type="email" className="input" placeholder="you@example.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Password</label>
                  <input type="password" className="input" placeholder="8+ characters"
                    value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>}
                <button type="submit" className="btn-primary w-full">Continue</button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold text-gray-900 mb-1">Your profile</h1>
              <p className="text-sm text-gray-500 mb-6">How should you appear on the shared calendar?</p>
              <form onSubmit={handleCreateAccount} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Your name</label>
                  <input type="text" className="input" placeholder="e.g. JB or Dad"
                    value={displayName} onChange={e => setDisplayName(e.target.value)}
                    required maxLength={20} autoFocus />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">Your calendar color</label>
                  <div className="flex gap-2.5 flex-wrap">
                    {COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setColor(c)}
                        className="w-8 h-8 rounded-full transition-transform hover:scale-110 relative flex-shrink-0"
                        style={{ background: c }}>
                        {color === c && (
                          <div className="absolute inset-0 rounded-full border-2 border-white ring-2 ring-gray-900" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preview */}
                <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                    style={{ background: color }}>
                    {displayName ? displayName[0].toUpperCase() : '?'}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{displayName || 'Your name'}</div>
                    <div className="text-xs text-gray-500">Your custody days will show in this color</div>
                  </div>
                </div>

                {error && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-100">{error}</div>}
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setStep('account'); setError('') }}
                    className="btn-secondary flex-1">Back</button>
                  <button type="submit" className="btn-primary flex-1" disabled={loading}>
                    {loading ? 'Creating…' : 'Create account'}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>

        <div className="mt-4 text-center">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-700">
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
