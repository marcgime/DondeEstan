import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GuiaService } from '../../../src/guia/guia_service';
import { generateGroupItinerary, calculateTripDurationDays } from '../../../src/guia/generator';
import type { Firestore } from 'firebase/firestore';
import type { NewTripRequest } from '../../../src/guia/types';

vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((_db, _col, _sub, _subCol, id) => ({ type: 'doc-ref', id })),
    collection: vi.fn((_db, ...parts) => ({ type: 'col-ref', path: parts.join('/') })),
    addDoc: vi.fn(async () => ({ id: 'new-trip-123' })),
    deleteDoc: vi.fn(async () => {}),
    query: vi.fn((...args) => ({ type: 'query', args })),
    orderBy: vi.fn((field, dir) => ({ type: 'orderBy', field, dir })),
    onSnapshot: vi.fn((_q, cb) => {
      cb({
        docs: [
          {
            id: 'trip-1',
            data: () => ({
              metadatos: {
                destino: 'Granada',
                duracion_dias: 3,
                fecha_llegada: '2026-12-01',
                fecha_salida: '2026-12-04',
                presupuesto_estimado_por_persona: 350,
                created_by: 'uid-1',
                created_by_name: 'Marc',
              },
              plan_diario: [],
              created_at: 1000,
            }),
          },
        ],
      });
      return () => {};
    }),
  };
});

describe('Guia Module Tests', () => {
  describe('calculateTripDurationDays', () => {
    it('debe calcular correctamente los días entre dos fechas', () => {
      expect(calculateTripDurationDays('2026-12-01', '2026-12-04')).toBe(3);
      expect(calculateTripDurationDays('2026-12-01', '2026-12-01')).toBe(1);
      expect(calculateTripDurationDays('2026-12-05', '2026-12-01')).toBe(1);
    });
  });

  describe('generateGroupItinerary', () => {
    it('debe generar un itinerario completo con metadatos y plan diario por franjas', () => {
      const request: NewTripRequest = {
        destino: 'Roma',
        alojamiento: 'Trastevere',
        fecha_llegada: '2026-12-10',
        fecha_salida: '2026-12-13',
        preferencias: {
          entorno_principal: 5,
          estilo_planificacion: 3,
          ritmo_viaje: 3,
          enfoque_cultural_vs_ocio: 5,
          prioridad_gastronomica: 4,
          presupuesto_confort: 3,
          movilidad_transporte: 2,
          experiencia_social: 4,
          vida_nocturna_horario: 3,
          actividad_fisica: 2,
        },
      };

      const itinerary = generateGroupItinerary(request, 'grp-1', 'uid-123', 'Marc');

      expect(itinerary.groupId).toBe('grp-1');
      expect(itinerary.metadatos.destino).toBe('Roma');
      expect(itinerary.metadatos.duracion_dias).toBe(3);
      expect(itinerary.metadatos.presupuesto_estimado_por_persona).toBeGreaterThan(0);
      expect(itinerary.plan_diario).toHaveLength(3);
      expect(itinerary.plan_diario[0].franjas.manana?.actividades).toBeTruthy();
      expect(itinerary.plan_diario[0].franjas.manana?.sugerencia_gastronomica).toBeTruthy();
    });
  });

  describe('GuiaService', () => {
    let service: GuiaService;

    beforeEach(() => {
      service = new GuiaService({} as Firestore);
    });

    it('debe rechazar creación sin groupId', async () => {
      await expect(
        service.createTrip('', {
          groupId: '',
          metadatos: {} as any,
          plan_diario: [],
        })
      ).rejects.toThrow('ID de grupo requerido');
    });

    it('debe crear un viaje y devolver su ID', async () => {
      const tripId = await service.createTrip('grp-1', {
        groupId: 'grp-1',
        metadatos: { destino: 'Paris' } as any,
        plan_diario: [],
      });
      expect(tripId).toBe('new-trip-123');
    });

    it('debe suscribirse a los viajes del grupo', () => {
      const cb = vi.fn();
      const unsub = service.subscribeToGroupTrips('grp-1', cb);
      expect(cb).toHaveBeenCalledWith([
        expect.objectContaining({
          id: 'trip-1',
          groupId: 'grp-1',
          metadatos: expect.objectContaining({ destino: 'Granada' }),
        }),
      ]);
      expect(typeof unsub).toBe('function');
    });

    it('debe eliminar un viaje sin errores', async () => {
      await expect(service.deleteTrip('grp-1', 'trip-1')).resolves.not.toThrow();
    });
  });

  describe('renderGuiaView (acceso único sin menú superior)', () => {
    it('renderiza el iframe de GuIA directamente sin barra superior ni selector de grupos', async () => {
      const { renderGuiaView } = await import('../../../src/guia/views/GuiaView');
      const container = {
        innerHTML: '',
        querySelector: vi.fn(() => null),
      } as unknown as HTMLElement;

      const cleanup = renderGuiaView(container, {
        currentUser: {
          uid: 'u1',
          email: 'user@test.com',
          display_name: 'User',
          role: 'member',
          status: 'active',
          groupIds: ['grp-1'],
        },
        onNavigateTab: vi.fn(),
      });

      expect(container.innerHTML).toContain('id="guia-app-iframe"');
      expect(container.innerHTML).not.toContain('ios-nav-bar');
      expect(container.innerHTML).not.toContain('select-guia-group');
      expect(container.innerHTML).not.toContain('btn-reload-guia');
      expect(container.innerHTML).not.toContain('btn-external-guia');
      cleanup();
    });
  });
});
