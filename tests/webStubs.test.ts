import fs from 'fs';
import path from 'path';
import { landingRedirect } from '../components/AppOnlyWeb';
import { listRoutes, missingStubs, orphanStubs, robotsHeaders, webPath, PUBLIC_ROUTES } from '../scripts/check-web-stubs.js';

const APP = path.join(__dirname, '..', 'app');

test('only the four public pages and the start route render on the web', () => {
  expect(PUBLIC_ROUTES).toEqual(['datenschutz', 'impressum', 'einladung', 'kreis', '(tabs)/index']);
});

test('every app screen has its web stub, every stub its screen', () => {
  const routes = listRoutes(APP);
  const files: string[] = [];
  const walk = (dir: string, prefix = '') => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix ? `${prefix}/${e.name}` : e.name;
      if (e.isDirectory()) walk(path.join(dir, e.name), rel);
      else files.push(rel);
    }
  };
  walk(APP);
  expect(routes.map((r: { route: string }) => r.route)).toEqual(expect.arrayContaining(['stats', 'videocall', '(tabs)/contacts', '(auth)/verify']));
  expect(missingStubs(routes, files)).toEqual([]);
  expect(orphanStubs(routes, files)).toEqual([]);
});

test('a stub re-exports the shared redirect page', () => {
  const stub = fs.readFileSync(path.join(APP, 'stats.web.tsx'), 'utf8');
  expect(stub).toContain("export { default } from '../components/AppOnlyWeb'");
  const nested = fs.readFileSync(path.join(APP, '(tabs)', 'settings.web.tsx'), 'utf8');
  expect(nested).toContain("from '../../components/AppOnlyWeb'");
});

test('the check names missing and orphaned stubs', () => {
  const routes = [
    { route: 'stats', file: 'stats.tsx' },
    { route: 'kreis', file: 'kreis.tsx' },
    { route: '(tabs)/contacts', file: '(tabs)/contacts.tsx' },
  ];
  expect(missingStubs(routes, ['stats.tsx', 'kreis.tsx', '(tabs)/contacts.tsx'])).toEqual(['stats', '(tabs)/contacts']);
  expect(missingStubs(routes, ['stats.web.tsx', '(tabs)/contacts.web.tsx'])).toEqual([]);
  expect(orphanStubs(routes, ['year.web.tsx', 'stats.web.tsx'])).toEqual(['year']);
});

test('the Netlify headers mark every stub route noindex, never a public page', () => {
  expect(webPath('stats')).toBe('/stats');
  expect(webPath('(tabs)/contacts')).toBe('/contacts');
  expect(webPath('(tabs)/index')).toBe('/');
  const routes = [
    { route: 'stats', file: 'stats.tsx' },
    { route: 'kreis', file: 'kreis.tsx' },
    { route: '(tabs)/index', file: '(tabs)/index.tsx' },
    { route: '(tabs)/contacts', file: '(tabs)/contacts.tsx' },
  ];
  const headers = robotsHeaders(routes);
  expect(headers).toBe(
    [
      '/(tabs)\n  X-Robots-Tag: noindex',
      '/(tabs)/contacts\n  X-Robots-Tag: noindex',
      '/(tabs)/index\n  X-Robots-Tag: noindex',
      '/contacts\n  X-Robots-Tag: noindex',
      '/stats\n  X-Robots-Tag: noindex',
      '',
    ].join('\n')
  );
  expect(headers).not.toContain('/kreis');
  const real = robotsHeaders(listRoutes(APP));
  expect(real).toContain('/videocall\n  X-Robots-Tag: noindex');
  expect(real).toContain('/verify\n  X-Robots-Tag: noindex');
  // the home shell exported as dist/(tabs)/index.html is hidden, the landing at / is not
  expect(real).toContain('/(tabs)\n  X-Robots-Tag: noindex');
  expect(real).toContain('/(tabs)/index\n  X-Robots-Tag: noindex');
  for (const pub of ['/kreis\n', '/einladung\n', '/datenschutz\n', '/impressum\n', '/\n']) expect(real).not.toContain(pub);
});

test('a stub leaves the router for the static landing page, except when already there', () => {
  expect(landingRedirect('/stats')).toBe('/');
  expect(landingRedirect('/onboarding')).toBe('/');
  expect(landingRedirect('/(tabs)/contacts/')).toBe('/');
  // "/" inside the router is the guarded start route, not the landing page: no reload loop
  expect(landingRedirect('/')).toBeNull();
  expect(landingRedirect('')).toBeNull();
});
