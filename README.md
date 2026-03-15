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

| Tier | Income Range | Max Borrow | LTV |
|------|-------------|------------|-----|
| 1 | ₹25k–₹50k/mo | ~500 STRK | 40% of monthly |
| 2 | ₹50k–₹1L/mo | ~1,500 STRK | 50% of monthly |
| 3 | ₹1L+/mo | ~4,000 STRK | 60% of monthly |

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
Wallet:     Starkzap (social login + gasless AA)
ZK Proofs:  Reclaim Protocol (income verification)
Contract:   Cairo 2.x (ZKLend.cairo)
Chain:      Starknet Sepolia (testnet) / Mainnet
```

---

## Project Structure

```
starkzap-lending/
├── app/
│   ├── page.tsx          # Main 3-step borrowing flow
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── StepConnect.tsx   # Starkzap social login
│   ├── StepVerify.tsx    # Reclaim ZK income proof
│   ├── StepBorrow.tsx    # Loan configuration + execution
│   └── Dashboard.tsx     # Success + loan details
├── lib/
│   ├── starkzap.ts       # Starkzap SDK wrapper
│   └── reclaim.ts        # Reclaim Protocol integration
└── contracts/
    └── ZKLend.cairo      # On-chain lending logic
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
# Install Scarb
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Build
scarb build

# Deploy (using starkli)
starkli deploy \
  ./target/dev/ZKLend.json \
  --constructor-calldata \
    <STRK_TOKEN_ADDRESS> \
    <RECLAIM_VERIFIER_ADDRESS>
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
