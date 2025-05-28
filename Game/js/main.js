// js/main.js - Updated for 16x16 tilesets and Tiled map support

// --- Core Configuration & Setup ---
export const CONFIG = {
    TILE_SIZE: 32,          // Display size (we'll scale 16x16 to 32x32)
    WORLD_WIDTH: 100,
    WORLD_HEIGHT: 100,
    CANVAS_WIDTH: 800,
    CANVAS_HEIGHT: 600
};

export const canvas = document.getElementById('gameCanvas');
export const ctx = canvas.getContext('2d');
export const keys = {};

// --- Module Imports ---
import { Utils } from './utils.js'; 
import { Player } from './player.js'; 
import { ProjectileSystem } from './projectileSystem.js'; 
import { ItemSystem } from './itemSystem.js';
import { InventoryManager } from './inventoryManager.js';
import { UI } from './ui.js';
import { NPCSystem } from './npcSystem.js';
import { DialogueSystem } from './dialogueSystem.js';
import { EnemySystem } from './enemySystem.js';
import { Renderer } from './renderer.js';
import { Camera } from './camera.js';
import { World } from './world.js';
import { AssetManager } from './assetManager.js';

// --- Global Game State ---
export const gameState = {
    world: [],
    enemies: [],
    projectiles: [], 
    items: [], 
    inventory: [], 
    showInventory: false,
    npcs: [], 
    dialogue: {
        active: false,
        speaker: '',
        message: '',
        timer: 0,
        duration: 4000 
    },
    camera: {
        x: 0,
        y: 0,
        width: CONFIG.CANVAS_WIDTH,
        height: CONFIG.CANVAS_HEIGHT
    }
};

// Export all modules
export { 
    Player, 
    ProjectileSystem, 
    ItemSystem,
    InventoryManager,
    UI,
    NPCSystem,
    DialogueSystem,
    EnemySystem,
    Renderer,
    Camera,
    World,
    AssetManager
};

// --- ASSET LOADING FOR YOUR 16x16 TILESETS ---
async function loadGameAssets() {
    console.log('🎨 Loading your 16x16 professional tilesets...');
    
    try {
        // Load your grass tileset (16x16 pixels, scaled to 32x32 for display)
        await AssetManager.loadTileset(
            'grass',                            // Name for referencing
            'assets/tilesets/grass.png',        // Your grass tileset path
            16,                                 // Source tile width (your actual tile size)
            16,                                 // Source tile height
            0,                                  // Margin
            0                                   // Spacing
        );
        
        console.log('✅ Grass tileset loaded');
        
        // Load your trees tileset
        await AssetManager.loadTileset(
            'trees',                            // Name for referencing
            'assets/tilesets/trees.png',        // Your trees tileset path  
            16,                                 // Source tile width
            16,                                 // Source tile height
            0,                                  // Margin
            0                                   // Spacing
        );
        
        console.log('✅ Trees tileset loaded');
        
        // Optional: Load your Tiled map JSON
        try {
            await AssetManager.loadTiledMap(
                'overworld_map',
                './assets/maps/overworld_map.json'  // Organized in assets/maps/ folder
            );
            console.log('✅ Your custom map loaded successfully!');
        } catch (error) {
            console.log('📋 Custom map not found, will use procedural generation');
            console.log('🔧 Make sure map is in assets/maps/ folder');
        }
        
        console.log('🎉 All assets loaded successfully!');
        
    } catch (error) {
        console.error('❌ Failed to load some assets:', error);
        console.log('🔄 Game will use fallback graphics where needed');
    }
}

// --- INPUT HANDLING ---
document.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    
    if (e.key.toLowerCase() === 'i') {
        gameState.showInventory = !gameState.showInventory;
        return; 
    }

    if (gameState.showInventory) {
        if (e.key === 'ArrowUp') InventoryManager.navigateGrid('up');
        if (e.key === 'ArrowDown') InventoryManager.navigateGrid('down');
        if (e.key === 'ArrowLeft') InventoryManager.navigateGrid('left');
        if (e.key === 'ArrowRight') InventoryManager.navigateGrid('right');
        if (e.key === 'Enter') InventoryManager.useSelectedItem();
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.key)) e.preventDefault();
        return; 
    }

    if (gameState.dialogue && gameState.dialogue.active) {
        if (e.key.toLowerCase() === 'e') {
            const activeNPC = gameState.npcs.find(npc => npc.name === gameState.dialogue.speaker && npc.isTalking);
            if (activeNPC && NPCSystem.startInteraction) {
                NPCSystem.startInteraction(activeNPC); 
            } else {
                DialogueSystem.closeDialogue();
            }
        }
        return; 
    }

    if (e.key.toLowerCase() === 'x') {
        if (Player.attackCooldown <= 0 && !Player.isAttacking) { 
            Player.charging = true;
        }
    }
    
    if (e.key.toLowerCase() === 'e') {
        NPCSystem.attemptInteractionWithNearbyNPC(); 
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.key.toLowerCase()] = false;
    
    if (e.key.toLowerCase() === 'x') {
        if (Player.charging) { 
            Player.attack();
            Player.charging = false;
        }
    }
});

// --- GAME LOOP ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let gameLogicUpdatesPaused = gameState.showInventory || (gameState.dialogue && gameState.dialogue.active);

    if (!gameLogicUpdatesPaused) {
        Player.update(); 
        EnemySystem.updateAll();
        ProjectileSystem.update(); 
        ItemSystem.checkPickup(); 
        NPCSystem.update(); 
        Camera.update();
    }
    
    if (!gameState.showInventory) {
        DialogueSystem.update();
    }
    
    Renderer.renderWorld();
    EnemySystem.render();
    ItemSystem.render(); 
    NPCSystem.render(); 
    Renderer.renderPlayer();
    ProjectileSystem.render(); 
    UI.update(); 
    UI.renderInventory(); 
    DialogueSystem.render();
    
    requestAnimationFrame(gameLoop);
}

// --- GAME INITIALIZATION ---
async function initGame() {
    console.log('🚀 Starting game with professional 16x16 tilesets...');
    
    // Load assets first
    await loadGameAssets();
    
    // Initialize world system (now supports Tiled maps)
    await World.init();
    gameState.world = World.generate();
    
    // Set up player at safe spawn position
    const safeSpawn = World.findSafeSpawnPosition();
    Player.x = safeSpawn.x; 
    Player.y = safeSpawn.y;
    
    // Initialize other systems
    Camera.update();
    EnemySystem.spawn();
    ItemSystem.spawnTestItem(); 
    NPCSystem.spawnTestNPC(); 
    
    console.log('🎉 Game ready with professional tilesets!');
    console.log('🌍 Current world:', World.getCurrentWorld().name);
    
    // Start the game loop
    gameLoop();
}

// --- DEBUG HELPER (Optional) ---
window.debugTilesets = function() {
    console.log('🔍 Tileset Debug Info:');
    console.log('Grass tileset:', AssetManager.tilesets.grass);
    console.log('Trees tileset:', AssetManager.tilesets.trees);
    
    // Show first few tiles from each tileset
    const debugCanvas = document.createElement('canvas');
    debugCanvas.width = 400;
    debugCanvas.height = 200;
    debugCanvas.style.position = 'absolute';
    debugCanvas.style.top = '10px';
    debugCanvas.style.right = '10px';
    debugCanvas.style.border = '2px solid lime';
    debugCanvas.style.zIndex = '1000';
    debugCanvas.style.backgroundColor = 'white';
    document.body.appendChild(debugCanvas);
    
    const debugCtx = debugCanvas.getContext('2d');
    
    // Show grass tiles (16x16 source, scaled to 32x32)
    debugCtx.fillStyle = 'black';
    debugCtx.font = '12px Arial';
    debugCtx.fillText('Grass Tiles (16x16 → 32x32):', 5, 15);
    
    for (let i = 0; i < 8; i++) {
        AssetManager.drawTile(debugCtx, 'grass', i, 5 + i * 34, 20, 32, 32);
    }
    
    // Show tree tiles
    debugCtx.fillText('Tree Tiles (16x16 → 32x32):', 5, 75);
    for (let i = 0; i < 8; i++) {
        AssetManager.drawTile(debugCtx, 'trees', i, 5 + i * 34, 80, 32, 32);
    }
    
    // Add close button
    debugCtx.fillStyle = 'red';
    debugCtx.fillRect(370, 5, 25, 15);
    debugCtx.fillStyle = 'white';
    debugCtx.font = '10px Arial';
    debugCtx.fillText('X', 378, 15);
    
    debugCanvas.addEventListener('click', (e) => {
        const rect = debugCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (x > 370 && x < 395 && y > 5 && y < 20) {
            document.body.removeChild(debugCanvas);
        }
    });
};

// Start the game
initGame().catch(error => {
    console.error('💥 Game failed to start:', error);
    console.log('🔧 Check that your tileset paths are correct!');
    console.log('📁 Expected structure:');
    console.log('  assets/tilesets/grass.png');
    console.log('  assets/tilesets/trees.png');
    console.log('  assets/maps/overworld_map.json');
});

// Make debug function available globally
console.log('🛠️ Debug: Call debugTilesets() in console to see tileset preview');