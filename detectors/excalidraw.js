/**
 * Excalidraw SVG Detector
 * Handles SVGs exported from Excalidraw
 */

export default {
  name: 'excalidraw',
  priority: 5,

  /**
   * Check if this SVG appears to be Excalidraw output
   */
  canHandle(svg) {
    // Excalidraw uses stroke-linecap="round" on shape groups
    return svg.querySelector('g[stroke-linecap="round"]') !== null;
  },

  /**
   * Detect all animatable elements in an Excalidraw SVG
   */
  detect(svg, ctx) {
    const elements = [];

    // === SHAPES ===
    // Excalidraw shapes: <g stroke-linecap="round" transform="...">
    // The transform attribute indicates a positioned shape (not an arrow container)
    svg.querySelectorAll('g[stroke-linecap="round"][transform]').forEach(el => {
      if (ctx.isInDefs(el)) return;
      if (el.dataset.svgflowId) return; // Already processed

      const rect = el.getBoundingClientRect();

      // Skip if too small
      if (rect.width < 15 || rect.height < 15) return;

      const id = el.id || ctx.nextShapeId();

      elements.push({
        id,
        element: el,
        bounds: ctx.toViewBox(rect),
        type: 'shape'
      });
    });

    // === ARROWS ===
    // Excalidraw arrows: <g stroke-linecap="round"> without transform
    // These are container groups that hold nested path groups
    svg.querySelectorAll('g[stroke-linecap="round"]:not([transform])').forEach(el => {
      if (ctx.isInDefs(el)) return;
      if (el.dataset.svgflowId) return; // Already processed

      const rect = el.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) return;

      const id = el.id || ctx.nextArrowId();

      elements.push({
        id,
        element: el,
        bounds: ctx.toViewBox(rect),
        type: 'arrow'
      });
    });

    return elements;
  }
};
