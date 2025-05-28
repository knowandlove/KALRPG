// js/renderer.js - Updated for layered tile rendering

// Import dependencies
import { gameState, Player, CONFIG, ctx, canvas, AssetManager } from './main.js';

export const Renderer = {
    renderWorld: function() {
        if (!gameState.world || !gameState.camera || !ctx) return;

        const camera = gameState.camera;
        const startX = Math.floor(camera.x / CONFIG.TILE_SIZE);
        const endX = Math.min(startX + Math.ceil(camera.width / CONFIG.TILE_SIZE) + 1, CONFIG.WORLD_WIDTH);
        const startY = Math.floor(camera.y / CONFIG.TILE_SIZE);
        const endY = Math.min(startY + Math.ceil(camera.height / CONFIG.TILE_SIZE) + 1, CONFIG.WORLD_HEIGHT);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (gameState.world[y] && gameState.world[y][x]) {
                    const tile = gameState.world[y][x];
                    const screenX = x * CONFIG.TILE_SIZE - camera.x;
                    const screenY = y * CONFIG.TILE_SIZE - camera.y;
                    
                    // 🎨 FIRST: Draw the base grass tile
                    let drawnBase = false;
                    if (tile.tileset && tile.tileId !== undefined && AssetManager) {
                        drawnBase = AssetManager.drawTile(
                            ctx, 
                            tile.tileset, 
                            tile.tileId, 
                            screenX, 
                            screenY, 
                            CONFIG.TILE_SIZE, 
                            CONFIG.TILE_SIZE
                        );
                    }
                    
                    // Fallback for base tile if tileset fails
                    if (!drawnBase) {
                        switch (tile.type) {
                            case 'grass': ctx.fillStyle = tile.color || '#4a7c59'; break;
                            case 'wall': ctx.fillStyle = tile.color || '#8b4513'; break;
                            case 'tree': ctx.fillStyle = tile.color || '#4a7c59'; break; // Use grass color as base
                            case 'rock': ctx.fillStyle = tile.color || '#696969'; break;
                            case 'water': ctx.fillStyle = tile.color || '#4682b4'; break;
                            case 'path': ctx.fillStyle = tile.color || '#8b7355'; break;
                            case 'dirt': ctx.fillStyle = tile.color || '#8b4513'; break;
                            case 'floor': ctx.fillStyle = tile.color || '#2f2f2f'; break;
                            case 'stone': ctx.fillStyle = tile.color || '#696969'; break;
                            default: ctx.fillStyle = tile.color || '#654321';
                        }
                        
                        ctx.fillRect(screenX, screenY, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
                    }
                    
                    // 🌲 SECOND: Draw tree overlay if it exists
                    if (tile.treeOverlay && AssetManager) {
                        AssetManager.drawTile(
                            ctx,
                            tile.treeOverlay.tileset,
                            tile.treeOverlay.tileId,
                            screenX,
                            screenY,
                            CONFIG.TILE_SIZE,
                            CONFIG.TILE_SIZE
                        );
                    }
                }
            }
        }
    },

    renderPlayer: function() {
        if (!Player || !gameState.camera || !ctx) return;

        const screenX = Player.x - gameState.camera.x;
        const screenY = Player.y - gameState.camera.y;
        
        // Determine player color based on state
        let playerColor = '#4169e1'; // Default blue
        if (Player.damageFlash) {
            playerColor = '#ff4444'; // Red when taking damage
        } else if (Player.invulnerable) {
            // Flash between blue and light blue during invulnerability
            const flashCycle = Math.floor(Player.invulnerabilityTimer / 100) % 2;
            playerColor = flashCycle ? '#4169e1' : '#6495ed';
        }
        
        // Draw player body
        ctx.fillStyle = playerColor;
        ctx.fillRect(screenX, screenY, Player.width, Player.height);
        
        // Draw player border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(screenX, screenY, Player.width, Player.height);
        
        // Draw facing direction indicator
        ctx.fillStyle = '#fff';
        const centerX = screenX + Player.width / 2;
        const centerY = screenY + Player.height / 2;
        
        ctx.beginPath();
        switch (Player.facing) {
            case 'up':
                ctx.moveTo(centerX, screenY + 4);
                ctx.lineTo(centerX - 4, screenY + 10);
                ctx.lineTo(centerX + 4, screenY + 10);
                break;
            case 'down':
                ctx.moveTo(centerX, screenY + Player.height - 4);
                ctx.lineTo(centerX - 4, screenY + Player.height - 10);
                ctx.lineTo(centerX + 4, screenY + Player.height - 10);
                break;
            case 'left':
                ctx.moveTo(screenX + 4, centerY);
                ctx.lineTo(screenX + 10, centerY - 4);
                ctx.lineTo(screenX + 10, centerY + 4);
                break;
            case 'right':
                ctx.moveTo(screenX + Player.width - 4, centerY);
                ctx.lineTo(screenX + Player.width - 10, centerY - 4);
                ctx.lineTo(screenX + Player.width - 10, centerY + 4);
                break;
        }
        ctx.closePath();
        ctx.fill();
        
        // ⚡ CHARGING ANIMATION - Shows power building up
        if (Player.charging && Player.chargeLevel > 0) {
            const chargePercent = Player.chargeLevel / Player.maxChargeLevel;
            
            // Pulsing outer ring that grows with charge
            const maxRadius = 40;
            const currentRadius = 15 + (maxRadius - 15) * chargePercent;
            
            // Pulsing effect - faster pulse as charge increases
            const pulseSpeed = 2 + (chargePercent * 6); // Speed increases with charge
            const pulseTime = Date.now() / (200 - chargePercent * 100); // Faster pulse
            const pulseAlpha = (Math.sin(pulseTime) + 1) / 2; // 0 to 1
            
            // Determine charge color based on level
            let chargeColor, chargeText;
            if (chargePercent < 0.33) {
                chargeColor = '#87ceeb'; // Light blue
                chargeText = 'Charging...';
            } else if (chargePercent < 0.67) {
                chargeColor = '#4169e1'; // Blue
                chargeText = 'Magic Shot!';
            } else {
                chargeColor = '#ffd700'; // Gold
                chargeText = 'Power Blast!';
            }
            
            // Draw outer charging ring
            ctx.save();
            ctx.globalAlpha = pulseAlpha * 0.6;
            ctx.strokeStyle = chargeColor;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
            
            // Draw inner energy orb
            ctx.save();
            ctx.globalAlpha = 0.8;
            ctx.fillStyle = chargeColor;
            ctx.beginPath();
            ctx.arc(centerX, centerY, 3 + chargePercent * 5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
            
            // Draw charge particles/sparks
            const particleCount = Math.floor(chargePercent * 8);
            for (let i = 0; i < particleCount; i++) {
                const angle = (Date.now() / 100 + i * Math.PI * 2 / particleCount) % (Math.PI * 2);
                const particleRadius = 20 + Math.sin(Date.now() / 150 + i) * 10;
                const particleX = centerX + Math.cos(angle) * particleRadius;
                const particleY = centerY + Math.sin(angle) * particleRadius;
                
                ctx.save();
                ctx.globalAlpha = 0.7;
                ctx.fillStyle = chargeColor;
                ctx.beginPath();
                ctx.arc(particleX, particleY, 1 + chargePercent * 2, 0, Math.PI * 2);
                ctx.fill();
                ctx.restore();
            }
            
            // Draw charge level text above player
            if (chargePercent >= 0.33) {
                ctx.fillStyle = chargeColor;
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(chargeText, centerX, screenY - 15);
                ctx.textAlign = 'left'; // Reset alignment
            }
        }
        
        // 🗡️ SWORD ANIMATION - This is what was missing!
        if (Player.isAttacking) {
            const progress = Player.attackTimer / Player.attackDuration;
            const swingAngle = progress * Math.PI; // Full 180-degree swing
            
            ctx.strokeStyle = '#ffd700'; // Gold color
            ctx.lineWidth = 3;
            
            const swordLength = 30;
            let startAngle, swingDirection;
            
            // Determine swing start angle and direction based on facing
            switch (Player.facing) {
                case 'up':
                    startAngle = -Math.PI / 2 - Math.PI / 4; // Start from upper-left
                    swingDirection = 1; // Swing right
                    break;
                case 'down':
                    startAngle = Math.PI / 2 - Math.PI / 4; // Start from lower-left
                    swingDirection = 1; // Swing right
                    break;
                case 'left':
                    startAngle = -Math.PI / 4; // Start from upper-left
                    swingDirection = -1; // Swing down
                    break;
                case 'right':
                    startAngle = -Math.PI / 4; // Start from upper-right
                    swingDirection = 1; // Swing down
                    break;
            }
            
            // Calculate current sword position in the swing
            const currentAngle = startAngle + (swingAngle * swingDirection);
            const swordEndX = centerX + Math.cos(currentAngle) * swordLength;
            const swordEndY = centerY + Math.sin(currentAngle) * swordLength;
            
            // Draw sword line
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(swordEndX, swordEndY);
            ctx.stroke();
            
            // Draw sword tip
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(swordEndX, swordEndY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};