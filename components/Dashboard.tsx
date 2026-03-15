'use client'

import { useState } from 'react'
import type { StarkzapUser } from '@/lib/starkzap'
import type { IncomeProof } from '@/lib/reclaim'

interface Props {
  txHash: string
  user: StarkzapUser
  proof: IncomeProof
  amount: number
  duration: number
}

export default function Dashboard({ txHash, user, proof, amount, duration }: Props) {
  const dueDate = new Date(Date.now() + duration * 24 * 60 * 60 * 1000)
  const interest = amount * (0.08 / 365) * duration
  const totalRepay = amount + interest

  const [copied, setCopied] = useState(false)

  function copyHash() {
    navigator.clipboard.writeText(txHash)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">

      {/* Success header */}
      <div className="text-center space-y-3">
        <div className="w-14 h-14 rounded-full border border-[#00FF88] flex items-center justify-center mx-auto glow-acid">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>
        <div>
          <p className="font-mono text-xs text-[#00FF88] mb-1">TRANSACTION_CONFIRMED</p>
          <h2 className="font-display text-3xl font-bold text-white">
            ₹{amount.toLocaleString()} borrowed
          </h2>
          <p className="text-sm text-[#555] mt-1">
            Funds sent to your wallet · Zero gas paid
          </p>
        </div>
      </div>

      {/* Active loan card */}
      <div className="border border-[rgba(0,255,136,0.2)] rounded-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-[#444]">ACTIVE_LOAN</span>
          <span className="text-xs px-2 py-0.5 bg-[rgba(0,255,136,0.1)] text-[#00FF88] rounded-sm font-mono">
            ACTIVE
          </span>
        </div>
        {[
          { label: 'Borrowed',      value: `₹${amount.toLocaleString()}` },
          { label: 'Total repay',   value: `₹${totalRepay.toFixed(0)}` },
          { label: 'Due date',      value: dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
          { label: 'Income proof',  value: proof.tierLabel },
          { label: 'Collateral',    value: 'None (income-verified)' },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center">
            <span className="font-mono text-xs text-[#444]">{row.label}</span>
            <span className="font-mono text-xs text-[#888]">{row.value}</span>
          </div>
        ))}
      </div>

      {/* Tx hash */}
      <div className="border border-[#1F1F1F] rounded-sm p-3">
        <p className="font-mono text-xs text-[#444] mb-2">TX_HASH</p>
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-[#555] flex-1 truncate">{txHash}</span>
          <button onClick={copyHash} className="text-xs font-mono text-[#444] hover:text-[#00FF88] transition-colors">
            {copied ? '✓' : 'COPY'}
          </button>
        </div>
      </div>

      {/* What just happened */}
      <div className="space-y-2">
        <p className="font-mono text-xs text-[#333] uppercase tracking-widest">What happened</p>
        {[
          { step: '01', text: 'Email login → Starknet wallet created by Starkzap' },
          { step: '02', text: `Income range ${proof.tierLabel} proven via Reclaim ZKP` },
          { step: '03', text: 'Borrow executed on-chain, gasless via Starkzap paymaster' },
          { step: '04', text: 'Funds in wallet. No seed phrase. No gas spent.' },
        ].map(item => (
          <div key={item.step} className="flex gap-3">
            <span className="font-mono text-xs text-[#00FF88] w-5 flex-shrink-0">{item.step}</span>
            <span className="text-xs text-[#555]">{item.text}</span>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <a
          href={`https://starkscan.co/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 btn-outline py-2.5 rounded-sm text-xs text-center block"
        >
          View on Starkscan ↗
        </a>
        <button
          onClick={() => window.location.reload()}
          className="flex-1 btn-primary py-2.5 rounded-sm text-xs"
        >
          Borrow again
        </button>
      </div>
    </div>
  )
}
