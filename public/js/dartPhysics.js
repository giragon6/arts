/**
 * Dart Physics System
 */
class DartPhysics {
    constructor() {
        this.gravity = -9.81; // m/s^2
        this.airResistance = 0.01;
        this.dartMass = 0.025; // kg (25 grams)
        this.dartLength = 0.15; // meters
    }

    /**
     * Calculate dart trajectory based on throw parameters
     * @param {Object} startPos - Start position {x, y, z}
     * @param {Object} targetPos - Target position {x, y, z}
     * @param {number} power - Throw power (0-1)
     * @param {number} accuracy - Player accuracy (0-1)
     * @returns {Object} Trajectory data
     */
    calculateTrajectory(startPos, targetPos, power = 0.8, accuracy = 0.8) {
        // Calculate basic direction vector
        const dx = targetPos.x - startPos.x;
        const dy = targetPos.y - startPos.y;
        const dz = targetPos.z - startPos.z;
        
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        const totalDistance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Calculate optimal launch angle for given distance
        const optimalAngle = this.calculateOptimalAngle(horizontalDistance, dy);
        
        // Calculate initial velocity based on power
        const maxVelocity = 25; // m/s maximum throw velocity
        const initialVelocity = maxVelocity * power;
        
        // Break down velocity into components
        const velocityX = (dx / horizontalDistance) * initialVelocity * Math.cos(optimalAngle);
        const velocityY = initialVelocity * Math.sin(optimalAngle);
        const velocityZ = (dz / horizontalDistance) * initialVelocity * Math.cos(optimalAngle);
        
        // Add accuracy variance
        const variance = (1 - accuracy) * 2; // 0-2 m/s variance
        const vx = velocityX + (Math.random() - 0.5) * variance;
        const vy = velocityY + (Math.random() - 0.5) * variance * 0.5; // Less vertical variance
        const vz = velocityZ + (Math.random() - 0.5) * variance;
        
        // Calculate flight time
        const flightTime = this.calculateFlightTime(vy, startPos.y, targetPos.y);
        
        return {
            initialVelocity: {
                x: vx,
                y: vy,
                z: vz
            },
            angle: optimalAngle,
            flightTime: flightTime,
            totalDistance: totalDistance,
            gravity: this.gravity
        };
    }

    /**
     * Calculate optimal launch angle for projectile motion
     * @param {number} horizontalDistance - Horizontal distance to target
     * @param {number} heightDifference - Height difference to target
     * @returns {number} Optimal angle in radians
     */
    calculateOptimalAngle(horizontalDistance, heightDifference) {
        // For projectile motion with gravity
        const g = Math.abs(this.gravity);
        
        // If target is at same height, use 45 degrees (optimal for max range)
        if (Math.abs(heightDifference) < 0.1) {
            return Math.PI / 4; // 45 degrees
        }
        
        // For targets at different heights, calculate optimal angle
        const angle1 = Math.atan((25 + Math.sqrt(625 - g * (g * horizontalDistance * horizontalDistance + 2 * 25 * heightDifference))) / (g * horizontalDistance));
        const angle2 = Math.atan((25 - Math.sqrt(625 - g * (g * horizontalDistance * horizontalDistance + 2 * 25 * heightDifference))) / (g * horizontalDistance));
        
        // Choose the smaller angle (lower trajectory)
        return Math.min(angle1, angle2);
    }

    /**
     * Calculate flight time for projectile
     * @param {number} initialVY - Initial vertical velocity
     * @param {number} startHeight - Starting height
     * @param {number} endHeight - Ending height
     * @returns {number} Flight time in seconds
     */
    calculateFlightTime(initialVY, startHeight, endHeight) {
        const g = Math.abs(this.gravity);
        const heightDiff = endHeight - startHeight;
        
        // Solve quadratic equation: h = h0 + v0*t + 0.5*g*t^2
        const a = -0.5 * g;
        const b = initialVY;
        const c = heightDiff;
        
        const discriminant = b * b - 4 * a * c;
        
        if (discriminant < 0) {
            // No real solution, use approximate time
            return Math.abs(2 * initialVY / g);
        }
        
        const t1 = (-b + Math.sqrt(discriminant)) / (2 * a);
        const t2 = (-b - Math.sqrt(discriminant)) / (2 * a);
        
        // Return the positive time that makes sense
        return Math.max(t1, t2);
    }

    /**
     * Simulate dart position at given time
     * @param {Object} trajectory - Trajectory data
     * @param {Object} startPos - Start position
     * @param {number} time - Time elapsed
     * @returns {Object} Position at time t
     */
    simulatePosition(trajectory, startPos, time) {
        const { initialVelocity } = trajectory;
        
        // Apply air resistance (simplified)
        const resistance = 1 - (this.airResistance * time);
        const effectiveVx = initialVelocity.x * resistance;
        const effectiveVz = initialVelocity.z * resistance;
        
        return {
            x: startPos.x + effectiveVx * time,
            y: startPos.y + initialVelocity.y * time + 0.5 * this.gravity * time * time,
            z: startPos.z + effectiveVz * time
        };
    }

    /**
     * Check if dart hits the dartboard
     * @param {Object} position - Dart position
     * @param {number} dartboardRadius - Dartboard radius
     * @returns {boolean} Whether dart hits dartboard
     */
    checkDartboardHit(position, dartboardRadius = 3) {
        // Check if dart is close to dartboard plane (z ≈ 0)
        if (Math.abs(position.z) > 0.5) {
            return false;
        }
        
        // Check if within dartboard radius
        const distanceFromCenter = Math.sqrt(position.x * position.x + position.y * position.y);
        return distanceFromCenter <= dartboardRadius;
    }

    /**
     * Calculate dart bounce/deflection off dartboard
     * @param {Object} position - Hit position
     * @param {Object} velocity - Dart velocity at impact
     * @returns {Object} Final dart position and rotation
     */
    calculateBounce(position, velocity) {
        // Simplified bounce calculation
        // In reality, darts stick to the board, but we simulate slight deflection
        
        const deflectionFactor = 0.1;
        const finalPosition = {
            x: position.x + velocity.x * deflectionFactor * (Math.random() - 0.5),
            y: position.y + velocity.y * deflectionFactor * (Math.random() - 0.5),
            z: position.z - 0.05 // Slight embedding into board
        };
        
        // Calculate final rotation based on impact angle
        const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y + velocity.z * velocity.z);
        const rotation = {
            x: (velocity.y / speed) * Math.PI * 0.1,
            y: (velocity.x / speed) * Math.PI * 0.1,
            z: Math.random() * Math.PI * 0.2 - Math.PI * 0.1
        };
        
        return {
            position: finalPosition,
            rotation: rotation
        };
    }

    /**
     * Add wind effect to dart trajectory
     * @param {Object} trajectory - Base trajectory
     * @param {Object} windVector - Wind velocity {x, y, z}
     * @returns {Object} Modified trajectory
     */
    applyWindEffect(trajectory, windVector = { x: 0, y: 0, z: 0 }) {
        const windStrength = 0.3; // How much wind affects the dart
        
        return {
            ...trajectory,
            initialVelocity: {
                x: trajectory.initialVelocity.x + windVector.x * windStrength,
                y: trajectory.initialVelocity.y + windVector.y * windStrength,
                z: trajectory.initialVelocity.z + windVector.z * windStrength
            }
        };
    }

    /**
     * Calculate dart spin effects
     * @param {Object} trajectory - Base trajectory
     * @param {Object} spin - Spin parameters {x, y, z} (rad/s)
     * @returns {Object} Modified trajectory with spin effects
     */
    applySpinEffect(trajectory, spin = { x: 0, y: 0, z: 0 }) {
        // Magnus force from spin (simplified)
        const magnusCoeff = 0.1;
        
        // Cross product of velocity and spin for Magnus force
        const v = trajectory.initialVelocity;
        const magnusForce = {
            x: magnusCoeff * (v.y * spin.z - v.z * spin.y),
            y: magnusCoeff * (v.z * spin.x - v.x * spin.z),
            z: magnusCoeff * (v.x * spin.y - v.y * spin.x)
        };
        
        return {
            ...trajectory,
            magnusForce: magnusForce,
            spin: spin
        };
    }

    /**
     * Simulate full dart flight with all effects
     * @param {Object} startPos - Start position
     * @param {Object} targetPos - Target position  
     * @param {Object} throwParams - Throw parameters
     * @returns {Array} Array of position points for animation
     */
    simulateFullFlight(startPos, targetPos, throwParams = {}) {
        const {
            power = 0.8,
            accuracy = 0.8,
            wind = { x: 0, y: 0, z: 0 },
            spin = { x: 0, y: 0, z: 0 },
            timeStep = 0.016 // 60 FPS
        } = throwParams;
        
        let trajectory = this.calculateTrajectory(startPos, targetPos, power, accuracy);
        trajectory = this.applyWindEffect(trajectory, wind);
        trajectory = this.applySpinEffect(trajectory, spin);
        
        const positions = [];
        const maxTime = trajectory.flightTime;
        
        for (let t = 0; t <= maxTime; t += timeStep) {
            let position = this.simulatePosition(trajectory, startPos, t);
            
            // Apply Magnus force if there's spin
            if (trajectory.magnusForce) {
                const magnusEffect = {
                    x: trajectory.magnusForce.x * t * t * 0.5,
                    y: trajectory.magnusForce.y * t * t * 0.5,
                    z: trajectory.magnusForce.z * t * t * 0.5
                };
                
                position.x += magnusEffect.x;
                position.y += magnusEffect.y;
                position.z += magnusEffect.z;
            }
            
            positions.push({
                ...position,
                time: t,
                velocity: {
                    x: trajectory.initialVelocity.x * (1 - this.airResistance * t),
                    y: trajectory.initialVelocity.y + this.gravity * t,
                    z: trajectory.initialVelocity.z * (1 - this.airResistance * t)
                }
            });
            
            // Check if dart hits dartboard
            if (this.checkDartboardHit(position)) {
                // Add final impact position
                const impact = this.calculateBounce(position, positions[positions.length - 1].velocity);
                positions.push({
                    ...impact.position,
                    time: t,
                    rotation: impact.rotation,
                    isImpact: true
                });
                break;
            }
        }
        
        return positions;
    }

    /**
     * Get throwing difficulty multipliers
     * @param {string} difficulty - Difficulty level
     * @returns {Object} Difficulty multipliers
     */
    getDifficultySettings(difficulty = 'medium') {
        const settings = {
            easy: {
                accuracyBonus: 0.2,
                powerStability: 0.8,
                windStrength: 0.1
            },
            medium: {
                accuracyBonus: 0.0,
                powerStability: 1.0,
                windStrength: 0.3
            },
            hard: {
                accuracyBonus: -0.1,
                powerStability: 1.2,
                windStrength: 0.5
            }
        };
        
        return settings[difficulty] || settings.medium;
    }
}
