import { safeRoute } from '../services/notifications';

test('push deep links: only known app routes', () => {
  expect(safeRoute('/')).toBe('/');
  expect(safeRoute('/callmoments')).toBe('/callmoments');
  expect(safeRoute('/friend?phone=%2B4915111111111')).toBe('/friend?phone=%2B4915111111111');
  expect(safeRoute('/stats')).toBe('/stats');
  expect(safeRoute('/circle?id=0123456789abcdef01234567')).toBe('/circle?id=0123456789abcdef01234567');
  expect(safeRoute('/circle?id=../../x')).toBeNull();
  expect(safeRoute('https://evil.example.com')).toBeNull();
  expect(safeRoute('/videocall?channel=x')).toBeNull();
  expect(safeRoute('/friend?phone=1&x=<script>')).toBeNull();
  expect(safeRoute(undefined)).toBeNull();
  expect(safeRoute(42)).toBeNull();
});
