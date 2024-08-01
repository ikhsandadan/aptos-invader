module spaceship_addr::main {
    use aptos_framework::event;
    use aptos_framework::object;
    use aptos_framework::object::ExtendRef;
    use aptos_std::string_utils::{to_string};
    use aptos_token_objects::collection;
    use aptos_token_objects::token;
    use std::error;
    use std::option;
    use std::signer::address_of;
    use std::string::{Self, String};

    const ENOT_AVAILABLE: u64 = 1;

    struct SpaceshipAttributes has copy, drop, key, store {
        hp: u8,
        energyRegen: u8,
        maxEnergy: u8,
        laserWidth: u8,
        laserDamage: u8,
        laserColor: String,
        bullet: u8,
        width: u8,
        height: u8,
        maxFrame: u8,
    }

    struct Spaceship has key {
        name: String,
        image: String,
        icon: String,
        attributes: SpaceshipAttributes,
        mutator_ref: token::MutatorRef,
        burn_ref: token::BurnRef,
    }

    #[event]
    struct MintSpaceshipEvent has drop, store {
        token_name: String,
        spaceship_name: String,
        attributes: SpaceshipAttributes,
    }

    // We need a contract signer as the creator of the spaceship collection and spaceship token
    // Otherwise we need admin to sign whenever a new spaceship token is minted which is inconvenient
    struct ObjectController has key {
        // This is the extend_ref of the app object, not the extend_ref of collection object or token object
        // app object is the creator and owner of spaceship collection object
        // app object is also the creator of all spaceship token (NFT) objects
        // but owner of each token object is spaceship owner (i.e. user who mints spaceship)
        app_extend_ref: ExtendRef,
    }

    const APP_OBJECT_SEED: vector<u8> = b"SPACESHIP";
    const SPACESHIP_COLLECTION_NAME: vector<u8> = b"Spaceship Collection";
    const SPACESHIP_COLLECTION_DESCRIPTION: vector<u8> = b"Spaceship Collection Description";
    const SPACESHIP_COLLECTION_URI: vector<u8> = b"https://amethyst-implicit-silkworm-944.mypinata.cloud/ipfs/QmfAExo4NAtNs2TJ1swMqADM7xPLJ9mboH99Np7d4EsY57";
    
    // This function is only called once when the module is published for the first time.
    fun init_module(account: &signer) {
        let constructor_ref = object::create_named_object(
            account,
            APP_OBJECT_SEED,
        );
        let extend_ref = object::generate_extend_ref(&constructor_ref);
        let app_signer = &object::generate_signer(&constructor_ref);

        move_to(app_signer, ObjectController {
            app_extend_ref: extend_ref,
        });

        create_spaceship_collection(app_signer);
    }

    fun get_app_signer_addr(): address {
        object::create_object_address(&@spaceship_addr, APP_OBJECT_SEED)
    }

    fun get_app_signer(): signer acquires ObjectController {
        object::generate_signer_for_extending(&borrow_global<ObjectController>(get_app_signer_addr()).app_extend_ref)
    }

    // Create the collection that will hold all the Spaceships
    fun create_spaceship_collection(creator: &signer) {
        let description = string::utf8(SPACESHIP_COLLECTION_DESCRIPTION);
        let name = string::utf8(SPACESHIP_COLLECTION_NAME);
        let uri = string::utf8(SPACESHIP_COLLECTION_URI);

        collection::create_unlimited_collection(
            creator,
            description,
            name,
            option::none(),
            uri,
        );
    }

    // Create an Spaceship token object
    public entry fun create_Spaceship(
        user: &signer,
        name: String,
        image: String,
        icon: String,
        hp: u8,
        energyRegen: u8,
        maxEnergy: u8,
        laserWidth: u8,
        laserDamage: u8,
        laserColor: String,
        bullet: u8,
        width: u8,
        height: u8,
        maxFrame: u8,

    ) acquires ObjectController {
        let uri = string::utf8(SPACESHIP_COLLECTION_URI);
        let description = string::utf8(SPACESHIP_COLLECTION_DESCRIPTION);
        let token_name = name;
        let user_addr = address_of(user);
        let user_addr_string = to_string(&user_addr);
        string::append_utf8(&mut token_name, b": #");
        string::append(&mut token_name, user_addr_string);
        let attributes = SpaceshipAttributes {
            hp,
            energyRegen,
            maxEnergy,
            laserWidth,
            laserDamage,
            laserColor,
            bullet,
            width,
            height,
            maxFrame,
        };

        let constructor_ref = token::create_named_token(
            &get_app_signer(),
            string::utf8(SPACESHIP_COLLECTION_NAME),
            description,
            token_name,
            option::none(),
            uri,
        );

        let token_signer = object::generate_signer(&constructor_ref);
        let mutator_ref = token::generate_mutator_ref(&constructor_ref);
        let burn_ref = token::generate_burn_ref(&constructor_ref);
        let transfer_ref = object::generate_transfer_ref(&constructor_ref);

        // initialize/set default Spaceship struct values
        let ship = Spaceship {
            name,
            image,
            icon,
            attributes,
            mutator_ref,
            burn_ref,
        };

        move_to(&token_signer, ship);

        // Emit event for minting Spaceship token
        event::emit<MintSpaceshipEvent>(
            MintSpaceshipEvent {
                token_name,
                spaceship_name: name,
                attributes,
            },
        );

        object::transfer_with_ref(object::generate_linear_transfer_ref(&transfer_ref), address_of(user));
    }

    // Get reference to Spaceship token object (CAN'T modify the reference)
    #[view]
    public fun get_spaceship_address(creator_addr: address, name: String): (address) {
        let collection = string::utf8(SPACESHIP_COLLECTION_NAME);
        let token_name = name;
        let user_addr_string = to_string(&creator_addr);
        string::append_utf8(&mut token_name, b": #");
        string::append(&mut token_name, user_addr_string);
        let creator_addr = get_app_signer_addr();
        let token_address = token::create_token_address(
            &creator_addr,
            &collection,
            &token_name,
        );

        token_address
    }

    // Get collection address (also known as collection ID) of spaceship collection
    // Collection itself is an object, that's why it has an address
    #[view]
    public fun get_spaceship_collection_address(): (address) {
        let collection_name = string::utf8(SPACESHIP_COLLECTION_NAME);
        let creator_addr = get_app_signer_addr();
        collection::create_collection_address(&creator_addr, &collection_name)
    }

    // Returns true if this address owns an Spaceship
    #[view]
    public fun has_spaceship(owner_addr: address, name: String): (bool) {
        let token_address = get_spaceship_address(owner_addr, name);

        exists<Spaceship>(token_address)
    }

    // Returns all fields for this Spaceship (if found)
    #[view]
    public fun get_spaceship(
        owner_addr: address,
        name: String,
    ): (String, String, String, SpaceshipAttributes) acquires Spaceship {
        // if this address doesn't have an Spaceship, throw error
        assert!(has_spaceship(owner_addr, name), error::unavailable(ENOT_AVAILABLE));

        let token_address = get_spaceship_address(owner_addr, name);
        let ship = borrow_global<Spaceship>(token_address);

        // view function can only return primitive types.
        (ship.name, ship.image, ship.icon, ship.attributes)
    }
}