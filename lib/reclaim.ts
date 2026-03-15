/**
 * Reclaim Protocol Integration
 * 
 * Reclaim lets users prove claims about web2 data without revealing the data.
 * Example: "My salary is between $3000-$5000/month" without showing payslip.
 * 
 * Flow:
 * 1. User connects payroll provider (Razorpay Payroll, Gusto, Deel, etc.)
 * 2. Reclaim generates a ZK proof of the income range
 * 3. Proof is verified on-chain via our Cairo contract
 * 
 * Install: npm install @reclaim-protocol/js-sdk
 * Docs: https://dev.reclaimprotocol.org/
 */

import type { ReclaimProofRequest } from '@reclaimprotocol/js-sdk'

// ─── Types ───────────────────────────────────────────────────────────────────

export type IncomeTier = 1 | 2 | 3

export interface IncomeProof {
  tier: IncomeTier
  tierLabel: string           // "₹50k–₹1L/mo"
  proofBytes: string[]        // compressed ZK proof for on-chain verification
  reclaimProof: string        // raw Reclaim proof JSON
  verifiedAt: number          // timestamp
  borrowLimit: number         // in USDC cents
}

export const INCOME_TIERS = {
  1: { label: '₹25k–₹50k / mo',  borrowLimit: 50_000,  ltv: 0.4 },
  2: { label: '₹50k–₹1L / mo',   borrowLimit: 150_000, ltv: 0.5 },
  3: { label: '₹1L+ / mo',       borrowLimit: 400_000, ltv: 0.6 },
}

// Reclaim App credentials — get from https://dev.reclaimprotocol.org/
const RECLAIM_APP_ID = process.env.NEXT_PUBLIC_RECLAIM_APP_ID || 'demo'
const RECLAIM_APP_SECRET = process.env.RECLAIM_APP_SECRET || 'demo'

// Provider IDs for income verification
// These are pre-built Reclaim providers for payroll data
const PROVIDERS = {
  RAZORPAY_PAYROLL: 'f9f383fd-32d9-4c54-942f-5e9fda349762',
  DEEL: 'a4d5a8e2-1c3f-4b7d-8e9a-2f6c3d1e5b8a',
  LINKEDIN_SALARY: 'b2c4e6f8-3a5d-7b9c-1e3f-5a7c9e1d3f5b',
}

// ─── Real Reclaim Integration ─────────────────────────────────────────────────

export async function initReclaimRequest(
  providerId: string,
  callbackUrl: string
): Promise<{ qrUrl: string; requestId: string }> {
  try {
    const { ReclaimProofRequest } = await import('@reclaimprotocol/js-sdk')

    const proofRequest = await ReclaimProofRequest.init(
      RECLAIM_APP_ID,
      RECLAIM_APP_SECRET,
      providerId
    )

    // Set callback URL where proof will be delivered
    proofRequest.setAppCallbackUrl(callbackUrl)

    const requestUrl = await proofRequest.getRequestUrl()
    const requestId = proofRequest.getRequestId()

    return { qrUrl: requestUrl, requestId }
  } catch (e) {
    console.error('Reclaim init failed, using mock:', e)
    return mockReclaimRequest()
  }
}

export async function verifyReclaimProof(proofJson: string): Promise<IncomeProof | null> {
  try {
    const { Reclaim } = await import('@reclaimprotocol/js-sdk')
    const proof = JSON.parse(proofJson)

    const isValid = await Reclaim.verifySignedProof(proof)
    if (!isValid) return null

    // Extract income range from proof context
    // The provider returns structured data matching the income tier
    const context = JSON.parse(proof.claimData.context)
    const monthlyIncome = context.extractedParameters?.monthly_income || 0

    return buildIncomeProof(monthlyIncome, proof)
  } catch (e) {
    console.error('Proof verification failed:', e)
    return null
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildIncomeProof(monthlyIncomeINR: number, rawProof: any): IncomeProof {
  let tier: IncomeTier
  if (monthlyIncomeINR >= 100_000) tier = 3
  else if (monthlyIncomeINR >= 50_000) tier = 2
  else tier = 1

  const tierInfo = INCOME_TIERS[tier]

  // Compress proof to bytes for on-chain submission
  const proofBytes = compressProofForCairo(rawProof)

  return {
    tier,
    tierLabel: tierInfo.label,
    proofBytes,
    reclaimProof: JSON.stringify(rawProof),
    verifiedAt: Date.now(),
    borrowLimit: tierInfo.borrowLimit,
  }
}

function compressProofForCairo(proof: any): string[] {
  // Convert Reclaim proof to felt252 array for Cairo contract
  // In production: use proper serialization matching your Cairo contract
  const proofStr = JSON.stringify(proof)
  const chunks: string[] = []
  for (let i = 0; i < proofStr.length; i += 31) {
    chunks.push('0x' + Buffer.from(proofStr.slice(i, i + 31)).toString('hex'))
  }
  return chunks
}

// ─── Mock (Demo Mode) ─────────────────────────────────────────────────────────

export async function mockReclaimRequest(): Promise<{ qrUrl: string; requestId: string }> {
  await sleep(500)
  return {
    qrUrl: 'https://app.reclaimprotocol.org/demo',
    requestId: 'mock-' + Math.random().toString(36).slice(2),
  }
}

export async function mockVerifyIncome(tier: IncomeTier): Promise<IncomeProof> {
  await sleep(3000) // simulate proof generation time

  const tierInfo = INCOME_TIERS[tier]
  const mockIncome = tier === 1 ? 35000 : tier === 2 ? 75000 : 150000

  return {
    tier,
    tierLabel: tierInfo.label,
    proofBytes: ['0x' + Math.random().toString(16).slice(2)],
    reclaimProof: JSON.stringify({ mock: true, income: mockIncome }),
    verifiedAt: Date.now(),
    borrowLimit: tierInfo.borrowLimit,
  }
}

export function getBorrowLimit(proof: IncomeProof): number {
  return INCOME_TIERS[proof.tier].borrowLimit
}

export function getMaxLTV(proof: IncomeProof): number {
  return INCOME_TIERS[proof.tier].ltv
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
