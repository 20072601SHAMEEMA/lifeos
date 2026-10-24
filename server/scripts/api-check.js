/**
 * LifeOS API check — calls every backend route and verifies the response.
 *
 *   npm run test:api            (server must be running: npm run dev or npm start)
 *   API_URL=http://host:port npm run test:api
 *
 * Uses a temporary account that is deleted at the end, so demo data is untouched.
 * Prints a summary table and writes an HTML report to server/reports/api-report.html.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.API_URL || 'http://localhost:5050').replace(/\/$/, '');
const REPORT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'reports', 'api-report.html');

const results = [];
let token = null;

async function call(name, method, route, { body, auth = true, expect, useToken } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const t = useToken !== undefined ? useToken : token;
  if (auth && t) headers.Authorization = `Bearer ${t}`;

  const started = performance.now();
  let status = 0;
  let data = null;
  try {
    const res = await fetch(BASE + route, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
    status = res.status;
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
  } catch (err) {
    data = { error: `Network error: ${err.message}` };
  }
  const ms = Math.round(performance.now() - started);
  const pass = status === expect;
  results.push({ name, method, route, status, expect, pass, ms, data });
  return data;
}

function short(data) {
  const s = JSON.stringify(data, (k, v) => (k === 'token' && typeof v === 'string' ? `${v.slice(0, 16)}…` : k === 'photo' && v ? '[image]' : v));
  return s && s.length > 160 ? `${s.slice(0, 157)}…` : s;
}

const escape = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function writeReport(passed, total) {
  const rows = results
    .map(
      (r, i) => `<tr class="${r.pass ? 'ok' : 'bad'}">
        <td class="n">${i + 1}</td>
        <td><span class="m m-${r.method.toLowerCase()}">${r.method}</span></td>
        <td class="route">${escape(r.route.replace(/\/[A-Za-z0-9_-]{12}$/, '/:shareId'))}</td>
        <td>${escape(r.name)}</td>
        <td class="st">${r.status}<small> / ${r.expect}</small></td>
        <td class="res">${r.pass ? '✔ PASS' : '✘ FAIL'}</td>
        <td class="ms">${r.ms} ms</td>
        <td class="body"><code>${escape(short(r.data))}</code></td>
      </tr>`,
    )
    .join('\n');

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>LifeOS API Test Report</title>
<style>
  :root{--bg:#070b14;--card:#0f1627;--line:rgba(255,255,255,.08);--text:#e9eef8;--dim:#9ba7bf;--ok:#34d399;--bad:#fb7185;--pri:#22d3ee}
  *{box-sizing:border-box} body{margin:0;padding:28px;background:radial-gradient(800px 500px at 0 0,rgba(99,102,241,.18),transparent 60%),var(--bg);color:var(--text);font:14px/1.5 Inter,system-ui,Segoe UI,sans-serif}
  header{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:16px;margin-bottom:22px}
  h1{margin:0;font-size:26px} .sub{color:var(--dim);margin-top:4px}
  .score{display:flex;gap:12px} .tile{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 18px;min-width:120px}
  .tile b{display:block;font-size:26px} .tile span{color:var(--dim);font-size:12px;text-transform:uppercase;letter-spacing:.08em}
  .tile.ok b{color:var(--ok)} .tile.bad b{color:var(--bad)}
  .wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:16px}
  table{width:100%;border-collapse:collapse;min-width:980px} th,td{padding:9px 12px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
  th{color:var(--dim);font-size:11px;text-transform:uppercase;letter-spacing:.08em;background:rgba(255,255,255,.03)}
  .n,.ms{color:var(--dim)} .route{font-family:Consolas,monospace;white-space:nowrap}
  .m{display:inline-block;min-width:58px;text-align:center;padding:2px 8px;border-radius:6px;font:700 11px Consolas,monospace}
  .m-get{background:rgba(34,211,238,.15);color:#67e8f9}.m-post{background:rgba(52,211,153,.15);color:#6ee7b7}.m-put{background:rgba(251,191,36,.15);color:#fcd34d}.m-patch{background:rgba(167,139,250,.15);color:#c4b5fd}.m-delete{background:rgba(251,113,133,.15);color:#fda4af}
  .st{font-family:Consolas,monospace;font-weight:700} .st small{color:var(--dim);font-weight:400}
  tr.ok .res{color:var(--ok);font-weight:700} tr.bad .res{color:var(--bad);font-weight:700} tr.bad{background:rgba(251,113,133,.06)}
  .body code{font:12px Consolas,monospace;color:var(--dim);word-break:break-all}
  footer{color:var(--dim);margin-top:16px;font-size:12px}
</style></head><body>
<header>
  <div><h1>🛡️ LifeOS — Backend API Test Report</h1>
  <div class="sub">Base URL <code>${escape(BASE)}/api</code> · Run at ${new Date().toLocaleString()} · Express + SQLite + JWT</div></div>
  <div class="score">
    <div class="tile ok"><b>${passed}</b><span>Passed</span></div>
    <div class="tile ${total - passed ? 'bad' : ''}"><b>${total - passed}</b><span>Failed</span></div>
    <div class="tile"><b>${total}</b><span>Requests</span></div>
  </div>
</header>
<div class="wrap"><table>
<thead><tr><th>#</th><th>Method</th><th>Route</th><th>Test</th><th>Status / expected</th><th>Result</th><th>Time</th><th>Response (trimmed)</th></tr></thead>
<tbody>${rows}</tbody></table></div>
<footer>Generated by <code>npm run test:api</code> (server/scripts/api-check.js). A temporary user was registered for this run and deleted at the end. Expected 4xx rows are intentional checks for validation and security.</footer>
</body></html>`;
  fs.mkdirSync(path.dirname(REPORT), { recursive: true });
  fs.writeFileSync(REPORT, html);
}

async function main() {
  const stamp = Date.now();
  const user = { name: 'API Tester', email: `api-test-${stamp}@lifeos.test`, phone: '+91 90000 00000', password: 'TestPass123' };
  const soon = (min) => new Date(Date.now() + min * 60_000).toISOString();

  // Health & auth
  await call('Server health check', 'GET', '/api/health', { auth: false, expect: 200 });
  const reg = await call('Register new account', 'POST', '/api/auth/register', { body: user, auth: false, expect: 201 });
  token = reg?.token;
  await call('Reject duplicate email', 'POST', '/api/auth/register', { body: user, auth: false, expect: 409 });
  await call('Reject wrong password', 'POST', '/api/auth/login', { body: { email: user.email, password: 'wrong-pass' }, auth: false, expect: 401 });
  const login = await call('Login', 'POST', '/api/auth/login', { body: { email: user.email, password: user.password }, auth: false, expect: 200 });
  token = login?.token || token;
  await call('Current user (JWT)', 'GET', '/api/auth/me', { expect: 200 });
  await call('Block request without token', 'GET', '/api/contacts', { auth: false, expect: 401 });

  // Profile
  await call('Get profile', 'GET', '/api/users/profile', { expect: 200 });
  await call('Update profile', 'PUT', '/api/users/profile', { body: { name: 'API Tester Updated' }, expect: 200 });

  // Contacts (CRUD)
  const c1 = await call('Add contact', 'POST', '/api/contacts', { body: { name: 'Test Mother', relationship: 'Mother', phone: '+91 98450 11223', priority: 'high' }, expect: 201 });
  const c2 = await call('Add second contact', 'POST', '/api/contacts', { body: { name: 'Test Friend', relationship: 'Friend', phone: '+91 97412 77889', email: 'friend@example.com' }, expect: 201 });
  await call('Reject invalid contact', 'POST', '/api/contacts', { body: { name: 'X', relationship: '', phone: '12' }, expect: 400 });
  await call('List contacts', 'GET', '/api/contacts', { expect: 200 });
  const c2id = c2?.contact?.id;
  await call('Edit contact', 'PUT', `/api/contacts/${c2id}`, { body: { name: 'Test Friend', relationship: 'Best friend', phone: '+91 97412 77889', priority: 'medium' }, expect: 200 });
  await call('Set primary contact', 'PATCH', `/api/contacts/${c2id}/primary`, { expect: 200 });

  // Journeys
  const j = await call('Start journey', 'POST', '/api/journeys', {
    body: { start: { label: 'Home', lat: 12.9716, lng: 77.5946 }, destination: { label: 'University', lat: 12.9352, lng: 77.6245 }, expectedArrival: soon(30), contactId: c1?.contact?.id },
    expect: 201,
  });
  const jid = j?.journey?.id;
  await call('Reject second active journey', 'POST', '/api/journeys', { body: { start: { label: 'A' }, destination: { label: 'B' }, expectedArrival: soon(20) }, expect: 409 });
  await call('Get active journey', 'GET', '/api/journeys/active', { expect: 200 });
  await call('Journey check-in (I’m Safe)', 'PUT', `/api/journeys/${jid}`, { body: { action: 'checkin' }, expect: 200 });
  await call('Extend arrival +15 min', 'PUT', `/api/journeys/${jid}`, { body: { action: 'extend', minutes: 15 }, expect: 200 });
  await call('End journey (arrived)', 'PUT', `/api/journeys/${jid}`, { body: { action: 'complete' }, expect: 200 });
  await call('Journey list', 'GET', '/api/journeys', { expect: 200 });

  // SOS
  const s = await call('Activate SOS (simulated)', 'POST', '/api/sos', { body: { lat: 12.9716, lng: 77.5946, accuracy: 20 }, expect: 201 });
  await call('Get active SOS', 'GET', '/api/sos/active', { expect: 200 });
  await call('Resolve SOS (I’m safe)', 'PUT', `/api/sos/${s?.sos?.id}`, { body: { action: 'resolve' }, expect: 200 });
  await call('SOS history', 'GET', '/api/sos', { expect: 200 });

  // Safety history
  await call('Log check-in event', 'POST', '/api/safety-history', { body: { type: 'checkin', detail: 'API test check-in' }, expect: 201 });
  await call('Safety history + stats', 'GET', '/api/safety-history', { expect: 200 });

  // Emergency card
  await call('Get emergency card', 'GET', '/api/card', { expect: 200 });
  const card = await call('Update card + enable QR', 'PUT', '/api/card', {
    body: { sharingEnabled: true, bloodGroup: 'O+', allergies: 'None', visibility: { bloodGroup: true } },
    expect: 200,
  });
  await call('Public QR card (no login)', 'GET', `/api/card/public/${card?.card?.shareId}`, { auth: false, expect: 200 });
  await call('Regenerate QR link', 'POST', '/api/card/regenerate', { expect: 200 });
  await call('Old QR link stops working', 'GET', `/api/card/public/${card?.card?.shareId}`, { auth: false, expect: 404 });

  // Settings & data
  await call('Get settings', 'GET', '/api/settings', { expect: 200 });
  await call('Update settings', 'PUT', '/api/settings', { body: { countdownSeconds: 10, alertMode: 'all' }, expect: 200 });
  await call('Export my data', 'GET', '/api/users/export', { expect: 200 });

  // Deletes & cleanup
  await call('Delete contact', 'DELETE', `/api/contacts/${c2id}`, { expect: 200 });
  await call('Clear safety history', 'DELETE', '/api/safety-history', { expect: 200 });
  const oldToken = token;
  await call('Delete account (cleanup)', 'DELETE', '/api/users/me', { expect: 200 });
  await call('Deleted account is rejected', 'GET', '/api/auth/me', { useToken: oldToken, expect: 401 });
  await call('Unknown route returns 404', 'GET', '/api/does-not-exist', { auth: false, expect: 404 });

  // Output
  const passed = results.filter((r) => r.pass).length;
  console.log(`\nLifeOS API check against ${BASE}\n`);
  console.table(
    results.map((r, i) => ({
      '#': i + 1,
      Method: r.method,
      Route: r.route.replace(/\/[A-Za-z0-9_-]{12}$/, '/:shareId'),
      Test: r.name,
      Status: r.status,
      Result: r.pass ? 'PASS' : `FAIL (expected ${r.expect})`,
    })),
  );
  console.log(`\n${passed}/${results.length} checks passed.`);
  writeReport(passed, results.length);
  console.log(`HTML report: ${REPORT}\n`);
  process.exitCode = passed === results.length ? 0 : 1;
}

main().catch((err) => {
  console.error('API check crashed:', err);
  process.exitCode = 1;
});
