import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToRgb, rgbToHex, blendColors, hexToLottieColor } from '../lib/colors.js';

test('hexToRgb parses hex components', () => {
    assert.deepEqual(hexToRgb('#ff6b6b'), { r: 255, g: 107, b: 107 });
    assert.deepEqual(hexToRgb('#000000'), { r: 0, g: 0, b: 0 });
});

test('rgbToHex formats and pads components', () => {
    assert.equal(rgbToHex(255, 107, 107), '#ff6b6b');
    assert.equal(rgbToHex(0, 0, 0), '#000000');
    assert.equal(rgbToHex(1, 2, 3), '#010203');
});

test('rgbToHex rounds fractional components', () => {
    assert.equal(rgbToHex(254.6, 0, 0), '#ff0000');
});

test('blendColors returns white for empty input', () => {
    assert.equal(blendColors([]), '#ffffff');
});

test('blendColors returns the single color unchanged', () => {
    assert.equal(blendColors(['#ff6b6b']), '#ff6b6b');
});

test('blendColors averages multiple colors', () => {
    assert.equal(blendColors(['#ff0000', '#0000ff']), '#800080');
});

test('hexToLottieColor normalizes to 0-1 range with alpha 1', () => {
    assert.deepEqual(hexToLottieColor('#ffffff'), [1, 1, 1, 1]);
    assert.deepEqual(hexToLottieColor('#000000'), [0, 0, 0, 1]);
});
