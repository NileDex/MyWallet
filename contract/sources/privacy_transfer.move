module privacy::privacy_transfer {
    use std::signer;
    use std::vector;
    use std::bcs;
    use aptos_framework::coin::{Self, Coin};
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};
    use aptos_std::smart_table::{Self, SmartTable};
    use aptos_std::hash;

    friend privacy::admin;

    // Error codes
    const E_INSUFFICIENT_BALANCE: u64 = 1;
    const E_VAULT_NOT_INITIALIZED: u64 = 2;
    const E_INVALID_AMOUNT: u64 = 3;
    const E_UNAUTHORIZED: u64 = 4;
    const E_NULLIFIER_SPENT: u64 = 5;
    const E_INVALID_ADDRESS: u64 = 6;
    const E_OVERFLOW: u64 = 7;
    const E_VAULT_ALREADY_INITIALIZED: u64 = 11;
    const E_CONTRACT_PAUSED: u64 = 12;
    const E_INVALID_RECIPIENT: u64 = 13;
    const E_SELF_TRANSFER: u64 = 14;
    const E_ZERO_AMOUNT: u64 = 15;

    // Security constants
    const MIN_TRANSFER_AMOUNT: u64 = 1000;
    const MAX_TRANSFER_AMOUNT: u64 = 100000000000;
    const U64_MAX: u64 = 18446744073709551615;

    // Vault coin storage resource
    struct VaultCoinStore has key {
        coins: Coin<AptosCoin>,
    }

    // Emergency pause control
    struct PauseControl has key {
        is_paused: bool,
        pause_timestamp: u64,
        admin: address,
    }

    // Privacy vault with basic features
    struct PrivacyVault has key {
        balances: Table<address, u64>,
        total_locked: u64,
        nullifiers: SmartTable<vector<u8>, NullifierData>,
        deposit_nonces: Table<address, u64>,
    }

    // Nullifier tracking
    struct NullifierData has store, drop, copy {
        spent_at: u64,
    }

    // Privacy-preserving events (minimal info)
    struct DepositEvent has drop, store {
        timestamp: u64,
    }

    struct WithdrawalEvent has drop, store {
        timestamp: u64,
    }

    struct TransferEvent has drop, store {
        timestamp: u64,
    }

    struct VaultInitializedEvent has drop, store {
        timestamp: u64,
    }

    struct PauseEvent has drop, store {
        timestamp: u64,
        is_paused: bool,
    }

    // Private account metadata
    struct AccountMetadata has key {
        deposit_events: EventHandle<DepositEvent>,
        withdrawal_events: EventHandle<WithdrawalEvent>,
        transfer_events: EventHandle<TransferEvent>,
        commitment_secret: vector<u8>,
        nonce_counter: u64,
    }

    // Module events
    struct ModuleEvents has key {
        vault_initialized: EventHandle<VaultInitializedEvent>,
        pause_events: EventHandle<PauseEvent>,
    }

    /// Initialize the privacy vault
    fun init_module(signer_arg: &signer) {
        let account_addr = signer::address_of(signer_arg);
        
        move_to(signer_arg, VaultCoinStore {
            coins: coin::zero<AptosCoin>(),
        });

        move_to(signer_arg, PauseControl {
            is_paused: false,
            pause_timestamp: 0,
            admin: account_addr,
        });
        
        move_to(signer_arg, PrivacyVault {
            balances: table::new(),
            total_locked: 0,
            nullifiers: smart_table::new(),
            deposit_nonces: table::new(),
        });

        move_to(signer_arg, ModuleEvents {
            vault_initialized: account::new_event_handle<VaultInitializedEvent>(signer_arg),
            pause_events: account::new_event_handle<PauseEvent>(signer_arg),
        });
    }

    /// Initialize account metadata
    public entry fun init_account_metadata(signer_arg: &signer) {
        let account_addr = signer::address_of(signer_arg);
        if (!exists<AccountMetadata>(account_addr)) {
            let secret = generate_commitment_secret(signer_arg);
            move_to(signer_arg, AccountMetadata {
                deposit_events: account::new_event_handle<DepositEvent>(signer_arg),
                withdrawal_events: account::new_event_handle<WithdrawalEvent>(signer_arg),
                transfer_events: account::new_event_handle<TransferEvent>(signer_arg),
                commitment_secret: secret,
                nonce_counter: 0,
            });
        };
    }

    /// Generate commitment secret
    fun generate_commitment_secret(signer_arg: &signer): vector<u8> {
        let addr = signer::address_of(signer_arg);
        let timestamp_val = timestamp::now_microseconds();
        let seed = bcs::to_bytes(&addr);
        let timestamp_bytes = bcs::to_bytes(&timestamp_val);
        let combined = vector::empty<u8>();
        vector::append(&mut combined, seed);
        vector::append(&mut combined, timestamp_bytes);
        hash::sha3_256(combined)
    }

    fun assert_not_paused() acquires PauseControl {
        if (exists<PauseControl>(@privacy)) {
            let pause_control = borrow_global<PauseControl>(@privacy);
            assert!(!pause_control.is_paused, E_CONTRACT_PAUSED);
        };
    }

    fun validate_address(addr: address, sender: address) {
        assert!(addr != @0x0, E_INVALID_RECIPIENT);
        assert!(addr != @0x1, E_INVALID_RECIPIENT);
        assert!(addr != sender, E_SELF_TRANSFER);
    }

    fun validate_amount(amount: u64) {
        assert!(amount > 0, E_ZERO_AMOUNT);
        assert!(amount >= MIN_TRANSFER_AMOUNT, E_INVALID_AMOUNT);
        assert!(amount <= MAX_TRANSFER_AMOUNT, E_INVALID_AMOUNT);
    }

    // ==================== CORE FUNCTIONS ====================

    /// Deposit into privacy vault
    public entry fun deposit(signer_arg: &signer, amount: u64) 
        acquires PrivacyVault, VaultCoinStore, AccountMetadata 
    {
        validate_amount(amount);
        let addr = signer::address_of(signer_arg);
        init_account_metadata(signer_arg);

        let vault = borrow_global_mut<PrivacyVault>(@privacy);
        
        if (!table::contains(&vault.deposit_nonces, addr)) {
            table::add(&mut vault.deposit_nonces, addr, 0);
        };
        let nonce_ref = table::borrow_mut(&mut vault.deposit_nonces, addr);
        *nonce_ref = *nonce_ref + 1;

        let coin_store = borrow_global_mut<VaultCoinStore>(@privacy);
        let coins = coin::withdraw<AptosCoin>(signer_arg, amount);
        coin::merge(&mut coin_store.coins, coins);

        if (!table::contains(&vault.balances, addr)) {
            table::add(&mut vault.balances, addr, amount);
        } else {
            let balance_ref = table::borrow_mut(&mut vault.balances, addr);
            *balance_ref = *balance_ref + amount;
        };

        vault.total_locked = vault.total_locked + amount;

        let metadata_mut = borrow_global_mut<AccountMetadata>(addr);
        event::emit_event(&mut metadata_mut.deposit_events, DepositEvent {
            timestamp: timestamp::now_microseconds(),
        });
    }

    /// Top-up existing balance
    public entry fun top_up(signer_arg: &signer, amount: u64) 
        acquires PrivacyVault, VaultCoinStore, AccountMetadata, PauseControl
    {
        assert_not_paused();
        deposit(signer_arg, amount);
    }

    /// Private transfer
    public entry fun transfer(
        signer_arg: &signer,
        recipient: address,
        amount: u64
    ) acquires PrivacyVault, AccountMetadata, PauseControl {
        assert_not_paused();
        validate_amount(amount);

        let sender = signer::address_of(signer_arg);
        validate_address(recipient, sender);

        let vault = borrow_global_mut<PrivacyVault>(@privacy);
        
        assert!(table::contains(&vault.balances, sender), E_INSUFFICIENT_BALANCE);
        let sender_balance_ref = table::borrow_mut(&mut vault.balances, sender);
        assert!(*sender_balance_ref >= amount, E_INSUFFICIENT_BALANCE);

        *sender_balance_ref = *sender_balance_ref - amount;

        if (!table::contains(&vault.balances, recipient)) {
            table::add(&mut vault.balances, recipient, amount);
        } else {
            let recipient_balance_ref = table::borrow_mut(&mut vault.balances, recipient);
            *recipient_balance_ref = *recipient_balance_ref + amount;
        };

        if (exists<AccountMetadata>(sender)) {
            let metadata = borrow_global_mut<AccountMetadata>(sender);
            event::emit_event(&mut metadata.transfer_events, TransferEvent {
                timestamp: timestamp::now_microseconds(),
            });
        };
    }

    /// Withdraw from balance
    public entry fun withdraw(signer_arg: &signer, amount: u64) 
        acquires PrivacyVault, VaultCoinStore, AccountMetadata, PauseControl
    {
        assert_not_paused();
        validate_amount(amount);

        let addr = signer::address_of(signer_arg);
        
        let vault = borrow_global_mut<PrivacyVault>(@privacy);

        assert!(table::contains(&vault.balances, addr), E_INSUFFICIENT_BALANCE);
        let balance_ref = table::borrow_mut(&mut vault.balances, addr);
        assert!(*balance_ref >= amount, E_INSUFFICIENT_BALANCE);

        *balance_ref = *balance_ref - amount;
        vault.total_locked = vault.total_locked - amount;

        let coin_store = borrow_global_mut<VaultCoinStore>(@privacy);
        let coins = coin::extract(&mut coin_store.coins, amount);
        coin::deposit(addr, coins);

        init_account_metadata(signer_arg);
        let metadata = borrow_global_mut<AccountMetadata>(addr);
        event::emit_event(&mut metadata.withdrawal_events, WithdrawalEvent {
            timestamp: timestamp::now_microseconds(),
        });
    }

    // ==================== VIEW FUNCTIONS ====================

    
    public fun get_balance(account_addr: address): u64 acquires PrivacyVault {
        if (!exists<PrivacyVault>(@privacy)) {
            return 0
        };
        
        let vault = borrow_global<PrivacyVault>(@privacy);
        if (!table::contains(&vault.balances, account_addr)) {
            0
        } else {
            *table::borrow(&vault.balances, account_addr)
        }
    }

    
    public fun get_total_locked(): u64 acquires PrivacyVault {
        if (!exists<PrivacyVault>(@privacy)) {
            return 0
        };
        borrow_global<PrivacyVault>(@privacy).total_locked
    }

    
    public fun is_paused(): bool acquires PauseControl {
        if (!exists<PauseControl>(@privacy)) {
            return false
        };
        borrow_global<PauseControl>(@privacy).is_paused
    }

    // ==================== ADMIN FUNCTIONS (Friend Only) ====================

    /// Pause/unpause the contract (admin only)
    public(friend) fun set_pause_status_internal(admin_addr: address, paused: bool) acquires PauseControl, ModuleEvents {
        let pause_control = borrow_global_mut<PauseControl>(@privacy);
        
        assert!(pause_control.admin == admin_addr, E_UNAUTHORIZED);
        
        pause_control.is_paused = paused;
        pause_control.pause_timestamp = timestamp::now_microseconds();
        
        let events = borrow_global_mut<ModuleEvents>(@privacy);
        event::emit_event(&mut events.pause_events, PauseEvent {
            timestamp: pause_control.pause_timestamp,
            is_paused: paused,
        });
    }

    /// Change admin (admin only)
    public(friend) fun change_admin_internal(admin_addr: address, new_admin: address) acquires PauseControl {
        let pause_control = borrow_global_mut<PauseControl>(@privacy);
        
        assert!(pause_control.admin == admin_addr, E_UNAUTHORIZED);
        pause_control.admin = new_admin;
    }
}
