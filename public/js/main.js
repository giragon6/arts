/**
 * Main application entry point
 */

// Global game instance
let game;

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('ARTS Game starting...');
    
    try {
        // Apply random colors to UI elements first
        randomizeUIBackgrounds();
        initializeGame();
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showCriticalError('Failed to initialize game. Please refresh the page.');
    }
});

/**
 * Randomize background colors of UI elements (excluding canvas)
 */
function randomizeUIBackgrounds() {
    // Define selectors for UI containers that should get random backgrounds
    const uiSelectors = [
        '.menu-container',
        '.lobby-container', 
        '.players-section',
        '.game-settings',
        '.target-color-section',
        '.game-ui',
        '.game-header',
        '.current-turn',
        '.players-colors',
        '.popup-content'
    ];
    
    uiSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            // Generate a vibrant random color
            const color = generateVibrantColor();
            const rgba = `rgba(${color.r}, ${color.g}, ${color.b}, 0.95)`;
            element.style.backgroundColor = rgba;
        });
    });
    
    console.log('UI backgrounds randomized');
}

/**
 * Generate a vibrant random color
 */
function generateVibrantColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.random() * 30; // 70-100% saturation for vibrancy
    const lightness = 40 + Math.random() * 30;  // 40-70% lightness for good contrast
    
    return hslToRgb(hue, saturation, lightness);
}

/**
 * Initialize the main game systems
 */
function initializeGame() {
    // Create game manager
    game = new GameManager();
    
    // Expose to global scope for gameRenderer access
    window.gameManager = game;
    
    // Create UI manager and connect it to game manager
    const uiManager = new UIManager(game);
    game.setUIManager(uiManager);
    
    // Setup global error handlers
    setupErrorHandlers();
    
    // Setup performance monitoring
    setupPerformanceMonitoring();
    
    // Setup debug console (only in development)
    if (isDevelopment()) {
        setupDebugConsole();
    }
    
    console.log('ARTS Game initialized successfully');
}

/**
 * Setup global error handlers
 */
function setupErrorHandlers() {
    // Handle JavaScript errors
    window.addEventListener('error', (event) => {
        console.error('JavaScript Error:', event.error);
        
        if (game && game.uiManager) {
            game.uiManager.showError('An unexpected error occurred. Please try again.');
        }
    });
    
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled Promise Rejection:', event.reason);
        
        if (game && game.uiManager) {
            game.uiManager.showError('A network error occurred. Please check your connection.');
        }
    });
    
    // Handle WebGL context lost
    const canvas = document.getElementById('three-canvas');
    if (canvas) {
        canvas.addEventListener('webglcontextlost', (event) => {
            event.preventDefault();
            console.warn('WebGL context lost');
            
            if (game && game.uiManager) {
                game.uiManager.showError('Graphics error. Please refresh the page.');
            }
        });
        
        canvas.addEventListener('webglcontextrestored', (event) => {
            console.log('WebGL context restored');
            
            // Reinitialize renderer if needed
            if (game && game.gameRenderer) {
                game.gameRenderer.init();
            }
        });
    }
}

/**
 * Setup performance monitoring
 */
function setupPerformanceMonitoring() {
    // Monitor FPS if in development
    if (isDevelopment()) {
        let frameCount = 0;
        let lastTime = performance.now();
        
        function updateFPS() {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime >= lastTime + 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                console.log(`FPS: ${fps}`);
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(updateFPS);
        }
        
        requestAnimationFrame(updateFPS);
    }
    
    // Monitor memory usage
    if (performance.memory) {
        setInterval(() => {
            const memory = performance.memory;
            if (memory.usedJSHeapSize > memory.jsHeapSizeLimit * 0.9) {
                console.warn('High memory usage detected');
            }
        }, 30000); // Check every 30 seconds
    }
}

/**
 * Setup debug console for development
 */
function setupDebugConsole() {
    // Add debug commands to window object
    window.ARTS_DEBUG = {
        getGameState: () => game ? game.getGameState() : null,
        getConnectionInfo: () => game ? game.getConnectionInfo() : null,
        testError: () => { throw new Error('Test error'); },
        testThrow: (power = 0.8) => {
            if (game) {
                game.throwDart({ x: 0, y: 0, z: 0 }, power);
            }
        },
        clearDarts: () => {
            if (game && game.gameRenderer) {
                game.gameRenderer.clearDarts();
            }
        },
        generateColor: () => generateRandomColor(),
        mixColors: (color1, color2, weight) => mixColors(color1, color2, weight),
        calculateDistance: (color1, color2) => calculateColorDistance(color1, color2)
    };
    
    console.log('Debug console available at window.ARTS_DEBUG');
    console.log('Available commands:', Object.keys(window.ARTS_DEBUG));
}

/**
 * Check if running in development mode
 */
function isDevelopment() {
    return location.hostname === 'localhost' || location.hostname === '127.0.0.1';
}

/**
 * Show critical error message
 */
function showCriticalError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    `;
    
    errorDiv.innerHTML = `
        <div style="
            background: rgba(255, 255, 255, 0.95);
            padding: 3rem;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
            text-align: center;
            max-width: 400px;
        ">
            <h2 style="color: #dc3545; margin-bottom: 1rem;">Critical Error</h2>
            <p style="color: #666; margin-bottom: 2rem;">${message}</p>
            <button onclick="location.reload()" style="
                background: linear-gradient(45deg, #ff6b6b, #ee5a6f);
                color: white;
                border: none;
                padding: 1rem 2rem;
                border-radius: 10px;
                font-size: 1.1rem;
                font-weight: 600;
                cursor: pointer;
            ">Reload Page</button>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
}

/**
 * Handle page visibility changes
 */
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        console.log('Page hidden - pausing game updates');
        // Could pause game updates here if needed
    } else {
        console.log('Page visible - resuming game updates');
        // Could resume game updates here if needed
    }
});

/**
 * Handle page unload
 */
window.addEventListener('beforeunload', () => {
    if (game) {
        game.dispose();
    }
});

/**
 * Handle window resize
 */
window.addEventListener('resize', debounce(() => {
    if (game && game.gameRenderer) {
        game.gameRenderer.onWindowResize();
    }
}, 250));

/**
 * Expose useful functions globally for debugging
 */
if (isDevelopment()) {
    window.game = () => game;
    window.colorUtils = {
        generateRandomColor,
        mixColors,
        calculateColorDistance,
        rgbToHex,
        hexToRgb,
        hslToRgb,
        rgbToHsl
    };
}

// Service Worker registration for PWA (optional)
if ('serviceWorker' in navigator && location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
