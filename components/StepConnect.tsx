'use client'

import { useState } from 'react'
import { loginWithEmail, loginWithGoogle, StarkzapUser } from '@/lib/starkzap'

interface Props {
  onComplete: (user: StarkzapUser) => void
}

export default function StepConnect({ onComplete }: Props) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<'email' | 'google' | null>(null)
  const [error, setError] = useState('')

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setError('')
    setLoading('email')

    try {
      // Starkzap creates/recovers a Starknet wallet from your email
      // No seed phrase. No gas. Just email → wallet.
      const user = await loginWithEmail(email)
      onComplete(user)
    } catch (err: any) {
      setError(err?.message || 'Login failed. Try again.')
    } finally {
      setLoading(null)
    }
  }

  async function handleGoogleLogin() {
    setError('')
    setLoading('google')
    try {
      const user = await loginWithGoogle()
      onComplete(user)
    } catch (err: any) {
      setError(err?.message || 'Google login failed.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-[#444]">STEP_01</span>
          <span className="w-8 h-px bg-[#1F1F1F]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          Connect your account
        </h2>
        <p className="text-sm text-[#666] mt-1 font-body">
          Starkzap creates a gasless Starknet wallet from your email.
          No seed phrase. No STRK for gas. Just login.
        </p>
      </div>

      {/* Google */}
      <button
        onClick={handleGoogleLogin}
        disabled={!!loading}
        className="btn-outline w-full py-3 px-4 rounded-sm flex items-center gap-3 hover:border-[#444]"
      >
        {loading === 'google' ? (
          <LoadingDots />
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span>Continue with Google</span>
          </>
        )}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-[#1F1F1F]" />
        <span className="font-mono text-xs text-[#444]">OR</span>
        <div className="flex-1 h-px bg-[#1F1F1F]" />
      </div>

      {/* Email form */}
      <form onSubmit={handleEmailLogin} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full px-4 py-3 rounded-sm text-sm"
          disabled={!!loading}
          required
        />
        <button
          type="submit"
          disabled={!!loading || !email}
          className="btn-primary w-full py-3 rounded-sm text-sm"
        >
          {loading === 'email' ? (
            <span className="flex items-center justify-center gap-2">
              <LoadingDots /> Creating wallet...
            </span>
          ) : 'Continue with Email →'}
        </button>
      </form>

      {/* Error */}
      {error && (
        <p className="text-xs text-[#FF3B5C] font-mono">{error}</p>
      )}

      {/* Info footer */}
      <div className="border border-[#1F1F1F] rounded-sm p-3 space-y-1.5">
        {[
          'Wallet created from email — no downloads',
          'All transactions are gasless via Starkzap',
          'Your wallet persists across sessions',
        ].map(text => (
          <div key={text} className="flex items-center gap-2">
            <span className="text-[#00FF88] text-xs">✓</span>
            <span className="text-xs text-[#666]">{text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }}
        />
      ))}
    </span>
  )
}
