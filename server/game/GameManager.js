const Room = require('./Room');
const { generateTargetColor, generateRoomCode } = require('./utils');

class GameManager {
    constructor() {
        this.rooms = new Map();
        this.playerRooms = new Map(); // Track which room each player is in
    }

    createRoom(playerId, playerName) {
        const roomCode = generateRoomCode();
        const room = new Room(roomCode, playerId, playerName);
        
        this.rooms.set(roomCode, room);
        this.playerRooms.set(playerId, roomCode);

        return {
            success: true,
            roomCode,
            player: room.players.get(playerId),
            room: room.getState()
        };
    }

    joinRoom(playerId, playerName, roomCode = null) {
        // If no room code provided, try to find an available room
        if (!roomCode) {
            roomCode = this.findAvailableRoom();
            if (!roomCode) {
                // Create new room if none available
                return this.createRoom(playerId, playerName);
            }
        }

        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.players.size >= 4) {
            return { success: false, message: 'Room is full' };
        }

        if (room.gameState !== 'waiting') {
            return { success: false, message: 'Game is already in progress' };
        }

        const player = room.addPlayer(playerId, playerName);
        this.playerRooms.set(playerId, roomCode);

        return {
            success: true,
            roomCode,
            player,
            room: room.getState()
        };
    }

    startGame(roomCode, hostId) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.hostId !== hostId) {
            return { success: false, message: 'Only the host can start the game' };
        }

        if (room.players.size < 2) {
            return { success: false, message: 'Need at least 2 players to start' };
        }

        // Use the target color that was already generated when the room was created
        room.startGame(room.targetColor);

        return {
            success: true,
            gameState: room.getState(),
            targetColor: room.targetColor
        };
    }

    processDartThrow(roomCode, playerId, throwData) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.gameState !== 'playing') {
            return { success: false, message: 'Game is not in progress' };
        }

        console.log('Current player:', room.getCurrentPlayer())
        console.log('Player ID:', playerId)
        if (room.getCurrentPlayer() !== playerId) {
            return { success: false, message: 'Not your turn' };
        }

        const result = room.processDartThrow(playerId, throwData);
        
        return {
            success: true,
            throwData: result.throwData,
            newColor: result.newColor,
            colorChanged: result.colorChanged,
            gameState: room.getState(),
            winner: result.winner,
            finalColor: result.finalColor
        };
    }

    updateGameSettings(roomCode, hostId, settings) {
        const room = this.rooms.get(roomCode);
        if (!room) {
            return { success: false, message: 'Room not found' };
        }

        if (room.hostId !== hostId) {
            return { success: false, message: 'Only the host can update settings' };
        }

        room.updateSettings(settings);

        return {
            success: true,
            settings: room.gameSettings
        };
    }

    removePlayer(playerId) {
        const roomCode = this.playerRooms.get(playerId);
        if (!roomCode) {
            return {};
        }

        const room = this.rooms.get(roomCode);
        if (!room) {
            return {};
        }

        room.removePlayer(playerId);
        this.playerRooms.delete(playerId);

        // If room is empty, delete it
        if (room.players.size === 0) {
            this.rooms.delete(roomCode);
        }

        return {
            roomCode,
            room: room.getState()
        };
    }

    findAvailableRoom() {
        for (const [roomCode, room] of this.rooms) {
            if (room.players.size < 4 && room.gameState === 'waiting') {
                return roomCode;
            }
        }
        return null;
    }

    getRoomState(roomCode) {
        const room = this.rooms.get(roomCode);
        return room ? room.getState() : null;
    }
}

module.exports = GameManager;
