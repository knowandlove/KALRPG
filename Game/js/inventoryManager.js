// js/inventoryManager.js

// Import dependencies
// Player is the real module, ctx is a core export from main.js
import { gameState, Player, ctx } from './main.js';

export const InventoryManager = {
    selectedIndex: 0,
    gridCols: 8,
    gridRows: 6,
    slotSize: 48,
    // inventoryX and inventoryY are used by UI.renderInventory, not directly here.
    // We can remove them from here if UI.renderInventory becomes its own module or gets them from elsewhere.
    // For now, keeping them doesn't hurt, but they are unused within this specific object's methods.

    addItem: function(item) {
        const existingStack = gameState.inventory.find(stack => 
            stack.type === item.type && stack.name === item.name
        );
        
        if (existingStack) {
            existingStack.quantity = (existingStack.quantity || 0) + 1; // Ensure quantity is initialized
            // console.log(`Added to stack: ${existingStack.name} x${existingStack.quantity}`);
        } else {
            const newStack = {
                type: item.type,
                name: item.name,
                quantity: 1
            };
            
            if (item.type === 'health') {
                newStack.healAmount = item.healAmount;
            } else if (item.type === 'mana') {
                newStack.restoreAmount = item.restoreAmount;
            }
            
            gameState.inventory.push(newStack);
            // console.log(`New item: ${newStack.name} x1`);
        }
    },

    getSelectedItem: function() {
        return gameState.inventory[this.selectedIndex] || null;
    },

    useSelectedItem: function() {
        const item = this.getSelectedItem();
        if (!item || item.quantity <= 0) {
            // console.log('No item to use or quantity is zero!');
            return;
        }

        let itemUsed = false;
        if (item.type === 'health') {
            const oldHp = Player.hp;
            Player.hp = Math.min(Player.hp + item.healAmount, Player.maxHp);
            const actualHeal = Player.hp - oldHp;
            
            if (actualHeal > 0) {
                // console.log(`Used ${item.name}! Healed for ${actualHeal} HP (${Player.hp}/${Player.maxHp})`);
                itemUsed = true;
            } else {
                // console.log('Already at full health!');
            }
        } else if (item.type === 'mana') {
            const oldMana = Player.mana;
            Player.mana = Math.min(Player.mana + item.restoreAmount, Player.maxMana);
            const actualRestore = Player.mana - oldMana;
            
            if (actualRestore > 0) {
                // console.log(`Used ${item.name}! Restored ${actualRestore} mana (${Player.mana}/${Player.maxMana})`);
                itemUsed = true;
            } else {
                // console.log('Already at full mana!');
            }
        }

        if (itemUsed) {
            item.quantity -= 1;
            if (item.quantity <= 0) {
                gameState.inventory.splice(this.selectedIndex, 1);
                // Adjust selection if the list became shorter and current index is out of bounds
                if (this.selectedIndex >= gameState.inventory.length && gameState.inventory.length > 0) {
                    this.selectedIndex = gameState.inventory.length - 1;
                } else if (gameState.inventory.length === 0) {
                    this.selectedIndex = 0; // Reset if inventory is now empty
                }
            }
        }
    },

    selectNext: function() {
        if (gameState.inventory.length > 0) {
            this.selectedIndex = (this.selectedIndex + 1) % gameState.inventory.length;
        }
    },

    selectPrevious: function() {
        if (gameState.inventory.length > 0) {
            this.selectedIndex = (this.selectedIndex - 1 + gameState.inventory.length) % gameState.inventory.length;
        }
    },

    navigateGrid: function(direction) {
        if (gameState.inventory.length === 0) {
            this.selectedIndex = 0; // Ensure selectedIndex is 0 if inventory is empty
            return;
        }

        const maxIndex = gameState.inventory.length - 1;
        let currentRow = Math.floor(this.selectedIndex / this.gridCols);
        let currentCol = this.selectedIndex % this.gridCols;
        
        switch (direction) {
            case 'up':
                if (currentRow > 0) {
                    this.selectedIndex -= this.gridCols;
                }
                break;
            case 'down':
                // Only move down if there's an item in the slot below or it's a valid potential slot
                if (this.selectedIndex + this.gridCols <= maxIndex) {
                     this.selectedIndex += this.gridCols;
                } else {
                    // If trying to move down from last partially filled row, go to last item
                    if (currentRow < Math.floor(maxIndex / this.gridCols)) {
                         this.selectedIndex = maxIndex;
                    }
                }
                break;
            case 'left':
                if (this.selectedIndex > 0) { // Simpler check, just don't go below 0
                    this.selectedIndex--;
                }
                break;
            case 'right':
                if (this.selectedIndex < maxIndex) { // Simpler check, don't go beyond last item
                    this.selectedIndex++;
                }
                break;
        }
        // Ensure selectedIndex is always within the bounds of actual items
        this.selectedIndex = Math.max(0, Math.min(this.selectedIndex, maxIndex));
         if (gameState.inventory.length === 0) { // Double check if inventory became empty
            this.selectedIndex = 0;
        }
    },

    drawPotionIcon: function(x, y, size, color) {
        if (!ctx) return; // Guard clause for ctx
        const centerX = x + size / 2;
        const centerY = y + size / 2;
        
        ctx.fillStyle = color;
        ctx.fillRect(centerX - 8, centerY - 4, 16, 20); // Potion bottle body
        
        ctx.fillStyle = '#8B4513'; // Brown for neck
        ctx.fillRect(centerX - 4, centerY - 8, 8, 6); // Bottle neck
        
        ctx.fillStyle = '#D2691E'; // Cork color
        ctx.fillRect(centerX - 3, centerY - 10, 6, 4); // Cork
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'; // Shine
        ctx.fillRect(centerX - 6, centerY - 2, 3, 12);
    }
};
