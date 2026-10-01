/**
 * Public links on wannayap.app (netlify.toml, scripts/build-web.sh).
 * DOWNLOAD_URL is a redirect on the website (public/download.html) that points to
 * TestFlight during the beta and to the App Store later, without a new build.
 * The invite link carries the sender's code (`?von=`) so that /einladung and the
 * sign-up can tell who invited whom (backend User.inviteCode, POST /invites/visit).
 */
export const WEB_URL = 'https://wannayap.app';
export const INVITE_URL = `${WEB_URL}/einladung`;
export const DOWNLOAD_URL: string | null = `${WEB_URL}/download`;

/** The personal invite link; without a code (older servers) the plain page. */
export const inviteUrl = (code?: string | null) => (code ? `${INVITE_URL}?von=${encodeURIComponent(code)}` : INVITE_URL);

export const inviteText = (fromName?: string, code?: string | null) =>
  `${fromName ? `${fromName} hier! ` : 'Hey! '}Ich nutze Wanna yap? – da siehst du, wann ich Zeit für einen Anruf habe, und wir erwischen uns endlich mal. Hol dir die App: ${inviteUrl(code)}`;
