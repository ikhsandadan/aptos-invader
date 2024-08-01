import { useEffect, useRef } from 'react';

const Canvas = ({ setScores, ship, aliens, bosses, items, setHp, setCollectedItems }) => {
    const ref = useRef();
    const CANVAS_WIDTH = 1074;
    const CANVAS_HEIGHT = 576;

    useEffect(() => {
        try {
            if (document.readyState === 'complete') {
                const canvas = ref.current;
                const context = canvas.getContext("2d");
                
                // Set the canvas size
                canvas.width = CANVAS_WIDTH;
                canvas.height = CANVAS_HEIGHT;

                const resizeCanvas = () => {
                    const containerWidth = window.innerWidth;
                    const containerHeight = window.innerHeight;
                    const scale = Math.min(containerWidth / CANVAS_WIDTH, containerHeight / CANVAS_HEIGHT);
                    
                    canvas.style.width = `${CANVAS_WIDTH * scale}px`;
                    canvas.style.height = `${CANVAS_HEIGHT * scale}px`;
                };

                resizeCanvas();
                window.addEventListener('resize', resizeCanvas);
                
                context.fillStyle = "white";
                context.strokeStyle = "white";
                context.lineWidth = 5;
    
                class Laser {
                    constructor(game, width, damage, colorInside, colorOutside) {
                        this.game = game;
                        this.x = 0;
                        this.y = 0;
                        this.height = this.game.height - 50;
                        this.width = width;
                        this.damage = damage;
                        this.colorInside = colorInside;
                        this.colorOutside = colorOutside;
                    }
    
                    render(context) {
                        this.x = this.game.player.x + this.game.player.width / 2 - this.width / 2;
    
                        this.game.player.energy -= this.damage;
    
                        context.save();
                        context.fillStyle = this.colorInside;
                        context.fillRect(this.x, this.y, this.width, this.height);
                        context.fillStyle = this.colorOutside;
                        context.fillRect(this.x + this.width * 0.2, this.y, this.width * 0.6, this.height);
                        context.restore();
    
                        if (this.game.spriteUpdate) {
                            this.game.waves.forEach(wave => {
                                wave.enemies.forEach(enemy => {
                                    if (this.game.checkCollision(enemy, this)) {
                                        enemy.hit(this.damage);
                                        createParticles({
                                            object: enemy,
                                            color: enemy.color,
                                            fades: true
                                        });
                                    }
                                });
                            });
        
                            this.game.bossArray.forEach(boss => {
                                if (this.game.checkCollision(boss, this)) {
                                    boss.hit(this.damage);
                                    createParticles({
                                        object: boss,
                                        color: boss.color,
                                        fades: true
                                    });
                                }
                            });
                        }
                    }
                };
                
                class LaserConfig extends Laser {
                    constructor(game, width, damage, colorInside, colorOutside) {
                        super(game, width, damage, colorInside, colorOutside);
                    }
    
                    render(context) {
                        if (this.game.player.energy > 1 && !this.game.player.cooldown) {
                            super.render(context);
                        }
                    }
                }
    
                class Player {
                    constructor(game) {
                        this.game = game;
                        this.width = ship.width;
                        this.height = ship.height;
                        this.x = this.game.width / 2 - this.width / 2;
                        this.y = this.game.height - this.height;
                        this.speed = 5;
                        this.lives = ship.hp;
                        this.maxLives = ship.hp;
                        this.image = new Image();
                        this.image.src = ship.image;
                        this.widthPos = 256;
                        this.heightPos = 256;
                        this.frameX = 1;
                        this.maxFrame = ship.maxFrame;
                        this.energy = 25;
                        this.maxEnergy = ship.maxEnergy;
                        this.cooldown = false;
                        this.collectedItems = [];
                        this.itemCounter = 1;
                    }
                
                    draw(context) {
                        if (this.game.keys.indexOf("Control") > -1) {
                            this.laser = new LaserConfig(this.game, ship.laserWidth, ship.laserDamage, ship.laserColor, "white");
                            this.laser.render(context,ship.laserWidth, ship.laserDamage, ship.laserColor, "white");
                        }
                
                        context.drawImage(this.image, this.frameX * this.widthPos, 0, this.widthPos, this.heightPos, this.x, this.y, this.width, this.height);
                    }
                
                    update() {
                        if (this.game.spriteUpdate && this.lives >= 1) {
                            this.frameX = 0;
                        }
                
                        // Energy
                        if (this.energy < this.maxEnergy) {
                            this.energy = this.energy + (ship.energyRegen * 0.1);
                        }
                
                        if (this.energy < 1) {
                            this.cooldown = true;
                        } else if (this.energy > this.maxEnergy * 0.2) {
                            this.cooldown = false;
                        }
                
                        // Movement
                        if (this.game.keys.indexOf("ArrowLeft") > -1) {
                            this.x -= this.speed;
                        }
                
                        if (this.game.keys.indexOf("ArrowRight") > -1) {
                            this.x += this.speed;
                        }
                
                        // Boundaries
                        if (this.x < 0) {
                            this.x = 0;
                        } else if (this.x > this.game.width - this.width) {
                            this.x = this.game.width - this.width;
                        }
                    }
                
                    shoot() {
                        if (ship.bullet === 2) {
                            const projectile1 = this.game.getProjectile();
                            const projectile2 = this.game.getProjectile();
                            if (projectile1 && projectile2) {
                                projectile1.start(this.x + this.width * 0.45, this.y + 30);
                                projectile2.start(this.x + this.width * 0.65, this.y + 30);
                            }
                        } else if (ship.bullet === 3) {
                            const projectile1 = this.game.getProjectile();
                            const projectile2 = this.game.getProjectile();
                            const projectile3 = this.game.getProjectile();
                            if (projectile1 && projectile2 && projectile3) {
                                projectile1.start(this.x + this.width * 0.30, this.y + 30);
                                projectile2.start(this.x + this.width * 0.55, this.y + 30);
                                projectile3.start(this.x + this.width * 0.80, this.y + 30);
                            }
                        } else {
                            const projectile = this.game.getProjectile();
                            if (projectile) {
                                projectile.start(this.x + this.width * 0.55, this.y + 30);
                            }
                        }
                    }

                    collectItem(item) {
                        const newItem = {
                            id: this.itemCounter++,
                            name: item.name,
                            image: item.image,
                            rarity: item.rarity,
                            collected: false,
                        };
                        this.game.score += 50;
                        this.collectedItems.push(newItem);
                        setCollectedItems((prevItems) => [...prevItems, newItem]);
                    }
                
                    restart() {
                        this.x = this.game.width / 2 - this.width / 2;
                        this.y = this.game.height - this.height;
                        this.lives = ship.hp;
                        this.collectedItems = [];
                        setCollectedItems([]);
                    }
                };                
    
                class Particle {
                    constructor({position, velocity, radius, color, fades}) {
                        this.position = position;
                        this.velocity = velocity;
        
                        this.radius = radius;
                        this.color = color;
                        this.opacity = 1;
                        this.fades = fades;
                    };
        
                    draw() {
                        context.save();
                        context.globalAlpha = this.opacity;
                        context.beginPath();
                        context.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
                        context.fillStyle = this.color;
                        context.fill();
                        context.closePath();
                        context.restore();
                    };
        
                    update() {
                        this.draw();
                        this.position.x += this.velocity.x;
                        this.position.y += this.velocity.y;
        
                        if (this.fades)
                        this.opacity -= 0.01;
                    };
                };
    
                class Projectile {
                    constructor() {
                        this.width = 10;
                        this.height = 10;
                        this.x = 0;
                        this.y = 0;
                        this.speed = 10;
                        this.free = true;
                        this.radius = 4;
                    }
    
                    draw(context) {
                        if (!this.free) {
                            context.save();
                            context.beginPath();
                            context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
                            context.fillStyle = ship.laserColor;
                            context.fill();
                            context.closePath();
                            context.restore();
                        }
                    }
    
                    update() {
                        if (!this.free) {
                            this.y -= this.speed;
    
                            if (this.y < -this.height) {
                                this.reset();
                            }
                        }
                    }
    
                    start(x, y) {
                        this.x = x - this.width / 2;
                        this.y = y;
                        this.free = false;
                    }
    
                    reset() {
                        this.free = true;
                    }
                };

                class EnemyProjectile {
                    constructor({position, velocity}) {
                        this.position = position;
                        this.velocity = velocity;
        
                        this.width = 3;
                        this.height = 10;
                    };
        
                    draw() {
                        context.save();
                        context.fillStyle = "red";
                        context.fillRect(this.position.x, this.position.y, this.width, this.height);
                        context.restore();
                    };
        
                    update() {
                        this.draw();
                        this.position.x += this.velocity.x;
                        this.position.y += this.velocity.y;
                    };
                };
    
                class BossProjectile {
                    constructor({position, velocity}) {
                        this.position = position;
                        this.velocity = velocity;
        
                        this.width = 8;
                        this.height = 10;
                    };
        
                    draw() {
                        context.save();
                        context.fillStyle = "red";
                        context.beginPath();
                        context.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, Math.min(this.width, this.height) / 2, 0, Math.PI * 2);
                        context.closePath();
                        context.fill();
                        context.restore();
                    }
                    
        
                    update() {
                        this.draw();
                        this.position.x += this.velocity.x;
                        this.position.y += this.velocity.y;
                    };
                };
    
                class Enemy {
                    constructor(game, positionX, positionY) {
                        this.game = game;
                        this.width = this.game.enemySize;
                        this.height = this.game.enemySize;
                        this.x = 0;
                        this.y = 0;
                        this.positionX = positionX;
                        this.positionY = positionY;
                        this.frameX = 1;
                        this.widthPos = 256;
                        this.heightPos = 256;
                        this.markedForDeletion = false;
                    }
    
                    draw(context) {
                        context.drawImage(this.image, this.frameX * this.widthPos, 0, this.widthPos, this.heightPos, this.x, this.y, this.width, this.height);
                    }
    
                    update(x, y) {
                        if (this.game.spriteUpdate && this.lives >= 1) {
                            this.frameX = 0;
                        }

                        this.x = x + this.positionX;
                        this.y = y + this.positionY;
    
                        // Check collision enemies - projectiles
                        this.game.projectilesPool.forEach(projectile => {
                            if (!projectile.free && this.game.checkCollision(this, projectile)) {
                                this.hit(1);
                                projectile.reset();
    
                                createParticles({
                                    object: this,
                                    color: this.color,
                                    fades: true
                                });
                            }
                        });
    
                        // Check enemy destroyed
                        if (this.lives < 1 && this.game.spriteUpdate) {
                            this.frameX++;
                            if (this.frameX > this.maxFrame) {
                                this.markedForDeletion = true;
                                this.game.score += this.maxLives * 10;
                            }
                        }
    
                        // Check collision enemy bullets - player
                        this.game.enemyProjectiles.forEach((enemyProjectile, index) => {
                            if (
                                enemyProjectile.position.y + enemyProjectile.height >= 
                                this.game.player.y && enemyProjectile.position.x + 
                                enemyProjectile.width >= this.game.player.x && 
                                enemyProjectile.position.x <= this.game.player.x + this.game.player.width
                                ) {
                                delete this.game.enemyProjectiles[index];
                                this.game.player.lives -= 1;
        
                                createParticles({
                                    object: this.game.player,
                                    color: "white",
                                    fades: true
                                });

                                this.game.player.frameX = 1;
                                this.game.player.draw(context);
    
                                if (this.game.player.lives < 1) {
                                    this.gameOver = true;
                                }
                            }
                        });
    
                        // Check collison enemies - player
                        if (this.game.checkCollision(this, this.game.player)) {
                            this.frameX++;
                            if (this.frameX > this.maxFrame) {
                                this.markedForDeletion = true;
                            }

                            this.game.player.lives -= this.lives;
    
                            createParticles({
                                object: this.game.player,
                                color: "white",
                                fades: true
                            });

                            this.game.player.frameX = 1;
                            this.game.player.draw(context);

                            if (this.game.player.lives < 1) {
                                this.gameOver = true;
                            }
                        }
                    }
    
                    shoot(enemyProjectiles) {
                        enemyProjectiles.push(new EnemyProjectile({
                            position: {
                                x: this.x + this.width / 2,
                                y: this.y + this.height
                            },
                            velocity: {
                                x: 0,
                                y: 5
                            }
                        }));
                    };
    
                    hit(damage) {
                        this.lives -= damage;
                        if (this.lives >= 1) {
                            this.frameX = 1;
                        }
                    }
                };
    
                class Alien1 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[0].image.src;
                        this.lives = aliens[0].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[0].color;
                        this.maxFrame = aliens[0].maxFrame;
                    }
                };
    
                class Alien2 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[1].image.src;
                        this.lives = aliens[1].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[1].color;
                        this.maxFrame = aliens[1].maxFrame;
                    }
                };
    
                class Alien3 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[2].image.src;
                        this.lives = aliens[2].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[2].color;
                        this.maxFrame = aliens[2].maxFrame;
                    }
                };

                class Alien4 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[3].image.src;
                        this.lives = aliens[3].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[3].color;
                        this.maxFrame = aliens[3].maxFrame;
                    }
                };

                class Alien5 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[4].image.src;
                        this.lives = aliens[4].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[4].color;
                        this.maxFrame = aliens[4].maxFrame;
                    }
                };

                class Alien6 extends Enemy {
                    constructor(game, positionX, positionY) {
                        super(game, positionX, positionY);
                        this.image = new Image();
                        this.image.src = aliens[5].image.src;
                        this.lives = aliens[5].hp;
                        this.maxLives = this.lives;
                        this.color = aliens[5].color;
                        this.maxFrame = aliens[5].maxFrame;
                    }
                };
    
                class Boss {
                    constructor(game, bossLives) {
                        this.game = game;
                        this.width = 140;
                        this.height = 140;
                        this.x = this.game.width / 2 - this.width / 2;
                        this.y = -this.height;
                        this.speedX = Math.random() < 0.5 ? -1 : 1;
                        this.speedY = 0;
                        this.markedForDeletion = false;
                        this.frameX = 1;
                        this.lives = bossLives;
                        this.maxLives = this.lives;
                        this.maxFrame = 13;
                        this.color = "#000";
                        this.image = new Image();
                        this.widthPos = 140;
                        this.heightPos = 140;
                    }
    
                    draw(context) {
                        context.drawImage(this.image, this.frameX * this.widthPos, 0, this.widthPos, this.heightPos, this.x, this.y, this.width, this.height);
                        
                        if (this.lives >= 1) {
                            context.save();
                            context.textAlign = "center";
                            context.font = "20px Arial";
                            context.shadowOffsetX = 3;
                            context.shadowOffsety = 3;
                            context.shadowColor = "black";
                            context.fillText(Math.floor(this.lives), this.x + this.width / 2, this.y + 40);
                            context.restore();
                        }
                    }
    
                    update() {
                        this.speedY = 0;
                        if (this.game.spriteUpdate && this.lives >= 1) {
                            this.frameX = 0;
                        }

                        if (this.y < 0) {
                            this.y += 4;
                        }
    
                        if (this.x < 0 || this.x > this.game.width - this.width && this.lives >= 1) {
                            this.speedX *= -1;
                            this.speedY = this.height / 4;
                        }
    
                        this.x += this.speedX;
                        this.y += this.speedY;
    
                        // Collision detection boss - projectile
                        this.game.projectilesPool.forEach(projectile => {
                            if (this.game.checkCollision(this, projectile) && !projectile.free && this.lives >= 1 && this.y >= 0) {
                                this.hit(1);
                                projectile.reset();
                                createParticles({
                                    object: this,
                                    color: this.color,
                                    fades: true
                                });
                            }
                        });
    
                        // Check collision boss bullets - player
                        this.game.bossProjectiles.forEach((bossProjectile, index) => {
                            if (
                                bossProjectile.position.y + bossProjectile.height >= 
                                this.game.player.y && bossProjectile.position.x + 
                                bossProjectile.width >= this.game.player.x && 
                                bossProjectile.position.x <= this.game.player.x + this.game.player.width
                                ) {
                                delete this.game.bossProjectiles[index];
                                this.game.player.lives -= 1;
        
                                createParticles({
                                    object: this.game.player,
                                    color: "white",
                                    fades: true
                                });

                                this.game.player.frameX = 1;
                                this.game.player.draw(context);
    
                                if (this.game.player.lives < 1) {
                                    this.gameOver = true;
                                }
                            }
                        });
    
                        // Collision detection boss - player
                        if (this.game.checkCollision(this, this.game.player) && this.lives >= 1) {
                            this.frameX++;
                            if (this.frameX > this.maxFrame) {
                                this.markedForDeletion = true;
                            }

                            this.game.player.lives -= this.lives;
    
                            createParticles({
                                object: this.game.player,
                                color: "white",
                                fades: true
                            });

                            this.game.player.frameX = 1;
                            this.game.player.draw(context);

                            if (this.game.player.lives < 1) {
                                this.gameOver = true;
                            }
                        }
    
                        // Boss destroyed
                        if (this.lives < 1 && this.game.spriteUpdate) {
                            this.frameX++;
                            
                            if (this.frameX > this.maxFrame) {
                                this.markedForDeletion = true;
                                this.game.score += this.maxLives * 10;
        
                                this.game.bossLives += 10;

                                if (this.game.player.lives < this.game.player.maxLives) {
                                    this.game.player.lives++;
                                }

                                // Drop an item
                                const droppedItemData = this.game.chooseItemByDropRate(this.name);
                                const droppedItem = new Item(this.game, this.x + this.width / 2, this.y + this.height / 2, droppedItemData);
                                this.game.items.push(droppedItem);

                                if (!this.gameOver) {
                                    this.game.newWave();
                                }
                            }
                        }
                    }
    
                    shoot(bossProjectiles) {
                        let randomValue = Math.random();

                        if (this.name === "Boss3") {
                            if (randomValue < 0.7) {
                                const offset = 45; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 4, offset, 4);
                            } else {
                                const offset = 35; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 6, offset, 6);
                            }
                        } else if (this.name === "Boss2") {
                            if (randomValue < 0.7) {
                                const offset = 50; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 3, offset, 3);
                            } else {
                                const offset = 40; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 5, offset, 5);
                            }
                        } else {
                            if (randomValue < 0.7) {
                                const offset = 55; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 2, offset, 2);
                            } else {
                                const offset = 45; // Offset for the side-by-side projectiles
                                this.createProjectiles(bossProjectiles, this.width / 4, offset, 4);
                            }
                        }
                    }
                
                    createProjectiles(bossProjectiles, positionFactor, offset, count) {
                        for (let i = 0; i < count; i++) {
                            let velocity = { x: 0, y: 5 }; // Default straight down velocity
                            
                            // Adjust velocity for angled projectiles
                            if (count >= 3) {
                                const angle = 30 * (Math.PI / 180); // Convert 30 degrees to radians
                                if (i === 0 || (count === 5 && i === 1) || (count === 6 && i <= 1)) {
                                    // Leftmost or second from left projectile, angle to the left
                                    velocity = { x: -5 * Math.sin(angle), y: 5 * Math.cos(angle) };
                                } else if (i === count - 1 || (count === 5 && i === count - 2) || (count === 6 && i >= count - 2)) {
                                    // Rightmost or second from right projectile, angle to the right
                                    velocity = { x: 5 * Math.sin(angle), y: 5 * Math.cos(angle) };
                                }
                            }
                    
                            bossProjectiles.push(new BossProjectile({
                                position: {
                                    x: this.x + positionFactor - offset + (i * offset),
                                    y: this.y + this.height
                                },
                                velocity: velocity
                            }));
                        }
                    }
    
                    hit(damage) {
                        this.lives -= damage;
                        if (this.lives >= 1) {
                            this.frameX = 1;
                        }
                    }
                };

                class Boss1 extends Boss {
                    constructor(game, bossLives) {
                            super(game, bossLives);
                            this.name = bosses[0].name;
                            this.width = bosses[0].width;
                            this.height = bosses[0].height;
                            this.widthPos = bosses[0].widthPos;
                            this.heightPos = bosses[0].heightPos;
                            this.image = new Image();
                            this.image.src = bosses[0].image.src;
                            this.color = bosses[0].color;
                            this.maxFrame = bosses[0].maxFrame;
                    }
                };

                class Boss2 extends Boss {
                    constructor(game, bossLives) {
                            super(game, bossLives);
                            this.name = bosses[1].name;
                            this.width = bosses[1].width;
                            this.height = bosses[1].height;
                            this.widthPos = bosses[1].widthPos;
                            this.heightPos = bosses[1].heightPos;
                            this.image = new Image();
                            this.image.src = bosses[1].image.src;
                            this.color = bosses[1].color;
                            this.maxFrame = bosses[1].maxFrame;
                    }
                };

                class Boss3 extends Boss {
                    constructor(game, bossLives) {
                            super(game, bossLives);
                            this.name = bosses[2].name;
                            this.width = bosses[2].width;
                            this.height = bosses[2].height;
                            this.widthPos = bosses[2].widthPos;
                            this.heightPos = bosses[2].heightPos;
                            this.image = new Image();
                            this.image.src = bosses[2].image.src;
                            this.color = bosses[2].color;
                            this.maxFrame = bosses[2].maxFrame;
                    }
                };

                class Item {
                    constructor(game, x, y, itemData) {
                        this.game = game;
                        this.width = 30;
                        this.height = 30;
                        this.x = x;
                        this.y = y;
                        this.image = new Image();
                        this.image.src = itemData.image;
                        this.name = itemData.name;
                        this.rarity = itemData.rarity;
                        this.speed = 2;
                        this.markedForDeletion = false;
                    }
                
                    update() {
                        this.y += this.speed;
                        if (this.y > this.game.height) {
                            this.markedForDeletion = true;
                        }
                
                        // Check collision with the player
                        if (this.game.checkCollision(this, this.game.player)) {
                            this.markedForDeletion = true;
                            this.game.player.collectItem(this);
                        }
                    }
                
                    draw(context) {
                        context.drawImage(this.image, this.x, this.y, this.width, this.height);
                    }
                };
    
                class Wave {
                    constructor(game) {
                        this.game = game;
                        this.width = this.game.columns * this.game.enemySize;
                        this.height = this.game.rows * this.game.enemySize;;
                        this.x = this.game.width / 2 - this.width / 2;
                        this.y = -this.height;
                        this.speedX = (Math.random() < 0.5 ? -1 : 1) * 0.5;
                        this.speedY = 0;
                        this.enemies = [];
                        this.nextWaveTrigger = false;
                        this.markedForDeletion = false;
                        this.create();
                    }
    
                    render(context) {
                        if (this.y < 0) {
                            this.y += 5;
                        }
    
                        this.speedY = 0;
                        this.x += this.speedX;
    
                        if (this.x < 0 || this.x > this.game.width - this.width) {
                            this.speedX *= -1;
                            this.speedY = this.game.enemySize / 4;
                        }
    
                        this.x += this.speedX;
                        this.y += this.speedY;
                        this.enemies.forEach(enemy => {
                            enemy.update(this.x, this.y);
                            enemy.draw(context);
    
                            // Each enemy has a chance to shoot a bullet
                            if (Math.random() < 0.0002) {
                                enemy.shoot(this.game.enemyProjectiles);
                            }
                        });
    
                        this.enemies = this.enemies.filter(object => !object.markedForDeletion);
    
                        if (this.enemies.length <= 0) {
                            this.markedForDeletion = true;
                        }
                    }
    
                    create() {
                        for (let y = 0; y < this.game.rows; y++) {
                            for (let x = 0; x < this.game.columns; x++) {
                                let enemyX = x * this.game.enemySize;
                                let enemyY = y * this.game.enemySize;
                    
                                // Determine the type of alien based on random chance
                                let aliens = [
                                    { type: Alien6, threshold: 0.1},
                                    { type: Alien5, threshold: 0.2 },
                                    { type: Alien4, threshold: 0.3 },
                                    { type: Alien3, threshold: 0.4 },
                                    { type: Alien2, threshold: 0.6 },
                                    { type: Alien1, threshold: 1.0 }
                                ];
                                
                                let randomValue = Math.random();
                                for (let alien of aliens) {
                                    if (randomValue < alien.threshold) {
                                        this.enemies.push(new alien.type(this.game, enemyX, enemyY));
                                        break;
                                    }
                                }
                                
                            }
                        }
                    }
                    
                };
    
                class Game {
                    constructor(canvas) {
                        this.canvas = canvas;
                        this.width = this.canvas.width;
                        this.height = this.canvas.height;
                        this.keys = [];
                        this.player = new Player(this);
                        this.items = [];
    
                        this.projectilesPool = [];
                        this.numberOfProjectiles = 10;
                        this.createProjectiles();
                        this.fired = false;
    
                        this.columns = 3;
                        this.rows = 5;
                        this.enemySize = 80;
                        this.enemyProjectiles = [];
    
                        this.waves = [];
                        this.waveCount = 1;

                        this.spriteUpdate = false;
                        this.spriteTimer = 0;
                        this.spriteInterval = 100;
    
                        this.score = 0;
                        this.gameOver = false;
    
                        this.bossLives = 20;
                        this.bossArray = [];
                        this.bossProjectiles = [];
                        this.restart();
    
                        // Event listeners
                        window.addEventListener("keydown", e => {
                            if (e.key === " " && !this.fired) this.player.shoot();
                            this.fired = true;
                            if (this.keys.indexOf(e.key) === -1) this.keys.push(e.key);
                            if (e.key === "r" && this.gameOver) this.restart();
                        });
    
                        window.addEventListener("keyup", e => {
                            this.fired = false;
                            const index = this.keys.indexOf(e.key);
                            if (index > -1) this.keys.splice(index, 1);
                        });
                    }
    
                    render(context, deltaTime) {
                        if (this.spriteTimer > this.spriteInterval) {
                            this.spriteUpdate = true;
                            this.spriteTimer = 0;
                        } else {
                            this.spriteUpdate = false;
                            this.spriteTimer += deltaTime;
                        }

                        if (!this.gameOver && this.player.lives >= 1) {
                            setHp(this.player.lives);
                            this.player.frameX = 0;
                            this.drawStatus(context);
    
                            this.projectilesPool.forEach(projectile => {
                                projectile.update();
                                projectile.draw(context);
                            });
    
                            this.enemyProjectiles = this.enemyProjectiles.filter(enemyProjectile => {
                                return enemyProjectile.position.y + enemyProjectile.height < this.canvas.height;
                            });
    
                            this.enemyProjectiles.forEach(enemyProjectile => {
                                enemyProjectile.update();
                            });
    
                            this.bossProjectiles = this.bossProjectiles.filter(bossProjectile => {
                                return bossProjectile.position.y + bossProjectile.height < this.canvas.height;
                            });
                            
                            this.bossProjectiles.forEach(bossProjectile => {
                                bossProjectile.update();
                            });

                            this.items = this.items.filter(item => !item.markedForDeletion);

                            this.items.forEach(item => {
                                item.update();
                                item.draw(context);
                            });
    
                            this.player.draw(context);
                            this.player.update();
    
                            this.bossArray.forEach(boss => {
                                boss.draw(context);
                                boss.update();
    
                                // Boss has a chance to shoot a bullet
                                if (Math.random() < 0.01) {
                                    boss.shoot(this.bossProjectiles);
                                }
                            });
    
                            this.bossArray = this.bossArray.filter(object => !object.markedForDeletion);
    
                            this.waves.forEach(wave => {
                                wave.render(context);
    
                                if (wave.enemies.length < 1 && !wave.nextWaveTrigger && !this.gameOver) {
                                    this.newWave();
                                    wave.nextWaveTrigger = true;
                                }
                            });
                        } else {
                            this.player.frameX++;

                            if (this.player.frameX > this.player.maxFrame) {
                                setScores(this.score);
                                setHp(0);
                            }

                            this.player.draw(context);
                        }
                    }
    
                    // Create projectiles object pool
                    createProjectiles() {
                        for (let i = 0; i < this.numberOfProjectiles; i++) {
                            this.projectilesPool.push(new Projectile());
                        }
                    }
    
                    // Get free projectile object from the pool
                    getProjectile() {
                        for (let i = 0; i < this.projectilesPool.length; i++) {
                            if (this.projectilesPool[i].free) {
                                this.projectilesPool[i].free = false;
                                return this.projectilesPool[i];
                            }
                        }
                        return null; // If no free projectile is available
                    }
    
                    // Collision detection
                    checkCollision(a, b) {
                        return (
                            a.x < b.x + b.width &&
                            a.x + a.width > b.x &&
                            a.y < b.y + b.height &&
                            a.y + a.height > b.y
                        )
                    }
    
                    // Draw status
                    drawStatus(context) {
                        context.save();
                        context.shadowOffsetX = 2;
                        context.shadowOffsety = 2;
                        context.shadowColor = "grey";
                        context.font = "20px Arial";
    
                        context.fillText("Score: " + this.score, 20, 25);
                        context.fillText("Wave: " + this.waveCount, 20, 50);
    
                        for (let i = 0; i < this.player.lives; i++) {
                            drawDiamond(context, 30 + 25 * i, 70, 10);
                        }
    
                        context.restore();

                        // Draw energy
                        context.save();
                        this.player.cooldown ? context.fillStyle = "red" : context.fillStyle = "gold";
                        for (let i = 0; i < this.player.energy / 3; i++) {
                            context.fillRect(20 + 2 * i, 90, 2, 10);
                        }
                        context.restore();
                        

                        // Draw collected items
                        let itemX = 10;
                        let itemY = 110;
                        const itemsPerRow = 4;
                        const itemSpacing = 35;

                        this.player.collectedItems.forEach((item, index) => {
                            const row = Math.floor(index / itemsPerRow);
                            const col = index % itemsPerRow;
                            context.drawImage(item.image, itemX + col * itemSpacing, itemY + row * itemSpacing, 30, 30);
                        });
                    }
    
                    newWave() {
                        this.waveCount++;
                        if (this.waveCount % 5 === 0) {
                            let bosses = [
                                { type: Boss3, threshold: 0.1, multiplier: 1.5 },
                                { type: Boss2, threshold: 0.3, multiplier: 1.0 },
                                { type: Boss1, threshold: 1.0, multiplier: 0.5 }
                            ];
                            
                            let randomValue = Math.random();
                            for (let boss of bosses) {
                                if (randomValue < boss.threshold) {
                                    let newBossLives = this.bossLives * boss.multiplier;
                                    this.bossArray.push(new boss.type(this, newBossLives));
                                    break;
                                }
                            }
                            
                        } else {
                            if (Math.random() < 0.5 && this.columns * this.enemySize < this.width * 0.8) {
                                this.columns++;
                            } else if (this.rows * this.enemySize < this.height * 0.08) {
                                this.rows++;
                            }
    
                            this.waves.push(new Wave(this));
                        }
    
                        this.waves = this.waves.filter(object => !object.markedForDeletion);
                    }

                    chooseItemByDropRate(bossType) {
                        let totalRate;
                        let cumulativeRate = 0;
                        const adjustedItems = items.map(item => {
                            let adjustedRate = item.dropRate;
                            if (bossType === 'Boss1') {
                                adjustedRate *= 0.5;
                            } else if (bossType === 'Boss2') {
                                adjustedRate *= 1;
                            } else if (bossType === 'Boss3') {
                                adjustedRate *= 2;
                            }

                            adjustedRate *= (1 + (this.waveCount * 0.1));

                            return { ...item, dropRate: adjustedRate };
                        });
                
                        totalRate = adjustedItems.reduce((acc, item) => acc + item.dropRate, 0);
                        const random = Math.random() * totalRate;
                
                        for (let item of adjustedItems) {
                            cumulativeRate += item.dropRate;
                            if (random <= cumulativeRate) {
                                return item;
                            }
                        }
                    }
    
                    restart() {
                        this.player.restart();
                        this.columns = 2;
                        this.rows = 2;
                        this.waves = [];
                        this.bossArray = [];
                        this.waveCount = 1;
                        this.waves.push(new Wave(this));
                        this.score = 0;
                        setScores(0);
                        setCollectedItems([]);
                        this.gameOver = false;
                    }
                };
    
                const game = new Game(canvas);
                const particles = [];

                function drawDiamond(context, x, y, size) {
                    context.beginPath();
                    context.moveTo(x, y - size); // Top point
                    context.lineTo(x + size, y); // Right point
                    context.lineTo(x, y + size); // Bottom point
                    context.lineTo(x - size, y); // Left point
                    context.closePath();
                    context.fillStyle = 'white'; // Diamond color
                    context.fill();
                };
    
                function createParticles({object, color, fades}) {
                    for (let i = 0; i < 15; i++) {
                        particles.push(new Particle({
                            position: {
                                x: object.x + object.width / 2,
                                y: object.y + object.height / 2
                            },
                            velocity: {
                                x: (Math.random() - 0.5) * 2,
                                y: (Math.random() - 0.5) * 2
                            },
                            radius: Math.random() * 3,
                            color: color || "red",
                            fades
                        }));
                    }
                };

                let lastTime = 0;
                
                function animate(timeStamp) {
                    const deltaTime = timeStamp - lastTime;
                    lastTime = timeStamp;
                    context.clearRect(0, 0, canvas.width, canvas.height);
                    game.render(context, deltaTime);
                    particles.forEach((particle, i) => {
                        if (particle.position.y - particle.radius >= canvas.height) {
                            particle.position.x = Math.random() * canvas.width;
                            particle.position.y = -particle.radius;
                        }
        
                        if (particle.opacity <= 0) {
                            setTimeout(() => {
                                particles.splice(i, 1);
                            }, 0)
                        } else {
                            particle.update();
                        }
                        
                    });
                    window.requestAnimationFrame(animate);
                };

                function setBackgroundMoving() {
                    const bg = document.getElementById("canvas");
                    
                    if (bg) {
                        setTimeout(function() {
                            bg.style.backgroundPositionY = (parseInt(bg.style.backgroundPositionY.replace('px', '')) + 1) + 'px';
                            
                            setBackgroundMoving();
                        }, 30);
                    }
                };
                

                setBackgroundMoving();
                animate(0);

                // Clean up
                return () => {
                    window.removeEventListener('resize', resizeCanvas);
                };
            }
        } catch(e) {
            console.log(e);
        }
    }, []);

    return (
         <div style={{ 
            width: '100vw', 
            height: '70vh', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            overflow: 'hidden'
        }}>
            <canvas 
                ref={ref} 
                id="canvas" 
                style={{
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                }} 
            />
        </div>
    );
};

export default Canvas;
