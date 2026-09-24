/**
 * Public links. DOWNLOAD_URL is where invited people get the app: the
 * TestFlight public link during the beta, the App Store link later. While
 * it's null the invite page asks them to get the link from their friend.
 */
export const WEB_URL = 'https://cmm-app.netlify.app';
export const INVITE_URL = `${WEB_URL}/einladung`;
export const DOWNLOAD_URL: string | null = null;

export const inviteText = (fromName?: string) =>
  `${fromName ? `${fromName} hier! ` : 'Hey! '}Ich nutze Call Me Maybe – da siehst du, wann ich Zeit für einen Anruf habe, und wir erwischen uns endlich mal. Hol dir die App: ${INVITE_URL}`;
