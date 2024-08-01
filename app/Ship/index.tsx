export interface Ship {
    name: string;
    image: string;
    icon: string;
    hp: number;
    energyRegen: number;
    maxEnergy: number;
    laserWidth: number;
    laserDamage: number;
    laserColor: string;
    bullet: number;
    width: number;
    height: number;
    maxFrame: number;
    price: number;
};

export interface StatCardProps {
    label: string;
    value: number;
};

export interface ShipStatsProps {
    ship: Ship;
};