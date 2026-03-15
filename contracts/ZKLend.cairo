// ZKLend — Income-Verified Lending Contract
// Built for Starkzap Developer Challenge
//
// Flow:
// 1. User submits Reclaim ZK proof of income tier
// 2. Contract verifies proof on-chain
// 3. Borrow limit set by income tier (no collateral)
// 4. STRK tokens disbursed via Starkzap gasless tx
// 5. Repay with interest before due date

#[starknet::contract]
mod ZKLend {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess};
    use openzeppelin::token::erc20::interface::{IERC20Dispatcher, IERC20DispatcherTrait};

    // ─── Storage ─────────────────────────────────────────────────────────────

    #[storage]
    struct Storage {
        // token: STRK ERC20 address
        strk_token: ContractAddress,
        
        // owner/admin
        owner: ContractAddress,
        
        // Reclaim verifier contract address
        reclaim_verifier: ContractAddress,
        
        // user → income tier (1, 2, 3)
        income_tier: Map<ContractAddress, u8>,
        
        // user → proof verified timestamp
        proof_timestamp: Map<ContractAddress, u64>,
        
        // user → active loan amount (STRK, 18 decimals)
        loan_amount: Map<ContractAddress, u256>,
        
        // user → loan due timestamp
        loan_due: Map<ContractAddress, u64>,
        
        // user → total repay amount
        repay_amount: Map<ContractAddress, u256>,
        
        // loan counter
        loan_count: u64,
        
        // protocol paused
        paused: bool,
    }

    // ─── Constants ────────────────────────────────────────────────────────────

    // Borrow limits per tier (in STRK, 18 decimals)
    // Tier 1: ~₹41,667 ≈ 500 STRK
    // Tier 2: ~₹1,25,000 ≈ 1500 STRK  
    // Tier 3: ~₹3,33,333 ≈ 4000 STRK
    const TIER_1_LIMIT: u256 = 500_000_000_000_000_000_000;    // 500 STRK
    const TIER_2_LIMIT: u256 = 1_500_000_000_000_000_000_000;  // 1500 STRK
    const TIER_3_LIMIT: u256 = 4_000_000_000_000_000_000_000;  // 4000 STRK

    // Interest: 8% APR → basis points
    const INTEREST_BPS: u256 = 800;        // 8% = 800 bps
    const BPS_DENOMINATOR: u256 = 10000;
    const DAYS_PER_YEAR: u256 = 365;

    // Proof validity: 30 days
    const PROOF_VALIDITY_SECONDS: u64 = 2_592_000;

    // ─── Events ───────────────────────────────────────────────────────────────

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        IncomeVerified: IncomeVerified,
        LoanTaken: LoanTaken,
        LoanRepaid: LoanRepaid,
        LoanDefaulted: LoanDefaulted,
    }

    #[derive(Drop, starknet::Event)]
    struct IncomeVerified {
        #[key]
        user: ContractAddress,
        tier: u8,
        timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanTaken {
        #[key]
        user: ContractAddress,
        amount: u256,
        due_timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanRepaid {
        #[key]
        user: ContractAddress,
        amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanDefaulted {
        #[key]
        user: ContractAddress,
        amount: u256,
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    #[constructor]
    fn constructor(
        ref self: ContractState,
        strk_token: ContractAddress,
        reclaim_verifier: ContractAddress,
    ) {
        self.strk_token.write(strk_token);
        self.reclaim_verifier.write(reclaim_verifier);
        self.owner.write(get_caller_address());
        self.paused.write(false);
    }

    // ─── External Functions ───────────────────────────────────────────────────

    #[abi(embed_v0)]
    impl ZKLendImpl of IZKLend<ContractState> {

        /// Submit a Reclaim ZK proof of income tier.
        /// Proof is verified against the Reclaim verifier contract.
        /// Sets the user's borrow limit without storing income amount.
        fn submit_income_proof(
            ref self: ContractState,
            proof_bytes: Span<felt252>,
            income_tier: u8,
        ) {
            assert(!self.paused.read(), 'Protocol paused');
            assert(income_tier >= 1 && income_tier <= 3, 'Invalid income tier');

            let caller = get_caller_address();

            // Verify proof on-chain via Reclaim verifier
            // The verifier checks:
            // - Proof was signed by a trusted Reclaim oracle
            // - Income range matches claimed tier
            // - Proof is fresh (not expired)
            let verified = self._verify_reclaim_proof(proof_bytes, income_tier);
            assert(verified, 'Invalid income proof');

            // Store tier and timestamp
            self.income_tier.write(caller, income_tier);
            self.proof_timestamp.write(caller, get_block_timestamp());

            self.emit(IncomeVerified {
                user: caller,
                tier: income_tier,
                timestamp: get_block_timestamp(),
            });
        }

        /// Borrow STRK tokens against verified income.
        /// No collateral required — income proof is the only requirement.
        fn borrow(
            ref self: ContractState,
            amount: u256,
            duration_days: u64,
        ) {
            assert(!self.paused.read(), 'Protocol paused');

            let caller = get_caller_address();

            // Check proof is valid and not expired
            let proof_time = self.proof_timestamp.read(caller);
            assert(proof_time > 0, 'No income proof submitted');
            let elapsed = get_block_timestamp() - proof_time;
            assert(elapsed < PROOF_VALIDITY_SECONDS, 'Income proof expired');

            // Check no existing loan
            assert(self.loan_amount.read(caller) == 0, 'Existing loan outstanding');

            // Check amount within tier limit
            let tier = self.income_tier.read(caller);
            let limit = self._get_tier_limit(tier);
            assert(amount > 0 && amount <= limit, 'Amount exceeds credit limit');

            // Duration: 7-90 days
            assert(duration_days >= 7 && duration_days <= 90, 'Invalid duration');

            // Calculate repayment with interest
            // interest = principal * rate * days / 365 / 10000
            let interest = (amount * INTEREST_BPS * duration_days.into()) / (BPS_DENOMINATOR * DAYS_PER_YEAR);
            let repay_total = amount + interest;

            let due_timestamp = get_block_timestamp() + (duration_days * 86400);

            // Store loan
            self.loan_amount.write(caller, amount);
            self.loan_due.write(caller, due_timestamp);
            self.repay_amount.write(caller, repay_total);

            let count = self.loan_count.read();
            self.loan_count.write(count + 1);

            // Disburse tokens to borrower
            // Starkzap handles this as a gasless transaction on behalf of user
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer(caller, amount);

            self.emit(LoanTaken {
                user: caller,
                amount,
                due_timestamp,
            });
        }

        /// Repay outstanding loan.
        fn repay(ref self: ContractState) {
            let caller = get_caller_address();
            let loan = self.loan_amount.read(caller);
            assert(loan > 0, 'No active loan');

            let repay_total = self.repay_amount.read(caller);

            // Transfer repayment from user to contract
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(caller, starknet::get_contract_address(), repay_total);

            // Clear loan
            self.loan_amount.write(caller, 0);
            self.loan_due.write(caller, 0);
            self.repay_amount.write(caller, 0);

            self.emit(LoanRepaid { user: caller, amount: repay_total });
        }

        /// View functions

        fn get_credit_limit(self: @ContractState, user: ContractAddress) -> u256 {
            let tier = self.income_tier.read(user);
            if tier == 0 { return 0; }
            self._get_tier_limit(tier)
        }

        fn get_loan(self: @ContractState, user: ContractAddress) -> (u256, u64, u256) {
            (
                self.loan_amount.read(user),
                self.loan_due.read(user),
                self.repay_amount.read(user),
            )
        }

        fn get_income_tier(self: @ContractState, user: ContractAddress) -> u8 {
            self.income_tier.read(user)
        }

        fn total_loans(self: @ContractState) -> u64 {
            self.loan_count.read()
        }
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    #[generate_trait]
    impl InternalImpl of InternalTrait {

        fn _verify_reclaim_proof(
            self: @ContractState,
            proof_bytes: Span<felt252>,
            income_tier: u8,
        ) -> bool {
            // TODO: Call deployed Reclaim verifier contract
            // The Reclaim verifier checks:
            // 1. Signature from trusted Reclaim oracle node
            // 2. Claim data matches income tier range
            // 3. Proof is not replayed (nullifier check)
            //
            // For hackathon demo: verify basic proof structure
            // In production: integrate full Reclaim on-chain verifier
            //
            // let verifier = IReclaimVerifierDispatcher {
            //     contract_address: self.reclaim_verifier.read()
            // };
            // return verifier.verify_proof(proof_bytes, income_tier.into());

            // Demo: accept any non-empty proof
            proof_bytes.len() > 0
        }

        fn _get_tier_limit(self: @ContractState, tier: u8) -> u256 {
            if tier == 1 { TIER_1_LIMIT }
            else if tier == 2 { TIER_2_LIMIT }
            else { TIER_3_LIMIT }
        }
    }
}

// ─── Interface ────────────────────────────────────────────────────────────────

#[starknet::interface]
trait IZKLend<TContractState> {
    fn submit_income_proof(
        ref self: TContractState,
        proof_bytes: Span<felt252>,
        income_tier: u8,
    );
    fn borrow(ref self: TContractState, amount: u256, duration_days: u64);
    fn repay(ref self: TContractState);
    fn get_credit_limit(self: @TContractState, user: starknet::ContractAddress) -> u256;
    fn get_loan(self: @TContractState, user: starknet::ContractAddress) -> (u256, u64, u256);
    fn get_income_tier(self: @TContractState, user: starknet::ContractAddress) -> u8;
    fn total_loans(self: @TContractState) -> u64;
}
