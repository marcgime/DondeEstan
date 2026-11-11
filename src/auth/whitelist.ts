import { doc, getDoc, type Firestore } from 'firebase/firestore';
import type { EligibilityResult, WhitelistEntry } from './types';

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function verifyEmailEligibility(
  db: Firestore,
  rawEmail: string
): Promise<EligibilityResult> {
  const email = normalizeEmail(rawEmail);
  if (!email || !email.includes('@')) {
    return {
      eligible: false,
      reason: 'Introduce una dirección de correo electrónico válida.',
    };
  }

  try {
    // 1. Verificar si el registro global está abierto
    const systemConfigRef = doc(db, 'config', 'system');
    const systemSnap = await getDoc(systemConfigRef);

    if (systemSnap.exists()) {
      const systemData = systemSnap.data();
      if (systemData.registration_open === false) {
        return {
          eligible: false,
          reason: 'El registro familiar está temporalmente cerrado por el administrador.',
        };
      }
    }

    // 2. Comprobar preautorización en la lista blanca
    const whitelistRef = doc(db, 'whitelist', email);
    const whitelistSnap = await getDoc(whitelistRef);

    if (!whitelistSnap.exists()) {
      return {
        eligible: false,
        reason: 'Este correo no está autorizado en el núcleo familiar. Contacta con el administrador.',
      };
    }

    const data = whitelistSnap.data() as WhitelistEntry;
    const status = data.status;

    if (status === 'preapproved') {
      return {
        eligible: true,
        entry: {
          email,
          status: 'preapproved',
          uid: data.uid || null,
          added_at: data.added_at,
        },
      };
    }

    if (status === 'pending_approval') {
      return {
        eligible: false,
        reason: 'Tu solicitud ya ha sido registrada y está pendiente de aprobación por el administrador.',
        entry: data,
      };
    }

    if (status === 'active') {
      return {
        eligible: false,
        reason: 'Esta cuenta ya está registrada y aprobada. Por favor, inicia sesión.',
        entry: data,
      };
    }

    return {
      eligible: false,
      reason: 'El estado actual de este correo no permite el registro.',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al verificar la lista blanca';
    return {
      eligible: false,
      reason: `No se pudo verificar la autorización: ${message}`,
    };
  }
}

