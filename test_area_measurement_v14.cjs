const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m => m[1]).filter(s => s.trim()).join('\n');
const fn = inline.split('\n').find(line => line.startsWith('function polygonAreaSquareMeters('));
assert(fn, 'polygon area helper must exist');
const ctx = { Math, Number, Array };
vm.runInNewContext(fn, ctx);
const square = [
  { lat: 0, lng: 0 },
  { lat: 0, lng: 0.01 },
  { lat: 0.01, lng: 0.01 },
  { lat: 0.01, lng: 0 }
];
const area = ctx.polygonAreaSquareMeters(square);
assert(area > 1_200_000 && area < 1_280_000, `expected roughly 1.24 km², got ${area}`);
assert.equal(ctx.polygonAreaSquareMeters(square.slice(0, 2)), 0, 'fewer than three points cannot form an area');
for (const id of ['measureArea','finishArea','undoArea','cancelArea','areaStatus']) assert(new RegExp(`id="${id}"`).test(html), `missing ${id}`);
assert(html.includes("else if(mode==='area'){areaPoints.push(ll);refreshAreaPreview()"), 'map taps must add area points');
assert(html.includes("$('finishArea').onclick=()=>"), 'finish action must calculate and show area');
assert(html.includes("(m2/10000).toFixed(2)} ha"), 'area should show hectares');
assert(html.includes("(m2/4046.8564224).toFixed(2)} acres"), 'area should show acres');
assert(html.includes('Approximate map measurement'), 'measurement should be clearly marked approximate');
console.log('PASS: area measurement requires three points, computes spherical area, and reports m², hectares, and acres.');
