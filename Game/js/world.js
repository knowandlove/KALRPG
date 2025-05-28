// js/world.js - Updated to support Tiled JSON maps

import { CONFIG } from './main.js';
import { AssetManager } from './main.js';

export const World = {
    // World definitions - now includes Tiled map support
    worldDefinitions: {
        'overworld': {
            name: 'Overworld', 
            width: 100,
            height: 100,
            tileSize: 32,
            theme: 'forest',
            spawnPoint: { x: 50, y: 50 },
            enemyDensity: 0.15,
            itemDensity: 0.08,
            // NEW: Tiled map configuration (optional)
            tiledMap: 'overworld_map',  // Reference to loaded Tiled map
            tilesets: [
                { name: 'grass', firstGid: 1 },
                { name: 'trees', firstGid: 553 }  // Based on your JSON
            ]
        },
        'dungeon_1': {
            name: 'Ancient Ruins',
            width: 50, 
            height: 50,
            tileSize: 32,
            theme: 'dungeon',
            spawnPoint: { x: 25, y: 25 },
            enemyDensity: 0.25,
            itemDensity: 0.12,
            // Use procedural generation for dungeons
            useProcedural: true
        }
    },

    // Current active world
    currentWorldId: 'overworld',
    worlds: {},
    CHUNK_SIZE: 16,
    
    init: async function() {
        console.log('🌍 Initializing World System with Tiled support...');
        
        // Generate the starting world
        await this.generateWorld('overworld');
        this.setActiveWorld('overworld');
        
        console.log(`🌍 World System ready! Active world: ${this.getCurrentWorld().name}`);
    },

    // NEW: Load and parse Tiled JSON map
    loadTiledMap: async function(worldId) {
        const worldDef = this.worldDefinitions[worldId];
        if (!worldDef.tiledMap) {
            console.log(`📋 No Tiled map specified for ${worldId}, using procedural generation`);
            return null;
        }

        // Check if the map is already loaded in AssetManager
        if (!AssetManager.tiledMaps[worldDef.tiledMap]) {
            console.log(`📋 Tiled map ${worldDef.tiledMap} not loaded, using procedural generation`);
            return null;
        }

        try {
            const mapData = AssetManager.tiledMaps[worldDef.tiledMap];
            console.log(`✅ Using loaded Tiled map: ${mapData.width}x${mapData.height} tiles`);
            console.log(`📊 Map info: ${mapData.layers.length} layers, ${mapData.tilesets.length} tilesets`);
            
            return mapData;
        } catch (error) {
            console.error(`❌ Failed to process Tiled map for ${worldId}:`, error);
            console.log(`🔄 Falling back to procedural generation`);
            return null;
        }
    },

    // Generate world - now supports both Tiled maps and procedural
    generateWorld: async function(worldId) {
        const worldDef = this.worldDefinitions[worldId];
        if (!worldDef) {
            console.error(`❌ World definition not found: ${worldId}`);
            return;
        }

        console.log(`🏗️ Generating world: ${worldDef.name}`);

        const world = {
            id: worldId,
            ...worldDef,
            tiles: [],
            chunks: {},
            entities: { enemies: [], items: [], npcs: [] },
            generated: false,
            tiledMapData: null
        };

        // Try to load Tiled map first
        if (!worldDef.useProcedural) {
            world.tiledMapData = await this.loadTiledMap(worldId);
        }

        if (world.tiledMapData) {
            // Generate from Tiled map
            this.generateTilesFromTiled(world);
            console.log(`🗺️ Generated world from Tiled map: ${world.name}`);
        } else {
            // Fallback to procedural generation
            this.generateTiles(world);
            console.log(`🎲 Generated procedural world: ${world.name}`);
        }
        
        this.generateChunks(world);
        world.generated = true;
        this.worlds[worldId] = world;
        
        console.log(`✅ World ready: ${world.name}`);
        return world;
    },

    // NEW: Generate tiles from Tiled JSON data
    generateTilesFromTiled: function(world) {
        const mapData = world.tiledMapData;
        
        // Update world dimensions from map data
        world.width = mapData.width;
        world.height = mapData.height;
        
        // Initialize tile array
        world.tiles = [];
        for (let y = 0; y < world.height; y++) {
            world.tiles[y] = [];
        }

        // Process layers in order: grass first, then trees on top
        const grassLayer = mapData.layers.find(layer => 
            layer.type === 'tilelayer' && layer.name.toLowerCase().includes('grass')
        ) || mapData.layers[0];

        const treeLayer = mapData.layers.find(layer => 
            layer.type === 'tilelayer' && layer.name.toLowerCase().includes('tree')
        );

        console.log(`🎨 Processing grass layer: ${grassLayer.name}`);
        if (treeLayer) console.log(`🌲 Processing tree layer: ${treeLayer.name}`);

        // First pass: Create base tiles from grass layer
        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const tileIndex = y * world.width + x;
                const grassGid = grassLayer.data[tileIndex] || 0;
                
                world.tiles[y][x] = this.createTileFromGid(x, y, grassGid, world, 'grass');
            }
        }

        // Second pass: Add trees on top (but keep grass underneath)
        if (treeLayer) {
            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const tileIndex = y * world.width + x;
                    const treeGid = treeLayer.data[tileIndex] || 0;
                    
                    if (treeGid > 0) { // Only place trees where there's actually a tree tile
                        // Keep the grass as the base, but add tree info
                        const treeTile = this.createTileFromGid(x, y, treeGid, world, 'tree');
                        
                        // Create a composite tile with both grass and tree
                        world.tiles[y][x] = {
                            ...world.tiles[y][x], // Keep grass base
                            type: 'tree',         // But mark as tree for collision
                            solid: true,          // Trees are solid
                            // Add tree rendering info
                            treeOverlay: {
                                tileset: 'trees',
                                tileId: treeGid - 553  // Convert to local tree tile ID
                            }
                        };
                    }
                }
            }
        }
    },

    // NEW: Convert Tiled GID to our tile format
    createTileFromGid: function(x, y, gid, world, layerHint = null) {
        const tile = {
            x: x,
            y: y,
            worldX: x * world.tileSize,
            worldY: y * world.tileSize
        };

        // Empty tile (GID 0)
        if (gid === 0) {
            return { ...tile, type: 'grass', solid: false, color: '#4a7c59' };
        }

        // Find which tileset this GID belongs to
        const tilesetInfo = this.getTilesetFromGid(gid, world);
        if (!tilesetInfo) {
            return { ...tile, type: 'grass', solid: false, color: '#4a7c59' };
        }

        // Calculate local tile ID within the tileset
        const localTileId = gid - tilesetInfo.firstGid;

        // Create tile based on tileset and layer hint
        if (tilesetInfo.name === 'grass' || layerHint === 'grass') {
            return {
                ...tile,
                type: 'grass',
                solid: false,
                color: '#4a7c59',
                tileset: 'grass',
                tileId: localTileId
            };
        } else if (tilesetInfo.name === 'trees' || layerHint === 'tree' || gid >= 553) {
            // Trees are solid obstacles
            return {
                ...tile,
                type: 'tree',
                solid: true,
                color: '#228b22',
                tileset: 'trees', 
                tileId: localTileId
            };
        }

        // Default fallback
        return { ...tile, type: 'grass', solid: false, color: '#4a7c59' };
    },

    // NEW: Find which tileset a GID belongs to
    getTilesetFromGid: function(gid, world) {
        if (!world.tilesets) return null;

        // Find the tileset with the highest firstGid that's still <= our GID
        let matchingTileset = null;
        for (const tileset of world.tilesets) {
            if (gid >= tileset.firstGid) {
                if (!matchingTileset || tileset.firstGid > matchingTileset.firstGid) {
                    matchingTileset = tileset;
                }
            }
        }
        return matchingTileset;
    },

    // Existing procedural generation (keeping as fallback)
    generateTiles: function(world) {
        world.tiles = [];
        
        for (let y = 0; y < world.height; y++) {
            world.tiles[y] = [];
            for (let x = 0; x < world.width; x++) {
                world.tiles[y][x] = this.generateTile(x, y, world);
            }
        }
    },

    generateTile: function(x, y, world) {
        const tile = {
            x: x,
            y: y,
            worldX: x * world.tileSize,
            worldY: y * world.tileSize
        };

        // Border walls for all worlds
        if (x === 0 || x === world.width - 1 || y === 0 || y === world.height - 1) {
            return { ...tile, type: 'wall', solid: true, color: '#8b4513' };
        }

        // Theme-based generation
        switch (world.theme) {
            case 'forest':
                return this.generateForestTile(x, y, tile, world);
            case 'dungeon':
                return this.generateDungeonTile(x, y, tile, world);
            default:
                return { ...tile, type: 'grass', solid: false, color: '#4a7c59' };
        }
    },

    generateForestTile: function(x, y, tile, world) {
        const random = Math.random();
        
        if (random < 0.05) { // 5% trees
            return { 
                ...tile, 
                type: 'tree', 
                solid: true, 
                color: '#228b22',
                tileset: 'trees',
                tileId: 0  // First tree tile
            };
        } else {
            return { 
                ...tile, 
                type: 'grass', 
                solid: false, 
                color: '#4a7c59',
                tileset: 'grass',
                tileId: 0  // Main grass tile
            };
        }
    },

    generateDungeonTile: function(x, y, tile, world) {
        const random = Math.random();
        
        if (random < 0.08) {
            return { ...tile, type: 'wall', solid: true, color: '#404040' };
        } else {
            return { ...tile, type: 'floor', solid: false, color: '#2f2f2f' };
        }
    },

    // Rest of the existing methods remain the same...
    generateChunks: function(world) {
        world.chunks = {};
        
        const chunksX = Math.ceil(world.width / this.CHUNK_SIZE);
        const chunksY = Math.ceil(world.height / this.CHUNK_SIZE);
        
        for (let cy = 0; cy < chunksY; cy++) {
            for (let cx = 0; cx < chunksX; cx++) {
                const chunkId = `${cx}_${cy}`;
                world.chunks[chunkId] = {
                    id: chunkId,
                    x: cx,
                    y: cy,
                    worldX: cx * this.CHUNK_SIZE * world.tileSize,
                    worldY: cy * this.CHUNK_SIZE * world.tileSize,
                    tiles: this.getChunkTiles(world, cx, cy),
                    entities: { enemies: [], items: [], npcs: [] },
                    active: false
                };
            }
        }
        
        console.log(`📦 Generated ${Object.keys(world.chunks).length} chunks`);
    },

    getChunkTiles: function(world, chunkX, chunkY) {
        const tiles = [];
        const startX = chunkX * this.CHUNK_SIZE;
        const startY = chunkY * this.CHUNK_SIZE;
        const endX = Math.min(startX + this.CHUNK_SIZE, world.width);
        const endY = Math.min(startY + this.CHUNK_SIZE, world.height);
        
        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                if (world.tiles[y] && world.tiles[y][x]) {
                    tiles.push(world.tiles[y][x]);
                }
            }
        }
        
        return tiles;
    },

    setActiveWorld: function(worldId) {
        if (!this.worlds[worldId]) {
            console.warn(`⚠️ World not generated: ${worldId}`);
            // Don't try to generate again here, just return null
            return null;
        }
        
        const oldWorld = this.currentWorldId;
        this.currentWorldId = worldId;
        
        console.log(`🌍 Switched from ${oldWorld} to ${worldId}`);
        return this.worlds[worldId];
    },

    getCurrentWorld: function() {
        return this.worlds[this.currentWorldId];
    },

    getTileAt: function(worldX, worldY, worldId = null) {
        const world = worldId ? this.worlds[worldId] : this.getCurrentWorld();
        if (!world) return null;
        
        const tileX = Math.floor(worldX / world.tileSize);
        const tileY = Math.floor(worldY / world.tileSize);
        
        if (tileX < 0 || tileX >= world.width || tileY < 0 || tileY >= world.height) {
            return null;
        }
        
        return world.tiles[tileY] ? world.tiles[tileY][tileX] : null;
    },

    checkCollision: function(worldX, worldY, width, height, worldId = null) {
        const world = worldId ? this.worlds[worldId] : this.getCurrentWorld();
        if (!world) return true;
        
        const left = Math.floor(worldX / world.tileSize);
        const right = Math.floor((worldX + width - 1) / world.tileSize);
        const top = Math.floor(worldY / world.tileSize);
        const bottom = Math.floor((worldY + height - 1) / world.tileSize);
        
        for (let ty = top; ty <= bottom; ty++) {
            for (let tx = left; tx <= right; tx++) {
                if (tx < 0 || tx >= world.width || ty < 0 || ty >= world.height) {
                    return true;
                }
                
                const tile = world.tiles[ty] ? world.tiles[ty][tx] : null;
                if (tile && tile.solid) {
                    return true;
                }
            }
        }
        return false;
    },

    findSafeSpawnPosition: function(entityWidth = 24, entityHeight = 24) {
        const world = this.getCurrentWorld();
        if (!world) return { x: 200, y: 200 };
        
        const spawnX = world.spawnPoint.x * world.tileSize;
        const spawnY = world.spawnPoint.y * world.tileSize;
        
        if (!this.checkCollision(spawnX, spawnY, entityWidth, entityHeight)) {
            return { x: spawnX, y: spawnY };
        }
        
        let attempts = 0;
        while (attempts < 100) {
            const x = Math.random() * (world.width - 10) * world.tileSize + 5 * world.tileSize;
            const y = Math.random() * (world.height - 10) * world.tileSize + 5 * world.tileSize;
            
            if (!this.checkCollision(x, y, entityWidth, entityHeight)) {
                return { x, y };
            }
            attempts++;
        }
        
        return { x: spawnX, y: spawnY };
    },

    getActiveChunks: function(centerX, centerY, radius = 2) {
        const world = this.getCurrentWorld();
        if (!world) return [];
        
        const centerChunkX = Math.floor(centerX / (world.tileSize * this.CHUNK_SIZE));
        const centerChunkY = Math.floor(centerY / (world.tileSize * this.CHUNK_SIZE));
        
        const activeChunks = [];
        
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                const chunkId = `${centerChunkX + dx}_${centerChunkY + dy}`;
                if (world.chunks[chunkId]) {
                    world.chunks[chunkId].active = true;
                    activeChunks.push(world.chunks[chunkId]);
                }
            }
        }
        
        return activeChunks;
    },

    // Compatibility method
    generate: function() {
        if (!this.worlds[this.currentWorldId]) {
            this.init();
        }
        return this.getCurrentWorld().tiles;
    }
};