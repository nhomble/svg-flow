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
    // Excalidraw uses stroke-linecap="round" on shape groups, but other tools
    // use the same attribute for styling; a single match is too common to be
    // reliable, so require multiple occurrences (typical of real exports).
    return svg.querySelectorAll('g[stroke-linecap="round"]').length >= 2;
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

      const rect = el.getBoundingClientRect();

      // Skip if too small
      if (rect.width < 15 || rect.height < 15) return;

      const id = el.id || ctx.nextShapeId();
      ctx.claimId(id);

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

      // Skip nested groups already covered by an ancestor arrow container,
      // otherwise one visual arrow gets counted as multiple elements.
      if (el.parentElement && el.parentElement.closest('g[stroke-linecap="round"]:not([transform])')) return;

      const rect = el.getBoundingClientRect();
      if (rect.width < 5 || rect.height < 5) return;

      const id = el.id || ctx.nextArrowId();
      ctx.claimId(id);

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
