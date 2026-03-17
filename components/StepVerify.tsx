'use client'

import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  createIncomeProofRequest,
  waitForProof,
  mockVerifyIncome,
  isReclaimConfigured,
  INCOME_TIERS,
  type IncomeProof,
  type IncomeTier,
} from '@/lib/reclaim'
import type { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'

interface Props {
  onComplete: (proof: IncomeProof) => void
}

type State = 'select' | 'qr' | 'scanning' | 'complete'

export default function StepVerify({ onComplete }: Props) {
  const [state, setState] = useState<State>('select')
  const [selectedTier, setSelectedTier] = useState<IncomeTier | null>(null)
  const [verifyUrl, setVerifyUrl] = useState('')
  const [proof, setProof] = useState<IncomeProof | null>(null)
  const [error, setError] = useState('')
  const [proofRequest, setProofRequest] = useState<ReclaimProofRequest | null>(null)

  const configured = isReclaimConfigured()

  async function startVerification(tier: IncomeTier) {
    setSelectedTier(tier)
    setError('')

    if (!configured) {
      // No Reclaim credentials — use mock flow
      setState('scanning')
      try {
        const result = await mockVerifyIncome(tier)
        setProof(result)
        setState('complete')
      } catch (e: any) {
        setError(e.message)
        setState('select')
      }
      return
    }

    // Real Reclaim flow
    setState('qr')
    try {
      // Use a generic income provider — replace INCOME_PROVIDERS.GENERIC with real provider ID
      const { requestUrl, proofRequest: req } = await createIncomeProofRequest(
        process.env.NEXT_PUBLIC_RECLAIM_PROVIDER_ID || 'YOUR_PROVIDER_ID'
      )
      setVerifyUrl(requestUrl)
      setProofRequest(req)

      // Listen for proof completion
      await waitForProof(
        req,
        (incomeProof) => {
          setProof(incomeProof)
          setState('complete')
        },
        (err) => {
          setError(err.message)
          setState('select')
        }
      )
    } catch (e: any) {
      setError(e.message)
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
          {configured
            ? 'Reclaim Protocol generates a ZK proof of your income range from your payroll provider.'
            : 'Demo mode — Reclaim credentials not configured. Add them to .env.local for live proofs.'}
        </p>
        {!configured && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#FFB800] font-mono border border-[rgba(255,184,0,0.2)] bg-[rgba(255,184,0,0.05)] px-3 py-2 rounded-sm">
            <span>⚠</span>
            <span>DEMO_MODE — Add NEXT_PUBLIC_RECLAIM_APP_ID to .env.local</span>
          </div>
        )}
      </div>

      {state === 'select' && <SelectTier onSelect={startVerification} />}
      {state === 'qr' && verifyUrl && <QRState url={verifyUrl} tier={selectedTier!} />}
      {state === 'scanning' && <ScanningState tier={selectedTier!} />}
      {state === 'complete' && proof && (
        <CompleteState proof={proof} onContinue={() => onComplete(proof)} />
      )}

      {error && (
        <p className="text-xs text-[#FF3B5C] font-mono border border-[rgba(255,59,92,0.2)] px-3 py-2 rounded-sm">
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Tier Selection ───────────────────────────────────────────────────────────

function SelectTier({ onSelect }: { onSelect: (t: IncomeTier) => void }) {
  const [selected, setSelected] = useState<IncomeTier | null>(null)

  const tiers = [
    { tier: 1 as IncomeTier, range: '₹0–₹25k/mo',   borrow: '10 STRK',  icon: '◈' },
    { tier: 2 as IncomeTier, range: '₹25k–₹50k/mo', borrow: '100 STRK', icon: '◈◈' },
    { tier: 3 as IncomeTier, range: '₹50k+/mo',      borrow: '200 STRK', icon: '◈◈◈' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-xs font-mono text-[#444] uppercase tracking-widest">Select your income range</p>
      <div className="space-y-2">
        {tiers.map(({ tier, range, borrow, icon }) => (
          <button key={tier} onClick={() => setSelected(tier)}
            className={`w-full text-left p-4 rounded-sm border transition-all duration-200 ${
              selected === tier
                ? 'border-[rgba(0,255,136,0.5)] bg-[rgba(0,255,136,0.05)]'
                : 'border-[#1F1F1F] hover:border-[#333]'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[#00FF88] text-xs">{icon}</span>
                  <span className="font-mono text-sm text-white">{range}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs text-[#555]">Max borrow:</span>
                  <span className="font-mono text-xs text-[#888]">{borrow}</span>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full border transition-all ${
                selected === tier ? 'border-[#00FF88] bg-[#00FF88]' : 'border-[#333]'
              }`} />
            </div>
          </button>
        ))}
      </div>

      <button onClick={() => selected && onSelect(selected)} disabled={!selected}
        className="btn-primary w-full py-3 rounded-sm text-sm">
        Generate ZK Proof →
      </button>
    </div>
  )
}

// ─── QR Code State (real Reclaim) ─────────────────────────────────────────────

function QRState({ url, tier }: { url: string; tier: IncomeTier }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="space-y-4">
      <div className="border border-[rgba(0,255,136,0.2)] bg-[rgba(0,255,136,0.03)] rounded-sm p-4 text-center space-y-4">
        <p className="font-mono text-xs text-[#00FF88]">SCAN TO VERIFY INCOME</p>

        {/* QR Code */}
        <div className="flex justify-center">
          <div className="bg-white p-3 rounded-sm">
            <QRCodeSVG value={url} size={180} level="M" />
          </div>
        </div>

        <p className="text-xs text-[#555]">
          Scan with your phone. Connect your payroll provider.
          Proof is generated locally — your salary stays private.
        </p>

        {/* Or open link */}
        <div className="flex gap-2">
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex-1 btn-outline py-2 rounded-sm text-xs text-center">
            Open on this device ↗
          </a>
          <button onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="btn-outline px-3 py-2 rounded-sm text-xs">
            {copied ? '✓' : 'Copy'}
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-[#FFB800] animate-pulse" />
        <span className="font-mono text-xs text-[#555]">Waiting for proof from Reclaim...</span>
      </div>
    </div>
  )
}

// ─── Scanning / Mock state ────────────────────────────────────────────────────

function ScanningState({ tier }: { tier: IncomeTier }) {
  const [logs, setLogs] = useState(['> Initializing Reclaim proof session...'])
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const lines = [
      '> Fetching income data from provider...',
      '> Generating ZK witness...',
      '> Computing circuit constraints...',
      '> Verifying proof integrity...',
      '> Compressing for on-chain submission...',
    ]
    lines.forEach((line, i) => {
      setTimeout(() => setLogs(p => [...p, line]), 600 * (i + 1))
    })
    const interval = setInterval(() => {
      setProgress(p => p >= 95 ? 95 : p + Math.random() * 18)
    }, 400)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="font-mono text-xs text-[#444]">GENERATING_PROOF</span>
        <span className="font-mono text-xs text-[#00FF88]">{Math.floor(progress)}%</span>
      </div>
      <div className="h-1 bg-[#1F1F1F] rounded-full overflow-hidden">
        <div className="h-full bg-[#00FF88] transition-all duration-300" style={{ width: `${progress}%` }} />
      </div>
      <div className="proof-scan bg-[#0A0A0A] border border-[#1F1F1F] rounded-sm p-4 h-36 overflow-hidden font-mono text-xs">
        {logs.map((line, i) => (
          <div key={i} className="leading-relaxed"
            style={{ color: i === logs.length - 1 ? '#00FF88' : '#444',
              opacity: Math.max(0.3, 1 - (logs.length - 1 - i) * 0.2) }}>
            {line}
          </div>
        ))}
        <span className="text-[#00FF88] animate-pulse">█</span>
      </div>
    </div>
  )
}

// ─── Complete State ───────────────────────────────────────────────────────────

function CompleteState({ proof, onContinue }: { proof: IncomeProof; onContinue: () => void }) {
  return (
    <div className="space-y-4">
      <div className="border border-[rgba(0,255,136,0.3)] bg-[rgba(0,255,136,0.04)] rounded-sm p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full border border-[#00FF88] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          </div>
          <div>
            <p className="font-mono text-sm text-[#00FF88] font-medium">
              {proof.isMock ? 'Demo proof generated' : 'ZK proof verified'}
            </p>
            <p className="text-xs text-[#666] mt-0.5">
              Income range {proof.tierLabel} confirmed. Exact amount hidden.
            </p>
          </div>
        </div>
      </div>

      <div className="border border-[#1F1F1F] rounded-sm divide-y divide-[#1F1F1F]">
        {[
          { label: 'INCOME_RANGE',  value: proof.tierLabel,                             color: '#00FF88' },
          { label: 'BORROW_LIMIT',  value: `${proof.borrowLimit} STRK`,                 color: '#E8E8E8' },
          { label: 'PROOF_TYPE',    value: proof.isMock ? 'Demo (mock)' : 'Reclaim ZKP', color: '#888' },
          { label: 'EXACT_SALARY',  value: '██████ (hidden)',                             color: '#333' },
        ].map(row => (
          <div key={row.label} className="flex justify-between items-center px-3 py-2">
            <span className="font-mono text-xs text-[#444]">{row.label}</span>
            <span className="font-mono text-xs" style={{ color: row.color }}>{row.value}</span>
          </div>
        ))}
      </div>

      <button onClick={onContinue} className="btn-primary w-full py-3 rounded-sm text-sm">
        Proceed to Borrow →
      </button>
    </div>
  )
}
