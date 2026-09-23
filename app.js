/**
 * svg-flow - SVG Flow Animator
 * Main application module
 * @module app
 */

import { detectElements, getDetectorName } from './detectors/index.js';
import { blendColors, PATH_COLORS } from './lib/colors.js';
import { generateLottie, downloadLottie, getElementIdAtStep } from './lib/lottie.js';

// =============================================================================
// State
// =============================================================================

/** @type {string|null} Raw SVG content */
let svgContent = null;

/** @type {string|null} Base64-encoded original SVG for Lottie export */
let svgBase64Clean = null;

/** @type {Object.<string, ElementInfo>} Map of element ID to element info */
let svgElements = {};

/** @type {boolean} Whether animation preview is running */
let isAnimating = false;

/** @type {number[]} Active animation timer IDs */
let animationTimers = [];

/**
 * Animation path
 * @typedef {Object} AnimationPath
 * @property {number} id - Unique path identifier
 * @property {string} color - Hex color for this path
 * @property {string[]} elements - Element IDs in animation order
 */

/** @type {AnimationPath[]} All animation paths */
let paths = [{ id: 1, color: PATH_COLORS[0], elements: [] }];

/** @type {number} Currently selected path ID */
let activePathId = 1;

/** @type {number} Next path ID to assign */
let nextPathId = 2;

// Pan state
let isPanning = false;
let panStart = { x: 0, y: 0 };
let scrollStart = { x: 0, y: 0 };

// =============================================================================
// DOM References
// =============================================================================

const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const workspace = document.getElementById('workspace');
const svgContainer = document.getElementById('svg-container');
const svgPanel = document.getElementById('svg-panel');
const pathTabs = document.getElementById('path-tabs');
const pathList = document.getElementById('path-list');
const previewOverlay = document.getElementById('preview-overlay');
const previewBtn = document.getElementById('preview-btn');
const downloadBtn = document.getElementById('download-btn');
const stopBtn = document.getElementById('stop-btn');
const clearPathBtn = document.getElementById('clear-path');
const stepDurationInput = document.getElementById('step-duration');
const elementInfo = document.getElementById('element-info');
const fitBtn = document.getElementById('fit-btn');
const actualBtn = document.getElementById('actual-btn');

const STEP_DURATION_DEFAULT_MS = 500;
const STEP_DURATION_MIN_MS = 100;
const STEP_DURATION_MAX_MS = 3000;

/**
 * Read and clamp the step duration input's value, guarding against
 * NaN/empty/out-of-range values a user can type past the HTML min/max hints.
 * @returns {number}
 */
function getStepMs() {
    const parsed = parseInt(stepDurationInput.value, 10);
    if (Number.isNaN(parsed)) return STEP_DURATION_DEFAULT_MS;
    return Math.min(STEP_DURATION_MAX_MS, Math.max(STEP_DURATION_MIN_MS, parsed));
}

// =============================================================================
// Path Management
// =============================================================================

/**
 * Get the currently active animation path
 * @returns {AnimationPath|undefined}
 */
function getActivePath() {
    return paths.find(p => p.id === activePathId);
}

/**
 * Get the next color from the palette for a new path
 * @returns {string} Hex color
 */
function getNextColor() {
    return PATH_COLORS[(nextPathId - 1) % PATH_COLORS.length];
}

/**
 * Toggle an element's presence in the active path
 * @param {string} id - Element ID
 */
function toggleElement(id) {
    const path = getActivePath();
    if (!path) return;

    const idx = path.elements.indexOf(id);
    if (idx >= 0) {
        path.elements.splice(idx, 1);
    } else {
        path.elements.push(id);
    }
    updatePath();
}

/**
 * Remove an element from the active path by index
 * @param {number} idx - Index in the path's element array
 */
function removeFromPath(idx) {
    const path = getActivePath();
    if (path) {
        path.elements.splice(idx, 1);
        updatePath();
    }
}

/**
 * Fork a new path starting from an element in the current path
 * @param {number} idx - Index of the element to fork from
 */
function forkFromElement(idx) {
    const path = getActivePath();
    if (!path) return;

    const elementId = path.elements[idx];
    const newColor = getNextColor();

    const newPath = {
        id: nextPathId++,
        color: newColor,
        elements: [elementId]
    };
    paths.push(newPath);

    activePathId = newPath.id;
    renderPathTabs();
    updatePath();
}

/**
 * Add a new empty animation path
 */
function addNewPath() {
    const newColor = getNextColor();
    const newPath = {
        id: nextPathId++,
        color: newColor,
        elements: []
    };
    paths.push(newPath);
    activePathId = newPath.id;
    renderPathTabs();
    updatePath();
}

/**
 * Delete an animation path
 * @param {number} pathId - ID of path to delete
 */
function deletePath(pathId) {
    if (paths.length <= 1) return;

    paths = paths.filter(p => p.id !== pathId);

    if (activePathId === pathId) {
        activePathId = paths[0].id;
    }

    renderPathTabs();
    updatePath();
}

// =============================================================================
// UI Updates
// =============================================================================

/**
 * Update the path list UI and SVG highlights
 */
function updatePath() {
    const path = getActivePath();
    const elements = path ? path.elements : [];
    const pathColor = path ? path.color : '#6c63ff';

    // Update list with fork buttons
    pathList.innerHTML = '';
    elements.forEach((id, i) => {
        const li = document.createElement('li');

        const num = document.createElement('span');
        num.className = 'num';
        num.style.background = pathColor;
        num.textContent = i + 1;
        li.appendChild(num);

        const name = document.createElement('span');
        name.className = 'name';
        name.setAttribute('title', id);
        name.textContent = id;
        li.appendChild(name);

        const forkBtn = document.createElement('button');
        forkBtn.className = 'fork';
        forkBtn.title = 'Fork new path from here';
        forkBtn.textContent = 'fork';
        forkBtn.addEventListener('click', () => forkFromElement(i));
        li.appendChild(forkBtn);

        const removeBtn = document.createElement('button');
        removeBtn.className = 'remove';
        removeBtn.textContent = '×';
        removeBtn.addEventListener('click', () => removeFromPath(i));
        li.appendChild(removeBtn);

        pathList.appendChild(li);
    });

    // Clear existing highlights
    svgContainer.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
        el.style.outline = '';
    });

    // Collect all elements across all paths and their colors
    const elementColors = {};
    paths.forEach(p => {
        p.elements.forEach(id => {
            if (!elementColors[id]) elementColors[id] = [];
            elementColors[id].push(p.color);
        });
    });

    // Apply blended colors to elements
    Object.entries(elementColors).forEach(([id, colors]) => {
        const elInfo = svgElements[id];
        if (elInfo) {
            const blendedColor = blendColors(colors);
            const isInActivePath = getActivePath()?.elements.includes(id);

            elInfo.element.classList.add('selected');
            const width = isInActivePath ? '3px' : '2px';
            elInfo.element.style.outline = `${width} solid ${blendedColor}`;
            elInfo.element.style.outlineOffset = '2px';
        }
    });

    // Enable/disable buttons
    const canAnimate = paths.some(p => p.elements.length >= 2);
    previewBtn.disabled = !canAnimate;
    downloadBtn.disabled = !canAnimate;
}

/**
 * Render the path tabs UI
 */
function renderPathTabs() {
    pathTabs.innerHTML = paths.map(p => `
        <div class="path-tab ${p.id === activePathId ? 'active' : ''}" data-path-id="${p.id}">
            <span class="color-dot" style="background: ${p.color}"></span>
            <span>Path ${p.id}</span>
            ${paths.length > 1 ? `<button class="delete-path" data-path-id="${p.id}">×</button>` : ''}
        </div>
    `).join('') + `<button id="add-path-btn">+</button>`;

    // Tab click handlers
    pathTabs.querySelectorAll('.path-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-path')) return;
            activePathId = parseInt(tab.dataset.pathId);
            renderPathTabs();
            updatePath();
        });
    });

    // Delete button handlers
    pathTabs.querySelectorAll('.delete-path').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deletePath(parseInt(btn.dataset.pathId));
        });
    });

    // Add path button handler
    const addBtn = pathTabs.querySelector('#add-path-btn');
    if (addBtn) {
        addBtn.addEventListener('click', addNewPath);
    }
}

/**
 * Update the element info display
 * @param {SVGElement} [svg] - SVG element for detector detection
 */
function updateInfo(svg) {
    const count = Object.keys(svgElements).length;
    const detectorName = svg ? getDetectorName(svg) : 'unknown';
    const displayName = detectorName.charAt(0).toUpperCase() + detectorName.slice(1);

    elementInfo.innerHTML = `<strong>${displayName}</strong><br>Found <strong>${count}</strong> clickable elements`;
}

// =============================================================================
// SVG Loading
// =============================================================================

/**
 * Recursively strip script elements, event-handler attributes, and
 * javascript: URIs from a parsed SVG document before it is inserted into the DOM.
 * @param {Element} node - Root element to sanitize
 */
function sanitizeSvgNode(node) {
    for (const attr of Array.from(node.attributes || [])) {
        const name = attr.name.toLowerCase();
        if (name.startsWith('on')) {
            node.removeAttribute(attr.name);
        } else if ((name === 'href' || name === 'xlink:href') && /^\s*javascript:/i.test(attr.value)) {
            node.removeAttribute(attr.name);
        }
    }

    const children = Array.from(node.children || []);
    for (const child of children) {
        if (child.tagName && child.tagName.toLowerCase() === 'script') {
            child.remove();
            continue;
        }
        sanitizeSvgNode(child);
    }
}

/**
 * Load an SVG file and initialize the workspace
 * @param {File} file - SVG file to load
 */
function loadSVG(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        svgContent = e.target.result;
        // Store base64-encoded original before any DOM modifications
        svgBase64Clean = btoa(unescape(encodeURIComponent(svgContent)));

        const parsedDoc = new DOMParser().parseFromString(svgContent, 'image/svg+xml');
        if (parsedDoc.querySelector('parsererror')) {
            console.error('Failed to parse SVG file: invalid XML');
            alert('Failed to load SVG file. The file appears to be invalid.');
            return;
        }

        const parsedRoot = parsedDoc.documentElement;
        sanitizeSvgNode(parsedRoot);
        svgContainer.replaceChildren(parsedRoot);

        const svg = svgContainer.querySelector('svg');

        // Wait for render to get accurate bounding boxes
        requestAnimationFrame(() => {
            const svgRect = svg.getBoundingClientRect();

            // Use detector plugin system
            svgElements = detectElements(svg, svgRect);

            // Setup click handlers
            Object.values(svgElements).forEach(elInfo => {
                elInfo.element.style.cursor = 'pointer';
                elInfo.element.addEventListener('click', (e) => {
                    if (isAnimating) return;
                    e.stopPropagation();
                    toggleElement(elInfo.id);
                });
            });

            updateInfo(svg);
        });

        // Show workspace
        dropzone.style.display = 'none';
        workspace.classList.add('active');

        // Reset paths
        paths = [{ id: 1, color: PATH_COLORS[0], elements: [] }];
        activePathId = 1;
        nextPathId = 2;
        renderPathTabs();
        updatePath();
    };
    reader.readAsText(file);
}

// =============================================================================
// Preview Animation
// =============================================================================

/**
 * Start the animation preview
 */
function startPreview() {
    const animatablePaths = paths.filter(p => p.elements.length >= 1);
    if (animatablePaths.length === 0) return;

    isAnimating = true;
    svgPanel.classList.add('previewing');
    previewOverlay.classList.add('active');

    // Clear selected highlights
    svgContainer.querySelectorAll('.selected').forEach(el => {
        el.classList.remove('selected');
        el.style.outline = '';
    });

    const stepMs = getStepMs();
    let step = 0;

    function animateStep() {
        // Clear previous highlights
        svgContainer.querySelectorAll('.animated-highlight').forEach(el => {
            el.classList.remove('animated-highlight');
            el.style.outline = '';
        });

        // Collect currently active elements and their colors
        const activeElements = {};
        animatablePaths.forEach(path => {
            const elementId = getElementIdAtStep(path.elements, step);
            if (elementId === undefined) return;
            if (!activeElements[elementId]) activeElements[elementId] = [];
            activeElements[elementId].push(path.color);
        });

        // Apply blended highlights
        Object.entries(activeElements).forEach(([id, colors]) => {
            const elInfo = svgElements[id];
            if (elInfo) {
                const blendedColor = blendColors(colors);
                elInfo.element.classList.add('animated-highlight');
                elInfo.element.style.outline = `4px solid ${blendedColor}`;
                elInfo.element.style.outlineOffset = '3px';
            }
        });

        // Advance to next step
        step++;

        if (isAnimating) {
            const timer = setTimeout(animateStep, stepMs);
            animationTimers.push(timer);
        }
    }

    animateStep();
}

/**
 * Stop the animation preview
 */
function stopPreview() {
    isAnimating = false;

    animationTimers.forEach(timer => clearTimeout(timer));
    animationTimers = [];

    svgPanel.classList.remove('previewing');
    previewOverlay.classList.remove('active');

    svgContainer.querySelectorAll('.animated-highlight').forEach(el => {
        el.classList.remove('animated-highlight');
        el.style.outline = '';
    });
    updatePath();
}

// =============================================================================
// Lottie Export
// =============================================================================

/**
 * Get SVG viewBox dimensions
 * @param {SVGElement} svg - SVG element
 * @returns {{width: number, height: number}}
 */
function getSvgDimensions(svg) {
    let width = 800, height = 600;
    const viewBox = svg.getAttribute('viewBox');
    if (viewBox) {
        const parts = viewBox.split(/[\s,]+/);
        width = parseFloat(parts[2]) || 800;
        height = parseFloat(parts[3]) || 600;
    } else {
        width = parseFloat(svg.getAttribute('width')) || 800;
        height = parseFloat(svg.getAttribute('height')) || 600;
    }
    return { width, height };
}

/**
 * Handle Lottie download
 */
async function handleDownload() {
    const svg = svgContainer.querySelector('svg');
    const { width, height } = getSvgDimensions(svg);

    downloadBtn.disabled = true;
    downloadBtn.textContent = 'Converting...';

    try {
        const lottieData = await generateLottie({
            stepMs: getStepMs(),
            fps: 30,
            width,
            height,
            svgBase64: svgBase64Clean,
            paths,
            elements: svgElements
        });

        downloadLottie(lottieData);
    } catch (err) {
        console.error('Lottie generation failed:', err);
        alert('Failed to generate Lottie file. See console for details.');
    } finally {
        downloadBtn.disabled = false;
        downloadBtn.textContent = 'Download Lottie';
    }
}

// =============================================================================
// Event Handlers
// =============================================================================

// File handling
dropzone.addEventListener('click', () => fileInput.click());
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});
dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.svg')) loadSVG(file);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) loadSVG(e.target.files[0]);
});

// View toggle
fitBtn.addEventListener('click', () => {
    svgContainer.classList.remove('actual-size');
    svgContainer.classList.add('fit-view');
    fitBtn.classList.add('active');
    actualBtn.classList.remove('active');
});
actualBtn.addEventListener('click', () => {
    svgContainer.classList.remove('fit-view');
    svgContainer.classList.add('actual-size');
    actualBtn.classList.add('active');
    fitBtn.classList.remove('active');
});

// Pan functionality
svgContainer.addEventListener('mousedown', (e) => {
    if (e.button === 1 || (e.button === 0 && !e.target.closest('[data-svgflow-id]'))) {
        isPanning = true;
        svgContainer.classList.add('panning');
        panStart = { x: e.clientX, y: e.clientY };
        scrollStart = { x: svgContainer.scrollLeft, y: svgContainer.scrollTop };
        e.preventDefault();
    }
});
document.addEventListener('mousemove', (e) => {
    if (!isPanning) return;
    svgContainer.scrollLeft = scrollStart.x - (e.clientX - panStart.x);
    svgContainer.scrollTop = scrollStart.y - (e.clientY - panStart.y);
});
document.addEventListener('mouseup', () => {
    isPanning = false;
    svgContainer.classList.remove('panning');
});

// Path controls
clearPathBtn.addEventListener('click', () => {
    const path = getActivePath();
    if (path) {
        path.elements = [];
        updatePath();
    }
});

// Preview controls
previewBtn.addEventListener('click', startPreview);
stopBtn.addEventListener('click', stopPreview);

// Download
downloadBtn.addEventListener('click', handleDownload);
