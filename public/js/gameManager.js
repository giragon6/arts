/**
 * Main Game Manager - Coordinates all game systems
 */
class GameManager {
    constructor() {
        this.socketManager = new SocketManager();
        this.dartPhysics = new DartPhysics();
        this.gameRenderer = null;
        this.uiManager = null;
        
        this.gameState = {
            currentRoom: null,
            player: null,
            players: [],
            targetColor: null,
            currentTurn: null,
            gamePhase: 'menu', // menu, lobby, playing, gameOver
            playerColors: {},
            gameSettings: {
                colorTolerance: 30,
                dartSpeed: 50,
                difficulty: 'medium'
            }
        };

        this.isThrowInProgress = false;
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Socket events
        this.socketManager.on('connected', (socketId) => {
            console.log('Game connected with socket ID:', socketId);
        });

        this.socketManager.on('roomCreated', (data) => {
            this.handleRoomCreated(data);
        });

        this.socketManager.on('joinedRoom', (data) => {
            this.handleJoinedRoom(data);
        });

        this.socketManager.on('playerJoined', (data) => {
            this.handlePlayerJoined(data);
        });

        this.socketManager.on('playerLeft', (data) => {
            this.handlePlayerLeft(data);
        });

        this.socketManager.on('gameStarted', (data) => {
            this.handleGameStarted(data);
        });

        this.socketManager.on('dartThrown', (data) => {
            this.handleDartThrown(data);
        });

        this.socketManager.on('gameWon', (data) => {
            this.handleGameWon(data);
        });

        this.socketManager.on('gameSettingsUpdated', (data) => {
            this.handleGameSettingsUpdated(data);
        });

        // Error handlers
        this.socketManager.on('connectionError', (error) => {
            this.showError('Connection failed. Please try again.');
        });

        this.socketManager.on('throwError', (data) => {
            this.showError(data.message);
            this.isThrowInProgress = false;
        });

        this.socketManager.on('gameStartError', (data) => {
            this.showError(data.message);
        });
    }

    // Room management
    async createRoom(playerName) {
        if (!isValidPlayerName(playerName)) {
            this.showError('Please enter a valid name (1-20 characters)');
            return;
        }

        try {
            await this.socketManager.waitForConnection();
            this.socketManager.createRoom(playerName);
        } catch (error) {
            this.showError('Failed to create room. Please check your connection.');
        }
    }

    async joinRoom(playerName, roomCode = null) {
        if (!isValidPlayerName(playerName)) {
            this.showError('Please enter a valid name (1-20 characters)');
            return;
        }

        if (roomCode && !isValidRoomCode(roomCode)) {
            this.showError('Please enter a valid room code (4 characters)');
            return;
        }

        try {
            await this.socketManager.waitForConnection();
            this.socketManager.joinRoom(playerName, roomCode ? roomCode.toUpperCase() : null);
        } catch (error) {
            this.showError('Failed to join room. Please check your connection.');
        }
    }

    startGame() {
        if (!this.gameState.currentRoom) {
            this.showError('Not in a room');
            return;
        }

        if (!this.isHost()) {
            this.showError('Only the host can start the game');
            return;
        }

        this.socketManager.startGame(this.gameState.currentRoom.roomCode);
    }

    updateGameSettings(settings) {
        if (!this.gameState.currentRoom) {
            return;
        }

        if (!this.isHost()) {
            return;
        }

        this.gameState.gameSettings = { ...this.gameState.gameSettings, ...settings };
        this.socketManager.updateGameSettings(this.gameState.currentRoom.roomCode, settings);
    }

    // Game actions
    async throwDart(targetPosition, power = 0.8) {
        if (this.isThrowInProgress) {
            return;
        }

        if (!this.canThrow()) {
            this.showError('It\'s not your turn or game is not active');
            return;
        }

        this.isThrowInProgress = true;
        try {
            // Get player accuracy based on difficulty
            const difficulty = this.gameState.gameSettings.difficulty;
            const difficultySettings = this.dartPhysics.getDifficultySettings(difficulty);
            const accuracy = Math.max(0.1, 0.8 + difficultySettings.accuracyBonus);

            // Show throwing animation
            if (this.uiManager) {
                this.uiManager.showThrowingIndicator(true);
            }

            // Calculate and animate dart throw
            const throwResult = await this.gameRenderer.throwDart(
                targetPosition, 
                power, 
                this.socketManager.getSocketId()
            );

            // Send throw data to server
            const throwData = {
                hitPosition: throwResult.hitPosition,
                hitColor: throwResult.hitColor,
                trajectory: throwResult.trajectory,
                power: power,
                timestamp: Date.now()
            };

            console.log('Client sending throw data - hitColor:', throwResult.hitColor);
            this.socketManager.throwDart(this.gameState.currentRoom.roomCode, throwData);

        } catch (error) {
            console.error('Error throwing dart:', error);
            this.showError('Failed to throw dart. Please try again.');
            this.isThrowInProgress = false;
        } finally {
            if (this.uiManager) {
                this.uiManager.showThrowingIndicator(false);
            }
        }
    }

    async throwDartWithPhysics(throwParams) {
        if (this.isThrowInProgress) {
            return;
        }

        if (!this.canThrow()) {
            this.showError('It\'s not your turn or game is not active');
            return;
        }

        this.isThrowInProgress = true;
        try {
            // Get player accuracy based on difficulty
            const difficulty = this.gameState.gameSettings.difficulty;
            const difficultySettings = this.dartPhysics.getDifficultySettings(difficulty);

            // Show throwing animation
            if (this.uiManager) {
                this.uiManager.showThrowingIndicator(true);
            }

            // Calculate and animate physics-based dart throw
            const throwResult = await this.gameRenderer.throwDartWithPhysics(
                throwParams, 
                this.socketManager.getSocketId()
            );

            // Send throw data to server
            const throwData = {
                hitPosition: throwResult.hitPosition,
                hitColor: throwResult.hitColor,
                sectorInfo: throwResult.sectorInfo,
                trajectory: throwResult.trajectory,
                throwParams: throwResult.throwParams,
                timestamp: Date.now()
            };

            console.log('Client sending throw data - hitColor:', throwResult.hitColor);
            this.socketManager.throwDart(this.gameState.currentRoom.roomCode, throwData);

        } catch (error) {
            console.error('Error throwing dart:', error);
            this.showError('Failed to throw dart. Please try again.');
            this.isThrowInProgress = false;
        } finally {
            if (this.uiManager) {
                this.uiManager.showThrowingIndicator(false);
            }
        }
    }

    // Event handlers
    handleRoomCreated(data) {
        if (data.success) {
            this.gameState.currentRoom = data.room;
            this.gameState.player = data.player;
            this.gameState.players = data.room.players;
            this.gameState.gamePhase = 'lobby';
            
            if (this.uiManager) {
                this.uiManager.showLobby(data.room, data.player);
            }
        } else {
            this.showError(data.message);
        }
    }

    handleJoinedRoom(data) {
        if (data.success) {
            this.gameState.currentRoom = data.room;
            this.gameState.player = data.player;
            this.gameState.players = data.room.players;
            this.gameState.gamePhase = 'lobby';
            
            if (this.uiManager) {
                this.uiManager.showLobby(data.room, data.player);
            }
        } else {
            this.showError(data.message);
        }
    }

    handlePlayerJoined(data) {
        this.gameState.players = data.room.players;
        this.gameState.currentRoom = data.room;
        
        if (this.uiManager) {
          console.log('player joined')
            this.uiManager.updatePlayersList(data.room.players);
            this.uiManager.showNotification(`${data.player.name} joined the room`);
        }
    }

    handlePlayerLeft(data) {
        this.gameState.players = data.room.players;
        this.gameState.currentRoom = data.room;
        
        if (this.uiManager) {
            this.uiManager.updatePlayersList(data.room.players);
        }
    }

    handleGameStarted(data) {
        this.gameState.gamePhase = 'playing';
        this.gameState.targetColor = data.targetColor;
        this.gameState.currentTurn = data.gameState.currentTurn;
        this.gameState.playerColors = data.gameState.playerColors;

        if (this.uiManager) {
            this.uiManager.showGame(data.gameState, data.targetColor);
        }

        // Initialize 3D renderer after UI is shown and canvas is visible
        setTimeout(async () => {
            if (!this.gameRenderer) {
                const canvas = document.getElementById('three-canvas');
                if (canvas) {
                    console.log('Canvas found, creating GameRenderer');
                    this.gameRenderer = new GameRenderer(canvas);
                    
                    try {
                        await this.gameRenderer.initializeWhenReady();
                        console.log('GameRenderer initialized successfully');
                        
                        if (this.gameRenderer) {
                            this.gameRenderer.setTargetColor(data.targetColor);
                            this.gameRenderer.clearDarts();
                        }
                    } catch (error) {
                        console.error('Failed to initialize GameRenderer:', error);
                    }
                } else {
                    console.error('Canvas not found! ID: three-canvas');
                }
            } else {
                this.gameRenderer.setTargetColor(data.targetColor);
                this.gameRenderer.clearDarts();
            }
        }, 100); // Wait 100ms for UI transition to complete
    }

    handleDartThrown(data) {
        const { playerId, throwData, newColor, colorChanged, gameState } = data;
        
        // Update game state
        this.gameState.playerColors = gameState.playerColors;
        this.gameState.currentTurn = gameState.currentTurn;
        
        // Update UI
        if (this.uiManager) {
            this.uiManager.updatePlayerColors(gameState.playerColors);
            this.uiManager.updateCurrentTurn(gameState.currentTurn);
            this.uiManager.showThrowResult(playerId, newColor, throwData, colorChanged);
        }
        
        // Reset throw state if it was our throw
        if (this.gameState.player && playerId === this.gameState.player.id) {
            this.isThrowInProgress = false;
        }
    }

    handleGameWon(data) {
        this.gameState.gamePhase = 'gameOver';
        
        if (this.uiManager) {
            this.uiManager.showGameOver(data.winner, data.finalColor, this.gameState.targetColor);
        }
    }

    handleGameSettingsUpdated(data) {
        this.gameState.gameSettings = { ...this.gameState.gameSettings, ...data.settings };
        
        if (this.uiManager) {
            this.uiManager.updateGameSettings(data.settings);
        }
    }

    // Utility methods
    isHost() {
        return this.gameState.player && this.gameState.player.isHost;
    }

    canThrow() {
        // Use persistent player id instead of socket id
        return this.gameState.gamePhase === 'playing' &&
               this.gameState.currentTurn === (this.gameState.player && this.gameState.player.id) &&
               !this.isThrowInProgress;
    }

    getCurrentPlayer() {
        if (!this.gameState.currentTurn || !this.gameState.players) {
            return null;
        }
        
        return this.gameState.players.find(p => p.id === this.gameState.currentTurn);
    }

    getPlayerById(playerId) {
        return this.gameState.players.find(p => p.id === playerId);
    }

    showError(message) {
        console.error(message);
        if (this.uiManager) {
            this.uiManager.showError(message);
        }
    }

    // Initialize UI Manager
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    // Clean up
    dispose() {
        if (this.gameRenderer) {
            this.gameRenderer.dispose();
            this.gameRenderer = null;
        }
        
        if (this.socketManager) {
            this.socketManager.disconnect();
        }

        this.gameState = {
            currentRoom: null,
            player: null,
            players: [],
            targetColor: null,
            currentTurn: null,
            gamePhase: 'menu',
            playerColors: {},
            gameSettings: {
                colorTolerance: 30,
                dartSpeed: 50,
                difficulty: 'medium'
            }
        };
    }

    // Debug methods
    getGameState() {
        return { ...this.gameState };
    }

    getConnectionInfo() {
        return this.socketManager.getConnectionInfo();
    }
}
