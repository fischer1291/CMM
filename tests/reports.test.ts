import { ticketTitle } from '../features/support/SupportView';
import { reportErrorMessage, submitPublicReport, validateReport, REPORT_CATEGORIES } from '../services/reports';

const valid = { category: 'harassment' as const, text: 'Ruft mich ständig an, obwohl ich nein gesagt habe.' };

test('the categories are the backend contract of POST /reports/public', () => {
  expect(REPORT_CATEGORIES.map((c) => c.value)).toEqual(['harassment', 'illegal', 'spam', 'other']);
});

test('a minimal report: category and text, optional fields left out, honeypot empty', () => {
  const result = validateReport({ ...valid, text: `  ${valid.text}  `, reportedPhone: ' ', reporterEmail: '', momentHint: '' });
  expect(result.errors).toBeNull();
  expect(result.body).toEqual({ category: 'harassment', text: valid.text, website: '' });
});

test('optional fields are trimmed and sent; the e-mail in lower case', () => {
  const result = validateReport({ ...valid, reportedPhone: ' 0151 2345 6789 ', reporterEmail: ' Ich@Example.DE ', momentHint: ' gestern Abend ' });
  expect(result.body).toEqual({
    category: 'harassment',
    text: valid.text,
    reportedPhone: '0151 2345 6789',
    reporterEmail: 'ich@example.de',
    momentHint: 'gestern Abend',
    website: '',
  });
  expect(validateReport({ ...valid, reportedPhone: '+49 (151) 234-56789' }).errors).toBeNull();
});

test('what the backend would reject is named per field before sending', () => {
  const none = validateReport({ category: null, text: 'kurz' });
  expect(none.body).toBeNull();
  expect(Object.keys(none.errors!).sort()).toEqual(['category', 'text']);
  expect(validateReport({ ...valid, category: 'spam ' as never }).errors).toHaveProperty('category');
  // 10 to 2000 characters after trimming
  expect(validateReport({ ...valid, text: '   123456789   ' }).errors).toHaveProperty('text');
  expect(validateReport({ ...valid, text: '1234567890' }).errors).toBeNull();
  expect(validateReport({ ...valid, text: 'x'.repeat(2000) }).errors).toBeNull();
  expect(validateReport({ ...valid, text: 'x'.repeat(2001) }).errors).toHaveProperty('text');
  // a number: digits and separators, 6 to 15 digits, at most 40 characters
  for (const phone of ['abc', '12345', '0151-2345678x', '1'.repeat(16), `+49 ${' '.repeat(40)}151`]) {
    expect(validateReport({ ...valid, reportedPhone: phone }).errors).toHaveProperty('reportedPhone');
  }
  for (const email of ['ich@', 'ich example.de', `${'a'.repeat(196)}@x.de`]) {
    expect(validateReport({ ...valid, reporterEmail: email }).errors).toHaveProperty('reporterEmail');
  }
  expect(validateReport({ ...valid, momentHint: 'x'.repeat(201) }).errors).toHaveProperty('momentHint');
  expect(validateReport({ ...valid, momentHint: 'x'.repeat(200) }).errors).toBeNull();
});

test('the error messages for invalid_report, 429 and no connection, without pressure', () => {
  expect(reportErrorMessage(400, 'invalid_report')).toContain('Prüf bitte');
  expect(reportErrorMessage(429, 'too_many_reports')).toContain('in einer Stunde');
  expect(reportErrorMessage(null)).toContain('Keine Verbindung');
  expect(reportErrorMessage(500)).toContain('Gerade klappt es nicht');
});

const response = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response;

test('sending posts to /reports/public without a token and returns the reference', async () => {
  const body = validateReport(valid).body!;
  const calls: { url: string; init: RequestInit }[] = [];
  const reference = await submitPublicReport(body, async (url, init) => {
    calls.push({ url, init: init! });
    return response(200, { success: true, reference: 'AB12CD34' });
  });
  expect(reference).toBe('AB12CD34');
  expect(calls[0].url).toMatch(/\/reports\/public$/);
  expect(calls[0].init.method).toBe('POST');
  expect(calls[0].init.headers).toEqual({ 'Content-Type': 'application/json' });
  expect(JSON.parse(String(calls[0].init.body))).toEqual({ ...body, website: '' });

  await expect(submitPublicReport(body, async () => response(400, { success: false, error: 'invalid_report' }))).rejects.toThrow('Prüf bitte');
  await expect(submitPublicReport(body, async () => response(429, { success: false, error: 'too_many_reports' }))).rejects.toThrow('in einer Stunde');
  await expect(
    submitPublicReport(body, async () => {
      throw new Error('offline');
    })
  ).rejects.toThrow('Keine Verbindung');
});

test('statements of reasons get a title that names the decision (plan 2.7)', () => {
  expect(ticketTitle({ category: 'moderation', moderation: { action: 'suspend', until: null } })).toBe('Sperre deines Kontos');
  expect(ticketTitle({ category: 'moderation', moderation: { action: 'hide_moment', until: null } })).toBe('Entscheidung zu deinem Moment');
  expect(ticketTitle({ category: 'moderation', moderation: { action: 'delete_moment', until: null } })).toBe('Entscheidung zu deinem Moment');
  expect(ticketTitle({ category: 'moderation' })).toBe('Entscheidung zu deinem Konto');
  expect(ticketTitle({ category: 'bug' })).toBe('Etwas klappt nicht');
});
