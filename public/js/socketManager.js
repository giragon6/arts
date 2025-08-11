/**
 * Socket.IO Manager for client-server communication
 */
class SocketManager {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.eventListeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectInterval = 2000;
        
        this.connect();
    }

    connect() {
        try {
            // Initialize socket connection
            this.socket = io({
                transports: ['websocket', 'polling'],
                upgrade: true,
                rememberUpgrade: true
            });

            this.setupEventListeners();
            console.log('Socket.IO connection initiated');
        } catch (error) {
            console.error('Failed to initialize socket connection:', error);
            this.scheduleReconnect();
        }
    }

    setupEventListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server:', this.socket.id);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.emit('connected', this.socket.id);
        });

        this.socket.on('disconnect', (reason) => {
            console.log('Disconnected from server:', reason);
            this.isConnected = false;
            this.emit('disconnected', reason);
            
            if (reason === 'io server disconnect') {
                // Server disconnected the client, try to reconnect
                this.scheduleReconnect();
            }
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.emit('connectionError', error);
            this.scheduleReconnect();
        });

        // Game events
        this.socket.on('roomCreated', (data) => {
            console.log('Room created:', data);
            this.emit('roomCreated', data);
        });

        this.socket.on('joinedRoom', (data) => {
            console.log('Joined room:', data);
            this.emit('joinedRoom', data);
        });

        this.socket.on('playerJoined', (data) => {
            console.log('Player joined:', data);
            this.emit('playerJoined', data);
        });

        this.socket.on('playerLeft', (data) => {
            console.log('Player left:', data);
            this.emit('playerLeft', data);
        });

        this.socket.on('gameStarted', (data) => {
            console.log('Game started:', data);
            this.emit('gameStarted', data);
        });

        this.socket.on('gameStartError', (data) => {
            console.error('Game start error:', data);
            this.emit('gameStartError', data);
        });

        this.socket.on('dartThrown', (data) => {
            console.log('Dart thrown:', data);
            this.emit('dartThrown', data);
        });

        this.socket.on('gameWon', (data) => {
            console.log('Game won:', data);
            this.emit('gameWon', data);
        });

        this.socket.on('gameSettingsUpdated', (data) => {
            console.log('Game settings updated:', data);
            this.emit('gameSettingsUpdated', data);
        });

        // Error events
        this.socket.on('throwError', (data) => {
            console.error('Throw error:', data);
            this.emit('throwError', data);
        });

        this.socket.on('settingsError', (data) => {
            console.error('Settings error:', data);
            this.emit('settingsError', data);
        });
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnectAttemptsReached');
            return;
        }

        this.reconnectAttempts++;
        console.log(`Attempting reconnection ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectInterval}ms`);
        
        setTimeout(() => {
            if (!this.isConnected) {
                this.connect();
            }
        }, this.reconnectInterval);
    }

    // Event listener management
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Game actions
    createRoom(playerName) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        console.log('Creating room for player:', playerName);
        this.socket.emit('createRoom', { playerName });
    }

    joinRoom(playerName, roomCode = null) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        console.log('Joining room:', { playerName, roomCode });
        this.socket.emit('joinRoom', { playerName, roomCode });
    }

    startGame(roomCode) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        console.log('Starting game in room:', roomCode);
        this.socket.emit('startGame', { roomCode });
    }

    throwDart(roomCode, throwData) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        console.log('Throwing dart:', { roomCode, throwData });
        this.socket.emit('dartThrow', { roomCode, throwData });
    }

    updateGameSettings(roomCode, settings) {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        console.log('Updating game settings:', { roomCode, settings });
        this.socket.emit('updateGameSettings', { roomCode, settings });
    }

    leaveRoom() {
        if (!this.isConnected) {
            console.warn('Not connected to server');
            return;
        }

        // Server will handle disconnect automatically
        this.socket.disconnect();
        this.connect(); // Reconnect for new game
    }

    // Utility methods
    isSocketConnected() {
        return this.isConnected && this.socket && this.socket.connected;
    }

    getSocketId() {
        return this.socket ? this.socket.id : null;
    }

    // Connection status methods
    waitForConnection(timeout = 5000) {
        return new Promise((resolve, reject) => {
            if (this.isConnected) {
                resolve();
                return;
            }

            const timeoutId = setTimeout(() => {
                this.off('connected', onConnect);
                reject(new Error('Connection timeout'));
            }, timeout);

            const onConnect = () => {
                clearTimeout(timeoutId);
                this.off('connected', onConnect);
                resolve();
            };

            this.on('connected', onConnect);
        });
    }

    // Clean up
    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnected = false;
        this.eventListeners.clear();
        this.reconnectAttempts = 0;
    }

    // Debug methods
    getConnectionInfo() {
        return {
            connected: this.isConnected,
            socketId: this.getSocketId(),
            transport: this.socket ? this.socket.io.engine.transport.name : null,
            reconnectAttempts: this.reconnectAttempts
        };
    }

    // Ping test
    ping() {
        return new Promise((resolve) => {
            if (!this.isConnected) {
                resolve({ error: 'Not connected' });
                return;
            }

            const startTime = Date.now();
            this.socket.emit('ping', startTime, (response) => {
                const latency = Date.now() - startTime;
                resolve({ latency, timestamp: response });
            });
        });
    }
}
