const { generateRandomColor } = require('./colorUtils');

/**
 * Generate a random room code
 * @returns {string} 4-character room code
 */
function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 4; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

/**
 * Generate a random target color for the game
 * @returns {Object} RGB color {r, g, b}
 */
function generateTargetColor() {
    return generateRandomColor();
}

/**
 * Validate room code format
 * @param {string} roomCode - Room code to validate
 * @returns {boolean} Whether room code is valid
 */
function isValidRoomCode(roomCode) {
    return typeof roomCode === 'string' && 
           roomCode.length === 4 && 
           /^[A-Z0-9]+$/.test(roomCode);
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
 * Generate physics parameters for dart throwing
 * @param {Object} startPos - Start position {x, y, z}
 * @param {Object} targetPos - Target position {x, y, z}
 * @param {number} power - Throw power (0-1)
 * @returns {Object} Physics parameters
 */
function calculateDartTrajectory(startPos, targetPos, power = 0.8) {
    const dx = targetPos.x - startPos.x;
    const dy = targetPos.y - startPos.y;
    const dz = targetPos.z - startPos.z;
    
    const distance = Math.sqrt(dx * dx + dz * dz);
    const gravity = 9.81;
    
    // Calculate initial velocity components
    const angle = Math.atan2(dy, distance);
    const velocity = Math.sqrt(gravity * distance / Math.sin(2 * angle)) * power;
    
    return {
        velocity: {
            x: (dx / distance) * velocity * Math.cos(angle),
            y: velocity * Math.sin(angle),
            z: (dz / distance) * velocity * Math.cos(angle)
        },
        gravity: -gravity,
        time: 2 * velocity * Math.sin(angle) / gravity
    };
}

/**
 * Calculate hit position based on dart trajectory
 * @param {Object} trajectory - Dart trajectory data
 * @returns {Object} Hit position {x, y, z}
 */
function calculateHitPosition(trajectory) {
    const { velocity, gravity, time } = trajectory;
    
    return {
        x: velocity.x * time,
        y: velocity.y * time + 0.5 * gravity * time * time,
        z: velocity.z * time
    };
}

/**
 * Add some randomness to dart throws for realism
 * @param {Object} position - Target position
 * @param {number} accuracy - Accuracy factor (0-1)
 * @returns {Object} Modified position with variance
 */
function addThrowVariance(position, accuracy = 0.8) {
    const variance = (1 - accuracy) * 0.5; // Max variance based on accuracy
    
    return {
        x: position.x + (Math.random() - 0.5) * variance,
        y: position.y + (Math.random() - 0.5) * variance * 0.5, // Less Y variance
        z: position.z + (Math.random() - 0.5) * variance
    };
}

/**
 * Format time in MM:SS format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
 * Linear interpolation between two values
 * @param {number} start - Start value
 * @param {number} end - End value
 * @param {number} t - Interpolation factor (0-1)
 * @returns {number} Interpolated value
 */
function lerp(start, end, t) {
    return start + (end - start) * clamp(t, 0, 1);
}

module.exports = {
    generateRoomCode,
    generateTargetColor,
    isValidRoomCode,
    isValidPlayerName,
    calculateDartTrajectory,
    calculateHitPosition,
    addThrowVariance,
    formatTime,
    clamp,
    lerp
};
