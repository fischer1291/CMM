import fs from 'fs';
import path from 'path';
import { check, profileEnv, referencedKeys, OTA_PROFILES } from '../scripts/eas-env.js';

const root = path.join(__dirname, '..');
const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));

test('a variable with a real default is optional, one with an empty fallback is required', () => {
  const keys = referencedKeys([
    "export const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://api.example';",
    "const KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY || '';",
    "const EMPTY = process.env.EXPO_PUBLIC_OTHER ?? '';",
  ]);
  expect(keys.get('EXPO_PUBLIC_API_URL')).toBe(true);
  expect(keys.get('EXPO_PUBLIC_REVENUECAT_IOS_KEY')).toBe(false);
  expect(keys.get('EXPO_PUBLIC_OTHER')).toBe(false);
});

test('the check names a missing key and a profile mismatch', () => {
  const referenced = new Map([
    ['EXPO_PUBLIC_REVENUECAT_IOS_KEY', false],
    ['EXPO_PUBLIC_API_URL', true],
  ]);
  const fine = { build: { preview: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'a' } }, production: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'a' } } } };
  expect(check(fine, referenced)).toEqual([]);
  const missing = { build: { preview: { env: {} }, production: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'a' } } } };
  expect(check(missing, referenced)).toEqual([
    'eas.json build.preview.env: EXPO_PUBLIC_REVENUECAT_IOS_KEY fehlt (der Code hat dafür keinen Produktionswert)',
    'eas.json: EXPO_PUBLIC_REVENUECAT_IOS_KEY steht nur in einem der Profile preview/production',
  ]);
  const differs = { build: { preview: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'a' } }, production: { env: { EXPO_PUBLIC_REVENUECAT_IOS_KEY: 'b' } } } };
  expect(check(differs, referenced)).toEqual(['eas.json: EXPO_PUBLIC_REVENUECAT_IOS_KEY unterscheidet sich zwischen preview und production']);
});

test('the OTA profiles in eas.json carry the RevenueCat key the bundle needs', () => {
  const purchases = fs.readFileSync(path.join(root, 'services/purchases.ts'), 'utf8');
  const referenced = referencedKeys([purchases]);
  expect(referenced.get('EXPO_PUBLIC_REVENUECAT_IOS_KEY')).toBe(false);
  expect(check(eas, referenced)).toEqual([]);
  for (const profile of OTA_PROFILES) {
    expect(profileEnv(profile, eas).EXPO_PUBLIC_REVENUECAT_IOS_KEY).toMatch(/^appl_/);
    expect(profileEnv(profile, eas).APP_VARIANT).toBe('production');
  }
});
