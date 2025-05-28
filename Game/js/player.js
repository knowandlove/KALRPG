// js/player.js - Fixed movement speed

// Import dependencies
// These will initially point to the exports from main.js (which might be dummy objects for some systems)
import { keys, CONFIG, gameState } from './main.js';
import { Utils } from './utils.js';
// ProjectileSystem and ItemSystem will be dummy objects from main.js initially
import { ProjectileSystem } from './main.js'; 
import { ItemSystem } from './main.js';


export const Player = {
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    speed: 2.5,  // 🔧 REDUCED from 3 to 2.5 for better control
    hp: 100,
    maxHp: 100,
    mana: 100,
    maxMana: 100,
    level: 1,
    xp: 0,
    xpToNext: 100,
    attackDamage: 25,
    attackRange: 40,
    attackCooldown: 0,
    attackSpeed: 500,
    facing: 'down',
    isAttacking: false,
    attackTimer: 0,
    attackDuration: 200,
    invulnerable: false,
    invulnerabilityTimer: 0,
    invulnerabilityDuration: 1000,
    damageFlash: false,
    damageFlashTimer: 0,
    damageFlashDuration: 100,
    knockback: {
        active: false,
        vx: 0,
        vy: 0,
        timer: 0,
        duration: 200,
        friction: 0.88
    },
    
    charging: false,
    chargeLevel: 0,
    maxChargeLevel: 100,
    chargeRate: 1.8,  // 🔧 REDUCED from 2 to 1.8 for more controlled charging

    update: function() {
        let newX = this.x;
        let newY = this.y;
        
        if (this.knockback.active) {
            this.knockback.timer += 16;
            
            newX = this.x + this.knockback.vx;
            newY = this.y + this.knockback.vy;
            
            if (!Utils.checkCollision(newX, this.y, this.width, this.height)) {
                this.x = newX;
            } else {
                this.knockback.vx = 0;
            }
            
            if (!Utils.checkCollision(this.x, newY, this.width, this.height)) {
                this.y = newY;
            } else {
                this.knockback.vy = 0;
            }
            
            this.knockback.vx *= this.knockback.friction;
            this.knockback.vy *= this.knockback.friction;
            
            if (this.knockback.timer >= this.knockback.duration) {
                this.knockback.active = false;
                this.knockback.vx = 0;
                this.knockback.vy = 0;
                this.knockback.timer = 0;
            }
        } else if (!gameState.showInventory) {
            // 🔧 FRAME-RATE INDEPENDENT MOVEMENT
            // Calculate actual movement based on expected 60fps
            const deltaTime = 16; // Assume 16ms per frame (60fps)
            const speedMultiplier = deltaTime / 16; // Normalize to 60fps
            const actualSpeed = this.speed * speedMultiplier;
            
            if (keys['w'] || keys['arrowup']) {
                newY -= actualSpeed;
                this.facing = 'up';
            }
            if (keys['s'] || keys['arrowdown']) {
                newY += actualSpeed;
                this.facing = 'down';
            }
            if (keys['a'] || keys['arrowleft']) {
                newX -= actualSpeed;
                this.facing = 'left';
            }
            if (keys['d'] || keys['arrowright']) {
                newX += actualSpeed;
                this.facing = 'right';
            }
            
            if (!Utils.checkCollision(newX, this.y, this.width, this.height)) {
                this.x = newX;
            }
            if (!Utils.checkCollision(this.x, newY, this.width, this.height)) {
                this.y = newY;
            }
        }
        
        if (this.attackCooldown > 0) this.attackCooldown -= 16;
        
        if (this.isAttacking) {
            this.attackTimer += 16;
            if (this.attackTimer >= this.attackDuration) {
                this.isAttacking = false;
                this.attackTimer = 0;
            }
        }
        
        if (this.invulnerable) {
            this.invulnerabilityTimer += 16;
            if (this.invulnerabilityTimer >= this.invulnerabilityDuration) {
                this.invulnerable = false;
                this.invulnerabilityTimer = 0;
            }
        }
        
        if (this.damageFlash) {
            this.damageFlashTimer += 16;
            if (this.damageFlashTimer >= this.damageFlashDuration) {
                this.damageFlash = false;
                this.damageFlashTimer = 0;
            }
        }
        
        if (!gameState.showInventory) {
            if (this.charging) {
                this.chargeLevel = Math.min(this.chargeLevel + this.chargeRate, this.maxChargeLevel);
            } else {
                this.chargeLevel = Math.max(this.chargeLevel - 1, 0);
            }
        }
    },

    attack: function() {
        const chargePercent = (this.chargeLevel / this.maxChargeLevel) * 100;
        // console.log(`Attack triggered with charge: ${chargePercent.toFixed(1)}%`); // Keep for debug if needed
        
        if (chargePercent >= 33) {
            let manaCost;
            if (chargePercent >= 67) {
                manaCost = 30;
            } else {
                manaCost = 15;
            }
            
            // console.log(`Ranged attack - Need ${manaCost} mana, have ${this.mana}`);
            
            if (this.mana >= manaCost) {
                const projectileX = this.x + this.width / 2;
                const projectileY = this.y + this.height / 2;
                
                const projectile = ProjectileSystem.create( // Uses dummy ProjectileSystem for now
                    projectileX, 
                    projectileY, 
                    this.facing, 
                    chargePercent
                );
                
                gameState.projectiles.push(projectile);
                
                this.mana -= manaCost;
                // console.log(`Fired projectile! Used ${manaCost} mana. (${this.mana}/${this.maxMana} remaining)`);
                
                this.chargeLevel = 0;
            } else {
                // console.log(`Not enough mana! Need ${manaCost}, have ${this.mana}`);
                this.chargeLevel = 0;
            }
        } else {
            // console.log(`Melee attack - charge too low (${chargePercent.toFixed(1)}%)`);
            this.isAttacking = true;
            this.attackTimer = 0;
            
            let attackX, attackY, attackWidth, attackHeight;
            
            switch (this.facing) {
                case 'up':
                    attackX = this.x - 8;
                    attackY = this.y - this.attackRange;
                    attackWidth = this.width + 16;
                    attackHeight = this.attackRange;
                    break;
                case 'down':
                    attackX = this.x - 8;
                    attackY = this.y + this.height;
                    attackWidth = this.width + 16;
                    attackHeight = this.attackRange;
                    break;
                case 'left':
                    attackX = this.x - this.attackRange;
                    attackY = this.y - 8;
                    attackWidth = this.attackRange;
                    attackHeight = this.height + 16;
                    break;
                case 'right':
                    attackX = this.x + this.width;
                    attackY = this.y - 8;
                    attackWidth = this.attackRange;
                    attackHeight = this.height + 16;
                    break;
            }
            
            gameState.enemies.forEach((enemy) => { // Removed index as it's not used here
                if (!enemy.dying && // Added check for !enemy.dying
                    enemy.x < attackX + attackWidth &&
                    enemy.x + enemy.width > attackX &&
                    enemy.y < attackY + attackHeight &&
                    enemy.y + enemy.height > attackY) {
                    
                    enemy.hp -= this.attackDamage;
                    enemy.damageFlash = true;
                    enemy.damageFlashTimer = 0;
                    
                    const dx = enemy.x + enemy.width/2 - (this.x + this.width/2);
                    const dy = enemy.y + enemy.height/2 - (this.y + this.height/2);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const knockbackForce = 4;
                        enemy.knockback.active = true;
                        enemy.knockback.vx = (dx / distance) * knockbackForce;
                        enemy.knockback.vy = (dy / distance) * knockbackForce;
                        enemy.knockback.timer = 0;
                    }
                    
                    if (enemy.hp <= 0) {
                        enemy.dying = true;
                        enemy.deathTimer = 0;
                        
                        ItemSystem.dropLoot(enemy.x + enemy.width/2, enemy.y + enemy.height/2); // Uses dummy ItemSystem for now
                        
                        this.xp += 25;
                        this.checkLevelUp();
                    }
                }
            });
        }
        
        this.attackCooldown = this.attackSpeed;
    },

    checkLevelUp: function() {
        if (this.xp >= this.xpToNext) {
            this.level++;
            this.xp -= this.xpToNext;
            this.xpToNext = Math.floor(this.xpToNext * 1.5);
            
            this.maxHp += 20;
            this.hp = this.maxHp;
            // Note: Player.maxMana does not increase on level up in original code
            // Player.mana is not refilled on level up in original code
            this.attackDamage += 5;
            
            console.log(`Level up! Now level ${this.level}`);
        }
    },

    takeDamage: function(damage, attacker) {
        if (!this.invulnerable) {
            this.hp -= damage;
            this.invulnerable = true;
            this.invulnerabilityTimer = 0;
            this.damageFlash = true;
            this.damageFlashTimer = 0;
            
            if (attacker) {
                const dx = (this.x + this.width/2) - (attacker.x + attacker.width/2);
                const dy = (this.y + this.height/2) - (attacker.y + attacker.height/2);
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    const knockbackForce = 2.5;
                    this.knockback.active = true;
                    this.knockback.vx = (dx / distance) * knockbackForce;
                    this.knockback.vy = (dy / distance) * knockbackForce;
                    this.knockback.timer = 0;
                }
            }
            
            if (this.hp <= 0) {
                this.respawn();
            }
        }
    },

    respawn: function() {
        this.hp = this.maxHp;
        // this.mana = this.maxMana; // Consider refilling mana on respawn too
        const respawnPos = Utils.findSafeSpawnPosition();
        this.x = respawnPos.x;
        this.y = respawnPos.y;
        this.invulnerable = false;
        this.damageFlash = false;
        this.knockback.active = false;
        this.knockback.vx = 0;
        this.knockback.vy = 0;
        console.log('You died! Respawned at a safe location.');
    }
};