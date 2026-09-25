import { File, Paths } from 'expo-file-system';
import { Share } from 'react-native';
import { apiFetch } from '../utils/api';

/** Deletes the account and all its data on the server. */
export async function deleteAccount(): Promise<void> {
  const res = await apiFetch('/me', { method: 'DELETE' }, 20000);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
}

/** Writes everything stored about the user to a JSON file and opens the share sheet. */
export async function exportAccountData(): Promise<void> {
  const res = await apiFetch('/me/export', {}, 20000);
  const body = await res.json();
  if (!res.ok || !body.data) throw new Error(`HTTP ${res.status}`);

  const file = new File(Paths.cache, `wanna-yap-daten-${new Date().toISOString().slice(0, 10)}.json`);
  if (file.exists) file.delete();
  file.create();
  file.write(JSON.stringify(body.data, null, 2));
  await Share.share({ url: file.uri, title: 'Meine Wanna yap? Daten' });
}
