/**
 * Public links on wannayap.app (netlify.toml, scripts/build-web.sh).
 * DOWNLOAD_URL is a redirect on the website (public/download.html) that points to
 * TestFlight during the beta and to the App Store later, without a new build.
 */
export const WEB_URL = 'https://wannayap.app';
export const INVITE_URL = `${WEB_URL}/einladung`;
export const DOWNLOAD_URL: string | null = `${WEB_URL}/download`;

export const inviteText = (fromName?: string) =>
  `${fromName ? `${fromName} hier! ` : 'Hey! '}Ich nutze Wanna yap? – da siehst du, wann ich Zeit für einen Anruf habe, und wir erwischen uns endlich mal. Hol dir die App: ${INVITE_URL}`;
