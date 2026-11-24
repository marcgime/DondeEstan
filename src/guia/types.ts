export interface GroupTimeSlotActivity {
  actividades: string;
  logistica_transporte: string;
  sugerencia_gastronomica: string;
}

export interface GroupDayPlan {
  dia_numero: number;
  fecha: string;
  descripcion_general_dia: string;
  franjas: {
    manana?: GroupTimeSlotActivity | null;
    medio_dia?: GroupTimeSlotActivity | null;
    tarde?: GroupTimeSlotActivity | null;
    noche?: GroupTimeSlotActivity | null;
  };
}

export interface GroupItineraryMetadata {
  destino: string;
  alojamiento_ubicacion: string;
  fecha_llegada: string;
  fecha_salida: string;
  duracion_dias: number;
  resumen_estilo: string;
  imagen_url?: string;
  presupuesto_estimado_por_persona?: number;
  created_by: string;
  created_by_name: string;
}

export interface GroupTrip {
  id: string;
  groupId: string;
  metadatos: GroupItineraryMetadata;
  plan_diario: GroupDayPlan[];
  created_at: number;
}

export interface TravelPreferences {
  entorno_principal: number; // 1 (Naturaleza) - 5 (Ciudad)
  estilo_planificacion: number; // 1 (Improvisación) - 5 (Cronometrado)
  ritmo_viaje: number; // 1 (Slow) - 5 (Non-stop)
  enfoque_cultural_vs_ocio: number; // 1 (Relax) - 5 (Cultura)
  prioridad_gastronomica: number; // 1 (Rápido) - 5 (Alta Cocina)
  presupuesto_confort: number; // 1 (Backpacker) - 5 (Lujo)
  movilidad_transporte: number; // 1 (A pie) - 5 (Privado)
  experiencia_social: number; // 1 (Recóndito) - 5 (Popular)
  vida_nocturna_horario: number; // 1 (Madrugador) - 5 (Nocturno)
  actividad_fisica: number; // 1 (Cero esfuerzo) - 5 (Multideporte)
}

export interface NewTripRequest {
  destino: string;
  alojamiento: string;
  fecha_llegada: string;
  fecha_salida: string;
  preferencias: TravelPreferences;
}
