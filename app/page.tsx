'use client'

import { useState } from 'react'
import StepConnect from '@/components/StepConnect'
import StepVerify from '@/components/StepVerify'
import StepBorrow from '@/components/StepBorrow'
import Dashboard from '@/components/Dashboard'
import type { StarkzapUser } from '@/lib/starkzap'
import type { IncomeProof } from '@/lib/reclaim'

type Step = 'connect' | 'verify' | 'borrow' | 'done'

const STEPS: Step[] = ['connect', 'verify', 'borrow', 'done']

const STEP_LABELS = {
  connect: 'Login',
  verify:  'Verify Income',
  borrow:  'Borrow',
  done:    'Done',
}

export default function Home() {
  const [step, setStep] = useState<Step>('connect')
  const [user, setUser] = useState<StarkzapUser | null>(null)
  const [proof, setProof] = useState<IncomeProof | null>(null)
  const [txHash, setTxHash] = useState('')
  const [borrowAmount, setBorrowAmount] = useState(0)

  const stepIndex = STEPS.indexOf(step)

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">

      {/* Header */}
      <header className="border-b border-[#1F1F1F] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border border-[#00FF88] flex items-center justify-center">
            <span className="text-[#00FF88] text-xs font-mono font-bold">Z</span>
          </div>
          <span className="font-display font-bold text-white text-sm tracking-wide">ZKLend</span>
          <span className="font-mono text-xs text-[#333] hidden sm:block">
            / income-verified lending on starknet
          </span>
        </div>

        {/* Starkzap badge */}
        <div className="flex items-center gap-1.5 border border-[#1F1F1F] px-2.5 py-1 rounded-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-[#00FF88] animate-pulse" />
          <span className="font-mono text-xs text-[#444]">Powered by Starkzap</span>
        </div>
      </header>

      <main className="flex-1 flex">

        {/* Left: hero panel — hidden on mobile */}
        <div className="hidden lg:flex lg:w-1/2 border-r border-[#1F1F1F] p-12 flex-col justify-between relative overflow-hidden">

          {/* Grid background */}
          <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
              backgroundImage: 'linear-gradient(#00FF88 1px, transparent 1px), linear-gradient(90deg, #00FF88 1px, transparent 1px)',
              backgroundSize: '48px 48px',
            }}
          />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 border border-[rgba(0,255,136,0.2)] px-3 py-1 rounded-sm mb-8">
              <span className="text-[#00FF88] text-xs font-mono">STARKZAP DEVELOPER CHALLENGE 2025</span>
            </div>

            <h1 className="font-display text-5xl xl:text-6xl font-extrabold text-white leading-none mb-6">
              Borrow<br/>
              without<br/>
              <span className="text-[#00FF88] glow-text">collateral.</span>
            </h1>

            <p className="text-[#555] text-lg leading-relaxed max-w-sm">
              Prove your income range with a ZK proof.
              No overcollateralization. No wallet setup.
              No gas fees.
            </p>
          </div>

          {/* Stats */}
          <div className="relative z-10 grid grid-cols-3 gap-4">
            {[
              { label: 'Collateral required', value: '0%' },
              { label: 'Gas fees', value: 'None' },
              { label: 'Data revealed', value: '0 bytes' },
            ].map(stat => (
              <div key={stat.label} className="border border-[#1F1F1F] rounded-sm p-3">
                <p className="font-display text-2xl font-bold text-[#00FF88] number-display">{stat.value}</p>
                <p className="font-mono text-xs text-[#444] mt-0.5">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Tech stack badges */}
          <div className="relative z-10">
            <p className="font-mono text-xs text-[#333] mb-3 uppercase tracking-widest">Built with</p>
            <div className="flex flex-wrap gap-2">
              {['Starkzap', 'Starknet', 'Cairo', 'Reclaim Protocol', 'Account Abstraction'].map(tech => (
                <span key={tech} className="font-mono text-xs px-2 py-1 border border-[#1F1F1F] text-[#444] rounded-sm">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right: form panel */}
        <div className="w-full lg:w-1/2 flex flex-col">

          {/* Step indicator */}
          {step !== 'done' && (
            <div className="border-b border-[#1F1F1F] px-8 py-4">
              <div className="flex items-center gap-0">
                {(['connect', 'verify', 'borrow'] as Step[]).map((s, i) => {
                  const sIdx = STEPS.indexOf(s)
                  const isComplete = stepIndex > sIdx
                  const isActive = step === s

                  return (
                    <div key={s} className="flex items-center">
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-sm flex items-center justify-center transition-all ${
                          isComplete
                            ? 'bg-[rgba(0,255,136,0.15)] border border-[rgba(0,255,136,0.4)]'
                            : isActive
                            ? 'border border-[rgba(0,255,136,0.6)]'
                            : 'border border-[#1F1F1F]'
                        }`}>
                          {isComplete ? (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#00FF88" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          ) : (
                            <span className={`font-mono text-xs ${isActive ? 'text-[#00FF88]' : 'text-[#333]'}`}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span className={`font-mono text-xs ${
                          isActive ? 'text-[#888]' : isComplete ? 'text-[#555]' : 'text-[#333]'
                        }`}>
                          {STEP_LABELS[s]}
                        </span>
                      </div>
                      {i < 2 && (
                        <div className={`w-12 h-px mx-3 ${stepIndex > sIdx ? 'bg-[rgba(0,255,136,0.2)]' : 'bg-[#1F1F1F]'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Form content */}
          <div className="flex-1 flex items-start justify-center p-6 sm:p-8 lg:p-12">
            <div className="w-full max-w-md">

              {step === 'connect' && (
                <StepConnect
                  onComplete={(u) => {
                    setUser(u)
                    setStep('verify')
                  }}
                />
              )}

              {step === 'verify' && (
                <StepVerify
                  onComplete={(p) => {
                    setProof(p)
                    setStep('borrow')
                  }}
                />
              )}

              {step === 'borrow' && user && proof && (
                <StepBorrow
                  user={user}
                  proof={proof}
                  onComplete={(txHash) => {
                    setTxHash(txHash)
                    setStep('done')
                  }}
                />
              )}

              {step === 'done' && user && proof && (
                <Dashboard
                  txHash={txHash}
                  user={user}
                  proof={proof}
                  amount={borrowAmount || Math.floor(proof.borrowLimit * 0.3)}
                  duration={30}
                />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
