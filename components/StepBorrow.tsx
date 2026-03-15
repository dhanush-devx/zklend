'use client'

import { useState } from 'react'
import { borrowTokens } from '@/lib/starkzap'
import { INCOME_TIERS, type IncomeProof } from '@/lib/reclaim'
import type { StarkzapUser } from '@/lib/starkzap'

interface Props {
  proof: IncomeProof
  user: StarkzapUser
  onComplete: (txHash: string) => void
}

const INTEREST_RATE = 0.08  // 8% APR
const DURATION_OPTIONS = [7, 14, 30, 60, 90]

export default function StepBorrow({ proof, user, onComplete }: Props) {
  const maxBorrow = proof.borrowLimit
  const [amount, setAmount] = useState(Math.floor(maxBorrow * 0.3))
  const [duration, setDuration] = useState(30)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const tierInfo = INCOME_TIERS[proof.tier]
  const utilizationPct = (amount / maxBorrow) * 100

  // Repayment calc
  const dailyRate = INTEREST_RATE / 365
  const interest = amount * dailyRate * duration
  const totalRepay = amount + interest
  const dailyRepay = totalRepay / duration

  async function handleBorrow() {
    setError('')
    setLoading(true)

    try {
      // Gasless borrow via Starkzap — no STRK for gas needed
      const txHash = await borrowTokens(BigInt(amount), duration)
      onComplete(txHash)
    } catch (err: any) {
      setError(err?.message || 'Transaction failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-[#444]">STEP_03</span>
          <span className="w-8 h-px bg-[#1F1F1F]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          Borrow against your income
        </h2>
        <p className="text-sm text-[#666] mt-1">
          No collateral. No wallet needed. Gasless transaction.
        </p>
      </div>

      {/* Credit limit bar */}
      <div className="border border-[#1F1F1F] rounded-sm p-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-[#444]">CREDIT_LIMIT</span>
          <span className="font-mono text-sm text-[#00FF88]">₹{maxBorrow.toLocaleString()}</span>
        </div>
        <div className="h-1.5 bg-[#1F1F1F] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${utilizationPct}%`,
              background: utilizationPct > 80
                ? '#FF3B5C'
                : utilizationPct > 60
                ? '#FFB800'
                : '#00FF88',
            }}
          />
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-xs text-[#555]">
            {utilizationPct.toFixed(0)}% utilized
          </span>
          <span className="font-mono text-xs text-[#555]">
            ₹{(maxBorrow - amount).toLocaleString()} remaining
          </span>
        </div>
      </div>

      {/* Amount slider */}
      <div className="space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="font-mono text-xs text-[#444]">BORROW_AMOUNT</span>
          <span className="font-display text-3xl font-bold text-white number-display">
            ₹{amount.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={1000}
          max={maxBorrow}
          step={1000}
          value={amount}
          onChange={e => setAmount(Number(e.target.value))}
          className="w-full"
        />
        <div className="flex justify-between">
          <span className="font-mono text-xs text-[#333]">₹1,000</span>
          <span className="font-mono text-xs text-[#333]">₹{maxBorrow.toLocaleString()}</span>
        </div>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <span className="font-mono text-xs text-[#444]">REPAY_IN</span>
        <div className="flex gap-2">
          {DURATION_OPTIONS.map(d => (
            <button
              key={d}
              onClick={() => setDuration(d)}
              className={`flex-1 py-2 rounded-sm font-mono text-xs transition-all ${
                duration === d
                  ? 'bg-[rgba(0,255,136,0.1)] border border-[rgba(0,255,136,0.4)] text-[#00FF88]'
                  : 'border border-[#1F1F1F] text-[#444] hover:border-[#333]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {/* Repayment breakdown */}
      <div className="border border-[#1F1F1F] rounded-sm divide-y divide-[#1F1F1F]">
        {[
          { label: 'Principal',    value: `₹${amount.toLocaleString()}` },
          { label: `Interest (8% APR, ${duration}d)`, value: `₹${interest.toFixed(0)}` },
          { label: 'Total repay',  value: `₹${totalRepay.toFixed(0)}`, bold: true },
          { label: 'Daily cost',   value: `₹${dailyRepay.toFixed(0)}/day` },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center px-3 py-2">
            <span className={`font-mono text-xs ${row.bold ? 'text-[#888]' : 'text-[#444]'}`}>{row.label}</span>
            <span className={`font-mono text-xs ${row.bold ? 'text-white font-medium' : 'text-[#888]'}`}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Wallet + gasless note */}
      <div className="flex items-center gap-2 bg-[#0D0D0D] border border-[#1F1F1F] rounded-sm px-3 py-2">
        <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
        <span className="font-mono text-xs text-[#555]">
          Sending to{' '}
          <span className="text-[#888]">
            {user.address.slice(0, 6)}...{user.address.slice(-4)}
          </span>
          {' '}· Gasless via Starkzap
        </span>
      </div>

      {error && (
        <p className="text-xs text-[#FF3B5C] font-mono">{error}</p>
      )}

      <button
        onClick={handleBorrow}
        disabled={loading}
        className="btn-primary w-full py-4 rounded-sm text-sm font-bold"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <SpinIcon /> Processing gasless tx...
          </span>
        ) : (
          `Borrow ₹${amount.toLocaleString()} — No Gas →`
        )}
      </button>

      <p className="text-xs text-[#333] text-center">
        Transaction executed via Starkzap paymaster. No STRK required.
      </p>
    </div>
  )
}

function SpinIcon() {
  return (
    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
    </svg>
  )
}
