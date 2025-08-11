const { mixColors, calculateColorDistance, generateRandomColor } = require('./colorUtils');
const { v4: uuidv4 } = require('uuid');

class Room {
    constructor(roomCode, hostId, hostName) {
        this.roomCode = roomCode;
        this.hostId = hostId;
        this.players = new Map();
        this.gameState = 'waiting'; // waiting, playing, finished
        this.targetColor = generateRandomColor(); // Generate target color when room is created
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
            currentColor: { r: 0, g: 0, b: 0 }, // Start with white
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

        // Use client-provided hit color - null means miss, undefined means not provided
        let hitColor = throwData.hitColor;
        if (hitColor === undefined) {
            // Only calculate if client didn't provide hitColor at all
            hitColor = this.calculateHitColor(throwData.hitPosition);
        }
        
        console.log('Server processDartThrow - hitColor:', hitColor);
        
        let newColor = this.playerColors.get(playerId);
        let colorChanged = false;
        
        // Only mix colors if dart actually hit the dartboard
        if (hitColor !== null) {
            // Mix with player's current color
            const currentColor = this.playerColors.get(playerId);
            newColor = mixColors(currentColor, hitColor, 0.3); // 30% weight to new color
            
            this.playerColors.set(playerId, newColor);
            player.currentColor = newColor;
            colorChanged = true;
        }
        
        player.throwCount++;

        // Record the throw
        const throwRecord = {
            id: uuidv4(),
            playerId,
            timestamp: Date.now(),
            hitPosition: throwData.hitPosition,
            hitColor,
            newColor,
            trajectory: throwData.trajectory,
            hitBoard: hitColor !== null
        };
        this.throws.push(throwRecord);

        // Check if player won (only if they hit the board and color changed)
        let winner = null;
        let finalColor = null;

        if (colorChanged && hitColor !== null) {
            const colorDistance = calculateColorDistance(newColor, this.targetColor);
            if (colorDistance <= this.gameSettings.colorTolerance) {
                winner = player;
                finalColor = newColor;
                this.gameState = 'finished';
            }
        }
        
        // Always advance turn after a throw (whether hit or miss)
        if (!winner) {
            this.advanceTurn();
        }

        return {
            throwData: throwRecord,
            newColor: colorChanged ? newColor : null, // Only send newColor if it actually changed
            colorChanged: colorChanged,
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
