// js/renderer.js - Clean sprite rendering system

import { gameState, Player, CONFIG, ctx, canvas, AssetManager, World } from './main.js';

export const Renderer = {
    renderWorld: function() {
        if (!gameState.world || !gameState.camera || !ctx) return;

        // 🔧 DISABLE ANTI-ALIASING for pixel-perfect rendering
        ctx.imageSmoothingEnabled = false;

        const camera = gameState.camera;
        
        // Get world dimensions from current world, not CONFIG
        const currentWorld = World.getCurrentWorld();
        if (!currentWorld) return;
        
        const worldWidth = currentWorld.width;
        const worldHeight = currentWorld.height;
        const tileSize = currentWorld.tileSize;
        
        const startX = Math.floor(camera.x / tileSize);
        const endX = Math.min(startX + Math.ceil(camera.width / tileSize) + 1, worldWidth);
        const startY = Math.floor(camera.y / tileSize);
        const endY = Math.min(startY + Math.ceil(camera.height / tileSize) + 1, worldHeight);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (gameState.world[y] && gameState.world[y][x]) {
                    const tile = gameState.world[y][x];
                    // Round coordinates to prevent sub-pixel rendering
                    const screenX = Math.round(x * tileSize - camera.x);
                    const screenY = Math.round(y * tileSize - camera.y);
                    
                    // Draw the base grass tile
                    let drawnBase = false;
                    if (AssetManager) {
                        drawnBase = AssetManager.drawTile(
                            ctx, 
                            'forest',
                            tile.tileId, 
                            screenX, 
                            screenY, 
                            tileSize, 
                            tileSize
                        );
                    }
                    
                    // Fallback if tileset doesn't load
                    if (!drawnBase) {
                        ctx.fillStyle = this.getTileColor(tile);
                        ctx.fillRect(screenX, screenY, tileSize, tileSize);
                    }
                    
                    // Draw all additional layers on top in order
                    if (tile.layers && tile.layers.length > 0) {
                        // Sort layers by their original Tiled order
                        const sortedLayers = [...tile.layers].sort((a, b) => a.order - b.order);
                        
                        sortedLayers.forEach(layer => {
                            if (AssetManager) {
                                AssetManager.drawTile(
                                    ctx,
                                    layer.tileset,
                                    layer.tileId,
                                    screenX,
                                    screenY,
                                    tileSize,
                                    tileSize
                                );
                            } else {
                                // Fallback color rendering
                                ctx.fillStyle = this.getLayerColor(layer.type);
                                ctx.fillRect(screenX, screenY, tileSize, tileSize);
                            }
                        });
                    }
                }
            }
        }
        
        // Render portals (currently disabled for seamless entrance)
        this.renderPortals();
    },

    renderPlayer: function() {
        if (!Player || !gameState.camera || !ctx) return;

        const screenX = Player.x - gameState.camera.x;
        const screenY = Player.y - gameState.camera.y;
        
        // 🎨 NEW: Render player sprite if loaded
        if (Player.sprite && Player.sprite.loaded && Player.sprite.image) {
            const frame = Player.getCurrentFrame();
            if (frame) {
                // Disable anti-aliasing for crisp pixel art
                const originalSmoothing = ctx.imageSmoothingEnabled;
                ctx.imageSmoothingEnabled = false;
                
                // Save context for effects
                ctx.save();
                
                // Apply damage flash effect
                if (Player.damageFlash) {
                    ctx.globalCompositeOperation = 'multiply';
                    ctx.fillStyle = '#ff4444';
                    ctx.fillRect(screenX, screenY, Player.width, Player.height);
                    ctx.globalCompositeOperation = 'source-over';
                }
                
                // Apply invulnerability flashing
                if (Player.invulnerable) {
                    const flashCycle = Math.floor(Player.invulnerabilityTimer / 100) % 2;
                    if (flashCycle) {
                        ctx.globalAlpha = 0.5;
                    }
                }
                
                // Draw the sprite frame
                ctx.drawImage(
                    Player.sprite.image,
                    frame.sourceX, frame.sourceY, frame.width, frame.height,  // Source
                    Math.round(screenX), Math.round(screenY), Player.width, Player.height  // Destination (scaled up)
                );
                
                // Restore context
                ctx.restore();
                ctx.imageSmoothingEnabled = originalSmoothing;
            }
        } else {
            // 🔧 FALLBACK: Original colored square if sprite not loaded
            this.renderPlayerFallback(screenX, screenY);
        }
        
        // Render player effects (charging, sword attack)
        this.renderPlayerEffects(screenX, screenY);
    },

    renderPlayerFallback: function(screenX, screenY) {
        let playerColor = '#4169e1'; // Default blue
        if (Player.damageFlash) {
            playerColor = '#ff4444'; // Red when taking damage
        } else if (Player.invulnerable) {
            const flashCycle = Math.floor(Player.invulnerabilityTimer / 100) % 2;
            playerColor = flashCycle ? '#4169e1' : '#6495ed';
        }
        
        ctx.fillStyle = playerColor;
        ctx.fillRect(screenX, screenY, Player.width, Player.height);
        
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
    },

    renderPlayerEffects: function(screenX, screenY) {
        const centerX = screenX + Player.width / 2;
        const centerY = screenY + Player.height / 2;

        // ⚡ CHARGING ANIMATION
        if (Player.charging && Player.chargeLevel > 0) {
            const chargePercent = Player.chargeLevel / Player.maxChargeLevel;
            const maxRadius = 40;
            const currentRadius = 15 + (maxRadius - 15) * chargePercent;
            const pulseTime = Date.now() / (200 - chargePercent * 100);
            const pulseAlpha = (Math.sin(pulseTime) + 1) / 2;
            
            let chargeColor, chargeText;
            if (chargePercent < 0.33) {
                chargeColor = '#87ceeb';
                chargeText = 'Charging...';
            } else if (chargePercent < 0.67) {
                chargeColor = '#4169e1';
                chargeText = 'Magic Shot!';
            } else {
                chargeColor = '#ffd700';
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
            
            // Draw charge particles
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
            
            // Draw charge level text
            if (chargePercent >= 0.33) {
                ctx.fillStyle = chargeColor;
                ctx.font = 'bold 12px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(chargeText, centerX, screenY - 15);
                ctx.textAlign = 'left';
            }
        }
        
        // 🗡️ SWORD ANIMATION
        if (Player.isAttacking) {
            const progress = Player.attackTimer / Player.attackDuration;
            const swingAngle = progress * Math.PI;
            
            ctx.strokeStyle = '#ffd700';
            ctx.lineWidth = 3;
            
            const swordLength = 30;
            let startAngle, swingDirection;
            
            switch (Player.facing) {
                case 'up':
                    startAngle = -Math.PI / 2 - Math.PI / 4;
                    swingDirection = 1;
                    break;
                case 'down':
                    startAngle = Math.PI / 2 - Math.PI / 4;
                    swingDirection = 1;
                    break;
                case 'left':
                    startAngle = -Math.PI / 4;
                    swingDirection = -1;
                    break;
                case 'right':
                    startAngle = -Math.PI / 4;
                    swingDirection = 1;
                    break;
            }
            
            const currentAngle = startAngle + (swingAngle * swingDirection);
            const swordEndX = centerX + Math.cos(currentAngle) * swordLength;
            const swordEndY = centerY + Math.sin(currentAngle) * swordLength;
            
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(swordEndX, swordEndY);
            ctx.stroke();
            
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(swordEndX, swordEndY, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    renderPortals: function() {
        // Portal rendering disabled for seamless cave entrance
        return;
    },

    getLayerColor: function(layerType) {
        // Fallback colors for different layer types
        switch (layerType) {
            case 'rock': return '#8B4513';
            case 'cave': return '#2c2c2c';
            case 'water': return '#1e3a5f';
            case 'path': return '#8b7355';
            default: return '#654321';
        }
    },

    getTileColor: function(tile) {
        // Fallback colors for when tilesets don't load
        switch (tile.type) {
            case 'grass': return '#4a7c59';
            case 'tree': return '#228b22';
            case 'rock': return '#696969';
            case 'water': return '#1e3a5f';
            case 'cave': return '#2c2c2c';
            case 'path': return '#8b7355';
            case 'cave_floor': return '#3a3a3a';
            case 'wall': return '#404040';
            default: return tile.color || '#654321';
        }
    }
};