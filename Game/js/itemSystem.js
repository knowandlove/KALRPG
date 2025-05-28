// js/itemSystem.js

// Import dependencies
// Player is real, InventoryManager is a dummy from main.js for now
import { gameState, Player, InventoryManager, ctx, canvas } from './main.js'; // <--- ADD canvas HERE
import { Utils } from './utils.js';
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

    spawnTestItem: function() {
        // Spawn multiple health potions
        for (let i = 0; i < 5; i++) {
            const safeSpot = Utils.findSafeSpawnPosition();
            const offsetX = (Math.random() - 0.5) * 200;
            const offsetY = (Math.random() - 0.5) * 200;
            
            const healthPotion = this.create(
                safeSpot.x + offsetX, 
                safeSpot.y + offsetY, 
                'health'
            );
            
            if (!Utils.checkCollision(healthPotion.x, healthPotion.y, healthPotion.width, healthPotion.height)) {
                gameState.items.push(healthPotion);
            } else {
                // If offset position is bad, use original safe spot without offset
                gameState.items.push(this.create(safeSpot.x, safeSpot.y, 'health'));
            }
        }

        // Spawn some mana potions
        for (let i = 0; i < 3; i++) {
            const safeSpot = Utils.findSafeSpawnPosition();
            const offsetX = (Math.random() - 0.5) * 200;
            const offsetY = (Math.random() - 0.5) * 200;
            
            const manaPotion = this.create(
                safeSpot.x + offsetX, 
                safeSpot.y + offsetY, 
                'mana'
            );
            
            if (!Utils.checkCollision(manaPotion.x, manaPotion.y, manaPotion.width, manaPotion.height)) {
                gameState.items.push(manaPotion);
            } else {
                gameState.items.push(this.create(safeSpot.x, safeSpot.y, 'mana'));
            }
        }
        
        // console.log(`Spawned ${gameState.items.length} potions around the world!`);
    },

    dropLoot: function(x, y) {
        if (Math.random() < 0.6) { // 60% chance to drop something
            const dropX = x + (Math.random() - 0.5) * 20;
            const dropY = y + (Math.random() - 0.5) * 20;
            
            const itemType = Math.random() < 0.7 ? 'health' : 'mana'; // 70% health, 30% mana
            
            const loot = this.create(dropX, dropY, itemType);
            gameState.items.push(loot);
            // console.log(`Enemy dropped a ${itemType} potion!`);
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
                // console.log(`Picked up ${item.name}! Press I to open inventory.`);
                
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
