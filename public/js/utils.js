/**
 * Utility functions for the ARTS game client
 */

/**
 * Generate a random string
 * @param {number} length - Length of string to generate
 * @returns {string} Random string
 */
function generateRandomString(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Format room code for display
 * @param {string} roomCode - Room code to format
 * @returns {string} Formatted room code
 */
function formatRoomCode(roomCode) {
    return roomCode ? roomCode.toUpperCase() : '';
}

/**
 * Validate room code
 * @param {string} roomCode - Room code to validate
 * @returns {boolean} Whether room code is valid
 */
function isValidRoomCode(roomCode) {
    return typeof roomCode === 'string' && 
           roomCode.length === 4 && 
           /^[A-Z0-9]+$/i.test(roomCode);
}

/**
 * Validate player name
 * @param {string} name - Player name to validate
 * @returns {boolean} Whether name is valid
 */
function isValidPlayerName(name) {
    return typeof name === 'string' && 
           name.trim().length >= 1 && 
           name.trim().length <= 20;
}

/**
 * Generate a random player name
 * @returns {string} Random player name like "Player385"
 */
function generateRandomPlayerName() {
    const randomNumber = Math.floor(Math.random() * 1000) + 1;
    return `Player${randomNumber}`;
}

/**
 * Debounce function calls
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Throttle function calls
 * @param {Function} func - Function to throttle
 * @param {number} limit - Time limit in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Clamp a value between min and max
 * @param {number} value - Value to clamp
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Clamped value
 */
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

/**
 * Linear interpolation
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

/**
 * Map a value from one range to another
 * @param {number} value - Value to map
 * @param {number} fromMin - Source range minimum
 * @param {number} fromMax - Source range maximum
 * @param {number} toMin - Target range minimum
 * @param {number} toMax - Target range maximum
 * @returns {number} Mapped value
 */
function mapRange(value, fromMin, fromMax, toMin, toMax) {
    return (value - fromMin) * (toMax - toMin) / (fromMax - fromMin) + toMin;
}

/**
 * Get random number between min and max
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random number
 */
function random(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Get random integer between min and max (inclusive)
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @returns {number} Random integer
 */
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Show/hide element with animation
 * @param {HTMLElement} element - Element to animate
 * @param {boolean} show - Whether to show or hide
 * @param {number} duration - Animation duration in ms
 */
function animateElement(element, show, duration = 300) {
    if (show) {
        element.style.display = 'block';
        element.style.opacity = '0';
        element.style.transition = `opacity ${duration}ms ease`;
        setTimeout(() => {
            element.style.opacity = '1';
        }, 10);
    } else {
        element.style.transition = `opacity ${duration}ms ease`;
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.display = 'none';
        }, duration);
    }
}

/**
 * Create a DOM element with attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {...(HTMLElement|string)} children - Child elements or text
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, ...children) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'onClick') {
            element.addEventListener('click', value);
        } else {
            element.setAttribute(key, value);
        }
    });
    
    // Add children
    children.forEach(child => {
        if (typeof child === 'string') {
            element.appendChild(document.createTextNode(child));
        } else if (child instanceof HTMLElement) {
            element.appendChild(child);
        }
    });
    
    return element;
}

/**
 * Wait for a specified amount of time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Promise that resolves after the wait
 */
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 * @param {string} text - Text to copy
 * @returns {Promise<boolean>} Whether copy was successful
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        } catch (fallbackErr) {
            document.body.removeChild(textArea);
            return false;
        }
    }
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Check if device is mobile
 * @returns {boolean} Whether device is mobile
 */
function isMobile() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Get viewport dimensions
 * @returns {Object} Viewport width and height
 */
function getViewportSize() {
    return {
        width: window.innerWidth,
        height: window.innerHeight
    };
}
