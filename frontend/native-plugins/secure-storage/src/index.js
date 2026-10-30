import { registerPlugin } from '@capacitor/core';

const NativeSecureStorage = registerPlugin('OneByteSecureStorage');

export const SecureStorage = {
  async get({ key }) {
    return NativeSecureStorage.get({ key });
  },
  async set({ key, value }) {
    return NativeSecureStorage.set({ key, value });
  },
  async remove({ key }) {
    return NativeSecureStorage.remove({ key });
  },
};
