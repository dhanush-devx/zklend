# Setup Guide — Making Everything Real

## 1. Starkzap (Social Login + Gasless)

Starkzap uses **Cartridge Controller** for social login. No App ID needed — it works out of the box.

Just run `npm run dev` and click "Connect with Cartridge". 
A popup opens with Google / email / passkey login.

✅ **Already works — no config needed.**

---

## 2. Reclaim Protocol (ZK Income Proof)

1. Go to https://dev.reclaimprotocol.org/
2. Sign up → Create an App
3. Find an **income/salary provider** in the provider list
4. Copy your App ID, App Secret, and Provider ID

Add to `.env.local`:
```
NEXT_PUBLIC_RECLAIM_APP_ID=your-app-id
NEXT_PUBLIC_RECLAIM_APP_SECRET=your-app-secret  
NEXT_PUBLIC_RECLAIM_PROVIDER_ID=your-provider-id
```

⚠️ Without these, app runs in demo mode (mock proof). Real ZK proof needs credentials.

---

## 3. Cairo Contract (On-chain Lending)

Deploy `contracts/ZKLend.cairo` to Starknet Sepolia:

```bash
# Install Scarb
curl --proto '=https' --tlsv1.2 -sSf https://docs.swmansion.com/scarb/install.sh | sh

# Install starkli
curl https://get.starkli.sh | sh

# Get Sepolia STRK from faucet: https://faucet.starknet.io/

# Deploy
starkli deploy ./target/dev/ZKLend.json \
  --constructor-calldata \
    <STRK_SEPOLIA_ADDRESS> \
    0x0
```

Paste deployed address in `.env.local`:
```
NEXT_PUBLIC_LENDING_CONTRACT=0x...your-deployed-address
```

⚠️ Without this, borrow transactions are mocked (still shows full flow).

---

## Priority for Hackathon Demo

For judging, what matters most is the **full flow visible**:
1. ✅ Cartridge login (works now, no config)  
2. ⚡ Reclaim proof — get credentials from dev.reclaimprotocol.org
3. 🔧 Contract deployment — optional for demo, mock tx works fine

The judges care about the concept + Starkzap integration. A clean working demo beats a broken "real" one.
