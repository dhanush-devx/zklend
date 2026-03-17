'use client'

import { useState } from 'react'
import { loginWithCartridge, LENDING_CONTRACT } from '@/lib/starkzap'
import type { StarkzapUser } from '@/lib/starkzap'

interface Props {
  onComplete: (user: StarkzapUser) => void
}

export default function StepConnect({ onComplete }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleConnect() {
    setError('')
    setLoading(true)
    try {
      // Opens Cartridge Controller popup
      // User picks: Google / Twitter / email / passkey
      // Starkzap creates AA wallet + pre-approves lending contract
      const user = await loginWithCartridge(LENDING_CONTRACT)
      onComplete(user)
    } catch (err: any) {
      // User closed popup or error
      if (err?.message?.includes('closed') || err?.message?.includes('rejected')) {
        setError('Popup closed. Try again.')
      } else {
        setError(err?.message || 'Login failed. Try again.')
        console.error('Cartridge login error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">

      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-[#444]">STEP_01</span>
          <span className="w-8 h-px bg-[#1F1F1F]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          Connect your account
        </h2>
        <p className="text-sm text-[#666] mt-1">
          Starkzap uses Cartridge Controller to create a gasless Starknet wallet.
          Login with Google, email, or passkey — no seed phrase, no gas.
        </p>
      </div>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={loading}
        className="btn-primary w-full py-4 rounded-sm flex items-center justify-center gap-3 text-sm font-bold"
      >
        {loading ? (
          <>
            <LoadingDots />
            <span>Opening wallet...</span>
          </>
        ) : (
          <>
            <CartridgeIcon />
            <span>Connect with Cartridge →</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-[#FF3B5C] font-mono">{error}</p>
      )}

      {/* How it works */}
      <div className="border border-[#1F1F1F] rounded-sm p-4 space-y-3">
        <p className="font-mono text-xs text-[#333] uppercase tracking-widest">What happens</p>
        {[
          { n: '01', text: 'Cartridge popup opens — login with Google, email, or passkey' },
          { n: '02', text: 'Starknet AA wallet created automatically' },
          { n: '03', text: 'Lending contract pre-approved so all txns are 1-click' },
          { n: '04', text: 'All transactions are gasless — Starkzap paymaster covers fees' },
        ].map(item => (
          <div key={item.n} className="flex gap-3">
            <span className="font-mono text-xs text-[#00FF88] w-5 flex-shrink-0">{item.n}</span>
            <span className="text-xs text-[#555]">{item.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function CartridgeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2"/>
      <path d="M8 21h8M12 17v4"/>
    </svg>
  )
}

function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0,1,2].map(i => (
        <span key={i} className="w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </span>
  )
}
