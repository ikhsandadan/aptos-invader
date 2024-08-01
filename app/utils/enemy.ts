// Import ALiens image
import alien1 from '../images/Aliens/Alien1.1.png';
import alien2 from '../images/Aliens/Alien1.2.png';
import alien3 from '../images/Aliens/Alien2.1.png';
import alien4 from '../images/Aliens/Alien2.2.png';
import alien5 from '../images/Aliens/Alien3.1.png';
import alien6 from '../images/Aliens/Alien3.2.png';

// Import Bosses image
import boss1 from '../images/Bosses/Boss1.png';
import boss2 from '../images/Bosses/Boss2.png';
import boss3 from '../images/Bosses/Boss3.png';

const aliens = [
    { name: 'Alien1', image: alien1, color: "#fab955", hp: 1, maxFrame: 8 },
    { name: 'Alien2', image: alien2, color: "#fab955", hp: 2, maxFrame: 8 },
    { name: 'Alien3', image: alien3, color: "#391f57", hp: 3, maxFrame: 15 },
    { name: 'Alien4', image: alien4, color: "#391f57", hp: 4, maxFrame: 15 },
    { name: 'Alien5', image: alien5, color: "#ee2768", hp: 5, maxFrame: 9 },
    { name: 'Alien6', image: alien6, color: "#f9c228", hp: 6, maxFrame: 7 },
];

const bosses = [
    { name: 'Boss1', image: boss1, width: 140, height: 140, widthPos: 440, heightPos: 420, color: "#b33831", maxFrame: 13 },
    { name: 'Boss2', image: boss2, width: 100, height: 140, widthPos: 300, heightPos: 420, color: "#1ebc73", maxFrame: 13 },
    { name: 'Boss3', image: boss3, width: 150, height: 140, widthPos: 460, heightPos: 420, color: "#a884f3", maxFrame: 19 },
];

export { aliens };
export { bosses };