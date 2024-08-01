"use client";
import { FC, useEffect } from 'react';
import Modal from '@mui/material/Modal';
import Box from '@mui/material/Box';
import Pagination from '@mui/material/Pagination';
import { IconButton } from '@mui/material';

import { CollectedItem, useAppContext } from '../context/AppContext';
import { useUserContext } from '../context/UserContext';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    p: 4,
};

interface ItemCollectedModalProps {
    open: boolean,
    collectedItems: CollectedItem[],
    selectedItems: CollectedItem[],
    currentItems: CollectedItem[],
    scores: number,
    totalPages: number,
    clickedItems: { [key: string]: boolean },
    handleClose: () => void,
    handleChangePage: (newPage: number) => void,
    handleSelectItem: (id: number, name: string) => void,
    ship: any,
};

const ItemCollectedModal: FC<ItemCollectedModalProps> = ({ 
    open, 
    collectedItems, 
    selectedItems, 
    currentItems, 
    scores, 
    totalPages, 
    clickedItems, 
    handleClose, 
    handleChangePage, 
    handleSelectItem, 
    ship 
}) => {
    const { spaceshipAdmin, ownedItems, handleMintItems, handleNewGameSession } = useAppContext();
    const { userAddress } = useUserContext();

    const handleMintItem = async () => {
        if (!spaceshipAdmin || !userAddress) {
            console.error("spaceshipAdmin or userAddress is not available");
            return;
        }
    
        try {
            for (const item of selectedItems) {
                console.log("Processing item:", item);
                await handleMintItems(spaceshipAdmin, userAddress, item);
                console.log("Finished processing item:", item);
            }
            console.log("All items have been processed");
        } catch (error) {
            console.error("An error occurred while minting items:", error);
        }

        console.log(selectedItems);
    };

    const handleSubmitNewGameSession = async () => {
        if (!spaceshipAdmin || !userAddress) {
            console.error("spaceshipAdmin or userAddress is not available");
            return;
        }
    
        try {
            await handleNewGameSession(spaceshipAdmin, userAddress, scores, ship.name);
        } catch (error) {
            console.error("An error occurred while minting items:", error);
        }
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="parent-modal-title"
            aria-describedby="parent-modal-description"
            >
            <Box sx={style}>
                <div className="flex flex-col items-center p-2 max-w-xl">
                    <div className="text-3xl font-bold text-white">GAME OVER</div>
                    <div className="text-xl font-bold text-white mb-3">Your Score: {scores}</div>
                    <div className="text-xl font-bold text-white">Collected Items:</div>
                    <div className='flex flex-row flex-wrap items-center justify-items-center justify-center my-4'>
                        {currentItems.map((item, index) => {
                            let rarityColor;
                            switch (item.rarity) {
                                case 'Common':
                                    rarityColor = 'text-white';
                                    break;
                                case 'Uncommon':
                                    rarityColor = 'text-green-500';
                                    break;
                                case 'Rare':
                                    rarityColor = 'text-blue-500';
                                    break;
                                case 'Epic':
                                    rarityColor = 'text-purple-500';
                                    break;
                                case 'Legendary':
                                    rarityColor = 'text-red-500';
                                    break;
                                default:
                                    rarityColor = 'text-white';
                            }

                            return (
                                <IconButton disabled={ownedItems.map((item: any) => item.name).includes(item.name)} className={`grid text-xl font-bold text-white items-center justify-items-center p-2 min-w-max rounded-md justify-self-center self-center ${
                                    clickedItems[item.id] ? 'shadow-[0_0_10px_#25fff2] m-4' : ''
                                }`} key={index} id={`item-${item.id}`} onClick={() => handleSelectItem(item.id, item.name)}>
                                    <img src={item.image.src} className='size-16' />
                                    <div>{item.name}</div>
                                    <div className={rarityColor}>{item.rarity}</div>
                                </IconButton>
                            );
                        })}
                    </div>
                    <div className='flex justify-center my-4 text-white'>
                        {collectedItems.length > 0 ? (
                            <Pagination 
                            count={totalPages} 
                            variant="outlined" 
                            shape="rounded" 
                            color='secondary' 
                            onChange={(_, newPage) => handleChangePage(newPage)}
                            sx={{
                                '& .MuiPaginationItem-root': {
                                    color: 'white',
                                    fontWeight: 'bold',
                                },
                            }}
                        />
                        ) : (null)}
                    </div>
                    <div className='flex flex-row gap-2'>
                        <button disabled={selectedItems.length === 0} onClick={handleMintItem} className="bg-white rounded-md my-2 px-4 py-2 text-black hover:bg-transparent hover:text-white hover:border hover:border-white">Mint your items</button>
                        <button onClick={handleSubmitNewGameSession} className="bg-white rounded-md my-2 px-4 py-2 text-black hover:bg-transparent hover:text-white hover:border hover:border-white">Submit Game Session</button>
                        <button onClick={handleClose} className="bg-white rounded-md my-2 px-4 py-2 text-black hover:bg-transparent hover:text-white hover:border hover:border-white">Back To Home</button>
                    </div>
                </div>
            </Box>
        </Modal>
    )
};

export default ItemCollectedModal;