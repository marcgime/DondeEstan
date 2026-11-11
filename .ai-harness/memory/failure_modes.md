# Catálogo de Modos de Fallo — DondeEstan

Memoria preventiva de errores, sesgos y asunciones incorrectas que los agentes de IA no deben repetir.
Cada modo de fallo documenta la causa raíz técnica, el contraste de código y el guardarraíl de verificación.

---

## FM-001: Desbordamiento de Cuota por Omisión de Throttling en Ubicación GPS

- **Síntoma observable:** Firestore supera el límite de 20.000 escrituras/día rápidamente bloqueando el servicio para todos los usuarios familiares.
- **Causa raíz técnica (trampa típica de IA):** La IA emite una escritura en Firestore en cada evento geolocation.watchPosition sin comprobar intervalo temporal ni distancia mínima ni heartbeat.

### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
navigator.geolocation.watchPosition(async (pos) => {
  await updateDoc(doc(db, "users", uid), {
    location: { lat: pos.coords.latitude, lng: pos.coords.longitude }
  });
});


// ✅ CORRECTO (Canónico):
navigator.geolocation.watchPosition((pos) => {
  locationThrottleService.reportPosition(uid, pos.coords);
});

```

- **Mitigación obligatoria y verificación:** Encapsular el emisor de coordenadas en un servicio de estrangulamiento adaptativo estricto: emitir solo si (delta_t >= 30s AND delta_d >= 15m) OR (delta_t >= 120s).

## FM-002: Fuga de Conexiones Reactivas onSnapshot en Pestañas Inactivas

- **Síntoma observable:** Consumo desmedido de lecturas en Firestore y drenaje acelerado de batería en dispositivos iPhone.
- **Causa raíz técnica (trampa típica de IA):** No invocar la función unsubscribe devuelta por onSnapshot al cambiar de vista o ante eventos de ocultación en Safari (visibilitychange).

### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
function initChat() {
  onSnapshot(query(collection(db, "group_chat"), limitToLast(50)), (snapshot) => {
    renderMessages(snapshot.docs);
  });
}


// ✅ CORRECTO (Canónico):
let unsubscribeChat: (() => void) | null = null;
function openChat() {
  unsubscribeChat = onSnapshot(query(collection(db, "group_chat"), orderBy("created_at", "asc"), limitToLast(50)), (snap) => {
    renderMessages(snap.docs);
  });
}
function closeChat() {
  if (unsubscribeChat) { unsubscribeChat(); unsubscribeChat = null; }
}

```

- **Mitigación obligatoria y verificación:** Desuscribir activamente el listener reactivo de chat al salir de la pestaña y cancelar el seguimiento de posición cuando document.visibilityState sea hidden.

## FM-003: Bypass de Acceso en Estado pending_approval por Reglas Permisivas de Firestore

- **Síntoma observable:** Un familiar recién registrado pero aún no aprobado puede leer las coordenadas y los mensajes privados del grupo familiar.
- **Causa raíz técnica (trampa típica de IA):** Reglas de Firestore que comprueban únicamente request.auth != null sin verificar que el documento /users/{uid} tenga status == 'active'.

### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
match /users/{userId} {
  allow read: if request.auth != null;
}


// ✅ CORRECTO (Canónico):
function isActiveMember() {
  return request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.status == 'active';
}
match /users/{userId} {
  allow read: if isActiveMember() || isAdmin();
}

```

- **Mitigación obligatoria y verificación:** Definir e invocar la función de seguridad isActiveMember() en firestore.rules para condicionar todas las lecturas y escrituras de usuarios y chat.

## FM-004: Saturación de Storage por Subida de Avatares sin Compresión Canvas

- **Síntoma observable:** Cargas de imágenes pesadas (>5MB) agotan los 5GB de Firebase Storage y causan latencia perceptible en los marcadores del mapa.
- **Causa raíz técnica (trampa típica de IA):** Subir directamente el objeto File obtenido del input de tipo file a Firebase Storage sin reescalado previo en el navegador.

### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
async function uploadAvatar(file: File, uid: string) {
  const storageRef = ref(storage, `avatars/${uid}/photo.jpg`);
  await uploadBytes(storageRef, file);
}


// ✅ CORRECTO (Canónico):
async function uploadAvatar(file: File, uid: string) {
  const blob = await resizeAndCompressImage(file, 300, 300, 0.8);
  const storageRef = ref(storage, `avatars/${uid}/photo.webp`);
  await uploadBytes(storageRef, blob);
}

```

- **Mitigación obligatoria y verificación:** Reescalar y recortar toda foto de perfil en un elemento HTML5 <canvas> a un tamaño máximo de 300x300 px y comprimir a WebP/JPEG calidad 0.8 (<50KB).

## FM-005: Violación de Tokens de Diseño con Estilos Literales o Colores HEX Directos

- **Síntoma observable:** Inconsistencia visual, rotura de la paleta Kinetic Bloom y fallos en la puerta preflight.
- **Causa raíz técnica (trampa típica de IA):** La IA introduce colores hexadecimales literales (ej. #6b38fb, #ffffff) o medidas fijas en el código de componentes.

### Ejemplo de Anti-patrón vs Patrón Canónico
```
// ❌ INCORRECTO (Antipatrón típico de IA):
<div style={{ backgroundColor: "#6b38fb", padding: "16px" }}>
  <p style={{ color: "#ffffff" }}>Familia</p>
</div>


// ✅ CORRECTO (Canónico):
<div className="bg-brand-primary p-space-md rounded-full">
  <p className="text-brand-onPrimary font-bold">Familia</p>
</div>

```

- **Mitigación obligatoria y verificación:** Consumir exclusivamente tokens declarados en tokens.json mediante variables CSS o clases utilitarias de Tailwind configuradas.
