# DSE · Módulo autónomo y unidad de tierra (2A–2G)

**Jugar:** https://juortizra.github.io/DSE/ — sin cuenta, instalación ni servicios externos.

## Recorrido
Selecciona edificio y dificultad → briefing → **prevuelo** (batería/SD y calibración quieto 3 s, o despegue sin calibrar) → fotos de 7 puntos → regreso y aterrizaje → lectura de SD en Pi Zero 2 W/TFT virtual → agente → tu decisión → puntaje/informe → ZIP.

- **WASD:** desplazamiento. **Q/E:** bajar/subir. **Ratón** (clic en escena) o flechas: orientación; **Esc** libera el ratón.
- **Shift:** aproximación fina. **F:** dispara tras 150 ms; espera al menos 1 s entre fotos. **T:** luz. **P:** pausa. **B:** guía a base, no piloto automático. **L:** aterriza en H.
- En vuelo solo hay video y HUD local; **G no consulta la SD**. Las fotos y detecciones se revisan **en tierra**.
- Entra por ACCESO; el hueco para subir está al frente-derecha visto desde la calle. Choques fuertes terminan el vuelo y conservan la SD.
- Se puede aterrizar incompleto. **INDETERMINADO** ofrece segunda salida con nueva batería/SD de vuelo, conservando el archivo previo de la misión en tierra. Recargar o abandonar borra la sesión.

## Sensores y medición
Cámara virtual 1280×720/HFOV 82°, con exposición, ruido, desplazamiento de imagen por movimiento y JPEG. Láser de 50–1200 mm con error y cono discretizado, interferencia solar, vidrio y reflectancia simplificada. IMU con error de actitud y deriva de yaw; no hay magnetómetro. Batería nominal de 8 minutos **simulados**, con consumo variable; SD de 60 fotos por salida.

Todos los parámetros funcionales se concentran en [`config.js`](config.js), con **[VERIFICAR]**. No son una validación del hardware. Las constantes de dibujo/decoración heredadas no representan parámetros calibrados.

`fx = (1280/2)/tan(82°/2)`; `mm/px = láser × cos(ángulo estimado) / fx`; `ancho = píxeles × mm/px`. Mínimo: **2 píxeles**. Incertidumbre por propagación RSS de láser, segmentación y ángulo/deriva; no es un intervalo de confianza calibrado.

**Límite importante:** una fisura de 0,2 mm necesita acercarse a unos 7 cm para alcanzar 2 píxeles con esta óptica. Se encuadra un **segmento pequeño**, no toda la grieta. Enfoque mínimo, paralaje, seguridad y viabilidad física deben probarse en el prototipo. El ángulo al muro y la inclinación del edificio usan referencias geométricas **sintéticas**; el MPU6050 por sí solo no las identifica.

## Unidad de tierra, agente e informe
TFT lógica 320×240, cola de 0,5–2 s/foto **simulados**, cajas sobre regiones de inspección, cobertura y reglas activadas. `detector.js` expone un adaptador reemplazable: la implementación actual usa verdad de terreno y calidad, con falsos positivos/negativos; **no es un modelo de IA real ni un benchmark de Raspberry Pi**.

El agente considera colapso, inclinación, daño localizado/extendido, amenazas e incertidumbre. La confianza resume cobertura/calidad, **no probabilidad de seguridad**. Si hay réplica opcional, se invalida la cobertura de fotos anteriores y se recuerda repetir la Fase 1.

La verdad de terreno solo se muestra al abrir el informe final/parcial. El ZIP contiene JPEG sintéticos, `telemetria.csv`, `verdad-terreno.json`, `informe.json`, `configuracion.json` y aviso `LEEME.txt`; no sube archivos a ningún servidor.

**Clasificación provisional; no sustituye al evaluador certificado ni a la Fase 2.** La clasificación oficial la hace el evaluador certificado. Los umbrales de reglas son ejemplos didácticos, no normativa oficial.

## Offline, pruebas y gafas
Después de una carga completa se puede usar offline. Para actualizar una caché antigua, cierra todas las pestañas DSE o usa el aviso de actualización. La cabecera dice **2G**. WebXR conserva inspección visual experimental; no se probó en Quest y el flujo completo se hace en escritorio.

Consulta [VALIDACION.md](VALIDACION.md) y [VERIFICAR.md](VERIFICAR.md). Desarrollo: `npm ci`, instalar Chromium de Playwright, servir por HTTP; `npm test`, `npm run test:project2`, `npm run test:offline`. No se necesitan comandos para jugar.
