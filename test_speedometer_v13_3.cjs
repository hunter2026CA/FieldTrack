const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const checks = [
  ['live speed display', /id="gpsSpeed"/.test(html)],
  ['maximum speed display', /id="gpsMaxSpeed"/.test(html)],
  ['average speed display', /id="gpsAvgSpeed"/.test(html)],
  ['km\/h and mph selector', /option value="kmh"/.test(html) && /option value="mph"/.test(html)],
  ['unit preference persistence', /fieldtrack-speed-unit/.test(html)],
  ['GPS speed preferred with distance-time fallback', /pos\.coords\.speed/.test(html) && /gpsDistanceMeters\(previous,point\)\/elapsed/.test(html)],
  ['maximum speed checkpoint persistence', /maxSpeedMps:Number\.isFinite\(maxSpeedMps\)/.test(html)],
  ['ATV and boat speed ceiling', /calculatedSpeed>80/.test(html) && /reportedSpeed<=80/.test(html)],
  ['speed refresh on accepted GPS fixes', /updateGpsMetrics\(accuracy\)/.test(html)],
  ['unique HTML IDs', (() => { const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]); return ids.length===new Set(ids).size; })()]
];
for (const [name, ok] of checks) { if (!ok) throw new Error(`FAIL: ${name}`); console.log(`PASS ${name}`); }
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(s=>s.trim());
fs.writeFileSync('/tmp/fieldtrack-inline-check.js', scripts.join('\n'));
