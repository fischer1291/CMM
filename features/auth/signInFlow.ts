/**
 * What happens after the SMS code (app/(auth)/verify.tsx) and after the
 * answer to "Ist das dein Konto?" (app/(auth)/account-check.tsx, plan 2.9):
 * read the backend's answer, ask the question when the number belonged to
 * an account that was quiet for half a year, else sign in. Kept apart from
 * the screens so the routing can be tested.
 */
import { apiFetch, apiPostJson } from '../../utils/api';
import { clearInviteCode } from '../../services/invites';

/** The previous account behind a recycled number, as POST /verify/check sends it. */
export type AccountCheck = { name: string; avatarUrl: string; lastActiveMonth: string };

/** Route params of app/(auth)/account-check.tsx (strings only). */
export type AccountCheckParams = {
  phone: string;
  checkToken: string;
  name: string;
  avatarUrl: string;
  lastActiveMonth: string;
  /** "1" when onboarding confirmed the age; the consent goes along again */
  ageConfirmed: string;
};

export type VerifyOutcome =
  | { kind: 'error'; message: string | null }
  | { kind: 'account_check'; params: AccountCheckParams }
  | { kind: 'signed_in'; token: string | null; name: string | undefined };

/**
 * The answer of POST /verify/check or /verify/account-check, sorted: an
 * error, the question (accountCheck and a checkToken, no token), or a
 * sign-in (a token, or none from a backend without token auth).
 */
export function verifyOutcome(data: any, phone: string, ageConfirmed: boolean): VerifyOutcome {
  if (!data?.success) return { kind: 'error', message: typeof data?.error === 'string' ? data.error : null };
  const check = data.accountCheck;
  if (!data.token && check && typeof data.checkToken === 'string') {
    return {
      kind: 'account_check',
      params: {
        phone,
        checkToken: data.checkToken,
        name: typeof check.name === 'string' ? check.name : '',
        avatarUrl: typeof check.avatarUrl === 'string' ? check.avatarUrl : '',
        lastActiveMonth: typeof check.lastActiveMonth === 'string' ? check.lastActiveMonth : '',
        ageConfirmed: ageConfirmed ? '1' : '',
      },
    };
  }
  return {
    kind: 'signed_in',
    token: typeof data.token === 'string' ? data.token : null,
    name: typeof data.user?.name === 'string' ? data.user.name : undefined,
  };
}

const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

/** "2026-03" → "März 2026"; null for anything else. */
export function formatActiveMonth(month: string | null | undefined): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(month || '');
  if (!m) return null;
  const index = Number(m[2]) - 1;
  return index >= 0 && index < 12 ? `${MONTHS[index]} ${m[1]}` : null;
}

type SignIn = (phone: string, token: string | null, options?: { needsProfileSetup?: boolean }) => Promise<void>;

/**
 * Sign in after a successful verification: a pending invite code is used
 * up only now (plan 1.11a: it must survive the question), a backend
 * without token auth creates the account with /auth/register, and users
 * without a name set up their profile first.
 */
export async function finishSignIn(
  phone: string,
  outcome: { token: string | null; name: string | undefined },
  signIn: SignIn,
  usedInviteCode: boolean
): Promise<void> {
  if (usedInviteCode) await clearInviteCode();
  if (!outcome.token) {
    // Backend without token auth creates the account here
    await apiPostJson('/auth/register', { phone }, 10000);
  }
  let name = outcome.name;
  if (name === undefined) {
    const profileRes = await apiFetch(`/me?phone=${encodeURIComponent(phone)}`, {}, 10000);
    name = (await profileRes.json())?.user?.name;
  }
  await signIn(phone, outcome.token, { needsProfileSetup: !name });
}
