import {
  generateVapidKeys,
  sendWebPushNotification,
  type VapidKeyPairData,
  type WebPushSubscriptionRecord,
} from './web_push';

export interface WorkerEnv {
  readonly FIREBASE_SERVICE_ACCOUNT?: string;
  readonly VAPID_PUBLIC_KEY?: string;
  readonly VAPID_PRIVATE_JWK?: string;
  readonly ASSETS?: {
    fetch(request: Request): Promise<Response>;
  };
}

interface ServiceAccountCredentials {
  readonly project_id: string;
  readonly client_email: string;
  readonly private_key: string;
}

interface DeleteUserPayload {
  readonly targetUid?: string;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeString(str: string): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(str));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\s+/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleAccessToken(sa: ServiceAccountCredentials): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncodeString(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const payload = base64UrlEncodeString(
    JSON.stringify({
      iss: sa.client_email,
      sub: sa.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope:
        'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore',
    })
  );

  const signingInput = `${header}.${payload}`;
  const keyBuffer = pemToArrayBuffer(sa.private_key);
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );

  const assertion = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(signature))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${assertion}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Error OAuth2 Google (${tokenRes.status}): ${errText}`);
  }

  const tokenData = (await tokenRes.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('No se obtuvo access_token de Google OAuth2.');
  }
  return tokenData.access_token;
}

async function verifyAdminCaller(
  idToken: string,
  projectId: string,
  accessToken: string
): Promise<string> {
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!lookupRes.ok) {
    throw new Error('Token de sesión no válido.');
  }

  const lookupData = (await lookupRes.json()) as {
    users?: Array<{ localId?: string }>;
  };
  const callerUid = lookupData.users?.[0]?.localId;
  if (!callerUid) {
    throw new Error('No se pudo identificar al usuario solicitante.');
  }

  const docRes = await fetch(
    `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${callerUid}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!docRes.ok) {
    throw new Error('No se pudo verificar el perfil del administrador.');
  }

  const docData = (await docRes.json()) as {
    fields?: { role?: { stringValue?: string } };
  };
  const role = docData.fields?.role?.stringValue;
  if (role !== 'admin') {
    throw new Error('Permiso denegado: solo el administrador puede eliminar usuarios.');
  }

  return callerUid;
}

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export async function handleAdminDeleteUser(
  request: Request,
  env: WorkerEnv
): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    return jsonResponse(
      {
        error:
          'Falta configurar la variable FIREBASE_SERVICE_ACCOUNT en Cloudflare Workers.',
      },
      501
    );
  }

  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return jsonResponse({ error: 'Falta token de autorización.' }, 401);
  }

  let body: DeleteUserPayload;
  try {
    body = (await request.json()) as DeleteUserPayload;
  } catch (err) {
    console.warn('Cuerpo JSON inválido en delete-user:', err);
    return jsonResponse({ error: 'Cuerpo de petición inválido.' }, 400);
  }

  const targetUid = body.targetUid?.trim();
  if (!targetUid) {
    return jsonResponse({ error: 'Falta targetUid.' }, 400);
  }

  let sa: ServiceAccountCredentials;
  try {
    sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccountCredentials;
  } catch (err) {
    console.error('FIREBASE_SERVICE_ACCOUNT no es un JSON válido:', err);
    return jsonResponse(
      { error: 'Configuración FIREBASE_SERVICE_ACCOUNT inválida.' },
      500
    );
  }

  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    return jsonResponse(
      { error: 'FIREBASE_SERVICE_ACCOUNT incompleto.' },
      500
    );
  }

  try {
    const accessToken = await getGoogleAccessToken(sa);
    const callerUid = await verifyAdminCaller(idToken, sa.project_id, accessToken);

    if (callerUid === targetUid) {
      return jsonResponse(
        { error: 'El administrador no puede auto-eliminarse.' },
        400
      );
    }

    const deleteRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:delete`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ localId: targetUid }),
      }
    );

    if (!deleteRes.ok) {
      const errText = await deleteRes.text();
      if (!errText.includes('USER_NOT_FOUND')) {
        return jsonResponse(
          { error: `No se pudo borrar de Firebase Auth: ${errText}` },
          502
        );
      }
    }

    return jsonResponse({ ok: true, deletedUid: targetUid }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error interno del Worker.';
    return jsonResponse({ error: message }, 403);
  }
}

interface ChatNotifyPayload {
  readonly groupId?: string;
  readonly senderName?: string;
  readonly text?: string;
}

interface FirestoreStringValue {
  stringValue?: string;
}

interface FirestoreDoc {
  name?: string;
  fields?: Record<string, unknown>;
}

async function verifyAuthenticatedUid(
  idToken: string,
  projectId: string,
  accessToken: string
): Promise<string> {
  const lookupRes = await fetch(
    `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    }
  );

  if (!lookupRes.ok) {
    throw new Error('Token de sesión no válido.');
  }

  const lookupData = (await lookupRes.json()) as {
    users?: Array<{ localId?: string }>;
  };
  const callerUid = lookupData.users?.[0]?.localId;
  if (!callerUid) {
    throw new Error('No se pudo identificar al usuario remitente.');
  }
  return callerUid;
}

function parseServiceAccount(env: WorkerEnv): ServiceAccountCredentials {
  if (!env.FIREBASE_SERVICE_ACCOUNT) {
    throw new Error('MISSING_SA');
  }
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT) as ServiceAccountCredentials;
  if (!sa.project_id || !sa.client_email || !sa.private_key) {
    throw new Error('INVALID_SA');
  }
  return sa;
}

async function getOrCreateVapidKeys(
  env: WorkerEnv,
  projectId: string,
  accessToken: string
): Promise<VapidKeyPairData> {
  if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_JWK) {
    return {
      publicKey: env.VAPID_PUBLIC_KEY,
      privateJwk: env.VAPID_PRIVATE_JWK,
    };
  }

  const docUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/web_push`;
  const getRes = await fetch(docUrl, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (getRes.ok) {
    const docData = (await getRes.json()) as {
      fields?: {
        publicKey?: FirestoreStringValue;
        privateJwk?: FirestoreStringValue;
      };
    };
    const publicKey = docData.fields?.publicKey?.stringValue;
    const privateJwk = docData.fields?.privateJwk?.stringValue;
    if (publicKey && privateJwk) {
      return { publicKey, privateJwk };
    }
  }

  const generated = await generateVapidKeys();
  await fetch(docUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        publicKey: { stringValue: generated.publicKey },
        privateJwk: { stringValue: generated.privateJwk },
      },
    }),
  });

  return generated;
}

function extractPushSubscriptions(fields: Record<string, unknown>): WebPushSubscriptionRecord[] {
  const subsField = fields.push_subscriptions as
    | { arrayValue?: { values?: Array<{ mapValue?: { fields?: Record<string, FirestoreStringValue> } }> } }
    | undefined;
  const values = subsField?.arrayValue?.values;
  if (!Array.isArray(values)) return [];

  const result: WebPushSubscriptionRecord[] = [];
  for (const item of values) {
    const mapFields = item.mapValue?.fields;
    const endpoint = mapFields?.endpoint?.stringValue;
    const p256dh = mapFields?.p256dh?.stringValue;
    const auth = mapFields?.auth?.stringValue;
    if (endpoint && p256dh && auth) {
      result.push({ endpoint, keys: { p256dh, auth } });
    }
  }
  return result;
}

export async function handleGetVapidKey(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  if (env.VAPID_PUBLIC_KEY) {
    return jsonResponse({ publicKey: env.VAPID_PUBLIC_KEY }, 200);
  }

  try {
    const sa = parseServiceAccount(env);
    const accessToken = await getGoogleAccessToken(sa);
    const vapid = await getOrCreateVapidKeys(env, sa.project_id, accessToken);
    return jsonResponse({ publicKey: vapid.publicKey }, 200);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error obteniendo clave VAPID.';
    return jsonResponse({ error: msg }, msg === 'MISSING_SA' ? 501 : 500);
  }
}

export async function handleChatNotify(request: Request, env: WorkerEnv): Promise<Response> {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Método no permitido.' }, 405);
  }

  const authHeader = request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return jsonResponse({ error: 'Falta token de autorización.' }, 401);
  }

  let body: ChatNotifyPayload;
  try {
    body = (await request.json()) as ChatNotifyPayload;
  } catch {
    return jsonResponse({ error: 'Cuerpo JSON inválido.' }, 400);
  }

  const groupId = body.groupId?.trim();
  const text = body.text?.trim();
  if (!groupId || !text) {
    return jsonResponse({ error: 'Faltan groupId o text.' }, 400);
  }

  try {
    const sa = parseServiceAccount(env);
    const accessToken = await getGoogleAccessToken(sa);
    const senderUid = await verifyAuthenticatedUid(idToken, sa.project_id, accessToken);
    const vapid = await getOrCreateVapidKeys(env, sa.project_id, accessToken);

    // 1. Obtener nombre del grupo
    let groupName = 'Familia';
    const groupRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/groups/${encodeURIComponent(groupId)}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (groupRes.ok) {
      const groupDoc = (await groupRes.json()) as FirestoreDoc;
      const nameVal = (groupDoc.fields?.name as FirestoreStringValue | undefined)?.stringValue;
      if (nameVal) groupName = nameVal;
    }

    // 2. Obtener miembros del grupo con notificaciones activadas
    const usersRes = await fetch(
      `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/users?pageSize=100`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!usersRes.ok) {
      return jsonResponse({ error: 'No se pudieron consultar los usuarios.' }, 502);
    }

    const usersList = (await usersRes.json()) as { documents?: FirestoreDoc[] };
    const senderName = body.senderName?.trim() || 'Familiar';
    const pushPromises: Promise<unknown>[] = [];

    for (const userDoc of usersList.documents || []) {
      const uid = userDoc.name?.split('/').pop() || '';
      if (!uid || uid === senderUid || !userDoc.fields) continue;

      const status = (userDoc.fields.status as FirestoreStringValue | undefined)?.stringValue;
      const role = (userDoc.fields.role as FirestoreStringValue | undefined)?.stringValue;
      if (status !== 'active' && role !== 'admin') continue;

      const notifField = userDoc.fields.chat_notifications_enabled as
        | { booleanValue?: boolean }
        | undefined;
      if (notifField && notifField.booleanValue === false) continue;

      const groupIdsField = userDoc.fields.groupIds as
        | { arrayValue?: { values?: FirestoreStringValue[] } }
        | undefined;
      const memberGroups = (groupIdsField?.arrayValue?.values || [])
        .map((v) => v.stringValue || '')
        .filter(Boolean);

      if (role !== 'admin' && !memberGroups.includes(groupId)) continue;

      const subs = extractPushSubscriptions(userDoc.fields);
      for (const sub of subs) {
        pushPromises.push(
          sendWebPushNotification(
            sub,
            {
              title: `${senderName} · ${groupName}`,
              body: text.slice(0, 140),
              groupId,
              tag: `chat-${groupId}`,
              url: '/',
            },
            vapid
          ).catch(() => null)
        );
      }
    }

    await Promise.all(pushPromises);
    return jsonResponse({ ok: true, notified: pushPromises.length }, 200);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error enviando notificaciones push.';
    return jsonResponse({ error: message }, message === 'MISSING_SA' ? 501 : 500);
  }
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/delete-user') {
      return handleAdminDeleteUser(request, env);
    }
    if (url.pathname === '/api/push/vapid-key') {
      return handleGetVapidKey(request, env);
    }
    if (url.pathname === '/api/chat/notify') {
      return handleChatNotify(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
