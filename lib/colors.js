/**
 * Color manipulation utilities for svg-flow
 * @module lib/colors
 */

/**
 * RGB color representation
 * @typedef {Object} RGB
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

/**
 * Lottie color array [r, g, b, a] with values 0-1
 * @typedef {[number, number, number, number]} LottieColor
 */

/**
 * Parse a hex color string to RGB components
 * @param {string} hex - Hex color string (e.g., "#ff6b6b")
 * @returns {RGB} RGB color object
 * @example
 * hexToRgb("#ff6b6b") // => { r: 255, g: 107, b: 107 }
 */
export function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

/**
 * Convert RGB components to hex color string
 * @param {number} r - Red component (0-255)
 * @param {number} g - Green component (0-255)
 * @param {number} b - Blue component (0-255)
 * @returns {string} Hex color string (e.g., "#ff6b6b")
 * @example
 * rgbToHex(255, 107, 107) // => "#ff6b6b"
 */
export function rgbToHex(r, g, b) {
    return '#' + [r, g, b]
        .map(x => Math.round(x).toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Blend multiple colors by averaging their RGB values
 * Used when multiple animation paths highlight the same element
 * @param {string[]} colors - Array of hex color strings
 * @returns {string} Blended hex color string
 * @example
 * blendColors(["#ff0000", "#0000ff"]) // => "#800080" (purple)
 */
export function blendColors(colors) {
    if (colors.length === 0) return '#ffffff';
    if (colors.length === 1) return colors[0];

    const rgbs = colors.map(hexToRgb);
    const avg = {
        r: rgbs.reduce((sum, c) => sum + c.r, 0) / rgbs.length,
        g: rgbs.reduce((sum, c) => sum + c.g, 0) / rgbs.length,
        b: rgbs.reduce((sum, c) => sum + c.b, 0) / rgbs.length
    };
    return rgbToHex(avg.r, avg.g, avg.b);
}

/**
 * Convert hex color to Lottie RGBA array format
 * Lottie uses 0-1 range for color values
 * @param {string} hex - Hex color string (e.g., "#ff6b6b")
 * @returns {LottieColor} Array [r, g, b, a] with values 0-1
 * @example
 * hexToLottieColor("#ff6b6b") // => [1, 0.42, 0.42, 1]
 */
export function hexToLottieColor(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b, 1];
}

/**
 * Default color palette for animation paths
 * Each path gets a distinct color from this palette
 * @type {string[]}
 */
export const PATH_COLORS = [
    "#ff6b6b",  // red
    "#4ecdc4",  // teal
    "#ffe66d",  // yellow
    "#95e1d3",  // mint
    "#f38181",  // coral
    "#aa96da",  // purple
    "#fcbad3",  // pink
    "#a8d8ea"   // light blue
];
