module aptos_invader::aptos_invader {
    use aptos_std::smart_table::{Self, SmartTable};
    use std::signer;
    use std::vector;
    use std::string::{Self, String};

    /// The account is not authorized to update the resources.
    const ENOT_AUTHORIZED: u64 = 1;

    struct UserStats has key, store, copy, drop {
        games_played: u64,
        best_score: u64,
        spaceship: String,
    }

    struct GlobalState has key {
        users_stats: SmartTable<address, UserStats>,
    }

    struct UserStatsView has drop {
        games_played: u64,
        best_score: u64,
        spaceship: String,
    }

    struct AllUsersStatsViewItem has drop {
        addr: address,
        games_played: u64,
        best_score: u64,
        spaceship: String,
    }

    fun init_module(admin: &signer) {
        move_to(admin, GlobalState {
            users_stats: smart_table::new(),
        })
    }

    public entry fun save_game_session(
        user: &signer,
        score: u64,
        new_spaceship: String,
    ) acquires GlobalState {
        let user_addr = signer::address_of(user);
        let users_stats = &mut borrow_global_mut<GlobalState>(@aptos_invader).users_stats;
        
        if (!smart_table::contains(users_stats, user_addr)) {
            smart_table::add(users_stats, user_addr, UserStats {
                games_played: 1,
                best_score: score,
                spaceship: new_spaceship,
            });
        } else {
            let user_stats = smart_table::borrow_mut(users_stats, user_addr);
            user_stats.games_played = user_stats.games_played + 1;
            if (score > user_stats.best_score) {
                user_stats.best_score = score;
            };
            user_stats.spaceship = new_spaceship;
        }
    }

    #[view]
    public fun get_user_stats(
        user: address,
    ): UserStatsView acquires GlobalState {
        let users_stats = &borrow_global<GlobalState>(@aptos_invader).users_stats;
        if (!smart_table::contains(users_stats, user)) {
            UserStatsView {
                games_played: 0,
                best_score: 0,
                spaceship: string::utf8(b""),
            }
        } else {
            let user_stats = smart_table::borrow(users_stats, user);
            UserStatsView {
                games_played: user_stats.games_played,
                best_score: user_stats.best_score,
                spaceship: user_stats.spaceship,
            }
        }
    }

    fun create_stats_view_item(addr: address, stats: &UserStats): AllUsersStatsViewItem {
        AllUsersStatsViewItem {
            addr,
            games_played: stats.games_played,
            best_score: stats.best_score,
            spaceship: stats.spaceship,
        }
    }

    #[view]
    public fun get_all_user_stats(): vector<AllUsersStatsViewItem> acquires GlobalState {
        let users_stats = &borrow_global<GlobalState>(@aptos_invader).users_stats;
        let result = vector::empty<AllUsersStatsViewItem>();
        smart_table::for_each_ref(
            users_stats,
            |key, value| {
                vector::push_back(&mut result, create_stats_view_item(*key, value));
            }
        );
        result
    }
}