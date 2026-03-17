/**
 * Starkzap Integration — Real SDK
 *
 * Uses StarkZap (StarkSDK) with Cartridge Controller for social login.
 * Cartridge = passkeys + Google/email social login for Starknet.
 * feeMode: "sponsored" = gasless transactions via paymaster.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StarkzapUser {
  address: string
  username?: string
  provider: 'cartridge'
}

type FeeMode = 'sponsored' | 'user_pays'

// ─── State ────────────────────────────────────────────────────────────────────

let _sdk: any = null
let _wallet: any = null

const DEFAULT_FEE_MODE: FeeMode =
  process.env.NEXT_PUBLIC_STARKZAP_FEE_MODE === 'sponsored'
    ? 'sponsored'
    : 'user_pays'

// ─── SDK init ─────────────────────────────────────────────────────────────────

async function getSDK() {
  if (_sdk) return _sdk
  const { StarkZap } = await import('starkzap')
  _sdk = new StarkZap({ network: 'sepolia' })
  return _sdk
}

// ─── Login via Cartridge Controller ──────────────────────────────────────────
// Cartridge opens a popup: Google / Twitter / email / passkey
// Auto-creates Starknet AA wallet. feeMode sponsored = gasless.

export async function loginWithCartridge(contractAddress?: string): Promise<StarkzapUser> {
  // In demo mode there is no on-chain contract interaction; avoid SDK side effects.
  if (!contractAddress || contractAddress === '0x0') {
    return {
      address: '0x' + '1'.padStart(64, '0'),
      username: 'demo-user',
      provider: 'cartridge',
    }
  }

  const sdk = await getSDK()

  const policies = contractAddress && contractAddress !== '0x0' ? [
    { target: contractAddress, method: 'submit_income_proof' },
    { target: contractAddress, method: 'borrow' },
    { target: contractAddress, method: 'repay' },
  ] : []

  // Use direct Cartridge connection to avoid onboard auto-deploy behavior,
  // which can pass unsupported deploy overrides in some controller versions.
  _wallet = await sdk.connectCartridge({ policies, feeMode: DEFAULT_FEE_MODE })

  let username: string | undefined
  try {
    if (typeof _wallet.username === 'function') {
      username = await _wallet.username()
    }
  } catch (_) {}

  return {
    address: _wallet.address,
    username,
    provider: 'cartridge',
  }
}

// ─── Gasless Execute ──────────────────────────────────────────────────────────

export async function executeGasless(calls: {
  contractAddress: string
  entrypoint: string
  calldata: string[]
}[]): Promise<string> {
  if (!_wallet) throw new Error('Not connected. Login first.')

  if (DEFAULT_FEE_MODE === 'user_pays') {
    await _wallet.ensureReady({ deploy: 'if_needed' })
    const tx = await _wallet.execute(calls, { feeMode: 'user_pays' })
    await tx.wait()
    return tx.hash || '0x0'
  }

  let tx: any
  try {
    tx = await _wallet.execute(calls, { feeMode: 'sponsored' })
  } catch {
    // Fallback path: execute as user-pays if sponsored flow is unavailable.
    await _wallet.ensureReady({ deploy: 'if_needed' })
    tx = await _wallet.execute(calls, { feeMode: 'user_pays' })
  }
  await tx.wait()
  return tx.hash || '0x0'
}

// ─── Contract Calls ───────────────────────────────────────────────────────────

export const LENDING_CONTRACT =
  process.env.NEXT_PUBLIC_LENDING_CONTRACT || '0x0'

export function isMockMode(): boolean {
  return LENDING_CONTRACT === '0x0'
}

// Submits income proof + borrows in a single multicall transaction
export async function borrowWithProof(
  incomeTier: number,
  amount: bigint,
  durationDays: number,
): Promise<string> {
  if (isMockMode()) {
    await sleep(2000)
    return '0x' + Math.random().toString(16).slice(2).padEnd(60, '0')
  }
  return executeGasless([
    {
      contractAddress: LENDING_CONTRACT,
      entrypoint: 'submit_income_proof',
      calldata: [incomeTier.toString()],  // income_tier: u8
    },
    {
      contractAddress: LENDING_CONTRACT,
      entrypoint: 'borrow',
      calldata: [amount.toString(), '0', durationDays.toString()],  // amount: u256 (low, high), duration: u64
    },
  ])
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
