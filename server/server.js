const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const GameManager = require('./game/GameManager');
const Room = require('./game/Room');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// Game manager instance
const gameManager = new GameManager();

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join or create room
    socket.on('joinRoom', ({ playerName, roomCode }) => {
        try {
            const result = gameManager.joinRoom(socket.id, playerName, roomCode);
            
            if (result.success) {
                socket.join(result.roomCode);
                socket.emit('joinedRoom', {
                    success: true,
                    roomCode: result.roomCode,
                    player: result.player,
                    room: result.room
                });

                // Notify other players
                socket.to(result.roomCode).emit('playerJoined', {
                    player: result.player,
                    room: result.room
                });

                console.log(`Player ${playerName} joined room ${result.roomCode}`);
            } else {
                socket.emit('joinedRoom', { success: false, message: result.message });
            }
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('joinedRoom', { success: false, message: 'Server error' });
        }
    });

    // Create new room
    socket.on('createRoom', ({ playerName }) => {
        try {
            const result = gameManager.createRoom(socket.id, playerName);
            
            socket.join(result.roomCode);
            socket.emit('roomCreated', {
                success: true,
                roomCode: result.roomCode,
                player: result.player,
                room: result.room
            });

            console.log(`Player ${playerName} created room ${result.roomCode}`);
        } catch (error) {
            console.error('Error creating room:', error);
            socket.emit('roomCreated', { success: false, message: 'Server error' });
        }
    });

    // Start game
    socket.on('startGame', ({ roomCode }) => {
        try {
            const result = gameManager.startGame(roomCode, socket.id);
            
            if (result.success) {
                io.to(roomCode).emit('gameStarted', {
                    gameState: result.gameState,
                    targetColor: result.targetColor
                });
                console.log(`Game started in room ${roomCode}`);
            } else {
                socket.emit('gameStartError', { message: result.message });
            }
        } catch (error) {
            console.error('Error starting game:', error);
            socket.emit('gameStartError', { message: 'Server error' });
        }
    });

    // Handle dart throw
    socket.on('dartThrow', ({ roomCode, throwData }) => {
        try {
            const result = gameManager.processDartThrow(roomCode, socket.id, throwData);
            
            if (result.success) {
                // Broadcast throw to all players in room
                io.to(roomCode).emit('dartThrown', {
                    playerId: socket.id,
                    throwData: result.throwData,
                    newColor: result.newColor,
                    gameState: result.gameState
                });

                // Check for winner
                if (result.winner) {
                    io.to(roomCode).emit('gameWon', {
                        winner: result.winner,
                        finalColor: result.finalColor
                    });
                }
            } else {
                socket.emit('throwError', { message: result.message });
            }
        } catch (error) {
            console.error('Error processing dart throw:', error);
            socket.emit('throwError', { message: 'Server error' });
        }
    });

    // Update game settings
    socket.on('updateGameSettings', ({ roomCode, settings }) => {
        try {
            const result = gameManager.updateGameSettings(roomCode, socket.id, settings);
            
            if (result.success) {
                socket.to(roomCode).emit('gameSettingsUpdated', {
                    settings: result.settings
                });
            } else {
                socket.emit('settingsError', { message: result.message });
            }
        } catch (error) {
            console.error('Error updating game settings:', error);
            socket.emit('settingsError', { message: 'Server error' });
        }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        
        try {
            const result = gameManager.removePlayer(socket.id);
            if (result.roomCode) {
                socket.to(result.roomCode).emit('playerLeft', {
                    playerId: socket.id,
                    room: result.room
                });
            }
        } catch (error) {
            console.error('Error handling disconnect:', error);
        }
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
    console.log(`Arts game server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to play`);
});
