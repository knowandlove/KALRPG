// js/utils.js

// Import necessary globals from main.js
import { CONFIG, gameState, Player } from './main.js';
// Import World system for collision detection
import { World } from './main.js';

export const Utils = {
    checkCollision: function(x, y, width, height) {
        // Use the new World system's collision detection
        return World.checkCollision(x, y, width, height);
    },

    findSafeSpawnPosition: function() {
        // Use the new World system's spawn position finding
        return World.findSafeSpawnPosition(
            Player && typeof Player.width !== 'undefined' ? Player.width : 24,
            Player && typeof Player.height !== 'undefined' ? Player.height : 24
        );
    }
};