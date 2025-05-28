// js/projectileSystem.js

// Import dependencies
import { gameState, Player, ItemSystem, canvas, ctx } from './main.js';
import { Utils } from './utils.js';

export const ProjectileSystem = {
    create: function(x, y, direction, chargeLevel) {
        let size, damage, speed, color;
        
        if (chargeLevel < 33) {
            size = 6;
            damage = 15;
            speed = 6;
            color = '#87ceeb'; // Light blue
        } else if (chargeLevel < 67) {
            size = 10;
            damage = 30;
            speed = 5;
            color = '#4169e1'; // Blue
        } else { // chargeLevel >= 67
            size = 14;
            damage = 50;
            speed = 4;
            color = '#ffd700'; // Gold
        }
        
        let vx = 0, vy = 0;
        switch (direction) {
            case 'up': vy = -speed; break;
            case 'down': vy = speed; break;
            case 'left': vx = -speed; break;
            case 'right': vx = speed; break;
        }
        
        return {
            x: x,
            y: y,
            size: size,
            damage: damage,
            vx: vx,
            vy: vy,
            color: color,
            life: 120, // Frames before auto-destroy
            trail: [] // For visual trail effect
        };
    },

    update: function() {
        for (let i = gameState.projectiles.length - 1; i >= 0; i--) {
            const projectile = gameState.projectiles[i];
            
            projectile.trail.push({ x: projectile.x, y: projectile.y });
            if (projectile.trail.length > 5) {
                projectile.trail.shift();
            }
            
            projectile.x += projectile.vx;
            projectile.y += projectile.vy;
            
            projectile.life--;
            
            if (Utils.checkCollision(projectile.x - projectile.size/2, projectile.y - projectile.size/2, projectile.size, projectile.size)) {
                gameState.projectiles.splice(i, 1);
                continue;
            }
            
            let hitEnemy = false;
            for (let j = gameState.enemies.length - 1; j >= 0; j--) { // Iterate enemies backward if modifying
                const enemy = gameState.enemies[j];
                if (!enemy.dying && 
                    projectile.x > enemy.x && 
                    projectile.x < enemy.x + enemy.width &&
                    projectile.y > enemy.y && 
                    projectile.y < enemy.y + enemy.height) {
                    
                    enemy.hp -= projectile.damage;
                    enemy.damageFlash = true;
                    enemy.damageFlashTimer = 0;
                    
                    const dx = enemy.x + enemy.width/2 - projectile.x;
                    const dy = enemy.y + enemy.height/2 - projectile.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance > 0) {
                        const knockbackForce = 3;
                        enemy.knockback.active = true;
                        enemy.knockback.vx = (dx / distance) * knockbackForce;
                        enemy.knockback.vy = (dy / distance) * knockbackForce;
                        enemy.knockback.timer = 0;
                    }
                    
                    if (enemy.hp <= 0) {
                        enemy.dying = true;
                        enemy.deathTimer = 0;
                        
                        ItemSystem.dropLoot(enemy.x + enemy.width/2, enemy.y + enemy.height/2); // ItemSystem is dummy from main.js
                        
                        Player.xp += 25; // Player is real from player.js (imported via main.js)
                        Player.checkLevelUp();
                    }
                    
                    hitEnemy = true;
                    gameState.projectiles.splice(i, 1); // Remove projectile after hitting an enemy
                    break; 
                }
            }
            
            if (!hitEnemy && projectile.life <= 0) { // Only remove for expired life if no enemy was hit
                gameState.projectiles.splice(i, 1);
            }
        }
    },

    render: function() {
        gameState.projectiles.forEach(projectile => {
            const screenX = projectile.x - gameState.camera.x;
            const screenY = projectile.y - gameState.camera.y;
            
            if (screenX > -50 && screenX < canvas.width + 50 && 
                screenY > -50 && screenY < canvas.height + 50) {
                
                ctx.strokeStyle = projectile.color;
                ctx.lineWidth = 2;
                
                // Draw trail
                if (projectile.trail.length > 1) {
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.moveTo(projectile.trail[0].x - gameState.camera.x, projectile.trail[0].y - gameState.camera.y);
                    for (let k = 1; k < projectile.trail.length; k++) {
                        ctx.lineTo(projectile.trail[k].x - gameState.camera.x, projectile.trail[k].y - gameState.camera.y);
                    }
                    ctx.stroke();
                }
                
                // Draw projectile
                ctx.globalAlpha = 1;
                ctx.fillStyle = projectile.color;
                ctx.beginPath();
                ctx.arc(screenX, screenY, projectile.size / 2, 0, Math.PI * 2);
                ctx.fill();
                
                if (projectile.size > 10) { // Glow for larger projectiles
                    ctx.globalAlpha = 0.3;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, projectile.size / 2 + 4, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.globalAlpha = 1;
                }
            }
        });
    }
};
