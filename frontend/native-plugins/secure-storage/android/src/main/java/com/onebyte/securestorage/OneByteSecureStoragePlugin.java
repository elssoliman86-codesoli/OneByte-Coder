package com.onebyte.securestorage;

import android.content.SharedPreferences;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.nio.ByteBuffer;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

@CapacitorPlugin(name = "OneByteSecureStorage")
public class OneByteSecureStoragePlugin extends Plugin {
    private static final String PREFS = "onebyte_secure_values";
    private static final String KEY_ALIAS = "onebyte_api_secret_aes_gcm_v1";
    private static final String ANDROID_KEY_STORE = "AndroidKeyStore";
    private static final int GCM_TAG_BITS = 128;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, android.content.Context.MODE_PRIVATE);
    }

    private SecretKey getOrCreateKey() throws Exception {
        KeyStore keyStore = KeyStore.getInstance(ANDROID_KEY_STORE);
        keyStore.load(null);
        java.security.Key existing = keyStore.getKey(KEY_ALIAS, null);
        if (existing instanceof SecretKey) return (SecretKey) existing;

        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEY_STORE);
        generator.init(new KeyGenParameterSpec.Builder(
            KEY_ALIAS,
            KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT
        ).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
         .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
         .setRandomizedEncryptionRequired(true)
         .build());
        return generator.generateKey();
    }

    @PluginMethod
    public void set(PluginCall call) {
        String key = call.getString("key");
        String value = call.getString("value");
        if (key == null || key.isEmpty() || value == null) {
            call.reject("Both key and value are required");
            return;
        }
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey());
            byte[] encrypted = cipher.doFinal(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            byte[] iv = cipher.getIV();
            ByteBuffer payload = ByteBuffer.allocate(4 + iv.length + encrypted.length);
            payload.putInt(iv.length).put(iv).put(encrypted);
            String encoded = Base64.encodeToString(payload.array(), Base64.NO_WRAP);
            if (!prefs().edit().putString(key, encoded).commit()) throw new IllegalStateException("Could not persist encrypted value");
            call.resolve();
        } catch (Exception e) {
            call.reject("Secure storage write failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void get(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("A key is required");
            return;
        }
        String encoded = prefs().getString(key, null);
        JSObject result = new JSObject();
        if (encoded == null) {
            result.put("value", JSObject.NULL);
            call.resolve(result);
            return;
        }
        try {
            ByteBuffer payload = ByteBuffer.wrap(Base64.decode(encoded, Base64.NO_WRAP));
            int ivLength = payload.getInt();
            if (ivLength < 12 || ivLength > 16 || payload.remaining() <= ivLength) throw new IllegalStateException("Encrypted value is malformed");
            byte[] iv = new byte[ivLength];
            payload.get(iv);
            byte[] encrypted = new byte[payload.remaining()];
            payload.get(encrypted);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), new GCMParameterSpec(GCM_TAG_BITS, iv));
            String value = new String(cipher.doFinal(encrypted), java.nio.charset.StandardCharsets.UTF_8);
            result.put("value", value);
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Secure storage read failed: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void remove(PluginCall call) {
        String key = call.getString("key");
        if (key == null || key.isEmpty()) {
            call.reject("A key is required");
            return;
        }
        if (!prefs().edit().remove(key).commit()) {
            call.reject("Could not remove secure value");
            return;
        }
        call.resolve();
    }
}
