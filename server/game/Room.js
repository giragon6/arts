const { mixColors, calculateColorDistance } = require('./colorUtils');
const { v4: uuidv4 } = require('uuid');

class Room {
    constructor(roomCode, hostId, hostName) {
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.players = new Map();
        this.gameState = 'waiting'; // waiting, playing, finished
        this.targetColor = null;
        this.playerColors = new Map(); // Current color for each player
        this.currentTurn = 0;
        this.turnOrder = [];
        this.throws = [];
        this.gameSettings = {
            colorTolerance: 30, // How close to target color to win
            maxThrows: 10, // Max throws per player
            dartSpeed: 50,
            difficulty: 'medium'
        };

        // Add host as first player
        this.addPlayer(hostId, hostName);
    }

    addPlayer(playerId, playerName) {
        const player = {
            id: playerId,
            name: playerName,
            isHost: playerId === this.hostId,
            isReady: false,
            throwCount: 0,
            currentColor: { r: 128, g: 128, b: 128 }, // Start with neutral gray
            score: 0
        };

        this.players.set(playerId, player);
        this.playerColors.set(playerId, player.currentColor);
        
        return player;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        this.playerColors.delete(playerId);
        
        // If host leaves, assign new host
        if (playerId === this.hostId && this.players.size > 0) {
            const newHost = this.players.values().next().value;
            this.hostId = newHost.id;
            newHost.isHost = true;
        }

        // Update turn order
        this.turnOrder = this.turnOrder.filter(id => id !== playerId);
        
        // If it was current player's turn, advance turn
        if (this.currentTurn >= this.turnOrder.length) {
            this.currentTurn = 0;
        }
    }

    startGame(targetColor) {
        this.gameState = 'playing';
        this.targetColor = targetColor;
        this.turnOrder = Array.from(this.players.keys());
        this.currentTurn = 0;
        this.throws = [];

        // Reset player states
        for (const player of this.players.values()) {
            player.throwCount = 0;
            player.currentColor = { r: 128, g: 128, b: 128 };
            player.score = 0;
            this.playerColors.set(player.id, player.currentColor);
        }
    }

    processDartThrow(playerId, throwData) {
        const player = this.players.get(playerId);
        if (!player) {
            throw new Error('Player not found');
        }

        // Extract color from hit position on color wheel
        const hitColor = this.calculateHitColor(throwData.hitPosition);
        
        // Mix with player's current color
        const currentColor = this.playerColors.get(playerId);
        const newColor = mixColors(currentColor, hitColor, 0.3); // 30% weight to new color
        
        this.playerColors.set(playerId, newColor);
        player.currentColor = newColor;
        player.throwCount++;

        // Record the throw
        const throwRecord = {
            id: uuidv4(),
            playerId,
            timestamp: Date.now(),
            hitPosition: throwData.hitPosition,
            hitColor,
            newColor,
            trajectory: throwData.trajectory
        };
        this.throws.push(throwRecord);

        // Check if player won
        const colorDistance = calculateColorDistance(newColor, this.targetColor);
        let winner = null;
        let finalColor = null;

        if (colorDistance <= this.gameSettings.colorTolerance) {
            winner = player;
            finalColor = newColor;
            this.gameState = 'finished';
        } else {
            // Advance turn
            this.advanceTurn();
        }

        return {
            throwData: throwRecord,
            newColor,
            winner,
            finalColor
        };
    }

    calculateHitColor(position) {
        // Convert 3D position to color wheel coordinates
        const x = position.x;
        const z = position.z;
        
        // Calculate angle for hue (0-360 degrees)
        const angle = Math.atan2(z, x);
        const hue = ((angle * 180 / Math.PI) + 360) % 360;
        
        // Calculate distance from center for saturation
        const distance = Math.sqrt(x * x + z * z);
        const saturation = Math.min(distance / 2, 1); // Normalize to 0-1
        
        // Use full brightness
        const brightness = 1;
        
        // Convert HSV to RGB
        return this.hsvToRgb(hue, saturation, brightness);
    }

    hsvToRgb(h, s, v) {
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        
        let r, g, b;
        
        if (h >= 0 && h < 60) {
            r = c; g = x; b = 0;
        } else if (h >= 60 && h < 120) {
            r = x; g = c; b = 0;
        } else if (h >= 120 && h < 180) {
            r = 0; g = c; b = x;
        } else if (h >= 180 && h < 240) {
            r = 0; g = x; b = c;
        } else if (h >= 240 && h < 300) {
            r = x; g = 0; b = c;
        } else {
            r = c; g = 0; b = x;
        }
        
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    }

    advanceTurn() {
        this.currentTurn = (this.currentTurn + 1) % this.turnOrder.length;
    }

    updateSettings(settings) {
        this.gameSettings = { ...this.gameSettings, ...settings };
    }

    getCurrentPlayer() {
        if (this.turnOrder.length === 0) return null;
        return this.turnOrder[this.currentTurn];
    }

    getState() {
        return {
            roomCode: this.roomCode,
            hostId: this.hostId,
            players: Array.from(this.players.values()),
            gameState: this.gameState,
            targetColor: this.targetColor,
            currentTurn: this.getCurrentPlayer(),
            playerColors: Object.fromEntries(this.playerColors),
            gameSettings: this.gameSettings,
            throwCount: this.throws.length
        };
    }
}

module.exports = Room;
