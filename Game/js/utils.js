// js/utils.js

// Import necessary globals from main.js
// Note: Player will initially be the dummy Player from main.js, 
// which is fine for now. It will be replaced when player.js is created.
import { CONFIG, gameState, Player } from './main.js'; 

export const Utils = {
    checkCollision: function(x, y, width, height) {
        const left = Math.floor(x / CONFIG.TILE_SIZE);
        const right = Math.floor((x + width - 1) / CONFIG.TILE_SIZE);
        const top = Math.floor(y / CONFIG.TILE_SIZE);
        const bottom = Math.floor((y + height - 1) / CONFIG.TILE_SIZE);
        
        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (tx < 0 || tx >= CONFIG.WORLD_WIDTH || ty < 0 || ty >= CONFIG.WORLD_HEIGHT) {
                    return true;
                }
                // Assuming gameState.world is populated correctly
                if (gameState.world[ty] && gameState.world[ty][tx] && gameState.world[ty][tx].solid) {
                    return true;
                }
            }
        }
        return false;
    },

    findSafeSpawnPosition: function() {
        let attempts = 0;
        while (attempts < 100) {
            const xPos = Math.random() * (CONFIG.WORLD_WIDTH - 10) * CONFIG.TILE_SIZE + 5 * CONFIG.TILE_SIZE;
            const yPos = Math.random() * (CONFIG.WORLD_HEIGHT - 10) * CONFIG.TILE_SIZE + 5 * CONFIG.TILE_SIZE;
            
            // Player might not be fully defined when this module is first loaded,
            // so we use default dimensions if Player or its properties are missing.
            const pWidth = Player && typeof Player.width !== 'undefined' ? Player.width : 24;
            const pHeight = Player && typeof Player.height !== 'undefined' ? Player.height : 24;

            if (!this.checkCollision(xPos, yPos, pWidth, pHeight)) {
                return { x: xPos, y: yPos };
            }
            attempts++;
        }
        
        // Fallback
        for (let y = 5; y < CONFIG.WORLD_HEIGHT - 5; y++) {
            for (let x = 5; x < CONFIG.WORLD_WIDTH - 5; x++) {
                if (gameState.world[y] && gameState.world[y][x] && gameState.world[y][x].type === 'grass') {
                    const pWidth = Player && typeof Player.width !== 'undefined' ? Player.width : 24;
                    const pHeight = Player && typeof Player.height !== 'undefined' ? Player.height : 24;
                    return { 
                        x: x * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - pWidth / 2, 
                        y: y * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2 - pHeight / 2 
                    };
                }
            }
        }
        
        return { x: 200, y: 200 }; // Absolute fallback
    }
};
