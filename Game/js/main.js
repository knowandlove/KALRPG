// js/main.js - Fixed teleportation and entity management

// --- Core Configuration & Setup ---
export const CONFIG = {
    TILE_SIZE: 32,
    WORLD_WIDTH: 30,        // Updated for 30x30 map
    WORLD_HEIGHT: 30,       // Updated for 30x30 map
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
    },
    // Teleportation system
    teleporting: false,
    teleportCooldown: 0
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

// --- ASSET LOADING ---
async function loadGameAssets() {
    console.log('🎨 Loading assets for 30x30 overworld...');
    
    try {
        // Load your forest tileset
        await AssetManager.loadTileset(
            'forest',
            'assets/tilesets/forest.png',    // Your tileset path
            16,                              // Source tile size
            16,
            0,
            0
        );
        
        console.log('✅ Forest tileset loaded');
        
        // 🎨 Load player sprite from assets folder
        console.log('🎨 Loading player sprite from assets/sprites/...');
        Player.loadSprite('assets/sprites/player.png');
        
        // Load your 30x30 overworld map
        try {
            await AssetManager.loadTiledMap(
                'overworld_map',
                'overworld_map.json'         // Your map file
            );
            console.log('✅ 30x30 overworld map loaded successfully!');
        } catch (error) {
            console.log('📋 Custom map not found, using fallback');
        }
        
        console.log('🎉 All assets loaded successfully!');
        
    } catch (error) {
        console.error('❌ Failed to load some assets:', error);
        console.log('🔄 Game will use fallback graphics where needed');
    }
}

// --- 🔧 FIXED: TELEPORTATION SYSTEM ---
function checkForTeleportation() {
    // Reduce teleport cooldown
    if (gameState.teleportCooldown > 0) {
        gameState.teleportCooldown -= 16;
        return;
    }

    // Check if player is touching a portal
    const portal = World.checkPortalCollision(Player.x, Player.y, Player.width, Player.height);
    
    if (portal && !gameState.teleporting) {
        console.log(`🌀 Player touching portal: ${portal.name} -> ${portal.teleportTo}`);
        
        gameState.teleporting = true;
        
        // Map teleport destinations
        let targetWorld = portal.teleportTo;
        if (targetWorld === 'dungeon') {
            targetWorld = 'cave';
        }
        
        console.log(`🎯 Teleporting to world: ${targetWorld}`);
        
        // Perform teleportation
        const newSpawnPos = World.teleportToWorld(targetWorld);
        
        if (newSpawnPos) {
            console.log(`🎯 Moving player to (${newSpawnPos.x.toFixed(1)}, ${newSpawnPos.y.toFixed(1)})`);
            
            // Move player to new spawn position
            Player.x = newSpawnPos.x;
            Player.y = newSpawnPos.y;
            
            // Reset player state to ensure visibility
            Player.invulnerable = false;
            Player.damageFlash = false;
            Player.knockback.active = false;
            Player.isAttacking = false;
            Player.charging = false;
            Player.chargeLevel = 0;
            
            // 🔧 CRITICAL: Update world reference in gameState
            const newWorld = World.getCurrentWorld();
            gameState.world = newWorld.tiles;
            
            // 🔧 CRITICAL: Update CONFIG to match new world size
            const oldWidth = CONFIG.WORLD_WIDTH;
            const oldHeight = CONFIG.WORLD_HEIGHT;
            CONFIG.WORLD_WIDTH = newWorld.width;
            CONFIG.WORLD_HEIGHT = newWorld.height;
            
            console.log(`📐 Updated world size from ${oldWidth}x${oldHeight} to ${CONFIG.WORLD_WIDTH}x${CONFIG.WORLD_HEIGHT}`);
            
            // 🔧 CRITICAL: Force camera update with new world bounds
            Camera.update();
            console.log(`📷 Camera updated to (${gameState.camera.x.toFixed(1)}, ${gameState.camera.y.toFixed(1)})`);
            
            // Clear entities properly
            console.log('🧹 Clearing old entities...');
            gameState.enemies = [];
            gameState.items = [];
            gameState.projectiles = [];
            gameState.npcs = [];
            
            // Spawn new entities for the new world
            console.log('✨ Spawning entities for new world...');
            EnemySystem.spawn();
            ItemSystem.spawnTestItem();
            
            // Only spawn NPCs in overworld
            if (World.getCurrentWorld().id === 'overworld') {
                NPCSystem.spawnTestNPC();
            }
            
            // Set teleport cooldown
            gameState.teleportCooldown = 2000; // 2 second cooldown
            
            // Show transition message
            const worldName = World.getCurrentWorld().name;
            console.log(`🎉 Welcome to ${worldName}!`);
            console.log(`👤 Player at (${Player.x.toFixed(1)}, ${Player.y.toFixed(1)}) in ${worldName}`);
            
            // Show UI message if available
            if (DialogueSystem && DialogueSystem.showDialogue) {
                DialogueSystem.showDialogue('System', `Entered ${worldName}`, 2000);
            }
            
            // Reset teleporting flag after a short delay
            setTimeout(() => {
                gameState.teleporting = false;
                console.log('✅ Teleportation complete');
                console.log(`🔍 Final check - Player: (${Player.x.toFixed(1)}, ${Player.y.toFixed(1)}), Camera: (${gameState.camera.x.toFixed(1)}, ${gameState.camera.y.toFixed(1)})`);
            }, 500);
        } else {
            console.error('❌ Failed to get spawn position for new world');
            gameState.teleporting = false;
        }
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

    if (!gameLogicUpdatesPaused && !gameState.teleporting) {
        Player.update(); 
        EnemySystem.updateAll();
        ProjectileSystem.update(); 
        ItemSystem.checkPickup(); 
        NPCSystem.update(); 
        Camera.update();
        
        // Check for teleportation
        checkForTeleportation();
    }
    
    if (!gameState.showInventory) {
        DialogueSystem.update();
    }
    
    // Render everything
    Renderer.renderWorld();
    EnemySystem.render();
    ItemSystem.render(); 
    NPCSystem.render(); 
    Renderer.renderPlayer();
    ProjectileSystem.render(); 
    UI.update(); 
    UI.renderInventory(); 
    DialogueSystem.render();
    
    // Show current world name and portal hints
    const currentWorld = World.getCurrentWorld();
    if (currentWorld) {
        // World name display
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(10, canvas.height - 80, 200, 25);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.fillText(`World: ${currentWorld.name}`, 15, canvas.height - 62);
        
        // Portal hint - DISABLED for seamless cave entrance
        /* ORIGINAL PORTAL HINT CODE (commented out)
        const nearPortal = World.checkPortalCollision(Player.x - 16, Player.y - 16, Player.width + 32, Player.height + 32);
        if (nearPortal && gameState.teleportCooldown <= 0 && !gameState.teleporting) {
            ctx.fillStyle = 'rgba(255, 215, 0, 0.9)';
            ctx.fillRect(10, canvas.height - 50, 250, 25);
            ctx.fillStyle = '#000000';
            ctx.font = 'bold 14px monospace';
            ctx.fillText(`Walk to enter ${nearPortal.name}`, 15, canvas.height - 32);
        }
        */
        
        // Teleport cooldown indicator
        if (gameState.teleportCooldown > 0) {
            ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
            ctx.fillRect(10, canvas.height - 110, 150, 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px monospace';
            ctx.fillText(`Teleport cooldown: ${Math.ceil(gameState.teleportCooldown / 1000)}s`, 15, canvas.height - 97);
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// --- GAME INITIALIZATION ---
async function initGame() {
    console.log('🚀 Starting game with 30x30 overworld and cave system...');
    
    // Load assets first
    await loadGameAssets();
    
    // Initialize world system
    await World.init();
    gameState.world = World.generate();
    
    // Set up player at safe spawn position
    const safeSpawn = World.findSafeSpawnPosition();
    Player.x = safeSpawn.x; 
    Player.y = safeSpawn.y;
    console.log(`👤 Player spawned at (${Player.x}, ${Player.y})`);
    
    // Initialize other systems
    Camera.update();
    EnemySystem.spawn();
    ItemSystem.spawnTestItem(); 
    NPCSystem.spawnTestNPC(); 
    
    console.log('🎉 Game ready with 30x30 overworld!');
    console.log('🌍 Current world:', World.getCurrentWorld().name);
    console.log('🚪 Portals available:', World.getCurrentWorld().portals?.length || 0);
    
    // Start the game loop
    gameLoop();
}

// --- DEBUG HELPERS ---
window.debugWorlds = function() {
    console.log('🔍 World Debug Info:');
    console.log('Available worlds:', Object.keys(World.worlds));
    console.log('Current world:', World.getCurrentWorld());
    
    const currentWorld = World.getCurrentWorld();
    if (currentWorld.portals) {
        console.log('Portals in current world:');
        currentWorld.portals.forEach((portal, i) => {
            console.log(`  ${i + 1}. ${portal.name} -> ${portal.teleportTo} at (${portal.x.toFixed(1)}, ${portal.y.toFixed(1)})`);
        });
    }
};

window.teleportTo = function(worldName) {
    const targetWorld = worldName === 'overworld' ? 'overworld' : 'cave';
    const newSpawnPos = World.teleportToWorld(targetWorld);
    
    if (newSpawnPos) {
        Player.x = newSpawnPos.x;
        Player.y = newSpawnPos.y;
        Camera.update();
        
        // Clear and respawn entities
        gameState.enemies = [];
        gameState.items = [];
        gameState.projectiles = [];
        gameState.npcs = [];
        
        EnemySystem.spawn();
        ItemSystem.spawnTestItem();
        if (World.getCurrentWorld().id === 'overworld') {
            NPCSystem.spawnTestNPC();
        }
        
        console.log(`🌀 Teleported to ${World.getCurrentWorld().name}`);
    }
};

window.showPlayerPos = function() {
    const world = World.getCurrentWorld();
    const tileX = Math.floor(Player.x / CONFIG.TILE_SIZE);
    const tileY = Math.floor(Player.y / CONFIG.TILE_SIZE);
    
    console.log(`Player position:`);
    console.log(`  World: (${Player.x.toFixed(1)}, ${Player.y.toFixed(1)})`);
    console.log(`  Tile: (${tileX}, ${tileY})`);
    console.log(`  World: ${world.name} (${world.width}x${world.height})`);
};

window.debugPortals = function() {
    const world = World.getCurrentWorld();
    console.log('🚪 Portal Debug:');
    console.log(`Current world: ${world.name}`);
    console.log(`Player position: (${Player.x.toFixed(1)}, ${Player.y.toFixed(1)})`);
    
    if (world.portals && world.portals.length > 0) {
        world.portals.forEach((portal, i) => {
            const distance = Math.sqrt((Player.x - portal.x) ** 2 + (Player.y - portal.y) ** 2);
            console.log(`Portal ${i + 1}: ${portal.name}`);
            console.log(`  Position: (${portal.x.toFixed(1)}, ${portal.y.toFixed(1)})`);
            console.log(`  Size: ${portal.width}x${portal.height}`);
            console.log(`  Distance from player: ${distance.toFixed(1)} pixels`);
            console.log(`  Target: ${portal.teleportTo}`);
            
            // Show tile coordinates too
            const tileX = Math.floor(portal.x / 32);
            const tileY = Math.floor(portal.y / 32);
            console.log(`  Tile position: (${tileX}, ${tileY})`);
        });
    } else {
        console.log('No portals in current world');
    }
    
    // Show where the player thinks the cave entrance should be
    console.log('\n🎯 Cave entrance location analysis:');
    console.log('Based on your image, the cave entrance appears to be around tile (24, 6)');
    console.log('That would be world coordinates:', 24 * 32, ',', 6 * 32, '= (768, 192)');
};

window.adjustPortal = function(offsetX = 0, offsetY = 0) {
    const world = World.getCurrentWorld();
    if (world.portals && world.portals.length > 0) {
        const portal = world.portals[0];
        portal.x += offsetX;
        portal.y += offsetY;
        portal.worldX = portal.x;
        portal.worldY = portal.y;
        
        console.log(`🔧 Adjusted portal to (${portal.x.toFixed(1)}, ${portal.y.toFixed(1)})`);
        console.log(`🎯 Try: adjustPortal(32, 0) to move right one tile`);
        console.log(`🎯 Try: adjustPortal(0, -32) to move up one tile`);
    }
};

// Start the game
initGame().catch(error => {
    console.error('💥 Game failed to start:', error);
    console.log('🔧 Check that your map file is in the right location!');
    console.log('📁 Expected: overworld_map.json in the same folder as index.html');
    console.log('🛠️ Also check that assets/tilesets/forest.png exists');
});

// Make debug functions available
window.debugPlayer = function() {
    console.log('👤 Player Debug Info:');
    console.log(`  Position: (${Player.x.toFixed(1)}, ${Player.y.toFixed(1)})`);
    console.log(`  Size: ${Player.width}x${Player.height}`);
    console.log(`  States: invulnerable=${Player.invulnerable}, damageFlash=${Player.damageFlash}, isAttacking=${Player.isAttacking}`);
    console.log(`  Knockback: active=${Player.knockback.active}`);
    
    const world = World.getCurrentWorld();
    console.log(`🌍 Current World: ${world.name} (${world.width}x${world.height})`);
    
    console.log(`📷 Camera: (${gameState.camera.x.toFixed(1)}, ${gameState.camera.y.toFixed(1)})`);
    
    const screenX = Player.x - gameState.camera.x;
    const screenY = Player.y - gameState.camera.y;
    console.log(`📺 Player on screen: (${screenX.toFixed(1)}, ${screenY.toFixed(1)})`);
    
    // Check if player is visible
    const visible = screenX > -Player.width && screenX < canvas.width && 
                   screenY > -Player.height && screenY < canvas.height;
    console.log(`👁️ Player visible: ${visible}`);
    
    // Check collision at player position
    const collision = World.checkCollision(Player.x, Player.y, Player.width, Player.height);
    console.log(`🚫 Player in solid tile: ${collision}`);
};

window.debugSprite = function() {
    console.log('🧪 Sprite Direction Test:');
    console.log('Current facing:', Player.facing);
    console.log('Current animation:', Player.sprite.currentAnimation);
    
    if (Player.sprite.currentAnimation) {
        const anim = Player.sprite.animations[Player.sprite.currentAnimation];
        console.log('Using row:', anim.row);
        console.log('Frame:', anim.frames[Player.sprite.currentFrame]);
    }
    
    console.log('\n🔧 Try these commands to test each direction:');
    console.log('testRow(0) - Test row 0 (currently mapped to DOWN)');
    console.log('testRow(1) - Test row 1 (currently mapped to LEFT)'); 
    console.log('testRow(2) - Test row 2 (currently mapped to RIGHT)');
    console.log('testRow(3) - Test row 3 (currently mapped to UP)');
    console.log('\nTell me which row actually shows which direction!');
};

window.testRow = function(row) {
    // Force the player to use a specific row so we can see what direction it shows
    Player.sprite.currentAnimation = 'walk_down';
    Player.sprite.animations.walk_down.row = row;
    Player.sprite.currentFrame = 0;
    console.log(`🎭 Now using row ${row} - look at your character!`);
    console.log('Tell me what direction this character is facing');
};

window.fixSpriteMapping = function(downRow, leftRow, rightRow, upRow) {
    console.log(`🔧 Updating sprite mapping: down=${downRow}, left=${leftRow}, right=${rightRow}, up=${upRow}`);
    
    // Update all the animations with correct rows
    Player.sprite.animations.idle_down.row = downRow;
    Player.sprite.animations.walk_down.row = downRow;
    Player.sprite.animations.idle_left.row = leftRow;
    Player.sprite.animations.walk_left.row = leftRow;
    Player.sprite.animations.idle_right.row = rightRow;
    Player.sprite.animations.walk_right.row = rightRow;
    Player.sprite.animations.idle_up.row = upRow;
    Player.sprite.animations.walk_up.row = upRow;
    
    console.log('✅ Sprite mapping updated! Try moving around now.');
};

console.log('🛠️ Debug commands available:');
console.log('  debugSprite() - Test sprite directions');
console.log('  testRow(0-3) - Test specific sprite rows');
console.log('  fixSpriteMapping(down, left, right, up) - Fix the row mapping');
console.log('  debugWorlds() - Show world and portal info');
console.log('  debugPortals() - Show detailed portal information');
console.log('  debugPlayer() - Show player position and visibility info');
console.log('  teleportTo("overworld") or teleportTo("cave") - Manual teleport');
console.log('  showPlayerPos() - Show player position info');