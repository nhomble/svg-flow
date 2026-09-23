import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
    generateHighlightShapes,
    generateOpacityKeyframes,
    createHighlightLayer,
    createBackgroundLayer,
    getElementIdAtStep
} from '../lib/lottie.js';

test('getElementIdAtStep returns the first element at step 0', () => {
    assert.equal(getElementIdAtStep(['a', 'b', 'c'], 0), 'a');
});

test('getElementIdAtStep wraps around for a path shorter than the step count', () => {
    const elements = ['a', 'b'];
    assert.equal(getElementIdAtStep(elements, 2), 'a');
    assert.equal(getElementIdAtStep(elements, 3), 'b');
    assert.equal(getElementIdAtStep(elements, 4), 'a');
});

test('getElementIdAtStep always returns the same element for a single-element path', () => {
    const elements = ['only'];
    assert.equal(getElementIdAtStep(elements, 0), 'only');
    assert.equal(getElementIdAtStep(elements, 5), 'only');
});

test('getElementIdAtStep returns undefined for an empty path', () => {
    assert.equal(getElementIdAtStep([], 0), undefined);
});

test('generateHighlightShapes sizes the rect with padding and returns a stroke group', () => {
    const [group] = generateHighlightShapes(100, 50, '#ff0000');
    const rect = group.it.find(i => i.ty === 'rc');
    const stroke = group.it.find(i => i.ty === 'st');
    assert.deepEqual(rect.s.k, [108, 58]);
    assert.deepEqual(stroke.c.k, [1, 0, 0, 1]);
});

test('generateOpacityKeyframes starts visible immediately at frame 0', () => {
    const kfs = generateOpacityKeyframes(0, 10, 30);
    assert.equal(kfs[0].t, 0);
    assert.deepEqual(kfs[0].s, [100]);
});

test('generateOpacityKeyframes fades in for later steps', () => {
    const kfs = generateOpacityKeyframes(10, 20, 30);
    assert.deepEqual(kfs[0].s, [0]);
    const fadeIn = kfs.find(k => k.t === 10);
    assert.deepEqual(fadeIn.s, [100]);
});

test('generateOpacityKeyframes holds at 0 after fade out when before totalFrames', () => {
    const kfs = generateOpacityKeyframes(0, 10, 30);
    const last = kfs[kfs.length - 1];
    assert.equal(last.t, 30);
    assert.deepEqual(last.s, [0]);
});

test('createHighlightLayer names the layer with 1-indexed step', () => {
    const element = { id: 'node-a', cx: 5, cy: 5, width: 10, height: 10 };
    const layer = createHighlightLayer(element, 0, '#00ff00', 15, 30, 2);
    assert.equal(layer.nm, 'node-a (step 1)');
    assert.equal(layer.ind, 2);
    assert.equal(layer.op, 30);
});

test('createBackgroundLayer references the svg background asset', () => {
    const layer = createBackgroundLayer(30);
    assert.equal(layer.refId, 'svg_bg');
    assert.equal(layer.op, 30);
});
