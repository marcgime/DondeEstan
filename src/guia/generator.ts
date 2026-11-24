import type {
  GroupDayPlan,
  GroupItineraryMetadata,
  GroupTrip,
  NewTripRequest,
} from './types';

export function calculateTripDurationDays(llegadaIso: string, salidaIso: string): number {
  try {
    const arr = new Date(llegadaIso);
    const dep = new Date(salidaIso);
    const diffMs = dep.getTime() - arr.getTime();
    if (diffMs <= 0) return 1;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays);
  } catch {
    return 1;
  }
}

export function generateGroupItinerary(
  request: NewTripRequest,
  groupId: string,
  userUid: string,
  userName: string
): Omit<GroupTrip, 'id' | 'created_at'> {
  const { destino, alojamiento, fecha_llegada, fecha_salida, preferencias } = request;
  const duracionDias = calculateTripDurationDays(fecha_llegada, fecha_salida);

  // Determinar estilo según preferencias
  const esNaturaleza = preferencias.entorno_principal <= 2;
  const esGourmet = preferencias.prioridad_gastronomica >= 4;
  const esLujo = preferencias.presupuesto_confort >= 4;
  const esActivo = preferencias.ritmo_viaje >= 4 || preferencias.actividad_fisica >= 4;
  const esNocturno = preferencias.vida_nocturna_horario >= 4;

  let estiloDesc = 'Ruta equilibrada con foco en cultura, paseos céntricos y gastronomía tradicional.';
  if (esNaturaleza && esActivo) {
    estiloDesc = 'Aventura al aire libre, miradores naturales y senderismo dinámico.';
  } else if (esGourmet && esLujo) {
    estiloDesc = 'Experiencia premium con selección de alta gastronomía y confort exclusivo.';
  } else if (esNocturno) {
    estiloDesc = 'Inmersión urbana vibrante con tardes culturales y animada vida nocturna.';
  }

  // Presupuesto base diario aproximado según confort
  const factorPresupuesto = preferencias.presupuesto_confort * 35 + preferencias.prioridad_gastronomica * 25;
  const presupuestoPorPersona = Math.round(duracionDias * (50 + factorPresupuesto));

  const planDiario: GroupDayPlan[] = [];
  const baseDate = new Date(fecha_llegada.slice(0, 10) + 'T00:00:00Z');

  for (let i = 1; i <= duracionDias; i++) {
    const dayDate = new Date(baseDate.getTime() + (i - 1) * 86400000)
      .toISOString()
      .slice(0, 10);

    const isFirstDay = i === 1;
    const isLastDay = i === duracionDias;

    let descDia = `Exploración y actividades destacadas de ${destino}`;
    if (isFirstDay) descDia = `Llegada a ${destino}, check-in en ${alojamiento || 'alojamiento'} y primera orientación`;
    else if (isLastDay) descDia = `Últimas visitas panorámicas, recuerdos y preparación del viaje de vuelta`;
    else if (i === 2) descDia = `Día central: Monumentos icónicos y zonas históricas emblemáticas`;

    planDiario.push({
      dia_numero: i,
      fecha: dayDate,
      descripcion_general_dia: descDia,
      franjas: {
        manana: {
          actividades: isFirstDay
            ? `Llegada, check-in en ${alojamiento || 'el alojamiento'} y paseo panorámico de bienvenida.`
            : isLastDay
            ? `Paseo relajado matinal por el barrio histórico y compras de recuerdos artesanales.`
            : `Ruta matutina por el centro histórico, principales monumentos y plazas de ${destino}.`,
          logistica_transporte: esNaturaleza
            ? 'Transporte hacia el punto de inicio de la ruta o mirador.'
            : 'Paseo 100% peatonal o transporte público cercano.',
          sugerencia_gastronomica: esGourmet
            ? 'Cafetería de especialidad con bollería artesanal local.'
            : 'Desayuno tradicional en terraza histórica.',
        },
        medio_dia: {
          actividades: isLastDay
            ? `Almuerzo de despedida y últimos momentos en ${destino}.`
            : `Visita a museos, galerías de arte o enclaves emblemáticos de la zona.`,
          logistica_transporte: 'Desplazamiento peatonal por la zona central.',
          sugerencia_gastronomica: esGourmet
            ? 'Almuerzo degustación en restaurante recomendado de cocina autóctona.'
            : 'Menú tradicional con especialidades de la región.',
        },
        tarde: isLastDay
          ? null
          : {
              actividades: `Ruta de miradores o paseo por zonas comerciales y parques al atardecer.`,
              logistica_transporte: 'Paseo a pie relajado o tranvía/bus local.',
              sugerencia_gastronomica: 'Merienda local y café con vistas panorámicas.',
            },
        noche: isLastDay
          ? null
          : {
              actividades: esNocturno
                ? `Cena animada y ruta nocturna por los locales y plazas más concurridas.`
                : `Cena tranquila y paseo nocturno para admirar los monumentos iluminados.`,
              logistica_transporte: 'Paseo a pie de regreso al alojamiento.',
              sugerencia_gastronomica: esGourmet
                ? 'Cena maridaje con vinos de la región.'
                : 'Tapas variadas en taberna tradicional.',
            },
      },
    });
  }

  const metadatos: GroupItineraryMetadata = {
    destino,
    alojamiento_ubicacion: alojamiento || 'Zona céntrica',
    fecha_llegada,
    fecha_salida,
    duracion_dias: duracionDias,
    resumen_estilo: estiloDesc,
    presupuesto_estimado_por_persona: presupuestoPorPersona,
    created_by: userUid,
    created_by_name: userName,
  };

  return {
    groupId,
    metadatos,
    plan_diario: planDiario,
  };
}
