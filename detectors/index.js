/**
 * SVG Detector Registry
 *
 * Strategy Pattern implementation for SVG element detection.
 * Each detector implements the same interface and handles a specific SVG origin.
 *
 * Interface:
 * {
 *   name: string,           - Detector name for logging
 *   priority: number,       - Higher = checked first
 *   canHandle(svg): bool,   - Returns true if this detector should handle the SVG
 *   detect(svg, ctx): []    - Returns array of DetectedElement
 * }
 *
 * DetectedElement:
 * {
 *   id: string,             - Unique identifier for the element
 *   element: Element,       - DOM element reference
 *   bounds: { x, y, width, height },  - Position in viewBox coordinates
 *   type?: string           - Optional: 'node', 'edge', 'shape', 'arrow'
 * }
 */

import mermaidDetector from './mermaid.js';
import excalidrawDetector from './excalidraw.js';
import genericDetector from './generic.js';

// Registry of all available detectors
const registry = [
  mermaidDetector,
  excalidrawDetector,
  genericDetector
];

/**
 * Parse SVG viewBox attribute
 */
function parseViewBox(svg, svgRect) {
  let vbX = 0, vbY = 0, vbW = svgRect.width, vbH = svgRect.height;

  const viewBox = svg.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/[\s,]+/);
    vbX = parseFloat(parts[0]) || 0;
    vbY = parseFloat(parts[1]) || 0;
    vbW = parseFloat(parts[2]) || svgRect.width;
    vbH = parseFloat(parts[3]) || svgRect.height;
  }

  return {
    x: vbX,
    y: vbY,
    width: vbW,
    height: vbH,
    scaleX: vbW / svgRect.width,
    scaleY: vbH / svgRect.height
  };
}

/**
 * Create detection context with helper methods
 */
function createContext(svg, svgRect) {
  const viewBox = parseViewBox(svg, svgRect);
  let shapeIdx = 0;
  let arrowIdx = 0;

  return {
    svgRect,
    viewBox,

    /**
     * Convert screen coordinates to viewBox coordinates
     */
    toViewBox(rect) {
      return {
        x: (rect.left - svgRect.left) * viewBox.scaleX,
        y: (rect.top - svgRect.top) * viewBox.scaleY,
        width: rect.width * viewBox.scaleX,
        height: rect.height * viewBox.scaleY
      };
    },

    /**
     * Generate unique shape ID
     */
    nextShapeId() {
      return `shape-${++shapeIdx}`;
    },

    /**
     * Generate unique arrow ID
     */
    nextArrowId() {
      return `arrow-${++arrowIdx}`;
    },

    /**
     * Check if element is inside defs or mask (should be skipped)
     */
    isInDefs(el) {
      return el.closest('defs') !== null || el.closest('mask') !== null;
    }
  };
}

/**
 * Normalize detected elements into svgElements map format
 */
function normalizeElements(elements) {
  const result = {};

  elements.forEach(el => {
    // Mark element with data attribute
    el.element.dataset.svgflowId = el.id;

    // Ensure element has an ID for CSS targeting
    if (!el.element.id) {
      el.element.id = el.id;
    }

    // Build normalized element info
    result[el.id] = {
      id: el.id,
      x: el.bounds.x,
      y: el.bounds.y,
      width: el.bounds.width,
      height: el.bounds.height,
      cx: el.bounds.x + el.bounds.width / 2,
      cy: el.bounds.y + el.bounds.height / 2,
      element: el.element,
      type: el.type || 'shape'
    };
  });

  return result;
}

/**
 * Main detection function
 * Finds the appropriate detector and runs element detection
 *
 * @param {SVGElement} svg - The SVG element to analyze
 * @param {DOMRect} svgRect - Bounding rect of the SVG
 * @returns {Object} Map of element ID -> element info
 */
export function detectElements(svg, svgRect) {
  // Create context with helpers
  const ctx = createContext(svg, svgRect);

  // Sort detectors by priority (highest first)
  const sorted = [...registry].sort((a, b) => b.priority - a.priority);

  // Find first detector that can handle this SVG
  const detector = sorted.find(d => d.canHandle(svg));

  if (!detector) {
    console.warn('[svg-flow] No detector found for SVG');
    return {};
  }

  console.log(`[svg-flow] Using ${detector.name} detector`);

  // Run detection
  const elements = detector.detect(svg, ctx);

  console.log(`[svg-flow] Detected ${elements.length} elements`);

  // Normalize and return
  return normalizeElements(elements);
}

/**
 * Get the name of the detector that would handle this SVG
 * Useful for UI display
 */
export function getDetectorName(svg) {
  const sorted = [...registry].sort((a, b) => b.priority - a.priority);
  const detector = sorted.find(d => d.canHandle(svg));
  return detector ? detector.name : 'unknown';
}

/**
 * Register a new detector
 * Use this to add custom detectors at runtime
 */
export function registerDetector(detector) {
  if (!detector.name || !detector.canHandle || !detector.detect) {
    throw new Error('Detector must have name, canHandle, and detect properties');
  }
  if (typeof detector.priority !== 'number') {
    detector.priority = 1; // Default priority
  }
  registry.push(detector);
  console.log(`[svg-flow] Registered detector: ${detector.name}`);
}
