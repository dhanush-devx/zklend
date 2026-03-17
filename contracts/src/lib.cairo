use starknet::ContractAddress;

// ─── ERC20 Interface (inlined — no OZ dependency needed) ─────────────────────

#[starknet::interface]
trait IERC20<TContractState> {
    fn transfer(ref self: TContractState, recipient: ContractAddress, amount: u256) -> bool;
    fn transfer_from(ref self: TContractState, sender: ContractAddress, recipient: ContractAddress, amount: u256) -> bool;
    fn balance_of(self: @TContractState, account: ContractAddress) -> u256;
}

// ─── ZKLend Interface ─────────────────────────────────────────────────────────

#[starknet::interface]
trait IZKLend<TContractState> {
    fn submit_income_proof(ref self: TContractState, income_tier: u8);
    fn borrow(ref self: TContractState, amount: u256, duration_days: u64);
    fn repay(ref self: TContractState);
    fn get_credit_limit(self: @TContractState, user: ContractAddress) -> u256;
    fn get_loan(self: @TContractState, user: ContractAddress) -> (u256, u64, u256);
    fn get_income_tier(self: @TContractState, user: ContractAddress) -> u8;
    fn total_loans(self: @TContractState) -> u64;
}

// ─── Contract ─────────────────────────────────────────────────────────────────

#[starknet::contract]
mod ZKLend {
    use starknet::{ContractAddress, get_caller_address, get_block_timestamp, get_contract_address};
    use starknet::storage::{StoragePointerReadAccess, StoragePointerWriteAccess, StoragePathEntry, Map};
    use super::IERC20Dispatcher;
    use super::IERC20DispatcherTrait;

    // Borrow limits (STRK, 18 decimals)
    const TIER_1_LIMIT: u256 = 10_000_000_000_000_000_000;     // 10 STRK
    const TIER_2_LIMIT: u256 = 100_000_000_000_000_000_000;    // 100 STRK
    const TIER_3_LIMIT: u256 = 200_000_000_000_000_000_000;    // 200 STRK

    const INTEREST_BPS: u256 = 800;      // 8% APR
    const BPS_DENOM: u256 = 10000;
    const DAYS_PER_YEAR: u256 = 365;
    const PROOF_VALIDITY: u64 = 2_592_000; // 30 days

    #[storage]
    struct Storage {
        strk_token: ContractAddress,
        owner: ContractAddress,
        income_tier: Map<ContractAddress, u8>,
        proof_timestamp: Map<ContractAddress, u64>,
        loan_amount: Map<ContractAddress, u256>,
        loan_due: Map<ContractAddress, u64>,
        repay_amount: Map<ContractAddress, u256>,
        loan_count: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        IncomeVerified: IncomeVerified,
        LoanTaken: LoanTaken,
        LoanRepaid: LoanRepaid,
    }

    #[derive(Drop, starknet::Event)]
    struct IncomeVerified {
        #[key] user: ContractAddress,
        tier: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanTaken {
        #[key] user: ContractAddress,
        amount: u256,
        due_timestamp: u64,
    }

    #[derive(Drop, starknet::Event)]
    struct LoanRepaid {
        #[key] user: ContractAddress,
        amount: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, strk_token: ContractAddress) {
        self.strk_token.write(strk_token);
        self.owner.write(get_caller_address());
    }

    #[abi(embed_v0)]
    impl ZKLendImpl of super::IZKLend<ContractState> {

        fn submit_income_proof(ref self: ContractState, income_tier: u8) {
            assert(income_tier >= 1 && income_tier <= 3, 'Invalid tier: must be 1-3');
            let caller = get_caller_address();
            self.income_tier.entry(caller).write(income_tier);
            self.proof_timestamp.entry(caller).write(get_block_timestamp());
            self.emit(IncomeVerified { user: caller, tier: income_tier });
        }

        fn borrow(ref self: ContractState, amount: u256, duration_days: u64) {
            let caller = get_caller_address();

            let proof_time = self.proof_timestamp.entry(caller).read();
            assert(proof_time > 0, 'No income proof submitted');
            let elapsed = get_block_timestamp() - proof_time;
            assert(elapsed < PROOF_VALIDITY, 'Income proof expired');

            assert(self.loan_amount.entry(caller).read() == 0, 'Loan already outstanding');

            let tier = self.income_tier.entry(caller).read();
            let limit = self.tier_limit(tier);
            assert(amount > 0 && amount <= limit, 'Exceeds credit limit');
            assert(duration_days >= 7 && duration_days <= 90, 'Duration: 7-90 days');

            let interest = (amount * INTEREST_BPS * duration_days.into())
                / (BPS_DENOM * DAYS_PER_YEAR);
            let repay_total = amount + interest;
            let due_ts = get_block_timestamp() + (duration_days * 86400);

            self.loan_amount.entry(caller).write(amount);
            self.loan_due.entry(caller).write(due_ts);
            self.repay_amount.entry(caller).write(repay_total);
            self.loan_count.write(self.loan_count.read() + 1);

            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer(caller, amount);

            self.emit(LoanTaken { user: caller, amount, due_timestamp: due_ts });
        }

        fn repay(ref self: ContractState) {
            let caller = get_caller_address();
            let loan = self.loan_amount.entry(caller).read();
            assert(loan > 0, 'No active loan');

            let repay_total = self.repay_amount.entry(caller).read();
            let token = IERC20Dispatcher { contract_address: self.strk_token.read() };
            token.transfer_from(caller, get_contract_address(), repay_total);

            self.loan_amount.entry(caller).write(0);
            self.loan_due.entry(caller).write(0);
            self.repay_amount.entry(caller).write(0);

            self.emit(LoanRepaid { user: caller, amount: repay_total });
        }

        fn get_credit_limit(self: @ContractState, user: ContractAddress) -> u256 {
            let tier = self.income_tier.entry(user).read();
            if tier == 0 { return 0; }
            self.tier_limit(tier)
        }

        fn get_loan(self: @ContractState, user: ContractAddress) -> (u256, u64, u256) {
            (
                self.loan_amount.entry(user).read(),
                self.loan_due.entry(user).read(),
                self.repay_amount.entry(user).read(),
            )
        }

        fn get_income_tier(self: @ContractState, user: ContractAddress) -> u8 {
            self.income_tier.entry(user).read()
        }

        fn total_loans(self: @ContractState) -> u64 {
            self.loan_count.read()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn tier_limit(self: @ContractState, tier: u8) -> u256 {
            if tier == 1 { TIER_1_LIMIT }
            else if tier == 2 { TIER_2_LIMIT }
            else { TIER_3_LIMIT }
        }
    }
}
