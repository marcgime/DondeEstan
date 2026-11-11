import { describe, it, expect, vi } from 'vitest';
import { normalizeEmail, verifyEmailEligibility } from '@/auth/whitelist';
import type { Firestore } from 'firebase/firestore';

// Mock de Firestore document snapshot
function createMockDocSnap(exists: boolean, data: Record<string, unknown> = {}) {
  return {
    exists: () => exists,
    data: () => data,
  };
}

describe('Whitelist Validation & Normalization', () => {
  it('normalizes email correctly (lowercase and trimmed)', () => {
    expect(normalizeEmail('  Familia@Correo.COM  ')).toBe('familia@correo.com');
    expect(normalizeEmail('MARC@gimenez.es')).toBe('marc@gimenez.es');
  });

  it('rejects malformed email addresses', async () => {
    const mockDb = {} as Firestore;
    const res = await verifyEmailEligibility(mockDb, 'no-es-un-correo');
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain('válida');
  });

  it('rejects registration when registration_open is false', async () => {
    const mockDb = {} as Firestore;
    // Mock getDoc de firebase/firestore
    vi.mock('firebase/firestore', async (importOriginal) => {
      const actual = await importOriginal<typeof import('firebase/firestore')>();
      return {
        ...actual,
        doc: vi.fn(),
        getDoc: vi.fn().mockImplementation(async () => {
          // Si es config/system
          return createMockDocSnap(true, { registration_open: false });
        }),
      };
    });

    const res = await verifyEmailEligibility(mockDb, 'hijo@familia.es');
    expect(res.eligible).toBe(false);
    expect(res.reason).toContain('cerrado');
  });
});
