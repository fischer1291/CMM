import { CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils';

const FALLBACK_REGION: CountryCode = 'DE';

/** Country of an E.164 number, used to interpret contacts without a country code. */
export function regionOf(e164: string | null | undefined): CountryCode {
  if (!e164) return deviceRegion();
  return parsePhoneNumberFromString(e164)?.country ?? deviceRegion();
}

/** Region from the device locale ("de-DE" -> "DE"). */
export function deviceRegion(): CountryCode {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale;
    const region = locale.split('-').pop()?.toUpperCase();
    if (region && /^[A-Z]{2}$/.test(region)) return region as CountryCode;
  } catch {
    // fall through
  }
  return FALLBACK_REGION;
}

/**
 * Normalize a phone number to E.164 ("+491711234567"), or null.
 * Mirrors the backend's lib/phone.js so hashes match.
 */
export function toE164(input: string, region: CountryCode = FALLBACK_REGION): string | null {
  const cleaned = input.trim().replace(/[^\d+]/g, '').replace(/^00/, '+');
  if (!cleaned) return null;
  const parsed = parsePhoneNumberFromString(cleaned, region);
  if (parsed?.isValid()) return parsed.number;
  if (/^[1-9]\d{7,14}$/.test(cleaned)) {
    const international = parsePhoneNumberFromString(`+${cleaned}`);
    if (international?.isValid()) return international.number;
  }
  return parsed?.isPossible() ? parsed.number : null;
}

/** SHA-256 of an E.164 number, as used by /contacts/match. */
export function hashPhone(e164: string): string {
  return bytesToHex(sha256(utf8ToBytes(e164)));
}
