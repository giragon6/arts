/**
 * UI Manager - Handles all user interface interactions
 */
class UIManager {
    constructor(gameManager) {
        this.gameManager = gameManager;
        this.screens = {
            mainMenu: document.getElementById('main-menu'),
            joinRoom: document.getElementById('join-room'),
            lobby: document.getElementById('lobby'),
            game: document.getElementById('game'),
            gameOver: document.getElementById('game-over'),
            loading: document.getElementById('loading')
        };
        
        this.elements = {
            // Main menu
            createRoomBtn: document.getElementById('create-room-btn'),
            joinRoomBtn: document.getElementById('join-room-btn'),
            
            // Join room form
            playerNameInput: document.getElementById('player-name'),
            roomCodeInput: document.getElementById('room-code'),
            joinForm: document.getElementById('join-form'),
            backToMenuBtn: document.getElementById('back-to-menu'),
            
            // Lobby
            currentRoomCode: document.getElementById('current-room-code'),
            playersList: document.getElementById('players-list'),
            playerCount: document.getElementById('player-count'),
            targetColorSwatch: document.getElementById('target-color-swatch'),
            targetColorRGB: document.getElementById('target-color-rgb'),
            hostSettings: document.getElementById('host-settings'),
            startGameBtn: document.getElementById('start-game'),
            leaveRoomBtn: document.getElementById('leave-room'),
            
            // Game settings
            colorTolerance: document.getElementById('color-tolerance'),
            toleranceValue: document.getElementById('tolerance-value'),
            dartSpeed: document.getElementById('dart-speed'),
            speedValue: document.getElementById('speed-value'),
            difficulty: document.getElementById('difficulty'),
            
            // Game
            gameRoomCode: document.getElementById('game-room-code'),
            gameTargetColor: document.getElementById('game-target-color'),
            currentPlayerName: document.getElementById('current-player-name'),
            currentPlayerColor: document.getElementById('current-player-color'),
            gamePlayersList: document.getElementById('game-players-list'),
            throwControls: document.getElementById('throw-controls'),
            throwPower: document.getElementById('throw-power'),
            powerValue: document.getElementById('power-value'),
            throwDartBtn: document.getElementById('throw-dart'),
            throwingIndicator: document.getElementById('throwing-indicator'),
            crosshair: document.getElementById('crosshair'),
            leaveGameBtn: document.getElementById('leave-game'),
            
            // Game over
            winnerName: document.getElementById('winner-name'),
            finalTargetColor: document.getElementById('final-target-color'),
            finalWinnerColor: document.getElementById('final-winner-color'),
            playAgainBtn: document.getElementById('play-again'),
            backToMainBtn: document.getElementById('back-to-main'),
            
            // Error popup
            errorPopup: document.getElementById('error-popup'),
            errorMessage: document.getElementById('error-message'),
            closeErrorBtn: document.getElementById('close-error'),
            
            // Loading
            loadingText: document.getElementById('loading-text')
        };

        this.currentScreen = 'mainMenu';
        this.notifications = [];
        
        this.setupEventListeners();
        this.showScreen('mainMenu');
    }

    setupEventListeners() {
        // Main menu
        this.elements.createRoomBtn?.addEventListener('click', () => {
            this.showJoinRoomForm(true);
        });

        this.elements.joinRoomBtn?.addEventListener('click', () => {
            this.showJoinRoomForm(false);
        });

        // Join room form
        this.elements.joinForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleJoinFormSubmit();
        });

        this.elements.backToMenuBtn?.addEventListener('click', () => {
            this.showScreen('mainMenu');
        });

        // Lobby
        this.elements.startGameBtn?.addEventListener('click', () => {
            this.gameManager.startGame();
        });

        this.elements.leaveRoomBtn?.addEventListener('click', () => {
            this.handleLeaveRoom();
        });

        // Game settings
        this.elements.colorTolerance?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.toleranceValue.textContent = value;
            this.gameManager.updateGameSettings({ colorTolerance: value });
        });

        this.elements.dartSpeed?.addEventListener('input', (e) => {
            const value = parseInt(e.target.value);
            this.elements.speedValue.textContent = value;
            this.gameManager.updateGameSettings({ dartSpeed: value });
        });

        this.elements.difficulty?.addEventListener('change', (e) => {
            this.gameManager.updateGameSettings({ difficulty: e.target.value });
        });

        // Game controls
        this.elements.throwPower?.addEventListener('input', (e) => {
            const value = parseFloat(e.target.value);
            this.elements.powerValue.textContent = Math.round(value * 100) + '%';
        });

        this.elements.throwDartBtn?.addEventListener('click', () => {
            this.handleThrowDart();
        });

        this.elements.leaveGameBtn?.addEventListener('click', () => {
            this.handleLeaveRoom();
        });

        // Game over
        this.elements.playAgainBtn?.addEventListener('click', () => {
            this.showScreen('lobby');
        });

        this.elements.backToMainBtn?.addEventListener('click', () => {
            this.handleLeaveRoom();
        });

        // Error popup
        this.elements.closeErrorBtn?.addEventListener('click', () => {
            this.hideError();
        });

        // Canvas click for dart throwing
        const canvas = document.getElementById('three-canvas');
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                this.handleCanvasClick(e);
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e);
        });
    }

    showScreen(screenName) {
        // Hide all screens
        Object.values(this.screens).forEach(screen => {
            if (screen) {
                screen.classList.remove('active');
            }
        });

        // Show target screen
        const targetScreen = this.screens[screenName];
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    showJoinRoomForm(isCreating = false) {
        this.showScreen('joinRoom');
        
        if (isCreating) {
            this.elements.roomCodeInput.style.display = 'none';
            this.elements.roomCodeInput.previousElementSibling.style.display = 'none';
            document.querySelector('#join-form button[type="submit"]').textContent = 'Create Room';
        } else {
            this.elements.roomCodeInput.style.display = 'block';
            this.elements.roomCodeInput.previousElementSibling.style.display = 'block';
            document.querySelector('#join-form button[type="submit"]').textContent = 'Join Room';
        }
    }

    handleJoinFormSubmit() {
        const playerName = this.elements.playerNameInput.value.trim();
        const roomCode = this.elements.roomCodeInput.value.trim().toUpperCase();
        const isCreating = this.elements.roomCodeInput.style.display === 'none';

        if (!isValidPlayerName(playerName)) {
            this.showError('Please enter a valid name (1-20 characters)');
            return;
        }

        this.showLoading('Connecting...');

        if (isCreating) {
            this.gameManager.createRoom(playerName);
        } else {
            this.gameManager.joinRoom(playerName, roomCode || null);
        }
    }

    showLobby(room, player) {
        this.showScreen('lobby');
        
        // Update room info
        this.elements.currentRoomCode.textContent = room.roomCode;
        
        // Update players list
        this.updatePlayersList(room.players);
        
        // Show/hide host settings
        if (player.isHost) {
            this.elements.hostSettings.style.display = 'block';
            this.updateGameSettingsUI(room.gameSettings);
        } else {
            this.elements.hostSettings.style.display = 'none';
        }
        
        // Update start game button
        this.updateStartGameButton(room.players.length, player.isHost);
        
        // Generate and show target color
        if (!room.targetColor) {
            const targetColor = generateRandomColor();
            this.updateTargetColor(targetColor);
        } else {
            this.updateTargetColor(room.targetColor);
        }
    }

    updatePlayersList(players) {
        if (!this.elements.playersList) return;
        this.elements.playersList.innerHTML = '';
        this.elements.playerCount.textContent = players.length;
        players.forEach(player => {
            const playerElement = createElement('div', { className: 'player-item' },
                createElement('div', { className: 'player-info' },
                    createElement('span', { className: 'player-name' }, player.name),
                    player.isHost ? createElement('span', { className: 'host-badge' }, 'HOST') : null
                ),
                createElement('div', { className: 'player-status' },
                    createElement('div', { 
                        className: `ready-indicator ${player.isReady ? '' : 'not-ready'}`
                    })
                )
            );
            this.elements.playersList.appendChild(playerElement);
        });
        // Also update the start button and info text in the lobby
        const isHost = this.gameManager && this.gameManager.isHost && this.gameManager.isHost();
        this.updateStartGameButton(players.length, isHost);
    }

    updateTargetColor(color) {
        applyColorToElement(this.elements.targetColorSwatch, color);
        this.elements.targetColorRGB.textContent = `RGB: ${color.r}, ${color.g}, ${color.b}`;
    }

    updateGameSettingsUI(settings) {
        if (this.elements.colorTolerance) {
            this.elements.colorTolerance.value = settings.colorTolerance;
            this.elements.toleranceValue.textContent = settings.colorTolerance;
        }
        
        if (this.elements.dartSpeed) {
            this.elements.dartSpeed.value = settings.dartSpeed;
            this.elements.speedValue.textContent = settings.dartSpeed;
        }
        
        if (this.elements.difficulty) {
            this.elements.difficulty.value = settings.difficulty;
        }
    }

    updateStartGameButton(playerCount, isHost) {
        const canStart = isHost && playerCount >= 2;
        console.log(canStart)
        this.elements.startGameBtn.disabled = !canStart;
        
        const infoText = document.querySelector('.start-game-info');
        if (!isHost) {
            infoText.textContent = 'Waiting for host to start';
        } else if (playerCount < 2) {
            infoText.textContent = 'Need at least 2 players to start';
        } else {
            infoText.textContent = 'Ready to start!';
        }
    }

    showGame(gameState, targetColor) {
        console.log('UIManager: Showing game screen');
        this.showScreen('game');
        
        // Update room code
        this.elements.gameRoomCode.textContent = gameState.roomCode;
        
        // Update target color
        applyColorToElement(this.elements.gameTargetColor, targetColor);
        
        // Update current turn
        this.updateCurrentTurn(gameState.currentTurn);
        
        // Update players list
        this.updateGamePlayersList(gameState.players, gameState.playerColors);
        
        // Show/hide throw controls
        this.updateThrowControls(gameState.currentTurn);
    }

    updateCurrentTurn(currentTurnId) {
        const currentPlayer = this.gameManager.getPlayerById(currentTurnId);
        
        if (currentPlayer) {
            this.elements.currentPlayerName.textContent = currentPlayer.name;
            const playerColor = this.gameManager.gameState.playerColors[currentTurnId];
            if (playerColor) {
                applyColorToElement(this.elements.currentPlayerColor, playerColor);
            }
        }
    }

    updateGamePlayersList(players, playerColors) {
        if (!this.elements.gamePlayersList) return;
        
        this.elements.gamePlayersList.innerHTML = '';
        
        players.forEach(player => {
            const isCurrentTurn = player.id === this.gameManager.gameState.currentTurn;
            const playerColor = playerColors[player.id] || { r: 128, g: 128, b: 128 };
            
            const playerElement = createElement('div', { 
                className: `game-player-item ${isCurrentTurn ? 'current-turn' : ''}` 
            },
                createElement('span', { className: 'player-name' }, player.name),
                createElement('div', { className: 'player-color' },
                    createElement('div', { 
                        className: 'color-swatch-mini',
                        style: `background-color: ${colorToCSS(playerColor)}`
                    })
                )
            );
            
            this.elements.gamePlayersList.appendChild(playerElement);
        });
    }

    updateThrowControls(currentTurnId) {
        const isMyTurn = currentTurnId === this.gameManager.socketManager.getSocketId();
        
        if (this.elements.throwControls) {
            this.elements.throwControls.style.display = isMyTurn ? 'block' : 'none';
        }
        
        if (this.elements.crosshair) {
            this.elements.crosshair.style.display = isMyTurn ? 'block' : 'none';
        }
    }

    updatePlayerColors(playerColors) {
        this.updateGamePlayersList(this.gameManager.gameState.players, playerColors);
        
        // Update current player color if needed
        const currentTurnId = this.gameManager.gameState.currentTurn;
        if (currentTurnId && playerColors[currentTurnId]) {
            applyColorToElement(this.elements.currentPlayerColor, playerColors[currentTurnId]);
        }
    }

    handleThrowDart() {
        // Get center of canvas as target (player aims with mouse)
        const canvas = document.getElementById('three-canvas');
        if (!canvas) return;
        
        // const rect = canvas.getBoundingClientRect();
        // const centerX = rect.width / 2;
        // const centerY = rect.height / 2;
        
        const targetPosition = {
            x: 0,
            y: 0,
            z: 0
        };
        
        const power = parseFloat(this.elements.throwPower.value);
        this.gameManager.throwDart(targetPosition, power);
    }

    handleCanvasClick(event) {
        if (!this.gameManager.canThrow()) return;
        
        const canvas = event.target;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        // Convert screen coordinates to world coordinates (simplified)
        const worldX = (x / rect.width - 0.5) * 6; // Scale to dartboard size
        const worldY = -(y / rect.height - 0.5) * 6; // Flip Y axis
        
        const targetPosition = { x: worldX, y: worldY, z: 0 };
        const power = parseFloat(this.elements.throwPower.value);
        
        this.gameManager.throwDart(targetPosition, power);
    }

    showThrowingIndicator(show) {
        if (this.elements.throwingIndicator) {
            this.elements.throwingIndicator.classList.toggle('active', show);
        }
    }

    showThrowResult(playerId, newColor, throwData) {
        const player = this.gameManager.getPlayerById(playerId);
        if (player) {
            this.showNotification(
                `${player.name} hit ${rgbToHex(throwData.hitColor)} and mixed to ${rgbToHex(newColor)}!`
            );
        }
    }

    showGameOver(winner, finalColor, targetColor) {
        this.showScreen('gameOver');
        
        this.elements.winnerName.textContent = `${winner.name} Won!`;
        applyColorToElement(this.elements.finalTargetColor, targetColor);
        applyColorToElement(this.elements.finalWinnerColor, finalColor);
    }

    showLoading(message) {
        this.elements.loadingText.textContent = message;
        this.showScreen('loading');
    }

    hideLoading() {
        if (this.currentScreen === 'loading') {
            this.showScreen('mainMenu');
        }
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorPopup.classList.add('active');
        this.hideLoading();
    }

    hideError() {
        this.elements.errorPopup.classList.remove('active');
    }

    showNotification(message) {
        // Create notification element
        const notification = createElement('div', { className: 'notification' }, message);
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 1rem;
            border-radius: 8px;
            z-index: 1000;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after delay
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }

    updateGameSettings(settings) {
        this.updateGameSettingsUI(settings);
    }

    handleLeaveRoom() {
        this.gameManager.socketManager.leaveRoom();
        this.showScreen('mainMenu');
    }

    handleKeyPress(event) {
        switch (event.key) {
            case 'Escape':
                this.hideError();
                break;
            case 'Enter':
                if (this.currentScreen === 'game' && this.gameManager.canThrow()) {
                    this.handleThrowDart();
                }
                break;
        }
    }

    // Utility methods
    getScreenElement(screenName) {
        return this.screens[screenName];
    }

    isScreenActive(screenName) {
        return this.currentScreen === screenName;
    }
}
