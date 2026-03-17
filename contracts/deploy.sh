#!/bin/bash
# ZKLend Contract Deployment Script
# Run from: starkzap-lending/contracts/

set -e

echo "═══════════════════════════════════════"
echo "  ZKLend Contract Deployment — Sepolia"
echo "═══════════════════════════════════════"

# STRK token address on Sepolia
STRK_SEPOLIA="0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d"

echo ""
echo "Step 1: Build contract..."
scarb build

echo ""
echo "Step 2: Declare contract class..."
CLASS_HASH=$(starkli declare \
  ./target/dev/zklend_ZKLend.contract_class.json \
  --network sepolia \
  --compiler-version 2.8.2 \
  --watch \
  2>&1 | grep "Class hash declared" | awk '{print $NF}')

echo "Class hash: $CLASS_HASH"

echo ""
echo "Step 3: Deploy contract..."
CONTRACT_ADDRESS=$(starkli deploy \
  $CLASS_HASH \
  $STRK_SEPOLIA \
  --network sepolia \
  --watch \
  2>&1 | grep "Contract deployed" | awk '{print $NF}')

echo ""
echo "═══════════════════════════════════════"
echo "✅ CONTRACT DEPLOYED"
echo "Address: $CONTRACT_ADDRESS"
echo ""
echo "Add to starkzap-lending/.env.local:"
echo "NEXT_PUBLIC_LENDING_CONTRACT=$CONTRACT_ADDRESS"
echo "═══════════════════════════════════════"
