import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import os from 'os';
import { downloadPage } from '../marketing/src/download-page';

const ROOT = path.join(__dirname, '..');
const SOURCE = fs.readFileSync(path.join(ROOT, 'public/download.html'), 'utf8');

test('the source page keeps all three placeholders at null', () => {
  expect(SOURCE).toMatch(/^\s*var STORE_URL = null;/m);
  expect(SOURCE).toMatch(/^\s*var PROVIDER_TOKEN = null;/m);
  expect(SOURCE).toMatch(/^\s*var TESTFLIGHT_URL = null;/m);
});

test('live: writes store URL and provider token as JSON strings', () => {
  const out = downloadPage(SOURCE, { mode: 'live', storeUrl: 'https://apps.apple.com/app/id6746295124', providerToken: '12$3' });
  expect(out).toContain('var STORE_URL = "https://apps.apple.com/app/id6746295124";');
  expect(out).toContain('var PROVIDER_TOKEN = "12$3";');
  expect(out).toContain('var TESTFLIGHT_URL = null;');
  expect(out).not.toContain('var STORE_URL = null;');
  // Everything else is untouched
  expect(out.split('\n').length).toBe(SOURCE.split('\n').length);
});

test('waitlist: null stays allowed, TestFlight link optional', () => {
  expect(downloadPage(SOURCE, { mode: 'waitlist' })).toContain('var STORE_URL = null;');
  expect(downloadPage(SOURCE, {})).toContain('var STORE_URL = null;');
  const out = downloadPage(SOURCE, { mode: 'waitlist', testflightUrl: 'https://testflight.apple.com/join/AbCdEf' });
  expect(out).toContain('var STORE_URL = null;');
  expect(out).toContain('var TESTFLIGHT_URL = "https://testflight.apple.com/join/AbCdEf";');
});

test('escapes values, never inserts them raw', () => {
  const out = downloadPage(SOURCE, { mode: 'live', storeUrl: 'https://apps.apple.com/app/id1?x="</script>' });
  expect(out).toContain('var STORE_URL = "https://apps.apple.com/app/id1?x=\\"\\u003c/script>";');
  expect(out).not.toContain('</script>";');
  const token = downloadPage(SOURCE, { mode: 'waitlist', providerToken: '<b>', testflightUrl: 'https://testflight.apple.com/join/<x>' });
  expect(token).toContain('var PROVIDER_TOKEN = "\\u003cb>";');
  expect(token).toContain('var TESTFLIGHT_URL = "https://testflight.apple.com/join/\\u003cx>";');
});

test('live without STORE_URL throws, and so does a non-https link', () => {
  expect(() => downloadPage(SOURCE, { mode: 'live' })).toThrow(/STORE_URL/);
  expect(() => downloadPage(SOURCE, { mode: 'live', storeUrl: '' })).toThrow(/LANDING_MODE=live/);
  expect(() => downloadPage(SOURCE, { mode: 'live', storeUrl: 'apps.apple.com/app/id1' })).toThrow(/https/);
  expect(() => downloadPage(SOURCE, { mode: 'live', storeUrl: 'http://apps.apple.com/app/id1' })).toThrow(/https/);
});

test('a page without the placeholder lines is refused', () => {
  expect(() => downloadPage('<script>var STORE_URL = "x";</script>', {})).toThrow(/var STORE_URL = null;/);
});

describe('build.js --landing-only', () => {
  const run = (env: Record<string, string>) => {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'cmm-landing-'));
    try {
      execFileSync(process.execPath, ['marketing/build.js', '--landing-only', '--out', out], {
        cwd: ROOT, env: { ...process.env, LANDING_MODE: '', STORE_URL: '', PROVIDER_TOKEN: '', TESTFLIGHT_URL: '', ...env }, stdio: 'pipe',
      });
      return { ok: true, html: fs.readFileSync(path.join(out, 'download.html'), 'utf8'), landing: fs.readFileSync(path.join(out, 'index.html'), 'utf8') };
    } catch (e: any) {
      return { ok: false, status: e.status as number, stderr: String(e.stderr) };
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  };

  test('live with STORE_URL writes dist/download.html and the landing with store buttons', () => {
    const r = run({ LANDING_MODE: 'live', STORE_URL: 'https://apps.apple.com/app/id6746295124', PROVIDER_TOKEN: '123456789' });
    expect(r.ok).toBe(true);
    expect(r.html).toContain('var STORE_URL = "https://apps.apple.com/app/id6746295124";');
    expect(r.html).toContain('var PROVIDER_TOKEN = "123456789";');
    expect(r.landing).toContain('href="/download" data-store');
    expect(r.landing).toContain("step: 'store'");
  });

  test('live without STORE_URL exits with 1 and names the variable', () => {
    const r = run({ LANDING_MODE: 'live' });
    expect(r.ok).toBe(false);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/STORE_URL/);
  });

  test('waitlist without STORE_URL still builds, with null', () => {
    const r = run({});
    expect(r.ok).toBe(true);
    expect(r.html).toContain('var STORE_URL = null;');
  });
});
