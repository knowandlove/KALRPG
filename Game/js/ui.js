// js/ui.js

// Import dependencies
// Player & InventoryManager are real modules imported via main.js
// canvas & ctx are core exports from main.js
import { Player, gameState, InventoryManager, canvas, ctx } from './main.js';

export const UI = {
    update: function() {
        const el = (id) => document.getElementById(id);

        // Update health bar
        if (Player && el('hp-text') && el('hp-fill')) {
            const hpPercent = (Player.hp / Player.maxHp) * 100;
            const hpFill = el('hp-fill');
            el('hp-text').textContent = `${Math.floor(Player.hp)}/${Player.maxHp}`;
            hpFill.style.width = hpPercent + '%';
            if (hpPercent > 60) hpFill.style.background = '#4caf50';
            else if (hpPercent > 30) hpFill.style.background = '#ff9800';
            else hpFill.style.background = '#f44336';
        }

        // Update mana bar
        if (Player && el('mp-text') && el('mp-fill')) {
            const mpPercent = (Player.mana / Player.maxMana) * 100;
            const mpFill = el('mp-fill');
            el('mp-text').textContent = `${Math.floor(Player.mana)}/${Player.maxMana}`;
            mpFill.style.width = mpPercent + '%';
            if (mpPercent > 60) mpFill.style.background = '#2196f3';
            else if (mpPercent > 30) mpFill.style.background = '#9c27b0';
            else mpFill.style.background = '#673ab7';
        }
        
        if (Player && el('level')) el('level').textContent = Player.level;
        if (Player && el('xp')) el('xp').textContent = Player.xp;
        
        // Update charge bar
        if (Player && el('charge-fill')) {
            const chargePercent = (Player.chargeLevel / Player.maxChargeLevel) * 100;
            const chargeFill = el('charge-fill');
            chargeFill.style.width = chargePercent + '%';
            if (chargePercent >= 100) chargeFill.style.background = '#ffd700';
            else if (chargePercent >= 50) chargeFill.style.background = '#ff6b35';
            else chargeFill.style.background = '#4169e1';
        }

        // Update debug info
        if (Player && el('player-pos')) el('player-pos').textContent = `${Math.floor(Player.x)}, ${Math.floor(Player.y)}`;
        if (gameState && el('npc-count')) el('npc-count').textContent = gameState.npcs ? gameState.npcs.length : 0;
    },

    renderInventory: function() {
        if (!gameState.showInventory || !InventoryManager || !ctx || !canvas) return;
        
        const invWidth = InventoryManager.gridCols * InventoryManager.slotSize + 40;
        const invHeight = InventoryManager.gridRows * InventoryManager.slotSize + 120;
        
        const invX = (canvas.width - invWidth) / 2;
        const invY = (canvas.height - invHeight) / 2;
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fillRect(invX, invY, invWidth, invHeight);
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 2;
        ctx.strokeRect(invX, invY, invWidth, invHeight);
        
        ctx.fillStyle = '#fff';
        ctx.font = '24px monospace';
        ctx.fillText('Inventory', invX + 20, invY + 35);
        
        ctx.font = '14px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText('Arrow keys: navigate, Enter: use, I: close', invX + 20, invY + 55);
        
        const gridStartX = invX + 20;
        const gridStartY = invY + 70;
        
        for (let row = 0; row < InventoryManager.gridRows; row++) {
            for (let col = 0; col < InventoryManager.gridCols; col++) {
                const slotX = gridStartX + col * InventoryManager.slotSize;
                const slotY = gridStartY + row * InventoryManager.slotSize;
                const slotIndex = row * InventoryManager.gridCols + col;
                
                ctx.fillStyle = '#333';
                ctx.fillRect(slotX, slotY, InventoryManager.slotSize - 2, InventoryManager.slotSize - 2);
                
                ctx.strokeStyle = '#555';
                ctx.lineWidth = 1;
                ctx.strokeRect(slotX, slotY, InventoryManager.slotSize - 2, InventoryManager.slotSize - 2);
                
                const item = gameState.inventory[slotIndex];
                if (slotIndex === InventoryManager.selectedIndex && item) { // Highlight only if item exists
                    ctx.strokeStyle = '#ffff00';
                    ctx.lineWidth = 3;
                    ctx.strokeRect(slotX - 1, slotY - 1, InventoryManager.slotSize, InventoryManager.slotSize);
                }
                
                if (item) {
                    if (item.type === 'health') {
                        InventoryManager.drawPotionIcon(slotX + 4, slotY + 4, InventoryManager.slotSize - 8, '#ff4444');
                    } else if (item.type === 'mana') {
                        InventoryManager.drawPotionIcon(slotX + 4, slotY + 4, InventoryManager.slotSize - 8, '#4444ff');
                    }
                    
                    if (item.quantity > 1) {
                        ctx.fillStyle = '#fff';
                        ctx.font = '12px monospace';
                        ctx.textAlign = 'right'; // Align quantity to the right of the slot
                        ctx.fillText(item.quantity.toString(), slotX + InventoryManager.slotSize - 5, slotY + InventoryManager.slotSize - 5);
                        ctx.textAlign = 'left'; // Reset alignment
                    }
                }
            }
        }
        
        const selectedItem = InventoryManager.getSelectedItem();
        if (selectedItem) {
            const detailY = gridStartY + InventoryManager.gridRows * InventoryManager.slotSize + 20;
            
            ctx.fillStyle = '#fff';
            ctx.font = '16px monospace';
            ctx.fillText(`${selectedItem.name} x${selectedItem.quantity}`, invX + 20, detailY);
            
            ctx.fillStyle = '#aaa';
            ctx.font = '14px monospace';
            if (selectedItem.type === 'health') {
                ctx.fillText(`Restores ${selectedItem.healAmount} HP`, invX + 20, detailY + 20);
            } else if (selectedItem.type === 'mana') {
                ctx.fillText(`Restores ${selectedItem.restoreAmount} Mana`, invX + 20, detailY + 20);
            }
        } else if (gameState.inventory.length > 0 && InventoryManager.selectedIndex >= 0 && InventoryManager.selectedIndex < gameState.inventory.length) {
            // This case should ideally not be hit if selectedIndex is managed well,
            // but as a fallback, indicate selection is on an empty "conceptual" slot if needed.
            // Or simply show no details. For now, if !selectedItem, no details are shown.
        } else if (gameState.inventory.length === 0) {
            ctx.fillStyle = '#777';
            ctx.font = '16px monospace';
            ctx.fillText('Inventory is empty.', invX + 20, gridStartY + 20);
        }
    }
};
