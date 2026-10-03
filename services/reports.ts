/**
 * Reports without an account (plan 2.7, DSA Art. 16): the form on /melden
 * (app/melden.tsx) posts to the backend's public POST /reports/public, which
 * has no token check and keeps the report as a support ticket. The rules here
 * mirror the backend's (routes/support.js publicReport), so the form can say
 * what is wrong before sending; the backend checks again.
 */
import { API_BASE_URL } from '../config/env';
import { fetchWithTimeout } from '../utils/apiUtils';

export type ReportCategory = 'harassment' | 'illegal' | 'spam' | 'other';

export const REPORT_CATEGORIES: { value: ReportCategory; label: string }[] = [
  { value: 'harassment', label: 'Belästigung' },
  { value: 'illegal', label: 'Rechtswidriger Inhalt' },
  { value: 'spam', label: 'Spam' },
  { value: 'other', label: 'Sonstiges' },
];

export const REPORT_TEXT_MIN = 10;
export const REPORT_TEXT_MAX = 2000;
export const REPORT_HINT_MAX = 200;
const PHONE_MAX = 40;
const EMAIL_MAX = 200;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// What people type for a number: digits, a leading +, spaces and the usual separators
const PHONE = /^\+?[0-9 ()/.-]+$/;

export type ReportInput = {
  category: ReportCategory | null;
  text: string;
  reportedPhone?: string;
  reporterEmail?: string;
  momentHint?: string;
};

export type ReportBody = {
  category: ReportCategory;
  text: string;
  reportedPhone?: string;
  reporterEmail?: string;
  momentHint?: string;
  /** Honeypot: always empty from a person (backend answers a filled one with a fake success) */
  website: string;
};

export type ReportField = 'category' | 'text' | 'reportedPhone' | 'reporterEmail' | 'momentHint';

/**
 * The body for POST /reports/public, or what is wrong per field (German, can
 * be shown as is). Optional fields that are left empty are not sent. Pure.
 */
export function validateReport(input: ReportInput): { body: ReportBody; errors: null } | { body: null; errors: Partial<Record<ReportField, string>> } {
  const errors: Partial<Record<ReportField, string>> = {};
  const category = REPORT_CATEGORIES.some((c) => c.value === input.category) ? (input.category as ReportCategory) : null;
  if (!category) errors.category = 'Bitte wähl aus, worum es geht.';

  const text = (input.text ?? '').trim();
  if (text.length < REPORT_TEXT_MIN) errors.text = `Beschreib bitte kurz, was passiert ist (mindestens ${REPORT_TEXT_MIN} Zeichen).`;
  else if (text.length > REPORT_TEXT_MAX) errors.text = `Bitte fass dich etwas kürzer (höchstens ${REPORT_TEXT_MAX} Zeichen).`;

  const phone = (input.reportedPhone ?? '').trim();
  const digits = phone.replace(/\D/g, '').length;
  if (phone && (phone.length > PHONE_MAX || !PHONE.test(phone) || digits < 6 || digits > 15)) {
    errors.reportedPhone = 'Das sieht nicht nach einer Telefonnummer aus. Du kannst das Feld auch leer lassen.';
  }

  const email = (input.reporterEmail ?? '').trim().toLowerCase();
  if (email && (email.length > EMAIL_MAX || !EMAIL.test(email))) {
    errors.reporterEmail = 'Bitte prüf die E-Mail-Adresse, oder lass das Feld leer.';
  }

  const hint = (input.momentHint ?? '').trim();
  if (hint.length > REPORT_HINT_MAX) errors.momentHint = `Höchstens ${REPORT_HINT_MAX} Zeichen.`;

  if (Object.keys(errors).length || !category) return { body: null, errors };
  return {
    body: {
      category,
      text,
      ...(phone ? { reportedPhone: phone } : {}),
      ...(email ? { reporterEmail: email } : {}),
      ...(hint ? { momentHint: hint } : {}),
      website: '',
    },
    errors: null,
  };
}

/** The message for a failed send, from the backend's answer (null status: no connection). Pure. */
export function reportErrorMessage(status: number | null, error?: unknown): string {
  if (status === null) return 'Keine Verbindung. Versuch es gleich noch einmal.';
  if (status === 429 || error === 'too_many_reports') return 'Von hier kamen gerade schon einige Meldungen. Probier es in einer Stunde noch einmal, oder schreib uns eine Mail.';
  if (error === 'invalid_report') return 'Da stimmt etwas mit den Angaben nicht. Prüf bitte die Felder und versuch es noch einmal.';
  return 'Gerade klappt es nicht. Versuch es gleich noch einmal, oder schreib uns eine Mail.';
}

/**
 * Sends the report. Deliberately a plain fetch without the app's token or
 * device headers: a report without an account stays one, even from inside
 * the app. Resolves with the reference (last 8 characters of the ticket id);
 * throws an Error whose message can be shown as is.
 */
export async function submitPublicReport(body: ReportBody, fetchImpl: typeof fetchWithTimeout = fetchWithTimeout): Promise<string> {
  let res: Response;
  try {
    res = await fetchImpl(
      `${API_BASE_URL}/reports/public`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
      15000
    );
  } catch {
    throw new Error(reportErrorMessage(null));
  }
  const data = await res.json().catch(() => ({}));
  if (res.ok && data.success !== false && typeof data.reference === 'string') return data.reference;
  throw new Error(reportErrorMessage(res.status, data.error));
}
