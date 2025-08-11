/**
 * Color utility functions for the client
 */

/**
 * Mix two RGB colors together
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @param {number} weight - Weight of second color (0-1)
 * @returns {Object} Mixed color {r, g, b}
 */
function mixColors(color1, color2, weight = 0.5) {
    const w1 = 1 - weight;
    const w2 = weight;
    
    return {
        r: Math.round(color1.r * w1 + color2.r * w2),
        g: Math.round(color1.g * w1 + color2.g * w2),
        b: Math.round(color1.b * w1 + color2.b * w2)
    };
}

/**
 * Calculate Euclidean distance between two RGB colors
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @returns {number} Distance between colors
 */
function calculateColorDistance(color1, color2) {
    const dr = color1.r - color2.r;
    const dg = color1.g - color2.g;
    const db = color1.b - color2.b;
    
    return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {Object} HSL color {h, s, l}
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0; // achromatic
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

/**
 * Convert HSL to RGB
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {Object} RGB color {r, g, b}
 */
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;
    
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
        r = g = b = l; // achromatic
    } else {
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

/**
 * Convert RGB to hex string
 * @param {Object|number} color - RGB color object or red value
 * @param {number} g - Green value (if first param is red)
 * @param {number} b - Blue value (if first param is red)
 * @returns {string} Hex color string
 */
function rgbToHex(color, g, b) {
    let r;
    if (typeof color === 'object') {
        r = color.r;
        g = color.g;
        b = color.b;
    } else {
        r = color;
    }
    
    const componentToHex = (c) => {
        const hex = Math.round(clamp(c, 0, 255)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    
    return `#${componentToHex(r)}${componentToHex(g)}${componentToHex(b)}`;
}

/**
 * Convert hex string to RGB
 * @param {string} hex - Hex color string
 * @returns {Object|null} RGB color {r, g, b} or null if invalid
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Generate a random vibrant color
 * @returns {Object} RGB color {r, g, b}
 */
function generateRandomColor() {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 70 + Math.random() * 30; // 70-100% saturation
    const lightness = 40 + Math.random() * 20;  // 40-60% lightness
    
    return hslToRgb(hue, saturation, lightness);
}

/**
 * Check if a color is close to another within tolerance
 * @param {Object} color1 - First color {r, g, b}
 * @param {Object} color2 - Second color {r, g, b}
 * @param {number} tolerance - Maximum distance to be considered close
 * @returns {boolean} Whether colors are close
 */
function isColorClose(color1, color2, tolerance = 30) {
    return calculateColorDistance(color1, color2) <= tolerance;
}

/**
 * Get the brightness of a color
 * @param {Object} color - RGB color {r, g, b}
 * @returns {number} Brightness (0-255)
 */
function getColorBrightness(color) {
    return Math.round((color.r * 299 + color.g * 587 + color.b * 114) / 1000);
}

/**
 * Determine if white or black text would be more readable on a color
 * @param {Object} color - RGB color {r, g, b}
 * @returns {string} 'white' or 'black'
 */
function getContrastColor(color) {
    return getColorBrightness(color) > 128 ? 'black' : 'white';
}

/**
 * Lighten or darken a color
 * @param {Object} color - RGB color {r, g, b}
 * @param {number} amount - Amount to lighten (positive) or darken (negative) (-100 to 100)
 * @returns {Object} Modified color {r, g, b}
 */
function adjustColorBrightness(color, amount) {
    const factor = amount / 100;
    
    if (amount > 0) {
        // Lighten
        return {
            r: Math.round(color.r + (255 - color.r) * factor),
            g: Math.round(color.g + (255 - color.g) * factor),
            b: Math.round(color.b + (255 - color.b) * factor)
        };
    } else {
        // Darken
        return {
            r: Math.round(color.r * (1 + factor)),
            g: Math.round(color.g * (1 + factor)),
            b: Math.round(color.b * (1 + factor))
        };
    }
}

/**
 * Convert a position on color wheel to RGB color
 * @param {number} x - X coordinate
 * @param {number} z - Z coordinate
 * @param {number} radius - Wheel radius
 * @returns {Object} RGB color {r, g, b}
 */
function wheelPositionToColor(x, z, radius = 1) {
    // Calculate angle for hue (0-360 degrees)
    const angle = Math.atan2(z, x);
    const hue = ((angle * 180 / Math.PI) + 360) % 360;
    
    // Calculate distance from center for saturation
    const distance = Math.sqrt(x * x + z * z);
    const saturation = Math.min(distance / radius, 1) * 100; // Normalize to 0-100
    
    // Use high brightness for vibrant colors
    const lightness = 50;
    
    return hslToRgb(hue, saturation, lightness);
}

/**
 * Create a CSS color string from RGB values
 * @param {Object} color - RGB color {r, g, b}
 * @param {number} alpha - Alpha value (0-1), optional
 * @returns {string} CSS color string
 */
function colorToCSS(color, alpha) {
    if (alpha !== undefined) {
        return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
    }
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
}

/**
 * Apply a color to a DOM element
 * @param {HTMLElement} element - Element to apply color to
 * @param {Object} color - RGB color {r, g, b}
 * @param {string} property - CSS property ('background-color', 'color', etc.)
 */
function applyColorToElement(element, color, property = 'background-color') {
    if (element && color) {
        element.style[property] = colorToCSS(color);
    }
}

/**
 * Generate a gradient between two colors
 * @param {Object} color1 - Start color {r, g, b}
 * @param {Object} color2 - End color {r, g, b}
 * @param {number} steps - Number of steps in gradient
 * @returns {Array} Array of RGB colors
 */
function generateColorGradient(color1, color2, steps) {
    const gradient = [];
    
    for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        gradient.push(mixColors(color1, color2, t));
    }
    
    return gradient;
}
