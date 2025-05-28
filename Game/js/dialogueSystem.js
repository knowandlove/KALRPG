// js/dialogueSystem.js

import { gameState, canvas, ctx, CONFIG } from './main.js'; // CONFIG might be needed if dialogue box uses TILE_SIZE for something

export const DialogueSystem = {
    showDialogue: function(speaker, message, duration) {
        gameState.dialogue.active = true;
        gameState.dialogue.speaker = speaker;
        gameState.dialogue.message = message;
        gameState.dialogue.timer = 0;
        gameState.dialogue.duration = duration || 4000; // Use provided duration or default to 4 seconds
        
        // console.log(`💬 ${speaker}: ${message}`); 
    },

    update: function() {
        if (gameState.dialogue.active) {
            gameState.dialogue.timer += 16; // Assuming 16ms per frame
            
            if (gameState.dialogue.timer >= gameState.dialogue.duration) {
                this.closeDialogue();
            }
        }
    },

    closeDialogue: function() {
        gameState.dialogue.active = false;
        gameState.dialogue.speaker = '';
        gameState.dialogue.message = '';
        gameState.dialogue.timer = 0;
        // Potentially notify the NPC system that dialogue ended, if NPC is waiting for it
        if (NPCSystem && typeof NPCSystem.onDialogueClose === 'function') {
            NPCSystem.onDialogueClose(); // This assumes an NPCSystem is available and has this method
        }
    },

    render: function() {
        if (!gameState.dialogue.active || !ctx || !canvas) return;

        const boxWidth = Math.min(600, canvas.width - 40);
        const boxHeight = 120;
        const boxX = (canvas.width - boxWidth) / 2;
        const boxY = canvas.height - boxHeight - 20;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(boxX + 4, boxY + 4, boxWidth - 8, boxHeight - 8);

        ctx.fillStyle = '#ffd700'; 
        ctx.font = 'bold 18px monospace';
        ctx.fillText(gameState.dialogue.speaker, boxX + 15, boxY + 25);

        ctx.fillStyle = '#fff';
        ctx.font = '16px monospace';
        
        const maxWidth = boxWidth - 30;
        const lineHeight = 20;
        const words = gameState.dialogue.message.split(' ');
        let line = '';
        let currentY = boxY + 50;
        
        for (let i = 0; i < words.length; i++) {
            const testLine = line + words[i] + ' ';
            const metrics = ctx.measureText(testLine);
            const testWidth = metrics.width;
            
            if (testWidth > maxWidth && i > 0) {
                ctx.fillText(line, boxX + 15, currentY);
                line = words[i] + ' ';
                currentY += lineHeight;
                if (currentY > boxY + boxHeight - 30) break; // Prevent text overflow
            } else {
                line = testLine;
            }
        }
        if (currentY <= boxY + boxHeight - 30) {
             ctx.fillText(line, boxX + 15, currentY);
        }


        ctx.fillStyle = '#aaa';
        ctx.font = '12px monospace';
        ctx.fillText('Press E to continue/close or wait...', boxX + 15, boxY + boxHeight - 10);

        const progress = gameState.dialogue.timer / gameState.dialogue.duration;
        const progressWidth = (boxWidth - 30) * Math.min(1, progress); // Cap progress at 1
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.fillRect(boxX + 15, boxY + boxHeight - 25, boxWidth - 30, 2);
        
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(boxX + 15, boxY + boxHeight - 25, progressWidth, 2);
    }
};

// We need to import NPCSystem if DialogueSystem.closeDialogue is to call it.
// This creates a potential circular dependency if NPCSystem also imports DialogueSystem.
// For now, let's make it a soft dependency (check if NPCSystem exists).
// A better solution would be an event system or callback.
import { NPCSystem } from './main.js'; // This will import the real NPCSystem from main.js
