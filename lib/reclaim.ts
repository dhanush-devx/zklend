/**
 * Reclaim Protocol Integration — Real SDK
 *
 * Flow:
 * 1. init() → creates a proof request session
 * 2. getVerificationUrl() → URL to open (QR on desktop, redirect on mobile)
 * 3. startSession() → polls for proof completion
 * 4. verifyProof() → verify signature on frontend
 * 5. transformForOnchain() → convert to felt252 array for Cairo
 *
 * Get credentials: https://dev.reclaimprotocol.org/
 * npm install @reclaimprotocol/js-sdk
 */

import { ReclaimProofRequest, verifyProof, transformForOnchain } from '@reclaimprotocol/js-sdk'
import type { Proof } from '@reclaimprotocol/js-sdk'

// ─── Types ───────────────────────────────────────────────────────────────────

export type IncomeTier = 1 | 2 | 3

export interface IncomeProof {
  tier: IncomeTier
  tierLabel: string
  borrowLimit: number
  proofBytes: string[]
  rawProof: Proof | null
  verifiedAt: number
  isMock: boolean
}

export const INCOME_TIERS = {
  1: { label: '₹0–₹25k / mo',   borrowLimit: 10 },
  2: { label: '₹25k–₹50k / mo', borrowLimit: 100 },
  3: { label: '₹50k+ / mo',     borrowLimit: 200 },
}

// ─── Reclaim App Config ───────────────────────────────────────────────────────
// Get from https://dev.reclaimprotocol.org/
// Provider IDs for salary verification (use real ones from Reclaim dashboard)

const APP_ID     = process.env.NEXT_PUBLIC_RECLAIM_APP_ID || ''
const APP_SECRET = process.env.NEXT_PUBLIC_RECLAIM_APP_SECRET || ''

// Provider IDs — find salary/income providers in Reclaim dashboard
// These are examples; check https://dev.reclaimprotocol.org/explore for current ones
export const INCOME_PROVIDERS = {
  LINKEDIN:  '6d3f6753-7ee6-49ee-a545-62f1b1822ae5', // LinkedIn salary (example)
  RAZORPAY:  'f9f383fd-32d9-4c54-942f-5e9fda349762', // Razorpay Payroll (example)
  GENERIC:   'YOUR_PROVIDER_ID',                       // Replace with real provider ID
}

// ─── Real Reclaim Flow ────────────────────────────────────────────────────────

export async function createIncomeProofRequest(providerId: string): Promise<{
  requestUrl: string
  proofRequest: ReclaimProofRequest
}> {
  if (!APP_ID || !APP_SECRET) {
    throw new Error('NEXT_PUBLIC_RECLAIM_APP_ID and NEXT_PUBLIC_RECLAIM_APP_SECRET required in .env.local')
  }

  const proofRequest = await ReclaimProofRequest.init(APP_ID, APP_SECRET, providerId, {
    log: false,
    acceptAiProviders: true,
  })

  const requestUrl = await proofRequest.getRequestUrl()
  return { requestUrl, proofRequest }
}

export async function waitForProof(
  proofRequest: ReclaimProofRequest,
  onSuccess: (proof: IncomeProof) => void,
  onError: (err: Error) => void
): Promise<void> {
  await proofRequest.startSession({
    onSuccess: async (rawProof) => {
      try {
        const proof = Array.isArray(rawProof) ? rawProof[0] : rawProof
        if (!proof) throw new Error('No proof received')

        // Verify signature
        const valid = await verifyProof(proof)
        if (!valid) throw new Error('Proof signature invalid')

        // Parse income from proof context
        const incomeProof = parseIncomeFromProof(proof)
        onSuccess(incomeProof)
      } catch (e: any) {
        onError(e)
      }
    },
    onError,
  })
}

// ─── Parse proof → income tier ────────────────────────────────────────────────

function parseIncomeFromProof(proof: Proof): IncomeProof {
  // Extract income from proof's extractedParameterValues
  // The exact field depends on which Reclaim provider you use
  // Common fields: monthly_income, salary, income_range
  const params = proof.extractedParameterValues || {}
  const rawIncome = params.monthly_income || params.salary || params.income || '0'
  const monthlyIncome = parseFloat(String(rawIncome).replace(/[^0-9.]/g, '')) || 0

  let tier: IncomeTier
  if (monthlyIncome >= 50_000) tier = 3
  else if (monthlyIncome >= 25_000) tier = 2
  else tier = 1

  // Convert proof to felt252 array for Cairo contract
  let proofBytes: string[] = []
  try {
    const onchainData = transformForOnchain(proof)
    proofBytes = Array.isArray(onchainData)
      ? onchainData.map(String)
      : Object.values(onchainData as Record<string, unknown>).map(String)
  } catch (_) {
    proofBytes = [proof.identifier || '0x0']
  }

  return {
    tier,
    tierLabel: INCOME_TIERS[tier].label,
    borrowLimit: INCOME_TIERS[tier].borrowLimit,
    proofBytes,
    rawProof: proof,
    verifiedAt: Date.now(),
    isMock: false,
  }
}

// ─── Mock fallback (when no Reclaim credentials) ─────────────────────────────

export function isReclaimConfigured(): boolean {
  return !!(APP_ID && APP_SECRET && APP_ID !== '' && APP_SECRET !== '')
}

export async function mockVerifyIncome(tier: IncomeTier): Promise<IncomeProof> {
  await sleep(3500)
  return {
    tier,
    tierLabel: INCOME_TIERS[tier].label,
    borrowLimit: INCOME_TIERS[tier].borrowLimit,
    proofBytes: ['0x' + Math.random().toString(16).slice(2)],
    rawProof: null,
    verifiedAt: Date.now(),
    isMock: true,
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
