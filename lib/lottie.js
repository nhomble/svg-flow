/**
 * Lottie animation generation utilities for svg-flow
 * @module lib/lottie
 */

import { hexToLottieColor, blendColors } from './colors.js';

/**
 * Element position and dimensions in viewBox coordinates
 * @typedef {Object} ElementBounds
 * @property {string} id - Element identifier
 * @property {number} cx - Center X coordinate
 * @property {number} cy - Center Y coordinate
 * @property {number} width - Element width
 * @property {number} height - Element height
 */

/**
 * Animation path configuration
 * @typedef {Object} AnimationPath
 * @property {number} id - Path identifier
 * @property {string} color - Hex color for this path
 * @property {string[]} elements - Array of element IDs in animation order
 */

/**
 * Configuration for Lottie generation
 * @typedef {Object} LottieConfig
 * @property {number} stepMs - Duration of each step in milliseconds
 * @property {number} fps - Frames per second (default: 30)
 * @property {number} width - Canvas width in pixels
 * @property {number} height - Canvas height in pixels
 * @property {string} svgBase64 - Base64-encoded SVG for background
 * @property {AnimationPath[]} paths - Animation paths to render
 * @property {Object.<string, ElementBounds>} elements - Map of element ID to bounds
 */

/**
 * Lottie animation JSON structure
 * @typedef {Object} LottieAnimation
 * @property {string} v - Lottie version
 * @property {number} fr - Frame rate
 * @property {number} ip - In point (start frame)
 * @property {number} op - Out point (end frame)
 * @property {number} w - Width
 * @property {number} h - Height
 * @property {string} nm - Name
 * @property {number} ddd - 3D flag
 * @property {Array} assets - Asset definitions
 * @property {Array} layers - Layer definitions
 */

/**
 * Generate Lottie shape layers for a highlight effect
 * Creates a rounded rectangle stroke around an element
 * @param {number} w - Element width
 * @param {number} h - Element height
 * @param {string} colorHex - Highlight color in hex format
 * @returns {Array} Lottie shape group array
 */
export function generateHighlightShapes(w, h, colorHex) {
    const color = hexToLottieColor(colorHex);
    const padding = 8;
    const radius = Math.min(w, h) / 4;

    return [{
        ty: "gr",
        it: [
            {
                ty: "rc",
                d: 1,
                s: { a: 0, k: [w + padding, h + padding] },
                p: { a: 0, k: [0, 0] },
                r: { a: 0, k: radius }
            },
            {
                ty: "st",
                c: { a: 0, k: color },
                o: { a: 0, k: 100 },
                w: { a: 0, k: 3 },
                lc: 2,
                lj: 2
            },
            {
                ty: "tr",
                p: { a: 0, k: [0, 0] },
                a: { a: 0, k: [0, 0] },
                s: { a: 0, k: [100, 100] },
                r: { a: 0, k: 0 },
                o: { a: 0, k: 100 }
            }
        ],
        nm: "Highlight"
    }];
}

/**
 * Generate opacity keyframes for a highlight layer
 * Handles fade in, hold, and fade out timing
 * @param {number} startFrame - Frame when highlight should appear
 * @param {number} endFrame - Frame when highlight should disappear
 * @param {number} totalFrames - Total animation duration in frames
 * @param {number} [fadeFrames=3] - Number of frames for fade transitions
 * @returns {Array} Lottie opacity keyframe array
 */
export function generateOpacityKeyframes(startFrame, endFrame, totalFrames, fadeFrames = 3) {
    const ease = { i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } };
    const keyframes = [];

    if (startFrame === 0) {
        // First step: start visible immediately
        keyframes.push({ t: 0, s: [100], ...ease });
    } else {
        // Later steps: start hidden, fade in
        keyframes.push({ t: 0, s: [0], ...ease });
        keyframes.push({ t: startFrame - fadeFrames, s: [0], ...ease });
        keyframes.push({ t: startFrame, s: [100], ...ease });
    }

    // Hold at 100, then fade out
    keyframes.push({ t: endFrame - fadeFrames, s: [100], ...ease });
    keyframes.push({ t: endFrame, s: [0], ...ease });

    // Stay at 0 until end
    if (endFrame < totalFrames) {
        keyframes.push({ t: totalFrames, s: [0] });
    }

    return keyframes;
}

/**
 * Create a Lottie highlight layer for an element at a specific animation step
 * @param {ElementBounds} element - Element position and dimensions
 * @param {number} step - Animation step index
 * @param {string} color - Highlight color in hex format
 * @param {number} framesPerStep - Number of frames per animation step
 * @param {number} totalFrames - Total animation duration in frames
 * @param {number} layerIndex - Layer index for z-ordering
 * @returns {Object} Lottie layer object
 */
export function createHighlightLayer(element, step, color, framesPerStep, totalFrames, layerIndex) {
    const startFrame = step * framesPerStep;
    const endFrame = (step + 1) * framesPerStep;

    return {
        ddd: 0,
        ind: layerIndex,
        ty: 4,
        nm: `${element.id} (step ${step + 1})`,
        sr: 1,
        ks: {
            o: { a: 1, k: generateOpacityKeyframes(startFrame, endFrame, totalFrames, Math.min(3, Math.floor(framesPerStep / 2))) },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [element.cx, element.cy, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        shapes: generateHighlightShapes(element.width, element.height, color),
        ip: 0,
        op: totalFrames,
        st: 0,
        bm: 0
    };
}

/**
 * Create the SVG background image layer for Lottie
 * @param {number} totalFrames - Total animation duration in frames
 * @returns {Object} Lottie image layer object
 */
export function createBackgroundLayer(totalFrames) {
    return {
        ddd: 0,
        ind: 1,
        ty: 2,
        nm: "SVG Background",
        refId: "svg_bg",
        sr: 1,
        ks: {
            o: { a: 0, k: 100 },
            r: { a: 0, k: 0 },
            p: { a: 0, k: [0, 0, 0] },
            a: { a: 0, k: [0, 0, 0] },
            s: { a: 0, k: [100, 100, 100] }
        },
        ao: 0,
        ip: 0,
        op: totalFrames,
        st: 0,
        bm: 0
    };
}

/**
 * Resolve the element id that is active for a given path at a given step,
 * looping (wrapping) through the path's elements so shorter paths cycle
 * instead of going dark once they run out of elements.
 * @param {string[]} elements - Ordered list of element ids for a path
 * @param {number} step - The current step index (0-based)
 * @returns {string|undefined} The active element id, or undefined if elements is empty
 */
export function getElementIdAtStep(elements, step) {
    if (!elements || elements.length === 0) return undefined;
    return elements[step % elements.length];
}

/**
 * Generate a complete Lottie animation from configuration
 * Supports multiple parallel paths with color blending for overlapping elements
 * @param {LottieConfig} config - Animation configuration
 * @returns {Promise<LottieAnimation>} Complete Lottie JSON structure
 */
export async function generateLottie(config) {
    const {
        stepMs,
        fps = 30,
        width,
        height,
        svgBase64,
        paths,
        elements
    } = config;

    const framesPerStep = Math.round((stepMs / 1000) * fps);
    const animatablePaths = paths.filter(p => p.elements.length >= 1);
    const maxElements = Math.max(...animatablePaths.map(p => p.elements.length));
    const totalFrames = framesPerStep * maxElements;

    // Build a map of (step, elementId) -> [colors] for blending
    const stepElementColors = {};

    for (let step = 0; step < maxElements; step++) {
        animatablePaths.forEach(path => {
            const elementId = getElementIdAtStep(path.elements, step);
            if (elementId !== undefined) {
                const key = `${step}:${elementId}`;
                if (!stepElementColors[key]) {
                    stepElementColors[key] = { step, elementId, colors: [] };
                }
                stepElementColors[key].colors.push(path.color);
            }
        });
    }

    // Create highlight layers with blended colors
    const highlightLayers = [];
    let layerIndex = 2;

    Object.values(stepElementColors).forEach(({ step, elementId, colors }) => {
        const el = elements[elementId];
        if (!el) return;

        const blendedColor = blendColors(colors);
        highlightLayers.push(
            createHighlightLayer(el, step, blendedColor, framesPerStep, totalFrames, layerIndex++)
        );
    });

    // Assemble layers (highlights on top, background at bottom)
    const layers = [...highlightLayers, createBackgroundLayer(totalFrames)];

    // Convert SVG to PNG to avoid tainted canvas issues in GIF converters
    const pngBase64 = await svgToPngBase64(svgBase64, Math.round(width), Math.round(height));

    return {
        v: "5.7.0",
        fr: fps,
        ip: 0,
        op: totalFrames,
        w: Math.round(width),
        h: Math.round(height),
        nm: "svg-flow animation",
        ddd: 0,
        assets: [{
            id: "svg_bg",
            w: Math.round(width),
            h: Math.round(height),
            u: "",
            p: `data:image/png;base64,${pngBase64}`,
            e: 1
        }],
        layers
    };
}

/**
 * Convert an SVG string to a PNG base64 data URI
 * This avoids "tainted canvas" errors when converting Lottie to GIF
 * @param {string} svgBase64 - Base64-encoded SVG
 * @param {number} width - Output width
 * @param {number} height - Output height
 * @returns {Promise<string>} Base64-encoded PNG (without data URI prefix)
 */
export function svgToPngBase64(svgBase64, width, height) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        img.onload = () => {
            // try/catch needed: the Promise executor's implicit catch doesn't
            // cover this async callback, so errors here must be reject()ed manually
            try {
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const pngDataUrl = canvas.toDataURL('image/png');
                // Remove the "data:image/png;base64," prefix
                const base64 = pngDataUrl.split(',')[1];
                resolve(base64);
            } catch (err) {
                reject(err);
            }
        };

        img.onerror = () => reject(new Error('Failed to load SVG for PNG conversion'));
        img.src = `data:image/svg+xml;base64,${svgBase64}`;
    });
}

/**
 * Download a Lottie animation as a JSON file
 * @param {LottieAnimation} lottieData - Lottie animation object
 * @param {string} [filename="animation.json"] - Download filename
 */
export function downloadLottie(lottieData, filename = "animation.json") {
    const blob = new Blob([JSON.stringify(lottieData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
