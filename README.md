# ZKLend — Income-Verified Lending on Starknet

> Borrow without overcollateralizing. Prove your income range with ZK. No wallet. No gas. No collateral.

**Built for the Starkzap Developer Challenge · March 2025**

---

## The Problem

DeFi lending is broken for real people.

- **Overcollateralized by design** — you need $150 to borrow $100. Defeats the purpose.
- **Wallet required** — most people don't have one, and onboarding kills the product before it starts.
- **Gas fees** — every transaction requires holding tokens most users don't have.
- **No credit model** — your identity, income, and history count for nothing on-chain.

TradFi works because banks can verify your income. DeFi has no equivalent. Until now.

---

## The Solution: ZKLend

ZKLend is the first income-verified lending protocol on Starknet, using:

- **Reclaim Protocol** — generates ZK proofs of income range from payroll providers (Razorpay Payroll, Deel, Gusto). Your exact salary never leaves your device.
- **Starkzap** — social login creates a Starknet wallet from your email. All transactions are gasless via Account Abstraction.
- **Cairo smart contract** — verifies income proofs on-chain, manages borrow limits and repayment logic.

**Result:** Anyone with an email and a job can borrow against their income. No seed phrase. No gas. No collateral.

---

## How It Works

```
1. Login with email
   └─ Starkzap creates Starknet AA wallet
   └─ No seed phrase, no gas needed

2. Prove income range
   └─ Connect payroll provider (Razorpay, Deel, etc.)
   └─ Reclaim Protocol generates ZK proof
   └─ Proof submitted on-chain: "earns ₹50k–₹1L/month"
   └─ Exact salary never revealed

3. Borrow
   └─ Credit limit set by income tier
   └─ Select amount + repayment duration
   └─ Gasless transaction via Starkzap paymaster
   └─ STRK disbursed instantly
```

---

## Income Tiers & Borrow Limits

| Tier | Income Range | Max Borrow |
|------|-------------|------------|
| 1 | ₹0–₹25k/mo | 10 STRK |
| 2 | ₹25k–₹50k/mo | 100 STRK |
| 3 | ₹50k+/mo | 200 STRK |

**Interest rate:** 8% APR (flat). **Duration:** 7–90 days.

---

## Why Starkzap Makes This Possible

ZKLend is only viable because of Starkzap's infrastructure:

1. **Gasless transactions** — borrowers don't need STRK for gas. Starkzap paymaster covers it. This is the critical onboarding unlock for non-crypto users.

2. **Social login wallets** — AA wallets created from email mean zero friction. Users don't need to "learn crypto" to borrow.

3. **Seamless execution** — the entire 3-step flow (login → verify → borrow) happens without the user ever touching a wallet UI or paying for gas.

Without Starkzap, this product doesn't exist. The target user — someone with a job and a phone who wants a short-term loan — would bounce at "install MetaMask."

---

## Tech Stack

```
Frontend:   Next.js 14 (App Router) + Tailwind CSS
Wallet:     Starkzap / Cartridge Controller (social login + gasless AA)
ZK Proofs:  Reclaim Protocol (income verification)
Contract:   Cairo 2.x (ZKLend.cairo) — deployed on Starknet Sepolia
Chain:      Starknet Sepolia (testnet) / Mainnet
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User's Browser                        │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │ StepConnect  │──▶│  StepVerify  │──▶│  StepBorrow  │   │
│  │              │   │              │   │              │   │
│  │  Cartridge   │   │   Reclaim    │   │  multicall   │   │
│  │  Controller  │   │   SDK        │   │  (2 calls)   │   │
│  └──────┬───────┘   └──────┬───────┘   └──────┬───────┘   │
│         │                  │                   │            │
└─────────┼──────────────────┼───────────────────┼────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
   ┌─────────────┐   ┌──────────────┐   ┌──────────────────┐
   │  Cartridge  │   │   Reclaim    │   │  ZKLend Cairo    │
   │  Controller │   │   Attestors  │   │  Contract        │
   │  (Starknet  │   │              │   │                  │
   │   AA Wallet)│   │  TLS proof   │   │ submit_income_   │
   │             │   │  of payroll  │   │ proof(tier)      │
   │  social     │   │  provider    │   │                  │
   │  login +    │   │  page →      │   │ borrow(amount,   │
   │  passkeys   │   │  income tier │   │   duration)      │
   └─────────────┘   └──────────────┘   └────────┬─────────┘
                                                  │
                                         STRK transfer
                                                  │
                                                  ▼
                                         ┌─────────────────┐
                                         │  Starkzap       │
                                         │  Paymaster      │
                                         │  (covers gas)   │
                                         └─────────────────┘
```

### Key architectural decisions

**Single multicall transaction** — `submit_income_proof` and `borrow` are executed atomically in one transaction. This prevents a race condition where the proof is submitted but the borrow fails, and saves one round-trip confirmation for the user.

**Income tier on-chain, salary off-chain** — the ZK proof establishes which tier (1/2/3) a user falls into. Only the tier integer is written to the contract. The raw income figure never touches the chain.

**Proof validity window** — income proofs expire after 30 days (`PROOF_VALIDITY = 2_592_000` seconds) on-chain. Users must re-verify to borrow again after expiry.

**Stateless frontend** — the app holds no backend. All state lives either in the user's browser session or on-chain. The Reclaim proof session is established client-side via the SDK.

---

## Reclaim Protocol Integration

Reclaim Protocol generates **TLS-based ZK proofs** — it proves that a specific HTTPS response was received from a trusted server (e.g. Razorpay Payroll, Deel, Gusto) without revealing the full response content.

### Flow

```
1. Frontend calls ReclaimProofRequest.init(APP_ID, APP_SECRET, PROVIDER_ID)
   └─ Creates a proof session on Reclaim's attestor network

2. getRequestUrl() returns a deep-link URL
   └─ Rendered as a QR code (desktop) or direct link (mobile)

3. User opens the URL on their phone
   └─ Reclaim app connects to their payroll provider
   └─ TLS session is witnessed by Reclaim attestors
   └─ ZK proof generated locally: "this response contains salary ≥ ₹X"

4. proofRequest.startSession({ onSuccess }) fires when proof is ready
   └─ verifyProof(proof) checks attestor signatures on the frontend
   └─ extractedParameterValues.monthly_income parsed → income tier assigned

5. proofBytes (felt252 array) passed to the Cairo contract via calldata
```

### Provider IDs

Find income/salary providers at [dev.reclaimprotocol.org/explore](https://dev.reclaimprotocol.org/explore). Set in `.env.local`:

```
NEXT_PUBLIC_RECLAIM_APP_ID=your-app-id
NEXT_PUBLIC_RECLAIM_APP_SECRET=your-app-secret
NEXT_PUBLIC_RECLAIM_PROVIDER_ID=your-provider-id
```

Without these, the app falls back to **demo mode** — a simulated proof flow with a mock tier selection. No real income is verified but the full borrow flow still executes on-chain.

---

## Cartridge Controller Integration

[Cartridge Controller](https://docs.cartridge.gg/) is a Starknet Account Abstraction wallet that replaces seed phrases with passkeys and social login.

### How ZKLend uses it

```typescript
// lib/starkzap.ts

const sdk = new StarkZap({ network: 'sepolia' })

// Opens a popup: Google / Twitter / email / passkey
// Auto-creates an AA wallet — no seed phrase, no gas required from user
_wallet = await sdk.connectCartridge({
  policies: [
    { target: LENDING_CONTRACT, method: 'submit_income_proof' },
    { target: LENDING_CONTRACT, method: 'borrow' },
    { target: LENDING_CONTRACT, method: 'repay' },
  ],
  feeMode: 'sponsored',  // Starkzap paymaster covers gas
})
```

**Policies** — the user pre-approves specific contract methods at login time. This means borrowing later requires zero wallet interaction — no popup, no confirmation, no gas prompt. The transaction executes silently in the background.

**Sponsored fee mode** — gas is covered by the Starkzap paymaster. The borrower needs zero STRK to interact with the protocol.

**Fallback** — if the sponsored flow is unavailable, `executeGasless` falls back to `user_pays` mode automatically.

### Why this matters

Without Cartridge, every transaction requires:
1. User has MetaMask / Argent X installed
2. User holds STRK for gas
3. User manually confirms each transaction

With Cartridge + Starkzap:
1. Login with Google
2. Done

---

## Project Structure

```
starkzap-lending/
├── app/
│   ├── page.tsx          # Main 3-step borrowing flow + state machine
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── StepConnect.tsx   # Cartridge Controller social login
│   ├── StepVerify.tsx    # Reclaim ZK income proof (real + mock fallback)
│   ├── StepBorrow.tsx    # Loan config + multicall execution
│   └── Dashboard.tsx     # Success screen + loan details
├── lib/
│   ├── starkzap.ts       # Starkzap/Cartridge SDK wrapper + contract calls
│   └── reclaim.ts        # Reclaim Protocol: proof request, session, parsing
└── contracts/
    └── src/lib.cairo     # ZKLend Cairo contract (deployed on Sepolia)
```

---

## Setup

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/starkzap-lending
cd starkzap-lending

# Install
npm install

# Configure
cp .env.example .env.local
# Add your Starkzap App ID and Reclaim credentials

# Run
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Contract Deployment (Starknet Sepolia)

```bash
# Install Scarb + Starknet Foundry
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh
curl -L https://raw.githubusercontent.com/foundry-rs/starknet-foundry/master/scripts/install.sh | sh

# Build
cd contracts
scarb build

# Declare + deploy (sncast uses Scarb's compiler — avoids CASM hash mismatch)
sncast \
  --account <YOUR_ACCOUNT> \
  --accounts-file <PATH_TO_ACCOUNTS_JSON> \
  declare \
  --url <RPC_URL> \
  --contract-name ZKLend

sncast \
  --account <YOUR_ACCOUNT> \
  --accounts-file <PATH_TO_ACCOUNTS_JSON> \
  deploy \
  --url <RPC_URL> \
  --class-hash <CLASS_HASH_FROM_DECLARE> \
  --arguments <STRK_SEPOLIA_TOKEN_ADDRESS>

# STRK token on Sepolia:
# 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

# Fund the contract (it holds the lending pool)
# Send STRK directly to the deployed contract address from any wallet
```

**Live deployment (Starknet Sepolia):**
```
Contract: 0x032ee7b733159ef554ff7689613ec3e3b5efe8860e899bee68e00e4223c5eee4
Class:    0x0054bb315cf544d1a24cf5358f270911c54d76a570acc0ddd9b0209ab16593e3
```

---

## Hackathon Submission

**Project:** ZKLend  
**Challenge:** Starkzap Developer Challenge  
**Submission deadline:** March 17, 2025  

**PR:** [keep-starknet-strange/awesome-starkzap](https://github.com/keep-starknet-strange/awesome-starkzap)  
**Demo:** [zklend.vercel.app](https://zklend.vercel.app) *(deploy to Vercel in 1 click)*

---

## Grant Application — Starknet Foundation

### Problem Statement
Undercollateralized lending is DeFi's most valuable unsolved problem. Every major TradFi product (personal loans, salary advances, BNPL) depends on income verification — but on-chain borrowers have had no equivalent path. This means DeFi lending is inaccessible to the ~4 billion people with income but without significant crypto collateral.

### Solution
ZKLend introduces a privacy-preserving income verification layer for Starknet, combining:
- Reclaim Protocol's ZK proofs for income range verification (no data leakage)
- Starkzap's AA infrastructure for zero-friction onboarding
- A Cairo contract enforcing borrow limits and repayment logic

### Why Starknet
Starknet's native Account Abstraction and low transaction costs make this the only L2 where this is economically viable at scale. The Starkzap paymaster enables truly gasless borrowing — impossible to replicate on EVM chains without significant cost.

### Market Opportunity
- 400M+ gig workers and salaried employees in India alone without access to formal credit
- ₹3.5 lakh crore ($42B) informal lending market in India
- BNPL market growing 25% YoY, entirely TradFi today

### Roadmap (with grant funding)
- **Month 1–2:** Full Reclaim verifier integration, Sepolia deployment, security audit
- **Month 3–4:** Mainnet launch, additional payroll providers (Razorpay, Salary slip OCR)
- **Month 5–6:** Repayment reputation system (on-chain credit score), lending pool mechanics
- **Month 7+:** B2B API for fintechs to integrate ZKLend as credit infrastructure

### Team
- Smart contract development (Cairo 2.x)
- Starknet ecosystem builder
- ZK proof integration (Reclaim Protocol, Circom background)

---

## License

MIT
