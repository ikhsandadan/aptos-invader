module marketplace::list_and_purchase {
    use std::error;
    use std::signer;
    use std::option::{Self, Option};
    use aptos_std::smart_vector;
    use aptos_std::smart_vector::SmartVector;
    use std::string::{String};

    use aptos_framework::aptos_account;
    use aptos_framework::coin;
    use aptos_framework::object::{Self, DeleteRef, ExtendRef, Object, ObjectCore};

    #[test_only]
    friend marketplace::test_list_and_purchase;

    const APP_OBJECT_SEED: vector<u8> = b"MARKETPLACE";

    /// There exists no listing.
    const ENO_LISTING: u64 = 1;
    /// There exists no seller.
    const ENO_SELLER: u64 = 2;

    // Core data structures

    struct MarketplaceSigner has key {
        extend_ref: ExtendRef,
    }

    // In production we should use off-chain indexer to store all sellers instead of storing them on-chain.
    // Storing it on-chain is costly since it's O(N) to remove a seller.
    struct Sellers has key {
        /// All addresses of sellers.
        addresses: SmartVector<address>
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct Listing has key {
        /// The item owned by this listing, transferred to the new owner at the end.
        object: Object<ObjectCore>,
        /// The item name.
        name: String,
        /// The seller of the object.
        seller: address,
        /// Used to clean-up at the end.
        delete_ref: DeleteRef,
        /// Used to create a signer to transfer the listed item, ideally the TransferRef would support this.
        extend_ref: ExtendRef,
    }

    #[resource_group_member(group = aptos_framework::object::ObjectGroup)]
    struct FixedPriceListing<phantom CoinType> has key {
        /// The price to purchase the item up for listing.
        price: u64,
    }

    // In production we should use off-chain indexer to store the listings of a seller instead of storing it on-chain.
    // Storing it on-chain is costly since it's O(N) to remove a listing.
    struct SellerListings has key {
        /// All object addresses of listings the user has created.
        listings: SmartVector<address>
    }

    // Functions

    // This function is only called once when the module is published for the first time.
    fun init_module(deployer: &signer) {
        let constructor_ref = object::create_named_object(
            deployer,
            APP_OBJECT_SEED,
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let marketplace_signer = &object::generate_signer(&constructor_ref);

        move_to(marketplace_signer, MarketplaceSigner {
            extend_ref,
        });
    }

    public fun get_marketplace_signer_addr(): address {
        object::create_object_address(&@marketplace, APP_OBJECT_SEED)
    }

    public fun get_marketplace_signer(marketplace_signer_addr: address): signer acquires MarketplaceSigner {
        object::generate_signer_for_extending(&borrow_global<MarketplaceSigner>(marketplace_signer_addr).extend_ref)
    }

    /// List an time for sale at a fixed price.
    public entry fun list_with_fixed_price<CoinType>(
        seller: &signer,
        object: Object<ObjectCore>,
        name: String,
        price: u64,
    ) acquires SellerListings, Sellers, MarketplaceSigner {
        list_with_fixed_price_internal<CoinType>(seller, object, name, price);
    }

    public(friend) fun list_with_fixed_price_internal<CoinType>(
        seller: &signer,
        object: Object<ObjectCore>,
        name: String,
        price: u64,        
    ): Object<Listing> acquires SellerListings, Sellers, MarketplaceSigner {
        let constructor_ref = object::create_object(signer::address_of(seller));

        let transfer_ref = object::generate_transfer_ref(&constructor_ref);
        object::disable_ungated_transfer(&transfer_ref);

        let listing_signer = object::generate_signer(&constructor_ref);

        let listing = Listing {
            object,
            name: name,
            seller: signer::address_of(seller),
            delete_ref: object::generate_delete_ref(&constructor_ref),
            extend_ref: object::generate_extend_ref(&constructor_ref),
        };
        let fixed_price_listing = FixedPriceListing<CoinType> {
            price,
        };
        move_to(&listing_signer, listing);
        move_to(&listing_signer, fixed_price_listing);

        object::transfer(seller, object, signer::address_of(&listing_signer));

        let listing = object::object_from_constructor_ref(&constructor_ref);

        if (exists<SellerListings>(signer::address_of(seller))) {
            let seller_listings = borrow_global_mut<SellerListings>(signer::address_of(seller));
            smart_vector::push_back(&mut seller_listings.listings, object::object_address(&listing));
        } else {
            let seller_listings = SellerListings {
                listings: smart_vector::new(),
            };
            smart_vector::push_back(&mut seller_listings.listings, object::object_address(&listing));
            move_to(seller, seller_listings);
        };
        if (exists<Sellers>(get_marketplace_signer_addr())) {
            let sellers = borrow_global_mut<Sellers>(get_marketplace_signer_addr());
            if (!smart_vector::contains(&sellers.addresses, &signer::address_of(seller))) {
                smart_vector::push_back(&mut sellers.addresses, signer::address_of(seller));
            }
        } else {
            let sellers = Sellers {
                addresses: smart_vector::new(),
            };
            smart_vector::push_back(&mut sellers.addresses, signer::address_of(seller));
            move_to(&get_marketplace_signer(get_marketplace_signer_addr()), sellers);
        };

        listing
    }

    /// Purchase outright an item from a fixed price listing.
    public entry fun purchase<CoinType>(
        purchaser: &signer,
        object: Object<ObjectCore>,
        name: String,
    ) acquires FixedPriceListing, Listing, SellerListings, Sellers {
        let listing_addr = object::object_address(&object);
        
        assert!(exists<Listing>(listing_addr), error::not_found(ENO_LISTING));
        assert!(exists<FixedPriceListing<CoinType>>(listing_addr), error::not_found(ENO_LISTING));

        let FixedPriceListing {
            price,
        } = move_from<FixedPriceListing<CoinType>>(listing_addr);

        // The listing has concluded, transfer the asset and delete the listing. Returns the seller
        // for depositing any profit.

        let coins = coin::withdraw<CoinType>(purchaser, price);

        let Listing {
            object,
            name,
            seller, // get seller from Listing object
            delete_ref,
            extend_ref,
        } = move_from<Listing>(listing_addr);

        let obj_signer = object::generate_signer_for_extending(&extend_ref);
        object::transfer(&obj_signer, object, signer::address_of(purchaser));
        object::delete(delete_ref); // Clean-up the listing object.

        // Note this step of removing the listing from the seller's listings will be costly since it's O(N).
        // Ideally you don't store the listings in a vector but in an off-chain indexer
        let seller_listings = borrow_global_mut<SellerListings>(seller);
        let (exist, idx) = smart_vector::index_of(&seller_listings.listings, &listing_addr);
        assert!(exist, error::not_found(ENO_LISTING));
        smart_vector::remove(&mut seller_listings.listings, idx);

        if (smart_vector::length(&seller_listings.listings) == 0) {
            // If the seller has no more listings, remove the seller from the marketplace.
            let sellers = borrow_global_mut<Sellers>(get_marketplace_signer_addr());
            let (exist, idx) = smart_vector::index_of(&sellers.addresses, &seller);
            assert!(exist, error::not_found(ENO_SELLER));
            smart_vector::remove(&mut sellers.addresses, idx);
        };

        aptos_account::deposit_coins(seller, coins);
    }

    // Helper functions

    inline fun borrow_listing(object: Object<Listing>): &Listing acquires Listing {
        let obj_addr = object::object_address(&object);
        assert!(exists<Listing>(obj_addr), error::not_found(ENO_LISTING));
        borrow_global<Listing>(obj_addr)
    }

    // View functions

    #[view]
    public fun price<CoinType>(
        object: Object<Listing>,
    ): Option<u64> acquires FixedPriceListing {
        let listing_addr = object::object_address(&object);
        if (exists<FixedPriceListing<CoinType>>(listing_addr)) {
            let fixed_price = borrow_global<FixedPriceListing<CoinType>>(listing_addr);
            option::some(fixed_price.price)
        } else {
            // This should just be an abort but the compiler errors.
            assert!(false, error::not_found(ENO_LISTING));
            option::none()
        }
    }

    #[view]
    public fun listing(object: Object<Listing>): (Object<ObjectCore>, String, address) acquires Listing {
        let listing = borrow_listing(object);
        (listing.object, listing.name, listing.seller)
    }

    #[view]
    public fun get_seller_listings(seller: address): vector<address> acquires SellerListings {
        if (exists<SellerListings>(seller)) {
            smart_vector::to_vector(&borrow_global<SellerListings>(seller).listings)
        } else {
            vector[]
        }
    }

    #[view]
    public fun get_sellers(): vector<address> acquires Sellers {
        if (exists<Sellers>(get_marketplace_signer_addr())) {
            smart_vector::to_vector(&borrow_global<Sellers>(get_marketplace_signer_addr()).addresses)
        } else {
            vector[]
        }
    }

    #[test_only]
    public fun setup_test(marketplace: &signer) {
        init_module(marketplace);
    }
}