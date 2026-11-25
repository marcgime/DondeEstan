export interface WebPushSubscriptionRecord {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  updated_at?: number;
}

export interface VapidKeyPairData {
  publicKey: string;
  privateJwk: string;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  const padding = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

function concatUint8Arrays(...arrays: Uint8Array[]): Uint8Array {
  const totalLen = arrays.reduce((sum, arr) => sum + arr.byteLength, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.byteLength;
  }
  return result;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

export async function generateVapidKeys(): Promise<VapidKeyPairData> {
  const keyPair = (await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  const privateJwkObj = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
  const xBytes = base64UrlDecode(privateJwkObj.x || '');
  const yBytes = base64UrlDecode(privateJwkObj.y || '');
  const uncompressedPublic = concatUint8Arrays(new Uint8Array([0x04]), xBytes, yBytes);

  return {
    publicKey: base64UrlEncode(uncompressedPublic),
    privateJwk: JSON.stringify(privateJwkObj),
  };
}

async function createVapidJwt(
  audience: string,
  subject: string,
  privateJwkStr: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const payloadB64 = base64UrlEncode(
    encoder.encode(
      JSON.stringify({
        aud: audience,
        exp: now + 12 * 3600,
        sub: subject,
      })
    )
  );

  const signingInput = `${headerB64}.${payloadB64}`;
  const jwk = JSON.parse(privateJwkStr) as JsonWebKey;
  const privateKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    encoder.encode(signingInput)
  );

  const signatureB64 = base64UrlEncode(new Uint8Array(signatureBuffer));
  return `${signingInput}.${signatureB64}`;
}

export async function encryptWebPushPayload(
  payloadText: string,
  p256dhBase64Url: string,
  authBase64Url: string
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const uaPublicBytes = base64UrlDecode(p256dhBase64Url);
  const authSecretBytes = base64UrlDecode(authBase64Url);

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const asKeyPair = (await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )) as CryptoKeyPair;

  const asPublicBytes = new Uint8Array(await crypto.subtle.exportKey('raw', asKeyPair.publicKey));
  const uaPublicKey = await crypto.subtle.importKey(
    'raw',
    toArrayBuffer(uaPublicBytes),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublicKey },
    asKeyPair.privateKey,
    256
  );

  // RFC 8291 §3.3: HKDF-SHA-256 para derivar IKM del payload
  const sharedSecretKey = await crypto.subtle.importKey(
    'raw',
    sharedSecretBits,
    'HKDF',
    false,
    ['deriveBits']
  );

  const keyInfo = concatUint8Arrays(
    encoder.encode('WebPush: info\0'),
    uaPublicBytes,
    asPublicBytes
  );

  const ikmBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(authSecretBytes),
      info: toArrayBuffer(keyInfo),
    },
    sharedSecretKey,
    256
  );

  const ikmKey = await crypto.subtle.importKey('raw', ikmBits, 'HKDF', false, ['deriveBits']);

  const cekBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(encoder.encode('Content-Encoding: aes128gcm\0')),
    },
    ikmKey,
    128
  );

  const nonceBits = await crypto.subtle.deriveBits(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: toArrayBuffer(salt),
      info: toArrayBuffer(encoder.encode('Content-Encoding: nonce\0')),
    },
    ikmKey,
    96
  );

  const aesKey = await crypto.subtle.importKey('raw', cekBits, { name: 'AES-GCM' }, false, [
    'encrypt',
  ]);

  // Delimitador final de registro 0x02 (RFC 8188)
  const paddedPlaintext = concatUint8Arrays(encoder.encode(payloadText), new Uint8Array([0x02]));
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonceBits },
      aesKey,
      toArrayBuffer(paddedPlaintext)
    )
  );

  // Cabecera aes128gcm: salt (16) + rs (4, BE=4096) + idlen (1=65) + keyid (65)
  const header = new Uint8Array(16 + 4 + 1 + asPublicBytes.byteLength);
  header.set(salt, 0);
  const view = new DataView(header.buffer);
  view.setUint32(16, 4096, false);
  header[20] = asPublicBytes.byteLength;
  header.set(asPublicBytes, 21);

  return concatUint8Arrays(header, ciphertext);
}

export async function sendWebPushNotification(
  subscription: WebPushSubscriptionRecord,
  payload: Record<string, unknown>,
  vapid: VapidKeyPairData,
  subject = 'mailto:soporte@dondeestan.app'
): Promise<{ ok: boolean; status: number; expired: boolean }> {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const jwt = await createVapidJwt(audience, subject, vapid.privateJwk);
  const encryptedBody = await encryptWebPushPayload(
    JSON.stringify(payload),
    subscription.keys.p256dh,
    subscription.keys.auth
  );

  const res = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${vapid.publicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
      Urgency: 'high',
    },
    body: toArrayBuffer(encryptedBody),
  });

  return {
    ok: res.ok,
    status: res.status,
    expired: res.status === 404 || res.status === 410,
  };
}
