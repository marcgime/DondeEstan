export interface WorkerEnv {
  readonly FIREBASE_SERVICE_ACCOUNT?: string;
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

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/admin/delete-user') {
      return handleAdminDeleteUser(request, env);
    }
    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }
    return new Response('Not Found', { status: 404 });
  },
};
