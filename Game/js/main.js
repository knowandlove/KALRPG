// js/main.js

// --- Core Configuration & Setup ---
export const CONFIG = {
    TILE_SIZE: 32,
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
import { DialogueSystem } from './dialogueSystem.js'; // ✅ REAL DialogueSystem module

// --- Global Game State ---
export const gameState = {
    world: [],
    enemies: [],
    projectiles: [], 
    items: [], 
    inventory: [], 
    showInventory: false,
    npcs: [], 
    dialogue: { // This will be managed by the real DialogueSystem
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

// --- TEMPORARY Dummy Game System Objects (defined without direct export) ---
// Player, Utils, ProjectileSystem, ItemSystem, InventoryManager, UI, NPCSystem, DialogueSystem are now real.
const EnemySystem_dummy = { create: () => ({}), spawn: () => {}, updateAll: () => {} };
const World_dummy = { generate: () => [] };
const Camera_dummy = { 
    update: function() { 
        if (Player && gameState && gameState.camera && CONFIG) { 
            gameState.camera.x = Player.x - gameState.camera.width / 2;
            gameState.camera.y = Player.y - gameState.camera.height / 2;
            gameState.camera.x = Math.max(0, Math.min(gameState.camera.x, CONFIG.WORLD_WIDTH * CONFIG.TILE_SIZE - gameState.camera.width));
            gameState.camera.y = Math.max(0, Math.min(gameState.camera.y, CONFIG.WORLD_HEIGHT * CONFIG.TILE_SIZE - gameState.camera.height));
        }
    } 
}; 
const Renderer_dummy = { 
    renderWorld: () => {}, 
    renderEnemies: () => {}, 
    renderPlayer: () => { 
        if(Player && gameState && gameState.camera && ctx) { 
             ctx.fillStyle = Player.damageFlash ? '#ff4444' : (Player.invulnerable ? '#6495ed' : '#4169e1'); 
             ctx.fillRect(Player.x - gameState.camera.x, Player.y - gameState.camera.y, Player.width, Player.height); 
        }
    } 
};

// Export necessary modules/variables that other modules might import FROM main.js
export { 
    Player, 
    ProjectileSystem, 
    ItemSystem,
    InventoryManager,
    UI,
    NPCSystem,
    DialogueSystem, // ✅ Exporting the REAL DialogueSystem
    EnemySystem_dummy as EnemySystem,
    World_dummy as World,
    Camera_dummy as Camera,
    Renderer_dummy as Renderer
};


// --- Input Handling ---
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
            // If dialogue is active, 'E' tries to advance/close it.
            // NPCSystem.startInteraction handles advancing dialogue.
            // If not handled by NPC (e.g. simple message), DialogueSystem.closeDialogue as fallback.
            const activeNPC = gameState.npcs.find(npc => npc.name === gameState.dialogue.speaker && npc.isTalking);
            if (activeNPC && NPCSystem.startInteraction) { // Check if method exists
                NPCSystem.startInteraction(activeNPC); 
            } else {
                DialogueSystem.closeDialogue(); // Uses REAL DialogueSystem
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


// --- Main Game Loop & Initialization ---
function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    let gameLogicUpdatesPaused = gameState.showInventory || (gameState.dialogue && gameState.dialogue.active);

    if (!gameLogicUpdatesPaused) {
        Player.update(); 
        EnemySystem_dummy.updateAll(); 
        ProjectileSystem.update(); 
        ItemSystem.checkPickup(); 
        NPCSystem.update(); 
        Camera_dummy.update(); 
    }
    // Dialogue system updates its timer regardless if active (but not if inventory is shown perhaps)
    if (!gameState.showInventory) {
        DialogueSystem.update(); // ✅ Uses REAL DialogueSystem.update()
    }
    
    Renderer_dummy.renderWorld(); 
    Renderer_dummy.renderEnemies(); 
    ItemSystem.render(); 
    NPCSystem.render(); 
    Renderer_dummy.renderPlayer(); 
    ProjectileSystem.render(); 
    UI.update(); 
    UI.renderInventory(); 
    DialogueSystem.render(); // ✅ Uses REAL DialogueSystem.render()
    
    requestAnimationFrame(gameLoop);
}

function initGame() {
    gameState.world = World_dummy.generate(); 
    const safeSpawn = Utils.findSafeSpawnPosition(); 
    Player.x = safeSpawn.x; 
    Player.y = safeSpawn.y;
    
    Camera_dummy.update(); 

    EnemySystem_dummy.spawn(); 
    ItemSystem.spawnTestItem(); 
    NPCSystem.spawnTestNPC(); 
    
    console.log('🚀 Adventure Game (Refactored) Started!');
    console.log('🎮 Controls: WASD (move), X (attack), I (inventory), E (interact)');
    
    gameLoop();
}

// Start the game
initGame();
