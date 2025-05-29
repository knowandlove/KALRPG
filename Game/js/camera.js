// js/camera.js - Fixed for multiple world sizes

import { gameState, Player, CONFIG } from './main.js';
import { World } from './main.js';

export const Camera = {
    update: function() {
        if (!Player || !gameState || !gameState.camera || !CONFIG) return;
        
        // Get current world for bounds checking
        const currentWorld = World.getCurrentWorld();
        if (!currentWorld) return;
        
        // Center camera on player
        gameState.camera.x = Player.x - gameState.camera.width / 2;
        gameState.camera.y = Player.y - gameState.camera.height / 2;
        
        // 🔧 FIXED: Use current world dimensions instead of CONFIG
        const worldPixelWidth = currentWorld.width * currentWorld.tileSize;
        const worldPixelHeight = currentWorld.height * currentWorld.tileSize;
        
        // Clamp camera to world boundaries
        gameState.camera.x = Math.max(0, Math.min(
            gameState.camera.x, 
            worldPixelWidth - gameState.camera.width
        ));
        
        gameState.camera.y = Math.max(0, Math.min(
            gameState.camera.y, 
            worldPixelHeight - gameState.camera.height
        ));
        
        // Debug log for teleportation issues
        if (gameState.teleporting) {
            console.log(`📷 Camera update: Player(${Player.x.toFixed(1)}, ${Player.y.toFixed(1)}) -> Camera(${gameState.camera.x.toFixed(1)}, ${gameState.camera.y.toFixed(1)})`);
            console.log(`🌍 World bounds: ${worldPixelWidth}x${worldPixelHeight} pixels`);
        }
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
    },

    // 🔧 NEW: Force camera to center on player (useful after teleportation)
    centerOnPlayer: function() {
        if (!Player || !gameState.camera) return;
        
        gameState.camera.x = Player.x - gameState.camera.width / 2;
        gameState.camera.y = Player.y - gameState.camera.height / 2;
        
        this.update(); // Apply bounds checking
    }
};