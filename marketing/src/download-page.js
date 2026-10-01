// The download redirect (public/download.html) stays in the repo with
// STORE_URL, PROVIDER_TOKEN and TESTFLIGHT_URL set to null: the values are deploy
// settings, not source. The website build fills them in from the environment
// (scripts/build-web.sh → build.js --landing-only), so every link to /download
// (campaign links /k/…, flyer QR, launch mail) lands in the App Store with ct/pt.
// No Chrome, no I/O: build.js reads and writes the file.

/** The variables the page declares as `var NAME = null;`, in this order. */
const VARS = ['STORE_URL', 'PROVIDER_TOKEN', 'TESTFLIGHT_URL'];

/**
 * Returns `html` with the three placeholders replaced by the given values (as
 * JSON strings with "<" escaped, so a value can never close the script
 * element). Throws when the page is live without a store link,
 * when STORE_URL is not an https URL, or when a placeholder line is missing.
 * @param {string} html public/download.html
 * @param {{ storeUrl?: string | null, providerToken?: string | null, testflightUrl?: string | null, mode?: string }} [config]
 */
function downloadPage(html, { storeUrl = null, providerToken = null, testflightUrl = null, mode = 'waitlist' } = {}) {
  if (mode === 'live' && !storeUrl) {
    throw new Error('STORE_URL is empty but LANDING_MODE=live: set STORE_URL (https://apps.apple.com/app/id…) in the build environment, otherwise /download says "kommt in Kürze"');
  }
  if (storeUrl) {
    let url;
    try { url = new URL(storeUrl); } catch { url = null; }
    if (!url || url.protocol !== 'https:') throw new Error(`STORE_URL must be an https URL, got ${JSON.stringify(storeUrl)}`);
  }
  const values = { STORE_URL: storeUrl || null, PROVIDER_TOKEN: providerToken || null, TESTFLIGHT_URL: testflightUrl || null };
  let out = html;
  for (const name of VARS) {
    const line = new RegExp(`^([ \\t]*)var ${name} = null;.*$`, 'm');
    if (!line.test(out)) throw new Error(`public/download.html: "var ${name} = null;" not found`);
    // JSON.stringify leaves "<" alone, so "</script>" in a value would end the
    // script element: escape it. Function replacement: a "$" inside a value
    // must not be read as a pattern
    const literal = JSON.stringify(values[name]).replace(/</g, '\\u003c');
    out = out.replace(line, (_, indent) => `${indent}var ${name} = ${literal};`);
  }
  return out;
}

module.exports = { downloadPage, VARS };
