// js/camera.js

// Import dependencies
import { gameState, Player, CONFIG } from './main.js';

export const Camera = {
    update: function() {
        if (!Player || !gameState || !gameState.camera || !CONFIG) return;
        
        // Center camera on player
        gameState.camera.x = Player.x - gameState.camera.width / 2;
        gameState.camera.y = Player.y - gameState.camera.height / 2;
        
        // Clamp camera to world boundaries
        // Prevent camera from showing area outside the world
        gameState.camera.x = Math.max(0, Math.min(
            gameState.camera.x, 
            CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE - gameState.camera.width
        ));
        
        gameState.camera.y = Math.max(0, Math.min(
            gameState.camera.y, 
            CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE - gameState.camera.height
        ));
    },

    // Utility function to convert world coordinates to screen coordinates
    worldToScreen: function(worldX, worldY) {
        if (!gameState.camera) return { x: worldX, y: worldY };
        
        return {
            x: worldX - gameState.camera.x,
            y: worldY - gameState.camera.y
        };
    },

    // Utility function to convert screen coordinates to world coordinates  
    screenToWorld: function(screenX, screenY) {
        if (!gameState.camera) return { x: screenX, y: screenY };
        
        return {
            x: screenX + gameState.camera.x,
            y: screenY + gameState.camera.y
        };
    },

    // Check if a world position is visible on screen
    isVisible: function(worldX, worldY, width = 0, height = 0) {
        if (!gameState.camera) return true;
        
        const screenPos = this.worldToScreen(worldX, worldY);
        
        return (
            screenPos.x + width >= 0 && 
            screenPos.x <= gameState.camera.width &&
            screenPos.y + height >= 0 && 
            screenPos.y <= gameState.camera.height
        );
    },

    // Get the current camera bounds in world coordinates
    getBounds: function() {
        if (!gameState.camera) {
            return { left: 0, right: 800, top: 0, bottom: 600 };
        }
        
        return {
            left: gameState.camera.x,
            right: gameState.camera.x + gameState.camera.width,
            top: gameState.camera.y,
            bottom: gameState.camera.y + gameState.camera.height
        };
    }
};