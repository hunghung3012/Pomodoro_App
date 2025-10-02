import { Preferences } from '@capacitor/preferences';
export async function setJSON<T>(key: string, value: T) {
await Preferences.set({ key, value: JSON.stringify(value) });
}
export async function getJSON<T>(key: string, fallback: T): Promise<T> {
const { value } = await Preferences.get({ key });
return value ? JSON.parse(value) as T : fallback;
}
