import { hashPhone, regionOf, toE164 } from '../utils/phone';

test('toE164: national and international formats', () => {
  expect(toE164('0151 1111 1111', 'DE')).toBe('+4915111111111');
  expect(toE164('+49 151 11111111', 'DE')).toBe('+4915111111111');
  expect(toE164('0049 151 11111111', 'DE')).toBe('+4915111111111');
  expect(toE164('abc', 'DE')).toBeNull();
});

test('regionOf: country of an E.164 number', () => {
  expect(regionOf('+4915111111111')).toBe('DE');
  expect(regionOf('+436641234567')).toBe('AT');
});

test('hashPhone: SHA-256 hex, same as the backend', () => {
  // echo -n "+4915111111111" | shasum -a 256
  expect(hashPhone('+4915111111111')).toBe('e2af3fa814fc74f16584396fc90134f4bbd0c4af995d8fe2506fe23b0716fffa');
});
