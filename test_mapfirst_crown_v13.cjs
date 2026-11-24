const fs = require('fs');
const assert = require('assert');
const html = fs.readFileSync('index.html', 'utf8');
const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
const checks = [
  ['map-first viewport shell', /main\{position:relative;display:block;flex:1;min-height:0;height:auto;padding-bottom:66px\}/],
  ['map fills the viewport', /#map\{position:absolute;inset:0;width:100%;height:100%;min-height:0;z-index:1\}/],
  ['fixed five-item bottom navigation', /class="ft-nav"[\s\S]*data-tab="map"[\s\S]*data-tab="stands"[\s\S]*data-tab="tracking"[\s\S]*data-tab="weather"[\s\S]*data-tab="land"/],
  ['map is the default active tab', /data-tab="map" aria-current="page"/],
  ['official Nova Scotia Crown Land service', /PLANCrownLandsWM84V1\/MapServer/],
  ['Crown Land toggle available from map and land panel', /id="toggleCrown"[\s\S]*id="quickCrown"[\s\S]*function toggleCrownLayer\(\)/],
  ['Crown toggle state is synchronized accessibly', /quickCrown'\)\.setAttribute\('aria-pressed',pressed\)/],
  ['official dataset attribution link', /data\.novascotia\.ca\/d\/sqec-gjbw/],
  ['device-local backup and restore controls', /id="exportData"[\s\S]*id="importData"[\s\S]*id="importFile"[\s\S]*id="dataStatus"/],
  ['backup and restore is included in Land tab', /land:\[[^\]]*'Map backup & restore'/],
  ['legacy group-sharing controls are removed', !/\b(groupName|shareNote|exportGroup|importGroup|shareStatus)\b/.test(html)],
  ['no group chat or shared trail-camera upload feature', !/group chat|shared trail.camera photo upload/i.test(html)]
];
for (const [name, test] of checks) {
  assert(test instanceof RegExp ? test.test(html) : test, name);
  console.log('PASS', name);
}
const missing = [...new Set([...html.matchAll(/\$\(['"]([^'"]+)['"]\)/g)].map(m => m[1]))].filter(id => !ids.has(id));
assert.deepStrictEqual(missing, [], `all literal $() lookups must have matching HTML elements; missing: ${missing.join(', ')}`);
console.log('PASS all literal DOM lookups resolve to existing HTML IDs');
const duplicates = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]).filter((id, i, all) => all.indexOf(id) !== i);
assert.deepStrictEqual(duplicates, [], `HTML IDs must be unique: ${duplicates.join(', ')}`);
console.log('PASS unique HTML IDs');
