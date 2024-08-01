"use client";
import { usePathname } from 'next/navigation';
import Homepage from './Home/page';
import Store from './Store/page';
import Profile from './Profile/page';
import Leaderboard from './Leaderboard/page';
import ItemStore from './ItemStore/page';

export default function Home() {
  const pathName = usePathname();
  return (
    <>
      {pathName === '/' && <Homepage />}
      {pathName === '/Store' && <Store />}
      {pathName === '/Profile' && <Profile />}
      {pathName === '/Leaderboard' && <Leaderboard />}
      {pathName === '/ItemStore' && <ItemStore />}
    </>
  );
}