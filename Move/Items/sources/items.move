module items_addr::items {
    use aptos_framework::event;
    use aptos_framework::object::{Self, ExtendRef, Object};
    use aptos_token_objects::collection;
    use aptos_token_objects::token::{Token, Self};
    use std::option;
    use std::signer::address_of;
    use std::string::{String, utf8};

    /// Items not exist at given address
    const EITEMS_NOT_EXIST: u64 = 1;

    const APP_OBJECT_SEED: vector<u8> = b"ITEMS";
    const ITEMS_COLLECTION_NAME: vector<u8> = b"Items Collection";
    const ITEMS_COLLECTION_DESCRIPTION: vector<u8> = b"Items Collection Description";
    const ITEMS_COLLECTION_URI: vector<u8> = b"https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/Qmcm3gcExwoFnA4VGifqP6MUE8JijnayddXeDhSvtboWJ7";

    struct Attributes has copy, drop, key, store {
        rarity: String,
        image: String,
    }

    struct Items has key {
        attributes: Attributes,
        extend_ref: ExtendRef,
        mutator_ref: token::MutatorRef,
        burn_ref: token::BurnRef,
    }

    #[event]
    struct MintItemsEvent has drop, store {
        item_address: address,
        token_name: String,
    }

    // Tokens require a signer to create, so this is the signer for the collection
    struct CollectionCapability has key {
        app_extend_ref: ExtendRef,
    }

    // This function is only called once when the module is published for the first time.
    fun init_module(account: &signer) {
        let constructor_ref = object::create_named_object(
            account,
            APP_OBJECT_SEED,
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let app_signer = &object::generate_signer(&constructor_ref);

        move_to(app_signer, CollectionCapability {
            app_extend_ref: extend_ref,
        });

        create_items_collection(app_signer);
    }

    fun get_collection_address(): address {
        object::create_object_address(&@items_addr, APP_OBJECT_SEED)
    }

    fun get_collection_signer(collection_address: address): signer acquires CollectionCapability {
        object::generate_signer_for_extending(&borrow_global<CollectionCapability>(collection_address).app_extend_ref)
    }

    fun get_items_signer(item_address: address): signer acquires Items {
        object::generate_signer_for_extending(&borrow_global<Items>(item_address).extend_ref)
    }

    // Create the collection that will hold all the items
    fun create_items_collection(creator: &signer) {
        let description = utf8(ITEMS_COLLECTION_DESCRIPTION);
        let name = utf8(ITEMS_COLLECTION_NAME);
        let uri = utf8(ITEMS_COLLECTION_URI);

        collection::create_unlimited_collection(
            creator,
            description,
            name,
            option::none(),
            uri,
        );
    }

    public entry fun create_item(user: &signer, name: String, rarity: String, image: String) acquires CollectionCapability {
        let uri = utf8(ITEMS_COLLECTION_URI);
        let description = utf8(ITEMS_COLLECTION_DESCRIPTION);
        let attributes = Attributes {
            rarity,
            image,
        };

        let collection_address = get_collection_address();
        let constructor_ref = &token::create(
            &get_collection_signer(collection_address),
            utf8(ITEMS_COLLECTION_NAME),
            description,
            name,
            option::none(),
            uri,
        );

        let token_signer_ref = &object::generate_signer(constructor_ref);

        let extend_ref = object::generate_extend_ref(constructor_ref);
        let mutator_ref = token::generate_mutator_ref(constructor_ref);
        let burn_ref = token::generate_burn_ref(constructor_ref);
        let transfer_ref = object::generate_transfer_ref(constructor_ref);

        // Initialize and set default item struct values
        let item = Items {
            attributes,
            extend_ref,
            mutator_ref,
            burn_ref,
        };
        move_to(token_signer_ref, item);

        // Emit event for minting Item token
        event::emit(
            MintItemsEvent {
                item_address: address_of(token_signer_ref),
                token_name: name,
            },
        );

        // Transfer the item to the user
        object::transfer_with_ref(object::generate_linear_transfer_ref(&transfer_ref), address_of(user));
    }

    // Get collection name of items collection
    #[view]
    public fun get_items_collection_name(): (String) {
        utf8(ITEMS_COLLECTION_NAME)
    }

    // Get creator address of items collection
    #[view]
    public fun get_items_collection_creator_address(): (address) {
        get_collection_address()
    }

    // Get collection ID of items collection
    #[view]
    public fun get_items_collection_address(): (address) {
        let collection_name = utf8(ITEMS_COLLECTION_NAME);
        let creator_address = get_collection_address();
        collection::create_collection_address(&creator_address, &collection_name)
    }

    // Returns all fields for this item (if found)
    #[view]
    public fun get_item(item_obj: Object<Token>): (String, Attributes) acquires Items {
        let item_address = object::object_address(&item_obj);
        assert!(object::object_exists<Token>(item_address), EITEMS_NOT_EXIST);
        let item = borrow_global<Items>(item_address);
        (token::name<Token>(item_obj), item.attributes)
    }
}
