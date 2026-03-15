'use client'

import { useState, useEffect } from 'react'
import { mockVerifyIncome, INCOME_TIERS, type IncomeProof, type IncomeTier } from '@/lib/reclaim'

interface Props {
  onComplete: (proof: IncomeProof) => void
}

type VerifyState = 'select' | 'scanning' | 'complete'

export default function StepVerify({ onComplete }: Props) {
  const [state, setState] = useState<VerifyState>('select')
  const [selectedTier, setSelectedTier] = useState<IncomeTier | null>(null)
  const [scanProgress, setScanProgress] = useState(0)
  const [proof, setProof] = useState<IncomeProof | null>(null)

  async function startVerification(tier: IncomeTier) {
    setSelectedTier(tier)
    setState('scanning')
    setScanProgress(0)

    // Simulate scan progress while Reclaim generates proof
    const interval = setInterval(() => {
      setScanProgress(p => {
        if (p >= 90) { clearInterval(interval); return 90 }
        return p + Math.random() * 15
      })
    }, 300)

    try {
      // In production: use real Reclaim proof
      // For demo: mock the ZK proof generation
      const result = await mockVerifyIncome(tier)
      clearInterval(interval)
      setScanProgress(100)
      setProof(result)
      setState('complete')
    } catch (e) {
      clearInterval(interval)
      setState('select')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-xs text-[#444]">STEP_02</span>
          <span className="w-8 h-px bg-[#1F1F1F]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-white">
          Verify income — without revealing it
        </h2>
        <p className="text-sm text-[#666] mt-1">
          Reclaim Protocol generates a ZK proof of your income range.
          The exact number never leaves your device.
        </p>
      </div>

      {state === 'select' && (
        <SelectTier onSelect={startVerification} />
      )}

      {state === 'scanning' && (
        <ScanningState progress={scanProgress} tier={selectedTier!} />
      )}

      {state === 'complete' && proof && (
        <CompleteState proof={proof} onContinue={() => onComplete(proof)} />
      )}
    </div>
  )
}

// ─── Select Income Tier ───────────────────────────────────────────────────────

function SelectTier({ onSelect }: { onSelect: (t: IncomeTier) => void }) {
  const [selected, setSelected] = useState<IncomeTier | null>(null)

  const tiers = [
    { tier: 1 as IncomeTier, range: '₹25k–₹50k/mo', usd: '$300–600', borrow: '₹41,667', icon: '◈' },
    { tier: 2 as IncomeTier, range: '₹50k–₹1L/mo',  usd: '$600–1.2k', borrow: '₹1,25,000', icon: '◈◈' },
    { tier: 3 as IncomeTier, range: '₹1L+/mo',       usd: '$1.2k+', borrow: '₹3,33,333', icon: '◈◈◈' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-[#444] uppercase tracking-widest">
        Select your income range
      </p>

      <div className="space-y-2">
        {tiers.map(({ tier, range, usd, borrow, icon }) => (
          <button
            key={tier}
            onClick={() => setSelected(tier)}
            className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
              selected === tier
                ? 'border-[rgba(0,255,136,0.5)] bg-[rgba(0,255,136,0.05)]'
                : 'border-[#1F1F1F] hover:border-[#333]'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#00FF88] text-xs">{icon}</span>
                  <span className="font-mono text-sm text-white">{range}</span>
                  <span className="font-mono text-xs text-[#444]">≈ {usd}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-[#555]">Max borrow:</span>
                  <span className="font-mono text-xs text-[#888]">{borrow}</span>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full border transition-all ${
                selected === tier
                  ? 'border-[#00FF88] bg-[#00FF88]'
                  : 'border-[#333]'
              }`} />
            </div>
          </button>
        ))}
      </div>

      {/* Proof source */}
      <div className="border border-[#1F1F1F] rounded-sm p-3">
        <p className="text-xs text-[#444] font-mono mb-2">VERIFIED VIA</p>
        <div className="flex gap-2 flex-wrap">
          {['Razorpay Payroll', 'Gusto', 'Deel', 'Salary slip PDF'].map(p => (
            <span key={p} className="text-xs px-2 py-0.5 border border-[#1F1F1F] rounded-sm text-[#555]">{p}</span>
          ))}
        </div>
      </div>

      <button
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
        className="btn-primary w-full py-3 rounded-sm text-sm"
      >
        Generate ZK Proof →
      </button>
    </div>
  )
}

// ─── Scanning State ───────────────────────────────────────────────────────────

function ScanningState({ progress, tier }: { progress: number; tier: IncomeTier }) {
  const tierInfo = INCOME_TIERS[tier]
  const [logLines, setLogLines] = useState<string[]>([
    '> Connecting to Reclaim Protocol...',
  ])

  useEffect(() => {
    const logs = [
      '> Fetching income data from provider...',
      '> Generating witness...',
      '> Computing ZK circuit...',
      '> Verifying proof integrity...',
      '> Proof valid. Compressing...',
    ]

    logs.forEach((log, i) => {
      setTimeout(() => {
        setLogLines(prev => [...prev, log])
      }, 600 * (i + 1))
    })
  }, [])

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="font-mono text-xs text-[#444]">GENERATING_PROOF</span>
          <span className="font-mono text-xs text-[#00FF88]">{Math.floor(progress)}%</span>
        </div>
        <div className="h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#00FF88] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Terminal log */}
      <div className="proof-scan bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 h-36 overflow-hidden font-mono text-xs">
        {logLines.map((line, i) => (
          <div
            key={i}
            className="text-[#444] leading-relaxed"
            style={{
              color: i === logLines.length - 1 ? '#00FF88' : undefined,
              opacity: Math.max(0.3, 1 - (logLines.length - 1 - i) * 0.2),
            }}
          >
            {line}
          </div>
        ))}
        {progress < 100 && (
          <span className="text-[#00FF88] animate-pulse">█</span>
        )}
      </div>

      {/* What's happening */}
      <p className="text-xs text-[#444]">
        Your income data is being processed locally. The ZK proof proves 
        you're in the <span className="text-[#888]">{tierInfo.label}</span> range 
        without revealing your exact salary.
      </p>
    </div>
  )
}

// ─── Complete State ───────────────────────────────────────────────────────────

function CompleteState({ proof, onContinue }: { proof: IncomeProof; onContinue: () => void }) {
  const tierInfo = INCOME_TIERS[proof.tier]

  return (
    <div className="space-y-4">
      {/* Success */}
      <div className="border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.04)] rounded-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full border border-[#00FF88] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="font-mono text-sm text-[#00FF88] font-medium">Proof verified</p>
            <p className="text-xs text-[#666] mt-0.5">
              Income range {proof.tierLabel} confirmed. Exact amount hidden.
            </p>
          </div>
        </div>
      </div>

      {/* Proof details */}
      <div className="border border-[#1F1F1F] rounded-sm divide-y divide-[#1F1F1F]">
        {[
          { label: 'INCOME_RANGE', value: proof.tierLabel, color: '#00FF88' },
          { label: 'BORROW_LIMIT', value: `₹${(proof.borrowLimit).toLocaleString()}`, color: '#E8E8E8' },
          { label: 'PROOF_TYPE', value: 'Reclaim ZKP', color: '#888' },
          { label: 'VERIFIED_AT', value: new Date(proof.verifiedAt).toLocaleTimeString(), color: '#888' },
          { label: 'EXACT_SALARY', value: '██████ (hidden)', color: '#333' },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center px-3 py-2">
            <span className="font-mono text-xs text-[#444]">{row.label}</span>
            <span className="font-mono text-xs" style={{ color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="btn-primary w-full py-3 rounded-sm text-sm"
      >
        Proceed to Borrow →
      </button>
    </div>
  )
}
