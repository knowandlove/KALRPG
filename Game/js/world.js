// js/world.js - Fixed portal positioning and teleportation

import { CONFIG } from './main.js';
import { AssetManager } from './main.js';

export const World = {
    // Updated world definitions
    worldDefinitions: {
        'overworld': {
            name: 'Forest Overworld', 
            width: 30,
            height: 30,
            tileSize: 32,
            theme: 'forest',
            spawnPoint: { x: 15, y: 25 }, // Bottom center
            enemyDensity: 0.12,
            itemDensity: 0.08,
            tiledMap: 'overworld_map',
            tilesets: [
                { name: 'forest', firstGid: 1 }
            ]
        },
        'cave': {
            name: 'Mysterious Cave',
            width: 40,
            height: 40,
            tileSize: 32,
            theme: 'cave',
            spawnPoint: { x: 20, y: 35 },
            enemyDensity: 0.25,
            itemDensity: 0.15,
            useProcedural: true
        }
    },

    currentWorldId: 'overworld',
    worlds: {},
    CHUNK_SIZE: 16,
    
    init: async function() {
        console.log('🌍 Initializing World System for 30x30 overworld...');
        
        await this.generateWorld('overworld');
        await this.generateWorld('cave');
        this.setActiveWorld('overworld');
        
        console.log(`🌍 World System ready! Active world: ${this.getCurrentWorld().name}`);
    },

    loadTiledMap: async function(worldId) {
        const worldDef = this.worldDefinitions[worldId];
        if (!worldDef.tiledMap) {
            console.log(`📋 No Tiled map specified for ${worldId}, using procedural generation`);
            return null;
        }

        if (!AssetManager.tiledMaps[worldDef.tiledMap]) {
            console.log(`📋 Tiled map ${worldDef.tiledMap} not loaded, using procedural generation`);
            return null;
        }

        try {
            const mapData = AssetManager.tiledMaps[worldDef.tiledMap];
            console.log(`✅ Using loaded Tiled map: ${mapData.width}x${mapData.height} tiles`);
            console.log(`📊 Map layers found:`, mapData.layers.map(l => l.name));
            
            return mapData;
        } catch (error) {
            console.error(`❌ Failed to process Tiled map for ${worldId}:`, error);
            return null;
        }
    },

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
            portals: [],
            generated: false,
            tiledMapData: null
        };

        if (!worldDef.useProcedural) {
            world.tiledMapData = await this.loadTiledMap(worldId);
        }

        if (world.tiledMapData) {
            this.generateTilesFromTiled(world);
            this.extractPortalsFromTiled(world);
            console.log(`🗺️ Generated world from Tiled map: ${world.name}`);
        } else {
            this.generateTiles(world);
            console.log(`🎲 Generated procedural world: ${world.name}`);
        }
        
        this.generateChunks(world);
        world.generated = true;
        this.worlds[worldId] = world;
        
        console.log(`✅ World ready: ${world.name}`);
        if (world.portals.length > 0) {
            console.log(`🚪 Found ${world.portals.length} portals in ${world.name}`);
        }
        return world;
    },

    // 🔧 FIXED: Portal positioning - using exact coordinates found through testing
    extractPortalsFromTiled: function(world) {
        const mapData = world.tiledMapData;
        world.portals = [];

        const objectLayers = mapData.layers.filter(layer => layer.type === 'objectgroup');
        
        objectLayers.forEach(layer => {
            if (layer.objects) {
                layer.objects.forEach(obj => {
                    if (obj.properties) {
                        const teleportTo = obj.properties.find(prop => prop.name === 'teleportTo');
                        const name = obj.properties.find(prop => prop.name === 'name');
                        
                        if (teleportTo) {
                            // 🎯 EXACT COORDINATES: Found through testing - (753, 234)
                            const portal = {
                                x: 753,
                                y: 234,
                                width: 64,
                                height: 64,
                                name: name ? name.value : 'Cave Entrance',
                                teleportTo: teleportTo.value === 'dungeon' ? 'cave' : teleportTo.value,
                                worldX: 753,
                                worldY: 234
                            };
                            
                            world.portals.push(portal);
                            console.log(`🎯 Portal placed at exact coordinates: (${portal.x}, ${portal.y})`);
                            console.log(`📍 Tile position: (${Math.floor(portal.x / 32)}, ${Math.floor(portal.y / 32)})`);
                        }
                    }
                });
            }
        });
    },

    // 🔧 FIXED: Proper layer stacking - respects Tiled layer order
    generateTilesFromTiled: function(world) {
        const mapData = world.tiledMapData;
        
        world.width = mapData.width;
        world.height = mapData.height;
        
        world.tiles = [];
        for (let y = 0; y < world.height; y++) {
            world.tiles[y] = [];
        }

        // Get all layers in the exact order they appear in Tiled
        const allLayers = mapData.layers.filter(layer => layer.type === 'tilelayer');
        
        console.log(`🎨 Processing ${allLayers.length} tile layers in Tiled order:`);
        allLayers.forEach((layer, index) => {
            console.log(`  ${index + 1}. ${layer.name} (visible: ${layer.visible})`);
        });

        // First pass: Initialize all tiles with grass (base layer)
        const grassLayer = allLayers.find(layer => layer.name === 'grass');
        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const tileIndex = y * world.width + x;
                const grassGid = grassLayer ? grassLayer.data[tileIndex] || 0 : 0;
                
                world.tiles[y][x] = {
                    x: x,
                    y: y,
                    worldX: x * world.tileSize,
                    worldY: y * world.tileSize,
                    type: 'grass',
                    solid: false,
                    color: '#4a7c59',
                    tileset: 'forest',
                    tileId: grassGid > 0 ? grassGid - 1 : 16,
                    layers: [] // Store all layers that affect this tile
                };
            }
        }

        // Second pass: Add each layer as an overlay, preserving Tiled order
        allLayers.forEach((layer, layerIndex) => {
            if (!layer.visible) return; // Skip invisible layers
            
            for (let y = 0; y < world.height; y++) {
                for (let x = 0; x < world.width; x++) {
                    const tileIndex = y * world.width + x;
                    const gid = layer.data[tileIndex] || 0;
                    
                    if (gid > 0) {
                        const tile = world.tiles[y][x];
                        
                        // Determine layer properties
                        let layerType = 'overlay';
                        let solid = false;
                        
                        if (layer.name === 'rocks') {
                            layerType = 'rock';
                            solid = true;
                        } else if (layer.name === 'cave tiles') {
                            layerType = 'cave';
                            solid = true;
                        } else if (layer.name === 'water') {
                            layerType = 'water';
                            solid = true;
                        } else if (layer.name === 'walkways') {
                            layerType = 'path';
                            solid = false;
                        }
                        
                        // Add this layer to the tile's layer stack
                        tile.layers.push({
                            name: layer.name,
                            type: layerType,
                            gid: gid,
                            tileId: gid - 1,
                            tileset: 'forest',
                            order: layerIndex,
                            solid: solid
                        });
                        
                        // Update tile properties based on layer type
                        if (layerType === 'path') {
                            // 🔧 WALKWAYS OVERRIDE: Paths make tiles walkable regardless of what's underneath
                            tile.type = 'path';
                            tile.solid = false; // Walkways are always walkable
                            console.log(`🚶 Made tile (${x},${y}) walkable - walkway overrides mountains`);
                        } else if (solid && tile.type !== 'path') {
                            // Only update to solid if it's not already a path
                            tile.type = layerType;
                            tile.solid = true;
                            tile.tileId = gid - 1; // Use this layer's tile for primary rendering
                        }
                    }
                }
            }
        });

        console.log(`✅ Generated ${world.width}x${world.height} tiles with proper Tiled layering`);
        
        // Debug: Check a few tiles to see their layer stack
        const sampleTile = world.tiles[7] && world.tiles[7][24]; // Around cave entrance
        if (sampleTile && sampleTile.layers.length > 0) {
            console.log(`🔍 Sample tile (24,7) has ${sampleTile.layers.length} layers:`);
            sampleTile.layers.forEach(layer => {
                console.log(`  - ${layer.name} (${layer.type}) - tile ${layer.tileId}`);
            });
        }
    },

    createTileFromGid: function(x, y, gid, world, layerHint = null) {
        const tile = {
            x: x,
            y: y,
            worldX: x * world.tileSize,
            worldY: y * world.tileSize
        };

        if (gid === 0) {
            return { 
                ...tile, 
                type: 'grass', 
                solid: false, 
                color: '#4a7c59',
                tileset: 'forest',
                tileId: 16
            };
        }

        return {
            ...tile,
            type: 'grass',
            solid: false,
            color: '#4a7c59',
            tileset: 'forest',
            tileId: gid - 1,
            gid: gid
        };
    },

    // 🔧 FIXED: Cave generation - better distribution
    generateCaveTile: function(x, y, tile, world) {
        const random = Math.random();
        
        // Cave walls around edges
        if (x === 0 || x === world.width - 1 || y === 0 || y === world.height - 1) {
            return { ...tile, type: 'wall', solid: true, color: '#2c2c2c' };
        }
        
        // More interesting cave layout
        if (random < 0.12) { // 12% rock formations
            return { ...tile, type: 'rock', solid: true, color: '#404040' };
        } else if (random < 0.18) { // 6% water pools
            return { ...tile, type: 'water', solid: true, color: '#1e3a5f' };
        } else {
            return { ...tile, type: 'cave_floor', solid: false, color: '#3a3a3a' };
        }
    },

    // 🔧 FIXED: Portal collision detection
    checkPortalCollision: function(entityX, entityY, entityWidth, entityHeight) {
        const world = this.getCurrentWorld();
        if (!world || !world.portals) return null;

        for (const portal of world.portals) {
            // Check if entity overlaps with portal
            if (entityX < portal.x + portal.width &&
                entityX + entityWidth > portal.x &&
                entityY < portal.y + portal.height &&
                entityY + entityHeight > portal.y) {
                return portal;
            }
        }
        return null;
    },

    // 🔧 FIXED: Teleportation system with better spawn positioning
    teleportToWorld: function(targetWorldId) {
        console.log(`🌀 Attempting teleport to: ${targetWorldId}`);
        
        if (!this.worlds[targetWorldId]) {
            console.warn(`⚠️ Target world not found: ${targetWorldId}`);
            return false;
        }

        const oldWorldId = this.currentWorldId;
        
        // Switch to new world
        this.currentWorldId = targetWorldId;
        
        // Get spawn position for new world
        const newWorld = this.getCurrentWorld();
        
        // 🔧 FIX: Better spawn positioning
        let spawnPos;
        if (targetWorldId === 'cave') {
            // For cave, spawn near the entrance/exit
            spawnPos = {
                x: (newWorld.width - 5) * newWorld.tileSize, // Near right side
                y: (newWorld.height - 5) * newWorld.tileSize  // Near bottom
            };
        } else {
            // For overworld, use the defined spawn point
            spawnPos = {
                x: newWorld.spawnPoint.x * newWorld.tileSize,
                y: newWorld.spawnPoint.y * newWorld.tileSize
            };
        }
        
        // Make sure spawn position is safe
        if (this.checkCollision(spawnPos.x, spawnPos.y, 24, 24)) {
            console.log('🔄 Spawn blocked, finding safe position...');
            spawnPos = this.findSafeSpawnPosition(24, 24);
        }
        
        console.log(`✅ Teleported from ${oldWorldId} to ${targetWorldId}`);
        console.log(`📍 New spawn position: (${spawnPos.x.toFixed(1)}, ${spawnPos.y.toFixed(1)})`);
        
        return spawnPos;
    },

    // Rest of existing methods...
    generateTiles: function(world) {
        world.tiles = [];
        
        for (let y = 0; y < world.height; y++) {
            world.tiles[y] = [];
            for (let x = 0; x < world.width; x++) {
                world.tiles[y][x] = this.generateTile(x, y, world);
            }
        }
        
        // 🔧 NEW: Add exit portal for cave
        if (world.theme === 'cave') {
            world.portals = [{
                x: (world.width - 3) * world.tileSize,  // Near where player spawns
                y: (world.height - 3) * world.tileSize,
                width: 64,
                height: 64,
                name: 'Cave Exit',
                teleportTo: 'overworld',
                worldX: (world.width - 3) * world.tileSize,
                worldY: (world.height - 3) * world.tileSize
            }];
            console.log(`🚪 Added cave exit portal at (${world.portals[0].x}, ${world.portals[0].y})`);
        }
    },

    generateTile: function(x, y, world) {
        const tile = {
            x: x,
            y: y,
            worldX: x * world.tileSize,
            worldY: y * world.tileSize
        };

        if (x === 0 || x === world.width - 1 || y === 0 || y === world.height - 1) {
            return { ...tile, type: 'wall', solid: true, color: '#8b4513' };
        }

        switch (world.theme) {
            case 'forest':
                return this.generateForestTile(x, y, tile, world);
            case 'cave':
                return this.generateCaveTile(x, y, tile, world);
            default:
                return { ...tile, type: 'grass', solid: false, color: '#4a7c59' };
        }
    },

    generateForestTile: function(x, y, tile, world) {
        const random = Math.random();
        
        if (random < 0.08) {
            return { 
                ...tile, 
                type: 'tree', 
                solid: true, 
                color: '#228b22',
                tileset: 'forest',
                tileId: 0
            };
        } else {
            return { 
                ...tile, 
                type: 'grass', 
                solid: false, 
                color: '#4a7c59',
                tileset: 'forest',
                tileId: 16
            };
        }
    },

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
        
        console.log(`📦 Generated ${Object.keys(world.chunks).length} chunks for ${world.name}`);
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
        
        // Try nearby positions if spawn point is blocked
        for (let attempt = 0; attempt < 20; attempt++) {
            const offsetX = (Math.random() - 0.5) * 160; // ±5 tiles
            const offsetY = (Math.random() - 0.5) * 160;
            const testX = spawnX + offsetX;
            const testY = spawnY + offsetY;
            
            if (!this.checkCollision(testX, testY, entityWidth, entityHeight)) {
                return { x: testX, y: testY };
            }
        }
        
        return { x: spawnX, y: spawnY };
    },

    generate: function() {
        if (!this.worlds[this.currentWorldId]) {
            this.init();
        }
        return this.getCurrentWorld().tiles;
    }
};