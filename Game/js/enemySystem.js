// js/enemySystem.js - Fixed enemy spawning distribution

import { gameState, Player, ItemSystem, CONFIG, ctx, canvas } from './main.js';
import { Utils } from './utils.js';
import { World } from './main.js';

export const EnemySystem = {
    create: function(x, y, type = 'goblin') {
        return {
            x: x,
            y: y,
            width: 20,
            height: 20,
            speed: 1.5,
            hp: 50,
            maxHp: 50,
            damage: 15,
            attackRange: 30,
            attackCooldown: 0,
            attackSpeed: 1000,
            type: type,
            damageFlash: false,
            damageFlashTimer: 0,
            damageFlashDuration: 150,
            knockback: {
                active: false,
                vx: 0,
                vy: 0,
                timer: 0,
                duration: 300,
                friction: 0.85
            },
            dying: false,
            deathTimer: 0,
            deathDuration: 500,
            ai: {
                state: 'patrol',
                alertRange: 80,
                patrolDirection: Math.random() * Math.PI * 2,
                patrolTimer: 0
            }
        };
    },

    // 🔧 FIXED: Better enemy distribution
    spawn: function() {
        console.log('👹 Spawning enemies across the world...');
        
        // Clear existing enemies
        gameState.enemies = [];
        
        const world = World.getCurrentWorld();
        if (!world) {
            console.warn('⚠️ No current world for enemy spawning');
            return;
        }
        
        // Determine enemy count based on world
        let enemyCount;
        if (world.theme === 'cave') {
            enemyCount = 20; // More enemies in cave
        } else {
            enemyCount = 10; // Fewer enemies in overworld
        }
        
        console.log(`🎯 Attempting to spawn ${enemyCount} enemies in ${world.name}`);
        
        let successfulSpawns = 0;
        let attempts = 0;
        const maxAttempts = enemyCount * 10; // Try 10x more than needed
        
        while (successfulSpawns < enemyCount && attempts < maxAttempts) {
            attempts++;
            
            // Generate random position across the entire world
            const x = Math.random() * (world.width - 4) * world.tileSize + 2 * world.tileSize;
            const y = Math.random() * (world.height - 4) * world.tileSize + 2 * world.tileSize;
            
            // Check if position is valid (not solid, not too close to player)
            if (!Utils.checkCollision(x, y, 20, 20)) {
                // Make sure not too close to player spawn
                const spawnX = world.spawnPoint.x * world.tileSize;
                const spawnY = world.spawnPoint.y * world.tileSize;
                const distanceFromSpawn = Math.sqrt((x - spawnX) ** 2 + (y - spawnY) ** 2);
                
                if (distanceFromSpawn > 100) { // At least 100 pixels from spawn
                    gameState.enemies.push(this.create(x, y));
                    successfulSpawns++;
                }
            }
        }
        
        console.log(`✅ Successfully spawned ${successfulSpawns} enemies after ${attempts} attempts`);
        
        // Log first few enemy positions for debugging
        gameState.enemies.slice(0, 3).forEach((enemy, i) => {
            console.log(`👹 Enemy ${i + 1} at (${enemy.x.toFixed(0)}, ${enemy.y.toFixed(0)})`);
        });
    },

    updateAll: function() {
        if (!gameState.enemies || !Player) return;

        for (let i = gameState.enemies.length - 1; i >= 0; i--) {
            const enemy = gameState.enemies[i];
            const distanceToPlayer = Math.sqrt(
                (Player.x - enemy.x) ** 2 + (Player.y - enemy.y) ** 2
            );
            
            if (enemy.attackCooldown > 0) enemy.attackCooldown -= 16;
            
            // Handle damage flash effect
            if (enemy.damageFlash) {
                enemy.damageFlashTimer += 16;
                if (enemy.damageFlashTimer >= enemy.damageFlashDuration) {
                    enemy.damageFlash = false;
                    enemy.damageFlashTimer = 0;
                }
            }
            
            // Handle death animation and removal
            if (enemy.dying) {
                enemy.deathTimer += 16;
                if (enemy.deathTimer >= enemy.deathDuration) {
                    gameState.enemies.splice(i, 1);
                }
                continue;
            }
            
            // Handle knockback physics
            if (enemy.knockback.active) {
                enemy.knockback.timer += 16;
                
                let newX = enemy.x + enemy.knockback.vx;
                let newY = enemy.y + enemy.knockback.vy;
                
                if (!Utils.checkCollision(newX, enemy.y, enemy.width, enemy.height)) {
                    enemy.x = newX;
                } else {
                    enemy.knockback.vx = 0;
                }
                
                if (!Utils.checkCollision(enemy.x, newY, enemy.width, enemy.height)) {
                    enemy.y = newY;
                } else {
                    enemy.knockback.vy = 0;
                }
                
                enemy.knockback.vx *= enemy.knockback.friction;
                enemy.knockback.vy *= enemy.knockback.friction;
                
                if (enemy.knockback.timer >= enemy.knockback.duration) {
                    enemy.knockback.active = false;
                    enemy.knockback.vx = 0;
                    enemy.knockback.vy = 0;
                    enemy.knockback.timer = 0;
                }
                
                continue;
            }
            
            // AI State Management
            if (distanceToPlayer <= enemy.ai.alertRange) {
                enemy.ai.state = 'chase';
            } else if (enemy.ai.state === 'chase' && distanceToPlayer > enemy.ai.alertRange * 2) {
                enemy.ai.state = 'patrol';
            }
            
            let newX = enemy.x;
            let newY = enemy.y;
            
            // AI Behavior
            if (enemy.ai.state === 'chase') {
                // Chase the player
                const dx = Player.x - enemy.x;
                const dy = Player.y - enemy.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                
                if (distance > 0) {
                    newX += (dx / distance) * enemy.speed;
                    newY += (dy / distance) * enemy.speed;
                }
                
                // Attack player if in range
                if (distanceToPlayer <= enemy.attackRange && enemy.attackCooldown <= 0) {
                    Player.takeDamage(enemy.damage, enemy);
                    enemy.attackCooldown = enemy.attackSpeed;
                }
            } else {
                // Patrol behavior
                enemy.ai.patrolTimer += 16;
                if (enemy.ai.patrolTimer > 2000) {
                    enemy.ai.patrolDirection = Math.random() * Math.PI * 2;
                    enemy.ai.patrolTimer = 0;
                }
                
                newX += Math.cos(enemy.ai.patrolDirection) * enemy.speed * 0.5;
                newY += Math.sin(enemy.ai.patrolDirection) * enemy.speed * 0.5;
            }
            
            // Apply movement with collision detection
            if (!Utils.checkCollision(newX, enemy.y, enemy.width, enemy.height)) {
                enemy.x = newX;
            }
            if (!Utils.checkCollision(enemy.x, newY, enemy.width, enemy.height)) {
                enemy.y = newY;
            }
        }
    },

    render: function() {
        if (!gameState.enemies || !gameState.camera || !ctx || !canvas) return;

        gameState.enemies.forEach(enemy => {
            const screenX = enemy.x - gameState.camera.x;
            const screenY = enemy.y - gameState.camera.y;
            
            // Only render if on or near screen
            if (screenX > -enemy.width && screenX < canvas.width && 
                screenY > -enemy.height && screenY < canvas.height) {
                
                // Handle death animation
                if (enemy.dying) {
                    const deathProgress = enemy.deathTimer / enemy.deathDuration;
                    
                    const alpha = 1 - deathProgress;
                    const scale = 1 - (deathProgress * 0.5);
                    
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    
                    const centerX = screenX + enemy.width / 2;
                    const centerY = screenY + enemy.height / 2;
                    const scaledWidth = enemy.width * scale;
                    const scaledHeight = enemy.height * scale;
                    
                    ctx.fillStyle = '#660000';
                    ctx.fillRect(
                        centerX - scaledWidth / 2, 
                        centerY - scaledHeight / 2, 
                        scaledWidth, 
                        scaledHeight
                    );
                    
                    ctx.restore();
                    return;
                }
                
                // Determine enemy color based on state
                let enemyColor;
                if (enemy.damageFlash) {
                    enemyColor = '#ffaaaa';
                } else if (enemy.ai.state === 'chase') {
                    enemyColor = '#dc143c'; // Darker red when chasing
                } else {
                    enemyColor = '#8b0000'; // Dark red when patrolling
                }
                
                // Draw enemy body
                ctx.fillStyle = enemyColor;
                ctx.fillRect(screenX, screenY, enemy.width, enemy.height);
                
                // Draw border
                ctx.strokeStyle = '#000';
                ctx.lineWidth = 1;
                ctx.strokeRect(screenX, screenY, enemy.width, enemy.height);
                
                // Draw health bar (only for living enemies)
                if (!enemy.dying) {
                    const healthPercent = enemy.hp / enemy.maxHp;
                    
                    // Health bar background
                    ctx.fillStyle = '#333';
                    ctx.fillRect(screenX, screenY - 8, enemy.width, 4);
                    
                    // Health bar fill
                    ctx.fillStyle = healthPercent > 0.5 ? '#4caf50' : 
                                   healthPercent > 0.2 ? '#ff9800' : '#f44336';
                    ctx.fillRect(screenX, screenY - 8, enemy.width * healthPercent, 4);
                }
            }
        });
    }
};