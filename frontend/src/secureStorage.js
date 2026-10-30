import { Capacitor } from '@capacitor/core';
import { SecureStorage } from '@onebyte/secure-storage';

const webSecrets = new Map();

export async function getSecret(key) {
  if (Capacitor.isNativePlatform()) return (await SecureStorage.get({ key })).value;
  return webSecrets.get(key) ?? null;
}

export async function setSecret(key, value) {
  if (Capacitor.isNativePlatform()) return SecureStorage.set({ key, value });
  if (value) webSecrets.set(key, value);
  else webSecrets.delete(key);
}

export async function removeSecret(key) {
  if (Capacitor.isNativePlatform()) return SecureStorage.remove({ key });
  webSecrets.delete(key);
}
