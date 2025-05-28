// js/assetManager.js

export const AssetManager = {
    // Storage for loaded assets
    images: {},
    tilesets: {},
    tiledMaps: {},
    
    // Loading state
    loading: false,
    loadedCount: 0,
    totalCount: 0,

    // Load a single image
    loadImage: function(name, path) {
        return new Promise((resolve, reject) => {
            if (this.images[name]) {
                resolve(this.images[name]);
                return;
            }

            const img = new Image();
            img.onload = () => {
                this.images[name] = img;
                this.loadedCount++;
                console.log(`✅ Loaded image: ${name} (${this.loadedCount}/${this.totalCount})`);
                resolve(img);
            };
            img.onerror = () => {
                console.error(`❌ Failed to load image: ${path}`);
                reject(new Error(`Failed to load ${path}`));
            };
            img.src = path;
        });
    },

    // Load a tileset (sprite sheet)
    loadTileset: function(name, imagePath, tileWidth = 32, tileHeight = 32, margin = 0, spacing = 0) {
        return this.loadImage(`${name}_image`, imagePath).then(image => {
            const tileset = {
                name: name,
                image: image,
                tileWidth: tileWidth,
                tileHeight: tileHeight,
                margin: margin,
                spacing: spacing,
                tilesPerRow: Math.floor((image.width - margin * 2 + spacing) / (tileWidth + spacing)),
                tilesPerColumn: Math.floor((image.height - margin * 2 + spacing) / (tileHeight + spacing)),
                totalTiles: 0
            };
            
            tileset.totalTiles = tileset.tilesPerRow * tileset.tilesPerColumn;
            this.tilesets[name] = tileset;
            
            console.log(`🎨 Loaded tileset: ${name} (${tileset.tilesPerRow}x${tileset.tilesPerColumn} = ${tileset.totalTiles} tiles)`);
            return tileset;
        });
    },

    // Load a Tiled JSON map
    loadTiledMap: function(name, mapPath) {
        return fetch(mapPath)
            .then(response => response.json())
            .then(mapData => {
                this.tiledMaps[name] = mapData;
                console.log(`🗺️ Loaded Tiled map: ${name} (${mapData.width}x${mapData.height})`);
                return mapData;
            })
            .catch(error => {
                console.error(`❌ Failed to load Tiled map: ${mapPath}`, error);
                throw error;
            });
    },

    // Draw a specific tile from a tileset
    drawTile: function(ctx, tilesetName, tileId, x, y, width = null, height = null) {
        const tileset = this.tilesets[tilesetName];
        if (!tileset) {
            console.warn(`⚠️ Tileset not found: ${tilesetName}`);
            return false;
        }

        if (tileId < 0 || tileId >= tileset.totalTiles) {
            console.warn(`⚠️ Invalid tile ID: ${tileId} (max: ${tileset.totalTiles - 1})`);
            return false;
        }

        // Calculate source position in tileset
        const tileX = tileId % tileset.tilesPerRow;
        const tileY = Math.floor(tileId / tileset.tilesPerRow);
        
        const sourceX = tileset.margin + tileX * (tileset.tileWidth + tileset.spacing);
        const sourceY = tileset.margin + tileY * (tileset.tileHeight + tileset.spacing);

        // Use provided dimensions or default to tile size
        const destWidth = width || tileset.tileWidth;
        const destHeight = height || tileset.tileHeight;

        ctx.drawImage(
            tileset.image,
            sourceX, sourceY, tileset.tileWidth, tileset.tileHeight,  // Source
            x, y, destWidth, destHeight                                // Destination
        );

        return true;
    },

    // Get tile information from tileset
    getTileInfo: function(tilesetName, tileId) {
        const tileset = this.tilesets[tilesetName];
        if (!tileset) return null;

        const tileX = tileId % tileset.tilesPerRow;
        const tileY = Math.floor(tileId / tileset.tilesPerRow);

        return {
            tileId: tileId,
            tileX: tileX,
            tileY: tileY,
            sourceX: tileset.margin + tileX * (tileset.tileWidth + tileset.spacing),
            sourceY: tileset.margin + tileY * (tileset.tileHeight + tileset.spacing),
            width: tileset.tileWidth,
            height: tileset.tileHeight
        };
    },

    // Load multiple assets at once
    loadAssets: function(assetList) {
        this.loading = true;
        this.loadedCount = 0;
        this.totalCount = assetList.length;

        console.log(`🔄 Loading ${this.totalCount} assets...`);

        const promises = assetList.map(asset => {
            switch (asset.type) {
                case 'image':
                    return this.loadImage(asset.name, asset.path);
                case 'tileset':
                    return this.loadTileset(
                        asset.name, 
                        asset.path, 
                        asset.tileWidth, 
                        asset.tileHeight, 
                        asset.margin, 
                        asset.spacing
                    );
                case 'tiledMap':
                    return this.loadTiledMap(asset.name, asset.path);
                default:
                    console.warn(`⚠️ Unknown asset type: ${asset.type}`);
                    return Promise.resolve();
            }
        });

        return Promise.all(promises).then(() => {
            this.loading = false;
            console.log(`🎉 All assets loaded! (${this.loadedCount}/${this.totalCount})`);
        }).catch(error => {
            this.loading = false;
            console.error('❌ Asset loading failed:', error);
            throw error;
        });
    },

    // Get loading progress (0-1)
    getLoadingProgress: function() {
        return this.totalCount > 0 ? this.loadedCount / this.totalCount : 1;
    },

    // ✅ NEW: Generate a retro tileset programmatically
    createRetroTileset: function() {
        console.log('🎨 Generating retro tileset...');
        
        // Create canvas for our retro tileset - 8x8 grid of 32x32 tiles
        const canvas = document.createElement('canvas');
        canvas.width = 256;  // 8 tiles × 32px
        canvas.height = 256; // 8 tiles × 32px
        const ctx = canvas.getContext('2d');
        
        // Disable anti-aliasing for pixel-perfect retro look
        ctx.imageSmoothingEnabled = false;
        
        // Define retro color palette (NES/SNES-inspired)
        const colors = {
            grass1: '#5C8B3A',      // Classic grass green
            grass2: '#6A9B4A',      // Lighter grass  
            grass3: '#4A7C2A',      // Darker grass
            grass4: '#3A6C1A',      // Very dark grass
            
            dirt1: '#8B5A2B',       // Brown dirt
            dirt2: '#9B6A3B',       // Lighter dirt
            dirt3: '#7B4A1B',       // Darker dirt
            
            stone1: '#7B7B7B',      // Gray stone
            stone2: '#8B8B8B',      // Light stone
            stone3: '#6B6B6B',      // Dark stone
            
            water: '#4B7BDB',       // Blue water
            wall: '#DB4B4B',        // Red wall
        };
        
        // Define our 64 tiles (8x8 grid)
        const tiles = [
            // Row 0 (tiles 0-7) - Main grass
            { color: colors.grass1, pattern: 'solid' },
            { color: colors.grass1, pattern: 'dots' },      // Good for main grass
            { color: colors.grass2, pattern: 'solid' },
            { color: colors.grass2, pattern: 'dots' },      // Good for variety
            { color: colors.grass3, pattern: 'solid' },
            { color: colors.grass3, pattern: 'dots' },      // Good for variety
            { color: colors.grass4, pattern: 'solid' },     // Good for trees
            { color: colors.grass1, pattern: 'hash' },
            
            // Row 1 (tiles 8-15) - More grass
            { color: colors.grass1, pattern: 'speckle' },
            { color: colors.grass2, pattern: 'speckle' },
            { color: colors.grass3, pattern: 'speckle' },
            { color: colors.grass4, pattern: 'speckle' },
            { color: colors.grass1, pattern: 'solid' },
            { color: colors.grass2, pattern: 'solid' },
            { color: colors.grass3, pattern: 'solid' },
            { color: colors.grass4, pattern: 'solid' },
            
            // Row 2 (tiles 16-23) - Dirt
            { color: colors.dirt1, pattern: 'solid' },
            { color: colors.dirt1, pattern: 'dots' },       // Good for paths
            { color: colors.dirt2, pattern: 'solid' },
            { color: colors.dirt2, pattern: 'dots' },
            { color: colors.dirt3, pattern: 'solid' },
            { color: colors.dirt3, pattern: 'dots' },       // Good for rocks
            { color: colors.dirt1, pattern: 'speckle' },
            { color: colors.dirt2, pattern: 'speckle' },
            
            // Row 3 (tiles 24-31) - Stone
            { color: colors.stone1, pattern: 'solid' },
            { color: colors.stone1, pattern: 'dots' },      // Good for floors
            { color: colors.stone2, pattern: 'solid' },
            { color: colors.stone2, pattern: 'dots' },      // Good for floors
            { color: colors.stone3, pattern: 'solid' },
            { color: colors.stone3, pattern: 'dots' },      // Good for floors
            { color: colors.stone1, pattern: 'speckle' },
            { color: colors.stone2, pattern: 'speckle' },
            
            // Row 4 (tiles 32-39) - Water & Walls
            { color: colors.water, pattern: 'solid' },
            { color: colors.water, pattern: 'waves' },
            { color: colors.water, pattern: 'dots' },
            { color: colors.wall, pattern: 'solid' },       // Good for walls
            { color: colors.wall, pattern: 'dots' },
            { color: colors.wall, pattern: 'speckle' },
            { color: colors.stone3, pattern: 'hash' },
            { color: colors.dirt3, pattern: 'hash' },
            
            // Rows 5-7 (tiles 40-63) - Fill remaining with variations
            ...Array(24).fill().map((_, i) => ({
                color: Object.values(colors)[i % Object.keys(colors).length],
                pattern: ['solid', 'dots', 'speckle'][i % 3]
            }))
        ];
        
        // Draw each tile
        tiles.forEach((tile, index) => {
            const x = (index % 8) * 32;
            const y = Math.floor(index / 8) * 32;
            
            // Fill base color
            ctx.fillStyle = tile.color;
            ctx.fillRect(x, y, 32, 32);
            
            // Add pattern
            const darkerColor = this.darkenColor(tile.color, 40);
            ctx.fillStyle = darkerColor;
            
            if (tile.pattern === 'dots') {
                // Small dots pattern
                for (let dx = 4; dx < 28; dx += 8) {
                    for (let dy = 4; dy < 28; dy += 8) {
                        ctx.fillRect(x + dx, y + dy, 2, 2);
                    }
                }
            } else if (tile.pattern === 'speckle') {
                // Random speckles
                for (let i = 0; i < 8; i++) {
                    const dx = Math.floor(Math.random() * 28) + 2;
                    const dy = Math.floor(Math.random() * 28) + 2;
                    ctx.fillRect(x + dx, y + dy, 2, 2);
                }
            } else if (tile.pattern === 'hash') {
                // Crosshatch pattern
                for (let dx = 0; dx < 32; dx += 8) {
                    ctx.fillRect(x + dx, y + 8, 2, 2);
                    ctx.fillRect(x + dx, y + 16, 2, 2);
                    ctx.fillRect(x + dx, y + 24, 2, 2);
                }
                for (let dy = 0; dy < 32; dy += 8) {
                    ctx.fillRect(x + 8, y + dy, 2, 2);
                    ctx.fillRect(x + 16, y + dy, 2, 2);
                    ctx.fillRect(x + 24, y + dy, 2, 2);
                }
            } else if (tile.pattern === 'waves') {
                // Water waves
                for (let dx = 0; dx < 32; dx += 2) {
                    const wave = Math.sin(dx * 0.2) * 2;
                    ctx.fillRect(x + dx, y + 12 + wave, 1, 2);
                    ctx.fillRect(x + dx, y + 20 + wave, 1, 2);
                }
            }
            
            // NO BORDER - for seamless continuous look
            // Removed the border drawing completely for seamless tiles
        });
        
        console.log('✅ Retro tileset generated!');
        return canvas;
    },

    darkenColor: function(color, amount) {
        const num = parseInt(color.replace('#', ''), 16);
        const R = Math.max(0, (num >> 16) - amount);
        const G = Math.max(0, (num >> 8 & 0x00FF) - amount);
        const B = Math.max(0, (num & 0x0000FF) - amount);
        return '#' + (R << 16 | G << 8 | B).toString(16).padStart(6, '0');
    },

    // Load the generated retro tileset
    loadRetroTileset: function(name) {
        return new Promise((resolve) => {
            const canvas = this.createRetroTileset();
            
            // Convert canvas to image
            const img = new Image();
            img.onload = () => {
                this.images[`${name}_image`] = img;
                
                const tileset = {
                    name: name,
                    image: img,
                    tileWidth: 32,
                    tileHeight: 32,
                    margin: 0,
                    spacing: 0,
                    tilesPerRow: 8,
                    tilesPerColumn: 8,
                    totalTiles: 64
                };
                
                this.tilesets[name] = tileset;
                console.log(`🎮 Loaded retro tileset: ${name} (8x8 = 64 tiles)`);
                resolve(tileset);
            };
            
            img.src = canvas.toDataURL();
        });
    },

    // Predefined asset configurations for common tileset formats
    presets: {
        // Standard 32x32 tileset
        standard32: {
            tileWidth: 32,
            tileHeight: 32,
            margin: 0,
            spacing: 0  
        },
        
        // Tileset with 1px spacing
        spaced32: {
            tileWidth: 32,
            tileHeight: 32,
            margin: 0,
            spacing: 1
        },

        // 16x16 pixel art style
        pixelArt16: {
            tileWidth: 16,
            tileHeight: 16,
            margin: 0,
            spacing: 0
        }
    }
};