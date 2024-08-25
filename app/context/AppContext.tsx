"use client";
import {
    useWallet,
    InputTransactionData,
} from "@aptos-labs/wallet-adapter-react";
import {
    Account,
    AccountAddress,
    AnyNumber,
    Aptos,
    AptosConfig,
    InputViewFunctionData,
    Network,
    NetworkToNetworkName,
    Ed25519PrivateKey 
} from "@aptos-labs/ts-sdk";
import { FC, ReactNode, useState, useContext, createContext } from "react";
import { createTheme, ThemeProvider } from '@mui/material/styles';

import { AlertProvider, useAlert } from "../provider/AlertProvider";
import { AutoConnectProvider } from "../provider/AutoConnectProvider";
import { WalletContext } from "./WalletContext";
import { UserContextProvider } from "./UserContext";
import { Ship } from "../Ship";
import items from "../utils/items";

export const SPACESHIP_ADMIN_PRIVATEKEY = process.env.NEXT_PUBLIC_SPACESHIP_ADMIN_PRIVATEKEY;
const COLLECTION_ID = process.env.NEXT_PUBLIC_COLLECTION_ADDRESS;

const theme = createTheme({
    palette: {
        primary: {
        main: "#000000",
        },
        secondary: {
        main: "#FFFFFF",
        },
    },
});

export interface CollectedItem {
    id: number;
    name: string;
    image: HTMLImageElement;
    rarity: string;
    collected: boolean;
};

export interface Items {
    name: string;
    address: string;
};

interface ListedItem {
    name?: string;
    image?: string;
    attributes?: any;
    price?: number;
    listingObjectAddress?: string;
    nftAddress?: string;
    sellerAddress?: string;
}

interface AppContextState {
    aptos: any;
    spaceshipAdmin: Account | null;
    mySpaceships: Ship[];
    myItems: any[];
    ownedItems: any[];
    myBalance: number | 0;
    myStats: any;
    allUserStats: any[];
    itemsCollectionAddress: any;
    listedNfts: any[] | undefined;
    allSellers: any[];
    myRank: number;
    setMyRank: (rank: number) => void;
    setSpaceshipAdmin: (admin: Account) => void;
    fetchAdminAccount: (adminPrivateKey: string) => Promise<Account>;
    fetchBalance: (accountAddress: AccountAddress, versionToWaitFor?: bigint | undefined) => void;
    fundWallet: (address: AccountAddress) => void;
    transferAPT: (accountAddress: AccountAddress, recipient: AccountAddress, amount: number) => Promise<string>;
    transferAPTBack: (admin: Account, recipient: AccountAddress, amount: number) => Promise<string>;
    handleMint: (admin: Account, account: AccountAddress, amount: number, ship: Ship) => Promise<string>;
    handleMintItems: (admin: Account, account: AccountAddress, item: CollectedItem) => Promise<string>;
    setMyBalance: (myBalance: number | 0) => void;
    fetchSpaceships: (admin: Account, account: AccountAddress, shipName: string) => void;
    handleNewGameSession: (admin: Account, account: AccountAddress, score: number, spaceship: string) => Promise<string>;
    fetchUserStats: (admin: Account, account: AccountAddress) => void;
    fetchItemsCollectionAddress: (admin: Account) => void;
    getUserOwnedItems: (ownerAddr: string) => Promise<any>;
    getItem: (itemObjectAddress: string, itemName: string) => void;
    handleListItem: (admin: Account, account: AccountAddress, item: any, price: string) => Promise<string>;
    getAllItems: () => void;
    getAllSellers: (admin: Account) => void;
    getAllListedNfts: () => void;
    handlePurchaseItem: (admin: Account, account: AccountAddress, item: any) => Promise<string>;
    fetchAllUserStats: (admin: Account) => void;
};

export const AppContexts = createContext<AppContextState | undefined>(
    undefined
);

export function useAppContext(): AppContextState {
    const context = useContext(AppContexts);
    if (!context)
        throw new Error("useAppContext must be used within an AppContextProvider");
    return context;
};

const AppContextProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [spaceshipAdmin, setSpaceshipAdmin] = useState<Account | null>(null);
    const APT = "0x1::aptos_coin::AptosCoin";
    const APT_UNIT = 100_000_000;
    const config = new AptosConfig({ network: Network.TESTNET });
    const aptos = new Aptos(config);
    const {
        signAndSubmitTransaction,
    } = useWallet();
    const { setSuccessAlertMessage, setErrorAlertMessage, setLoadingAlertMessage, setLoadingUpdateAlertMessage } = useAlert();
    const [myBalance, setMyBalance] = useState<number>(0);
    const [mySpaceships, setMyspaceships] = useState<Ship[]>([]);
    const [myItems, setMyItems] = useState<any[]>([]);
    const [myStats, setMyStats] = useState<any>({});
    const [allUserStats, setAllUserStats] = useState<any[]>([]);
    const [myRank, setMyRank] = useState<number>(0);
    const [ownedItems, setOwnedItems] = useState<any[]>([]);
    const [itemsCollectionAddress, setItemsCollectionAddress] = useState<any>();
    const [allItems, setAllItems] = useState<any[]>([]);
    const [allSellers, setAllSellers] = useState<any[]>([]);
    const [listedNfts, setListedNfts] = useState<any[]>([]);

    const fetchAdminAccount = async (adminPrivateKey: string) : Promise<Account> => {
        const privateKey = new Ed25519PrivateKey(adminPrivateKey);
        const account = await Account.fromPrivateKey({ privateKey });

        return account;
    };

    const handleMint = async (admin: Account, account: AccountAddress, amountToTransfer: number, ship: Ship) : Promise<string> => {
        const loadingMessage = `Please wait. Minting Spaceship...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnTransfer = await transferAPT(account, admin.accountAddress, amountToTransfer);
            if (txnTransfer === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to transfer coin. Please try again later", "error");
                return "Error";
            }

            const txnMint = await mintSpaceship(id, admin, account, ship);

            if (txnMint === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to purchase spaceship. Please try again later", "error");
                const txnTransferBack = transferAPTBack(admin, account, amountToTransfer);
                await fetchBalance(account);
                return "Error";
            }

            await fetchSpaceships(admin, account, ship.name);
            await fetchBalance(account);

            return txnMint;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to swap coin. Please try again later", "error");
            return "Error";
        }
    };

    const mintSpaceship = async (id: any, admin: Account, account: AccountAddress, ship: Ship) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::main::create_Spaceship`,
                    typeArguments: [],
                    functionArguments: [
                        ship.name,
                        ship.image,
                        ship.icon,
                        ship.hp,
                        ship.energyRegen,
                        ship.maxEnergy,
                        ship.laserWidth,
                        ship.laserDamage,
                        ship.laserColor,
                        ship.bullet,
                        ship.width,
                        ship.height,
                        ship.maxFrame,
                    ],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully purchased ${ship.name}!. With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const handleMintItems = async (admin: Account, account: AccountAddress, item: CollectedItem) : Promise<string> => {
        const loadingMessage = `Please wait. Minting Item...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnMint = await mintItems(id, admin, account, item); 
            if (txnMint === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to mint item. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            return txnMint;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to mint item. Please try again later", "error");
            return "Error";
        }
    }

    const mintItems = async (id: any, admin: Account, account: AccountAddress, item: CollectedItem) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::itemsv4::create_item`,
                    typeArguments: [],
                    functionArguments: [
                        item.name,
                        item.image.src as string,
                        item.rarity,
                    ],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully minted ${item.name}!. With hash ${response.hash}`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const fetchSpaceships = async (admin: Account, account: AccountAddress, shipName: string) => {
        const hasSpaceships = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::main::has_spaceship`,
                functionArguments: [account, shipName],
            },
        });

        if (hasSpaceships) {
            let response;

            try {
                response = await aptos.view({
                payload: {
                    function: `${admin.accountAddress}::main::get_spaceship`,
                    functionArguments: [account, shipName],
                },
                });

                let [name, image, icon, attributes] = response;
                const nameString = name as string;
                const newName = nameString.indexOf(shipName);

                if (newName !== -1) {
                    nameString.substring(0, newName + shipName.length);
                }

                const typeAttributes = attributes as { 
                    hp: number; 
                    energyRegen: number; 
                    maxEnergy: number; 
                    laserWidth: number; 
                    laserDamage: number; 
                    laserColor: string; 
                    bullet: number; 
                    width: number; 
                    height: number; 
                    maxFrame: number };

                setMyspaceships((prevSpaceships) => {
                    // Check if spaceship with the same name already exists
                    if (prevSpaceships.some(ship => ship.name === nameString)) {
                        return prevSpaceships;
                    }
    
                    return [
                        ...prevSpaceships,
                        {
                            name: nameString,
                            image: image as string,
                            icon: icon as string,
                            hp: typeAttributes.hp as number,
                            energyRegen: typeAttributes.energyRegen as number,
                            maxEnergy: typeAttributes.maxEnergy as number,
                            laserWidth: typeAttributes.laserWidth as number,
                            laserDamage: typeAttributes.laserDamage as number,
                            laserColor: typeAttributes.laserColor,
                            bullet: typeAttributes.bullet as number,
                            width: typeAttributes.width as number,
                            height: typeAttributes.height as number,
                            maxFrame: typeAttributes.maxFrame as number,
                            price: 0,
                        }
                    ];
                });
            } catch (error: any) {
                console.error("Ships not found");
            }
        }
    };

    const fetchItemsCollectionAddress = async (admin: Account) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::itemsv4::get_items_collection_address`,
                functionArguments: [],
            },
            });

            setItemsCollectionAddress(response as any);
        } catch (error: any) {
            console.error("Items Collection Address not found");
        }
    };

    const getUserOwnedItems = async (ownerAddr: string) => {
        const result = await aptos.getAccountOwnedTokensFromCollectionAddress({
            accountAddress: ownerAddr,
            collectionAddress: COLLECTION_ID as string,
        });

        setMyItems(result);
    };

    const getItem = async (itemObjectAddress: string, itemName: string) => {
        try {
            const response = await aptos.view({
                payload: {
                    function: `${spaceshipAdmin?.accountAddress}::itemsv4::get_item`,
                    typeArguments: [],
                    functionArguments: [itemObjectAddress],
                },
            });
    
            const [name, attributes] = response;
    
            const typeAttributes = attributes as { image: string, rarity: string};
    
            setOwnedItems((prevItems) => {
                if (prevItems.some(item => item.name === name)) {
                    return prevItems;
                }
                return [
                    ...prevItems,
                    {
                        itemObjectAddress: itemObjectAddress,
                        name: name as string,
                        image: typeAttributes.rarity as string,
                        rarity: typeAttributes.image,
                    }
                ];
            });
        } catch (error) {
            if (error instanceof Error) {
                console.error("Error fetching item:", error.message);
                // You might want to show this error to the user
                // setError(error.message);
            } else {
                console.error("An unknown error occurred:", error);
            }
            // Optionally, you can throw the error here if you want to handle it in the caller function
            // throw error;
        }
    };

    const handleListItem = async (admin: Account, account: AccountAddress, item: any, price: string) : Promise<string> => {
        const loadingMessage = `Please wait. Listing Item...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnList = await listItem(id, admin, account, item, price); 
            if (txnList === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to list item. Please try again later", "error");
                await getUserOwnedItems(account.toString());
                await getAllListedNfts();
                await getItem(item.itemObjectAddress, item.name);
                return "Error";
            }

            await getUserOwnedItems(account.toString());
            await getAllListedNfts();
            await getItem(item.itemObjectAddress, item.name);
            return txnList;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to list item. Please try again later", "error");
            await getUserOwnedItems(account.toString());
            await getAllListedNfts();
            await getItem(item.itemObjectAddress, item.name);
            return "Error";
        }
    };

    const listItem = async (id: any, admin: Account, account: AccountAddress, item: any, price: string) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::list_and_purchasev2::list_with_fixed_price`,
                    typeArguments: [APT],
                    functionArguments: [
                        item.itemObjectAddress,
                        item.name,
                        parseFloat(price) * APT_UNIT,
                    ],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully Listed ${item.name}!`, "success");

            await getAllListedNfts();

            return response.hash;
        } catch (error: any) {
            await getAllListedNfts();
            return "Error";
        }
    };

    const getAllItems = async () => {
        const result: {
            current_token_datas_v2: Items[];
        } = await aptos.queryIndexer({
            query: {
                query: `
                query MyQuery($collectionId: String) {
                    current_token_datas_v2(
                    where: {collection_id: {_eq: $collectionId}}
                    ) {
                    name: token_name
                    address: token_data_id
                    }
                }
                `,
                variables: { collectionId: COLLECTION_ID },
            },
        });
        
        setAllItems(result.current_token_datas_v2);
    };

    const getAllSellers = async (admin: Account) => {
        const allSellers: [string[]] = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::list_and_purchasev2::get_sellers`,
                typeArguments: [],
                functionArguments: [],
            },
        });
        setAllSellers(allSellers[0]);
    };

    const getAllListingObjectAddresses = async ( sellerAddr: string) => {
        const allListings: [string[]] = await aptos.view({
            payload: {
                function: `${spaceshipAdmin?.accountAddress}::list_and_purchasev2::get_seller_listings`,
                typeArguments: [],
                functionArguments: [sellerAddr],
            },
        });

        return allListings[0];
    };

    const getListingObjectAndSeller = async (
        listingObjectAddr: string
    ): Promise<[string, string, string]> => {
        const listingObjectAndSeller = await aptos.view({
            payload: {
                function: `${spaceshipAdmin?.accountAddress}::list_and_purchasev2::listing`,
                typeArguments: [],
                functionArguments: [listingObjectAddr],
            },
        });

        return [
            // @ts-ignore
            listingObjectAndSeller[0]["inner"] as string,
            listingObjectAndSeller[1] as string,
            listingObjectAndSeller[2] as string,
        ];
    };

    const getListingObjectPrice = async (
        listingObjectAddr: string
    ): Promise<number> => {
        const listingObjectPrice = await aptos.view({
            payload: {
                function: `${spaceshipAdmin?.accountAddress}::list_and_purchasev2::price`,
                typeArguments: [APT],
                functionArguments: [listingObjectAddr],
            },
        });
        // @ts-ignore
        return (listingObjectPrice[0]["vec"] as number) / APT_UNIT;
    };
    

    const getAllListedNfts = async () => {
        if (!allSellers) return;
    
        const listedItems: ListedItem[] = [];
        const ownedItemNames = new Set(ownedItems.map(item => item.name));
        const processedItems = new Set<string>();
    
        const rarityOrder = {
            "Legendary": 5,
            "Epic": 4,
            "Rare": 3,
            "Uncommon": 2,
            "Common": 1
        };
    
        // Process every seller
        const sellerPromises = allSellers.map(async (seller) => {
            try {
                // Get all listing object addresses
                const listingObjectAddresses = await getAllListingObjectAddresses(seller);
                if (!listingObjectAddresses) return;
    
                // Process every listing object address
                const itemPromises = listingObjectAddresses.map(async (listingObjectAddress) => {
                    try {
                        const [nftAddress, name, sellerAddress] = await getListingObjectAndSeller(listingObjectAddress);
                        const price = await getListingObjectPrice(listingObjectAddress);
    
                        // Find the item details
                        const itemDetails = items.find((item: any) => item.name === name);
                        if (!itemDetails) return;
    
                        const { image, rarity } = itemDetails;
    
                        const listedItem: ListedItem = {
                            name,
                            image,
                            attributes: rarity,
                            price,
                            listingObjectAddress,
                            nftAddress,
                            sellerAddress,
                        };
    
                        if (!ownedItemNames.has(name) && !processedItems.has(listingObjectAddress)) {
                            listedItems.push(listedItem);
                            processedItems.add(listingObjectAddress);
                        }
    
                    } catch (error) {
                        console.error("Error processing listing object address:", error);
                    }
                });
    
                // Wait until itemPromises is finished
                await Promise.all(itemPromises);
    
            } catch (error) {
                console.error("Error processing seller:", seller, error);
            }
        });
    
        // Wait until sellerPromises is finished
        await Promise.all(sellerPromises);
    
        // Sort listedItems based on rarity and price
        const sortedListedItems = listedItems.sort((a, b) => {
            // First, compare by rarity
            const rarityDiff = (rarityOrder[b.attributes as keyof typeof rarityOrder] || 0) - (rarityOrder[a.attributes as keyof typeof rarityOrder] || 0);
    
            if (rarityDiff !== 0) {
                return rarityDiff; // If rarity is different, sort by rarity
            }
    
            // If rarity is the same, sort by price (assuming price is a number)
            return Number(b.price) - Number(a.price);
        });
    
        // Update state with sorted items
        setListedNfts(sortedListedItems);
    };

    const handlePurchaseItem = async (admin: Account, account: AccountAddress, item: any) : Promise<string> => {
        const loadingMessage = `Please wait. Purchasing Item...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnPurchase = await purchaseListedItem(id, admin, account, item); 
            if (txnPurchase === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to purchase item. Please try again later", "error");
                await getUserOwnedItems(account.toString());
                await getAllListedNfts();
                await getItem(item.itemObjectAddress, item.name);
                return "Error";
            }

            await getUserOwnedItems(account.toString());
            await getAllListedNfts();
            await getItem(item.itemObjectAddress, item.name);
            return txnPurchase;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to purchase item. Please try again later", "error");
            await getUserOwnedItems(account.toString());
            await getAllListedNfts();
            await getItem(item.itemObjectAddress, item.name);
            return "Error";
        }
    }

    const purchaseListedItem = async (id: any, admin: Account, account: AccountAddress, item: ListedItem) => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::list_and_purchasev2::purchase`,
                    typeArguments: [APT],
                    functionArguments: [item.listingObjectAddress, item.name],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully Purchased ${item.name}!`, "success");

            await getAllListedNfts();
            await getUserOwnedItems(account.toString());

            return response.hash;
        } catch (error: any) {
            console.log(error);
            await getAllListedNfts();
            return "Error";
        }
    };

    const handleNewGameSession = async (admin: Account, account: AccountAddress, score: number, spaceship: string) => {
        const loadingMessage = `Please wait. Submitting New Game Session...`;
        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const txnMint = await fetchNewGameSession(id, admin, account, score, spaceship); 
            if (txnMint === "Error") {
                setLoadingUpdateAlertMessage(id, "Failed to submit new game session. Please try again later", "error");
                await fetchBalance(account);
                return "Error";
            }

            await fetchUserStats(admin, account);

            return txnMint;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Failed to submit new game session. Please try again later", "error");
            return "Error";
        }
    };

    const fetchNewGameSession = async (id: any, admin: Account, account: AccountAddress, score: number, spaceship: string) : Promise<string> => {
        try {
            const response = await signAndSubmitTransaction({
                sender: account,
                data: {
                    function: `${admin.accountAddress}::aptos_invaderv2::save_game_session`,
                    typeArguments: [],
                    functionArguments: [
                        score,
                        spaceship,
                    ],
                    },
            });

            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });

            setLoadingUpdateAlertMessage(id, `Successfully submitted new game session`, "success");

            return response.hash;
        } catch (error: any) {
            return "Error";
        }
    };

    const fetchUserStats = async (admin: Account, account: AccountAddress) => {
        try {
            let response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::aptos_invaderv2::get_user_stats`,
                functionArguments: [account],
            },
            });

            setMyStats(response);

        } catch (error: any) {
            console.error("Stats not found");
        }
    };

    const fetchAllUserStats = async (admin: Account) => {
        try {
            const response = await aptos.view({
            payload: {
                function: `${admin.accountAddress}::aptos_invaderv2::get_all_user_stats`,
                functionArguments: [],
            },
            });

            // @ts-ignore
            const sortedUsers = response[0].sort((a: any, b: any) => (b.best_score ?? 0) - (a.best_score ?? 0));
            setAllUserStats(sortedUsers);

        } catch (error: any) {
            console.error("Stats not found");
        }
    };

    const fetchBalance = async (accountAddress: AccountAddress, versionToWaitFor?: bigint | undefined) => {
        try {
            const amount = await aptos.getAccountAPTAmount({
                accountAddress,
                minimumLedgerVersion: versionToWaitFor ?? undefined,
            });
            
            setMyBalance(amount / 100000000);
        } catch (error: any) {
            setErrorAlertMessage(error.message);
        }
    };

    const fundWallet = async (address: AccountAddress) => {
        const loadingMessage = `Please wait. Funding wallet...`;
        const id = setLoadingAlertMessage(loadingMessage);
        try {
            await aptos.fundAccount({ accountAddress: address, amount: 100_000_000 });
            await fetchBalance(address);
            setLoadingUpdateAlertMessage(id, `Successful to fund wallet to 0x${address.toString().substring(2, 6)}...${address.toString().substring(address.toString().length - 5, address.toString().length)}`, "success");
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, error.message, "error");
        }
    };

    const transferAPT = async (accountAddress: AccountAddress, recipient: AccountAddress, amount: number) : Promise<string> => {
        const transaction: InputTransactionData = {
            data: {
                function: "0x1::coin::transfer",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [recipient.toStringLong(), amount],
            },
        };

        const loadingMessage = "Please accept transaction in your mobile wallet";

        const id = setLoadingAlertMessage(loadingMessage);

        try {
            const response = await signAndSubmitTransaction(transaction);
            await aptos.waitForTransaction({
                transactionHash: response.hash,
            });
            
            setLoadingUpdateAlertMessage(id, `Transaction Confirmed with hash: ${response.hash}`, "success");
            await fetchBalance(accountAddress);
            return response.hash;
        } catch (error: any) {
            setLoadingUpdateAlertMessage(id, "Transaction failed. Please try again later", "error");
            return "Error";
        }
    };

    const transferAPTBack = async (admin: Account, recipient: AccountAddress, amount: number) : Promise<string> => {
        try {
            const txn = await aptos.transaction.build.simple({
                sender: admin.accountAddress,
                data: {
                function: "0x1::coin::transfer",
                typeArguments: ["0x1::aptos_coin::AptosCoin"],
                functionArguments: [recipient, amount],
                },
            });

            const committedTxn = await aptos.signAndSubmitTransaction({ signer: admin, transaction: txn });

            await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
            setSuccessAlertMessage(`Successful to return your APT with hash ${committedTxn.hash}`)
            return committedTxn.hash;
        } catch (error: any) {
            setErrorAlertMessage(error.message);
            return "Error";
        }
    };

    return (
        <ThemeProvider theme={theme}>
        <AppContexts.Provider
        value={{ 
            aptos,
            spaceshipAdmin,
            mySpaceships,
            myItems,
            ownedItems,
            myBalance,
            myStats,
            allUserStats,
            itemsCollectionAddress,
            listedNfts,
            allSellers,
            myRank,
            setMyRank,
            setSpaceshipAdmin,
            fetchAdminAccount,
            fetchBalance,
            fundWallet,
            transferAPT,
            transferAPTBack,
            handleMint,
            handleMintItems,
            setMyBalance,
            fetchSpaceships,
            handleNewGameSession,
            fetchUserStats,
            fetchItemsCollectionAddress,
            getUserOwnedItems,
            getItem,
            handleListItem,
            getAllItems,
            getAllSellers,
            getAllListedNfts,
            handlePurchaseItem,
            fetchAllUserStats,
            }}>
            {children}
        </AppContexts.Provider>
        </ThemeProvider>
    )
};

export const AppContext: FC<{ children: ReactNode }> = ({ children }) => {
    return (
        <AlertProvider>
        <AutoConnectProvider>
        <WalletContext>
        <UserContextProvider>
            <AppContextProvider>{children}</AppContextProvider>
        </UserContextProvider>
        </WalletContext>
        </AutoConnectProvider>
        </AlertProvider>
    );
};
