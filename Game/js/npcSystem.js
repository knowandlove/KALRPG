// js/npcSystem.js

// Import dependencies
// DialogueSystem is imported as "DialogueSystem" because main.js exports "DialogueSystem_dummy as DialogueSystem"
import { gameState, Player, DialogueSystem, ctx, CONFIG, canvas } from './main.js'; 
import { Utils } from './utils.js';

export const NPCSystem = {
    spawnTestNPC: function() {
        // console.log('🟢 NPCSystem.spawnTestNPC() called');
        
        const safeSpot = Utils.findSafeSpawnPosition();
        const npc = {
            x: safeSpot.x + 80, 
            y: safeSpot.y + 20,
            width: 32, 
            height: 32, 
            name: 'Village Elder',
            color: '#ff00ff', // Bright magenta
            // Example multi-part dialogue
            dialogue: [
                "Greetings, traveler!", 
                "The world is full of adventure, but also great peril.", 
                "Seek out the lost ruins to the east if you dare."
            ], 
            currentDialogueIndex: 0,
            isTalking: false,
            canInteract: false
        };
        
        gameState.npcs.push(npc);
        // console.log('🟢 NPCs after spawn:', gameState.npcs.length, 'total NPCs');
    },

    update: function() {
        if (!gameState.npcs || gameState.npcs.length === 0 || !Player) return;
        
        gameState.npcs.forEach(npc => {
            // Calculate distance from center of player to center of NPC
            const playerCenterX = Player.x + Player.width / 2;
            const playerCenterY = Player.y + Player.height / 2;
            const npcCenterX = npc.x + npc.width / 2;
            const npcCenterY = npc.y + npc.height / 2;

            const dx = playerCenterX - npcCenterX;
            const dy = playerCenterY - npcCenterY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            const interactionRange = CONFIG.TILE_SIZE * 1.5; 
            npc.canInteract = distance < (interactionRange + Math.min(Player.width, Player.height)/2 + Math.min(npc.width, npc.height)/2) ; // More generous interaction range

            // If player walks away while talking, close dialogue
            if (npc.isTalking && distance >= interactionRange + CONFIG.TILE_SIZE * 2) { // Increased walk-away buffer
                npc.isTalking = false;
                npc.currentDialogueIndex = 0;
                if (gameState.dialogue.active && gameState.dialogue.speaker === npc.name) {
                    DialogueSystem.closeDialogue(); // DialogueSystem is the imported (dummy or real) object
                }
            }
        });
    },

    startInteraction: function(npc) {
        if (!npc || !DialogueSystem) return;

        if (!npc.isTalking) {
            npc.isTalking = true;
            npc.currentDialogueIndex = 0;
            if (npc.dialogue && npc.dialogue.length > 0) {
                DialogueSystem.showDialogue(npc.name, npc.dialogue[npc.currentDialogueIndex]);
            } else {
                DialogueSystem.showDialogue(npc.name, "I have nothing to say right now.");
            }
        } else { // If already talking, advance dialogue
            npc.currentDialogueIndex++;
            if (npc.dialogue && npc.currentDialogueIndex < npc.dialogue.length) {
                DialogueSystem.showDialogue(npc.name, npc.dialogue[npc.currentDialogueIndex]);
            } else { // End of dialogue
                npc.isTalking = false;
                npc.currentDialogueIndex = 0;
                DialogueSystem.closeDialogue();
            }
        }
    },
    
    attemptInteractionWithNearbyNPC: function() {
        if (!gameState.npcs || gameState.npcs.length === 0) {
            return false;
        }
        
        const nearbyNPC = gameState.npcs.find(npc => npc.canInteract);
        
        if (nearbyNPC) {
            this.startInteraction(nearbyNPC);
            return true; // Interaction initiated or advanced
        }
        return false; // No NPC to interact with
    },

    render: function() {
        if (!gameState.npcs || gameState.npcs.length === 0 || !gameState.camera || !ctx || !canvas) {
            return;
        }
        
        gameState.npcs.forEach((npc) => {
            const screenX = Math.floor(npc.x - gameState.camera.x);
            const screenY = Math.floor(npc.y - gameState.camera.y);
            
            if (screenX > -npc.width && screenX < canvas.width && 
                screenY > -npc.height && screenY < canvas.height) { // Simpler on-screen check
                
                ctx.fillStyle = npc.color || '#007bff'; 
                ctx.fillRect(screenX, screenY, npc.width, npc.height);
                
                ctx.strokeStyle = '#000000';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX, screenY, npc.width, npc.height);
                
                if (npc.name) {
                    ctx.fillStyle = '#ffffff';
                    ctx.font = '12px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText(npc.name, screenX + npc.width / 2, screenY - 8); // Adjusted y for label
                    ctx.textAlign = 'left'; 
                }
                
                // Show interaction prompt only if dialogue is not already active with this NPC
                if (npc.canInteract && (!gameState.dialogue.active || gameState.dialogue.speaker !== npc.name)) {
                    ctx.fillStyle = '#ffff00';
                    ctx.font = '16px monospace';
                    ctx.textAlign = 'center';
                    ctx.fillText('E', screenX + npc.width / 2, screenY - 20); // Adjusted y for prompt
                    ctx.textAlign = 'left'; 
                }
            }
        });
    }
};
