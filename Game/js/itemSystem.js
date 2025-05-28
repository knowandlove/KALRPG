// js/itemSystem.js - Fixed spawning for Tiled maps

// Import dependencies
// Player is real, InventoryManager is a dummy from main.js for now
import { gameState, Player, InventoryManager, ctx, canvas, CONFIG } from './main.js'; // <--- ADD CONFIG HERE
import { Utils } from './utils.js';
import { World } from './main.js'; // Import World directly

export const ItemSystem = {
    create: function(x, y, type) {
        const item = {
            x: x,
            y: y,
            width: 16,
            height: 16,
            type: type
        };
        
        // Add type-specific properties - single source of truth
        if (type === 'health') {
            item.name = 'Health Potion';
            item.healAmount = 25;
        } else if (type === 'mana') {
            item.name = 'Mana Potion';
            item.restoreAmount = 30;
        }
        
        return item;
    },

    // 🔧 FIXED: Better spawning for Tiled maps
    findRandomGrassPosition: function() {
        const world = World.getCurrentWorld();
        if (!world || !world.tiles) {
            console.warn('⚠️ No world data for item spawning, using fallback');
            return { x: 200 + Math.random() * 400, y: 200 + Math.random() * 400 };
        }

        // Try to find a grass tile (non-solid) randomly
        let attempts = 0;
        const maxAttempts = 50;
        
        while (attempts < maxAttempts) {
            // Pick random coordinates across the map (avoid edges)
            const tileX = Math.floor(Math.random() * (world.width - 4)) + 2;  // 2 tiles from edge
            const tileY = Math.floor(Math.random() * (world.height - 4)) + 2; // 2 tiles from edge
            
            // Check if this tile exists and is walkable
            if (world.tiles[tileY] && world.tiles[tileY][tileX]) {
                const tile = world.tiles[tileY][tileX];
                
                // If it's grass (not solid), use this position
                if (!tile.solid) {
                    const worldX = tileX * world.tileSize + Math.random() * (world.tileSize - 16);
                    const worldY = tileY * world.tileSize + Math.random() * (world.tileSize - 16);
                    
                    console.log(`✅ Found grass position at tile (${tileX},${tileY}) = world (${worldX.toFixed(0)},${worldY.toFixed(0)})`);
                    return { x: worldX, y: worldY };
                }
            }
            attempts++;
        }
        
        console.warn(`⚠️ Couldn't find grass after ${maxAttempts} attempts, using fallback`);
        return { x: 200 + Math.random() * 400, y: 200 + Math.random() * 400 };
    },

    spawnTestItem: function() {
        console.log('🧪 Spawning test items across the map...');
        
        // Clear existing items
        gameState.items = [];
        
        // Spawn multiple health potions across the map
        for (let i = 0; i < 8; i++) {  // Increased from 5 to 8
            const position = this.findRandomGrassPosition();
            const healthPotion = this.create(position.x, position.y, 'health');
            gameState.items.push(healthPotion);
            console.log(`🔴 Health potion ${i+1} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
        }

        // Spawn mana potions
        for (let i = 0; i < 5; i++) {  // Increased from 3 to 5
            const position = this.findRandomGrassPosition();
            const manaPotion = this.create(position.x, position.y, 'mana');
            gameState.items.push(manaPotion);
            console.log(`🔵 Mana potion ${i+1} at (${position.x.toFixed(0)}, ${position.y.toFixed(0)})`);
        }
        
        console.log(`✅ Spawned ${gameState.items.length} potions across the world!`);
        console.log(`📍 Player spawn: (${Player.x.toFixed(0)}, ${Player.y.toFixed(0)})`);
    },

    dropLoot: function(x, y) {
        if (Math.random() < 0.6) { // 60% chance to drop something
            const dropX = x + (Math.random() - 0.5) * 20;
            const dropY = y + (Math.random() - 0.5) * 20;
            
            const itemType = Math.random() < 0.7 ? 'health' : 'mana'; // 70% health, 30% mana
            
            const loot = this.create(dropX, dropY, itemType);
            gameState.items.push(loot);
            console.log(`💀 Enemy dropped a ${itemType} potion at (${dropX.toFixed(0)}, ${dropY.toFixed(0)})`);
        }
    },

    checkPickup: function() {
        if (!Player) return; // Ensure Player module is loaded

        for (let i = gameState.items.length - 1; i >= 0; i--) {
            const item = gameState.items[i];
            
            if (Player.x < item.x + item.width &&
                Player.x + Player.width > item.x &&
                Player.y < item.y + item.height &&
                Player.y + Player.height > item.y) {
                
                const itemData = { 
                    type: item.type,
                    name: item.name,
                    healAmount: item.healAmount, // Will be undefined if not health potion, which is fine
                    restoreAmount: item.restoreAmount // Will be undefined if not mana potion
                };
                
                InventoryManager.addItem(itemData); // InventoryManager is currently a dummy from main.js
                console.log(`📦 Picked up ${item.name}! Press I to open inventory.`);
                
                gameState.items.splice(i, 1);
            }
        }
    },

    render: function() {
        if (!gameState.items || !gameState.camera || !ctx) return; // Guard clauses

        gameState.items.forEach(item => {
            const screenX = item.x - gameState.camera.x;
            const screenY = item.y - gameState.camera.y;
            
            if (screenX > -item.width && screenX < canvas.width + item.width &&  // Adjusted bounds slightly
                screenY > -item.height && screenY < canvas.height + item.height) {
                
                if (item.type === 'health') {
                    ctx.fillStyle = '#ff4444'; // Red for health
                    ctx.fillRect(screenX, screenY, item.width, item.height);
                } else if (item.type === 'mana') {
                    ctx.fillStyle = '#4444ff'; // Blue for mana
                    ctx.fillRect(screenX, screenY, item.width, item.height);
                }
                // Could add a small border or icon later
                // ctx.strokeStyle = 'black';
                // ctx.strokeRect(screenX, screenY, item.width, item.height);
            }
        });
    }
};