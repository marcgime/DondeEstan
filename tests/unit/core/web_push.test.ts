import { describe, it, expect, vi } from 'vitest';
import {
  base64UrlEncode,
  base64UrlDecode,
  generateVapidKeys,
  encryptWebPushPayload,
} from '../../../src/core/web_push';
import { handleGetVapidKey, handleChatNotify } from '../../../src/core/worker';

describe('Web Push Cryptography & Worker Endpoints (BR-CORE-03)', () => {
  it('genera claves VAPID ECDSA P-256 válidas (65 bytes sin comprimir)', async () => {
    const keys = await generateVapidKeys();
    const pubBytes = base64UrlDecode(keys.publicKey);
    expect(pubBytes.byteLength).toBe(65);
    expect(pubBytes[0]).toBe(0x04);

    const parsedJwk = JSON.parse(keys.privateJwk) as { kty: string; crv: string; d?: string };
    expect(parsedJwk.kty).toBe('EC');
    expect(parsedJwk.crv).toBe('P-256');
    expect(parsedJwk.d).toBeTruthy();
  });

  it('cifra un payload Web Push en formato aes128gcm (RFC 8291)', async () => {
    const uaKeyPair = (await crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveBits']
    )) as CryptoKeyPair;

    const uaPublicRaw = new Uint8Array(
      await crypto.subtle.exportKey('raw', uaKeyPair.publicKey)
    );
    const p256dh = base64UrlEncode(uaPublicRaw);
    const auth = base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));

    const encrypted = await encryptWebPushPayload(
      JSON.stringify({ title: 'Ana · Familia', body: 'Hola!' }),
      p256dh,
      auth
    );

    // Cabecera aes128gcm: salt(16) + rs(4) + idlen(1) + keyid(65) = 86 bytes + ciphertext
    expect(encrypted.byteLength).toBeGreaterThan(86);
    expect(encrypted[20]).toBe(65);
  });

  it('GET /api/push/vapid-key devuelve la clave pública configurada en env', async () => {
    const req = new Request('https://dondeestan.app/api/push/vapid-key', { method: 'GET' });
    const res = await handleGetVapidKey(req, { VAPID_PUBLIC_KEY: 'test-pub-key' });
    expect(res.status).toBe(200);
    const data = (await res.json()) as { publicKey: string };
    expect(data.publicKey).toBe('test-pub-key');
  });

  it('POST /api/chat/notify rechaza peticiones sin token Bearer (401)', async () => {
    const req = new Request('https://dondeestan.app/api/chat/notify', {
      method: 'POST',
      body: JSON.stringify({ groupId: 'g1', text: 'Hola' }),
    });
    const res = await handleChatNotify(req, {});
    expect(res.status).toBe(401);
    vi.restoreAllMocks();
  });
});
