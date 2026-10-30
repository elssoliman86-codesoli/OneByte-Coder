import type { Plugin } from '@capacitor/core';

export interface SecureStoragePlugin extends Plugin {
  get(options: { key: string }): Promise<{ value: string | null }>;
  set(options: { key: string; value: string }): Promise<void>;
  remove(options: { key: string }): Promise<void>;
}

export declare const SecureStorage: SecureStoragePlugin;
