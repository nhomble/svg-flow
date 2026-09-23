/**
 * Generic SVG Detector
 * Fallback detector for standard SVG shapes
 * Handles any SVG with basic shapes (rect, circle, ellipse, polygon)
 */

export default {
  name: 'generic',
  priority: 0, // Lowest priority - fallback

  /**
   * Always returns true - this is the fallback detector
   */
  canHandle() {
    return true;
  },

  /**
   * Detect basic SVG shapes
   */
  detect(svg, ctx) {
    const elements = [];
    const svgRect = ctx.svgRect;
    const svgWidth = svgRect.width;
    const svgHeight = svgRect.height;

    // Find all basic shapes
    svg.querySelectorAll('rect, circle, ellipse, polygon').forEach(el => {
      if (ctx.isInDefs(el)) return;

      const rect = el.getBoundingClientRect();

      // Skip background rectangles (cover >90% of SVG)
      if (el.tagName === 'rect') {
        const coversWidth = rect.width > svgWidth * 0.9;
        const coversHeight = rect.height > svgHeight * 0.9;
        if (coversWidth && coversHeight) return;
      }

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

    return elements;
  }
};
