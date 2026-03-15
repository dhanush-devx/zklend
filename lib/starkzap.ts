/**
 * Starkzap Integration
 * 
 * Starkzap provides:
 * - Social login (email/Google) → auto wallet creation
 * - Gasless transactions via AA (no ETH/STRK for gas)
 * - Simple API: login → execute transactions
 * 
 * Install: npm install starkzap
 * Docs: https://github.com/keep-starknet-strange/starkzap
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StarkzapUser {
  address: string       // Starknet wallet address (auto-created)
  email?: string        // if social login via email
  provider: 'email' | 'google'
}

export interface TxCall {
  contractAddress: string
  entrypoint: string
  calldata: string[]
}

// ─── Starkzap Client ─────────────────────────────────────────────────────────


let _starkzap: any = null
export async function getStarkzap() {
  if (typeof window === 'undefined') return null

  if (!_starkzap) {
    const appId = process.env.NEXT_PUBLIC_STARKZAP_APP_ID

    if (!appId || appId === 'demo-app-id') {
      _starkzap = getMockStarkzap()
      return _starkzap
    }

    try {
      const starkzapModule = await import('starkzap')
      const StarkzapClass = starkzapModule.Starkzap || starkzapModule.default
      _starkzap = new StarkzapClass({ appId, network: 'sepolia' })
    } catch (e) {
      console.warn('Starkzap init failed, using mock:', e)
      _starkzap = getMockStarkzap()
    }
  }
  return _starkzap
}

// ─── Login ────────────────────────────────────────────────────────────────────

export async function loginWithEmail(email: string): Promise<StarkzapUser> {
  const sdk = await getStarkzap()

  // Starkzap creates/recovers wallet from email
  // No seed phrase, no gas needed
  const user = await sdk.login({ method: 'email', email })

  return {
    address: user.address,
    email: user.email,
    provider: 'email',
  }
}

export async function loginWithGoogle(): Promise<StarkzapUser> {
  const sdk = await getStarkzap()
  const user = await sdk.login({ method: 'google' })

  return {
    address: user.address,
    email: user.email,
    provider: 'google',
  }
}

// ─── Gasless Transactions ─────────────────────────────────────────────────────

/**
 * Execute a transaction gaslessly via Starkzap paymaster
 * User never needs STRK for gas — Starkzap handles it
 */
export async function executeGasless(calls: TxCall[]): Promise<string> {
  const sdk = await getStarkzap()

  const tx = await sdk.execute({
    calls: calls.map(call => ({
      contractAddress: call.contractAddress,
      entrypoint: call.entrypoint,
      calldata: call.calldata,
    })),
  })

  return tx.transaction_hash
}

// ─── Contract Calls ───────────────────────────────────────────────────────────

export const LENDING_CONTRACT = process.env.NEXT_PUBLIC_LENDING_CONTRACT || 
  '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7' // replace with deployed

export async function submitIncomeProof(
  proofBytes: string[],
  incomeTier: number  // 1=1k-2k, 2=2k-5k, 3=5k+
): Promise<string> {
  return executeGasless([{
    contractAddress: LENDING_CONTRACT,
    entrypoint: 'submit_income_proof',
    calldata: [...proofBytes, incomeTier.toString()],
  }])
}

export async function borrowTokens(
  amount: bigint,
  durationDays: number
): Promise<string> {
  return executeGasless([{
    contractAddress: LENDING_CONTRACT,
    entrypoint: 'borrow',
    calldata: [amount.toString(), durationDays.toString()],
  }])
}

export async function repayLoan(loanId: string, amount: bigint): Promise<string> {
  return executeGasless([{
    contractAddress: LENDING_CONTRACT,
    entrypoint: 'repay',
    calldata: [loanId, amount.toString()],
  }])
}

// ─── Mock (Dev/Demo) ──────────────────────────────────────────────────────────

function getMockStarkzap() {
  return {
    login: async ({ email }: any) => {
      await sleep(1500)
      return {
        address: '0x04a5b' + Math.random().toString(16).slice(2, 10) + '...f3e2',
        email,
      }
    },
    execute: async ({ calls }: any) => {
      await sleep(2000)
      return {
        transaction_hash: '0x' + Math.random().toString(16).slice(2),
      }
    },
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
