// js/player.js - Updated with sprite animation system

import { keys, CONFIG, gameState } from './main.js';
import { Utils } from './utils.js';
import { ProjectileSystem } from './main.js'; 
import { ItemSystem } from './main.js';

export const Player = {
    x: 0,
    y: 0,
    width: 24,
    height: 24,
    speed: 2.5,
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
    chargeRate: 1.8,

    // 🎨 Sprite Animation System - Fixed direction mapping
    sprite: {
        loaded: false,
        image: null,
        frameWidth: 16,      // Your sprite frame size
        frameHeight: 16,
        currentFrame: 0,
        frameTimer: 0,
        frameDelay: 200,     // Milliseconds between frames
        isMoving: false,
        
        // 🔧 FIXED: Animation definitions with corrected direction mapping
        // Based on typical sprite sheet layout: down, left, right, up
        animations: {
            idle_down: { frames: [0], row: 0 },    // Row 0 = facing down (forward)
            walk_down: { frames: [0, 1, 2, 3], row: 0 },
            idle_left: { frames: [0], row: 1 },    // Row 1 = facing left
            walk_left: { frames: [0, 1, 2, 3], row: 1 },
            idle_right: { frames: [0], row: 2 },   // Row 2 = facing right  
            walk_right: { frames: [0, 1, 2, 3], row: 2 },
            idle_up: { frames: [0], row: 3 },      // Row 3 = facing up (away)
            walk_up: { frames: [0, 1, 2, 3], row: 3 }
        },
        
        currentAnimation: 'idle_down'
    },

    // 🔧 DEBUG: Test function to check sprite directions
    testSpriteDirections: function() {
        console.log('🧪 Testing sprite directions - use arrow keys to see each row:');
        console.log('Current animation:', this.sprite.currentAnimation);
        console.log('Current row:', this.sprite.animations[this.sprite.currentAnimation].row);
    },

    // 🎨 Load player sprite - back to simple version
    loadSprite: function(imagePath) {
        console.log('🎨 Loading player sprite...');
        this.sprite.image = new Image();
        this.sprite.image.onload = () => {
            this.sprite.loaded = true;
            console.log('✅ Player sprite loaded successfully!');
            console.log('🧪 Use debugSprite() in console to test directions');
        };
        this.sprite.image.onerror = () => {
            console.error('❌ Failed to load player sprite');
        };
        this.sprite.image.src = imagePath;
    },

    // 🎨 Update sprite animation - with better debugging
    updateAnimation: function() {
        if (!this.sprite.loaded) return;

        // Determine if player is moving
        const isMoving = keys['w'] || keys['s'] || keys['a'] || keys['d'] || 
                        keys['arrowup'] || keys['arrowdown'] || keys['arrowleft'] || keys['arrowright'];
        
        this.sprite.isMoving = isMoving && !gameState.showInventory;

        // 🔧 DEBUG: Log movement and facing
        if (isMoving) {
            console.log(`🏃 Moving: facing ${this.facing}, keys:`, {
                w: keys['w'], s: keys['s'], a: keys['a'], d: keys['d']
            });
        }

        // Set animation based on facing direction and movement
        let targetAnimation;
        if (this.sprite.isMoving) {
            targetAnimation = `walk_${this.facing}`;
        } else {
            targetAnimation = `idle_${this.facing}`;
        }

        // Change animation if needed
        if (this.sprite.currentAnimation !== targetAnimation) {
            console.log(`🎬 Animation change: ${this.sprite.currentAnimation} -> ${targetAnimation}`);
            this.sprite.currentAnimation = targetAnimation;
            this.sprite.currentFrame = 0;
            this.sprite.frameTimer = 0;
        }

        // Update frame timer
        this.sprite.frameTimer += 16; // Assuming 60fps (16ms per frame)

        // Advance frame if enough time has passed
        if (this.sprite.frameTimer >= this.sprite.frameDelay) {
            const animation = this.sprite.animations[this.sprite.currentAnimation];
            if (animation && animation.frames.length > 1) {
                this.sprite.currentFrame = (this.sprite.currentFrame + 1) % animation.frames.length;
            }
            this.sprite.frameTimer = 0;
        }
    },

    // 🎨 Get current sprite frame info
    getCurrentFrame: function() {
        if (!this.sprite.loaded) return null;

        const animation = this.sprite.animations[this.sprite.currentAnimation];
        if (!animation) return null;

        const frameIndex = animation.frames[this.sprite.currentFrame];
        const row = animation.row;

        return {
            sourceX: frameIndex * this.sprite.frameWidth,
            sourceY: row * this.sprite.frameHeight,
            width: this.sprite.frameWidth,
            height: this.sprite.frameHeight
        };
    },

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
            const deltaTime = 16;
            const speedMultiplier = deltaTime / 16;
            const actualSpeed = this.speed * speedMultiplier;
            
            let oldFacing = this.facing; // Track facing changes
            
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
            
            // 🔧 DEBUG: Log facing changes
            if (oldFacing !== this.facing) {
                console.log(`👁️ Facing changed: ${oldFacing} -> ${this.facing}`);
            }
            
            if (!Utils.checkCollision(newX, this.y, this.width, this.height)) {
                this.x = newX;
            }
            if (!Utils.checkCollision(this.x, newY, this.width, this.height)) {
                this.y = newY;
            }
        }
        
        // Update sprite animation
        this.updateAnimation();
        
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

    // Rest of your existing methods (attack, checkLevelUp, takeDamage, respawn)
    attack: function() {
        const chargePercent = (this.chargeLevel / this.maxChargeLevel) * 100;
        
        if (chargePercent >= 33) {
            let manaCost;
            if (chargePercent >= 67) {
                manaCost = 30;
            } else {
                manaCost = 15;
            }
            
            if (this.mana >= manaCost) {
                const projectileX = this.x + this.width / 2;
                const projectileY = this.y + this.height / 2;
                
                const projectile = ProjectileSystem.create(
                    projectileX, 
                    projectileY, 
                    this.facing, 
                    chargePercent
                );
                
                gameState.projectiles.push(projectile);
                
                this.mana -= manaCost;
                this.chargeLevel = 0;
            } else {
                this.chargeLevel = 0;
            }
        } else {
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
            
            gameState.enemies.forEach((enemy) => {
                if (!enemy.dying &&
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
                        
                        ItemSystem.dropLoot(enemy.x + enemy.width/2, enemy.y + enemy.height/2);
                        
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