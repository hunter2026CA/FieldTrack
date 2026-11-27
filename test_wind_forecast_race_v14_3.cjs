const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const html = fs.readFileSync('index.html', 'utf8');
const inline = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim()).join('\n');
const loader = inline.match(/async function loadWindForecast\(lat,lon\)\{[\s\S]*?\n(?=\$\('showWindForecast'\)\.onclick)/);
assert(loader, 'seven-day forecast loader must exist');

const elements = {
  windForecastStatus: { textContent: '' },
  windForecastList: { innerHTML: '' }
};
const pending = [];
const context = {
  windForecastRequest: 0,
  $: id => elements[id],
  fetch: url => new Promise((resolve, reject) => pending.push({ url, resolve, reject })),
  Date, Number, Math,
  nice: value => Number(value).toFixed(1),
  formatBearing: value => String(Math.round(Number(value)) % 360).padStart(3, '0'),
  cardinal16: () => 'N',
  esc: value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]))
};
vm.runInNewContext(loader[0], context);

function response(speed) {
  const dates = Array.from({ length: 7 }, (_, index) => `2026-12-${String(index + 1).padStart(2, '0')}`);
  return {
    ok: true,
    json: async () => ({ daily: {
      time: dates,
      wind_speed_10m_max: dates.map(() => speed),
      wind_direction_10m_dominant: dates.map(() => 0),
      wind_gusts_10m_max: dates.map(() => speed + 5)
    } })
  };
}

(async () => {
  // A newer map-point request must win even if an older request resolves later.
  const oldRequest = context.loadWindForecast(44, -65);
  const newRequest = context.loadWindForecast(45, -66);
  assert.equal(pending.length, 2);
  assert(pending[1].url.includes('latitude=45&longitude=-66'), 'latest request must use the latest selected point');
  pending[1].resolve(response(32));
  await newRequest;
  const latestMarkup = elements.windForecastList.innerHTML;
  const latestStatus = elements.windForecastStatus.textContent;
  assert(latestMarkup.includes('32.0 km/h'));

  pending[0].resolve(response(8));
  await oldRequest;
  assert.equal(elements.windForecastList.innerHTML, latestMarkup, 'late older response must not replace the current forecast');
  assert.equal(elements.windForecastStatus.textContent, latestStatus, 'late older response must not replace current status');

  // A stale failed request must not overwrite the successful current result.
  const staleFailure = context.loadWindForecast(46, -67);
  const currentRequest = context.loadWindForecast(47, -68);
  pending[3].resolve(response(41));
  await currentRequest;
  const currentMarkup = elements.windForecastList.innerHTML;
  const currentStatus = elements.windForecastStatus.textContent;
  pending[2].reject(new Error('stale network failure'));
  await staleFailure;
  assert.equal(elements.windForecastList.innerHTML, currentMarkup);
  assert.equal(elements.windForecastStatus.textContent, currentStatus, 'stale error must not replace the current success message');

  console.log('PASS: latest selected map point wins when forecast responses arrive out of order; stale successes and failures cannot overwrite current UI.');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
