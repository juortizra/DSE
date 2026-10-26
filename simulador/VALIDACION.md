# Verificación 2A–2G

## Respaldo y publicación
- Commit de partida: `2305848bf6ea6617978c42967ab92cff50674b64`.
- Etiqueta **local** `respaldo-nivel-1` en ese commit. No se creó rama de respaldo: la sesión no permite crear/trabajar otras ramas. Ese commit también permanece en el historial remoto.
- Trabajo y pushes únicamente sobre `arena/c1eed267-dse`, sin force push ni reescritura. No se borraron archivos existentes.
- Etapas publicadas: 2A `bf54573`, 2B `7618d24`, 2C `a16b039`, 2D `b8c44df`, 2E `013b022`, 2F `f066d53`/`eb6ef5b`, 2G `5c08975`; todos sus workflows finalizaron correctamente. Correcciones de integración posteriores también se publican por el mismo workflow y URL.

## Pruebas realizadas
- **34 pruebas unitarias**: escalas 300/500/1000 mm, fórmula angular, mínimo exacto de 2 píxeles, incertidumbre, rango/conos/reflectancia/sol, deriva, configuración, consumo, timestamp común, reglas y casos límite, duplicados de elemento, INDETERMINADO, puntaje crítico y ZIP/CRC.
- Pipeline sintético: los 3 escenarios con buenas fotos producen verde/amarillo/rojo respectivamente; fotos de baja calidad producen INDETERMINADO.
- Chromium headless/WebGL por software: menú → briefing → prevuelo (incluye calibración) → 7 fotos 1280×720 → aterrizaje → TFT/cola → agente → decisión/informe. Comprobados los 3 niveles, timestamp común por foto y retardo de obturador. Sin excepciones JS ni errores de consola en el recorrido final.
- Segundo recorrido: foto rechazada → aterrizaje → INDETERMINADO → segunda salida conservando archivo → foto nueva → réplica que invalida cobertura → descenso automático con batería cero.
- ZIP descargado en navegador y leído con `zipfile` de Python: 7 JPEG, CSV, verdad e informe separados; CRC correcto y timestamps CSV idénticos por foto.
- Offline: service worker real, caché completa, red desactivada, menú → briefing → prevuelo → vuelo. Sin errores de consola.

**Alcance:** el test sitúa la cámara frente a cada checkpoint y acelera solo los tiempos de la cola para verificar flujo; no equivale a pilotaje humano completo ni benchmark de la Pi. Los casos de física interior de la etapa anterior se conservan. Las pruebas nuevas se ejecutan con `npm run test:project2` (o `test:browser`) y `npm run test:offline`. Los scripts históricos de nivel 1 se mantienen en el repositorio.

## Repetición (solo desarrollo)
`npm ci`, instalar Chromium de Playwright, servir esta carpeta por HTTP (8000 por defecto), `npm test`, `npm run test:project2`, `npm run test:offline`.
`DSE_TEST_URL` permite otra URL; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite un Chromium existente. Los tests inyectan su arnés: no hay teletransporte ni aceleración de procesamiento en el sitio público.

## Límites pendientes
- No se validaron sensores, enfoque, paralaje, autonomía, IA ni rendimiento en una Pi física. Consultar VERIFICAR.md.
- El cono usa rayos discretos y reflectancia uniforme para texturas: puede omitir cables muy finos. Ruido/desenfoque/exposición son modelos ilustrativos. El error RSS no incluye todos los sesgos del cono ni calibración óptica.
- El ángulo al muro y la inclinación estructural usan referencias sintéticas; no son funciones nativas del MPU6050.
- La página pública puede consultarse con la herramienta externa de lectura. El navegador de pruebas del entorno no tiene acceso directo a github.io: las comprobaciones interactivas de consola son locales. Despliegues confirmados por Actions.
- Sin prueba física en Meta Quest: XR sigue siendo inspección visual experimental; flujo completo en escritorio.

## Corrección posterior del láser
- Se eliminó el uso de una lectura anterior del HUD para calificar la foto: el paquete de exposición es la única fuente para calidad y metadatos.
- Distancia del HUD en mm, guía medida desde cámara y diagnóstico separado para retorno inválido o resolución menor de 2 píxeles.
- `npm run test:laser`: navegador con aleatoriedad real (sin sustituir Math.random), 7 puntos por nivel, múltiples lecturas por punto contrastadas con distancia de escena y error configurado; veredictos verde/amarillo/rojo después de fotos válidas. Los fallos solares genuinos se repiten, no se sustituyen por lecturas inventadas.
- Regresión de caché inválida frente a lectura de exposición válida. Caso a 800 mm con láser válido pero capilar no resoluble: INDETERMINADO con explicación óptica y consejo, no “sensor roto”.
- El arnés coloca el dron frente al objetivo y acelera la cola de tierra; no equivale a pilotaje manual ni valida hardware.

## Corrección del bloqueo del agente por precisión óptica
- Se detectó que cualquier checkpoint sin ancho medible añadía una carencia bloqueante y anulaba el resultado completo. Ahora se distinguen fotos/lecturas ausentes de limitaciones de medida con evidencia utilizable.
- Cada resultado del detector contiene metadatos ópticos derivados exclusivamente del láser y la calibración. Las cotas no se presentan como anchos medidos y no consultan el color esperado del escenario.
- Cota conservadora: `(mínimo de píxeles + error de segmentación) × mm/px`, usando la distancia más su error y el ángulo que maximiza la escala dentro del error estimado. Es condicional a una región bien encuadrada y al modelo sintético; no valida falsos negativos de una IA real.
- 43 pruebas unitarias: incluye cobertura completa sin anchos, colapso/inclinación/amenazas con limitaciones, límites de cota, lecturas ausentes, baja calidad y repetición mejorada sin bloqueo por fotos anteriores.
- `npm run test:evidence`, Chromium con ruido aleatorio activo: 7 fotos buenas a 0,8 m en cada edificio → amarillo por precaución / amarillo / rojo; 7 fotos a 0,2 m en vivienda → verde provisional por cotas suficientes; decisiones habilitadas y acceso al informe. Sin fotos → INDETERMINADO y segunda salida. Cero errores de consola observados.
- El arnés sitúa el dron frente a los puntos y acelera la cola de procesamiento; no es un recorrido pilotado manualmente.

## Nivel 3A–3D (26 octubre de 2026)

### Comprobado en Chromium local
- 45 pruebas unitarias: reglas, sensores, óptica, exportación, preferencias inválidas y rutas A* sin atravesar las cajas del vuelo.
- `test:level3`: inicio docente, Acerca/ODS, controles, interrupción de demo, tamaño/volumen persistentes, vuelo con WebXR no disponible; ninguna petición externa ni error/advertencia de consola observado en este recorrido.
- Caché completa: se corta la red del contexto del navegador y se recargan `/conectar/`, `/conectar` (redirección local), QR y juego con query; despegue offline correcto.
- `test:demo`: red cortada después de cachear, demostración completa en **142 segundos** con siete fotos, regreso, análisis y decisión/informe automáticos. No acredita progreso como jugador. Pestaña visible, viewport 900×650 y ajuste de rendimiento activado, render por software; no es un benchmark de Quest.
- Rechazo XR simulado: tres intentos, cada vez con menos opcionales, conservando vuelo normal.
- Ciclo XR con sesión y renderer simulados: ambos modos, sticks, pérdida de foco, restauración de estado XR/render target incluso tras excepción y limpieza de recursos/cámara del sensor intacta. **No prueba render estereoscópico real.**
- Regresión `test:evidence`: siete fotos buenas a 0,8 m en los tres escenarios y vivienda a 0,2 m; clasificación conservadora y datos faltantes correctos.
- Regresión `test:project2`: tres escenarios, prevuelo, siete fotos 1280×720 sincronizadas, TFT, sugerencia, decisión e informe; indeterminado, segunda salida, réplica y descenso por batería.
- Corregida advertencia de Three r186: PCFSoftShadowMap eliminado, se usa PCFShadowMap. Corregidas rutas de directorio en la caché offline.

### Publicación y límites de verificación
3A, 3B y 3C desplegados por separado mediante Actions; 3D se publica al cierre. Se consultó la página pública `/conectar/` mediante herramienta web y respondió con la guía y URL correctas. El navegador automatizado de este entorno no puede abrir GitHub Pages: `net::ERR_CONNECTION_CLOSED`. Por ello **no se declara probada desde el dominio público la interacción, demo ni desconexión**, aunque sí se probaron sobre los archivos locales de publicación. Revisar en el equipo del profesor y Quest.

Sin Quest, cable USB/ADB, red del salón ni CA instalada en las gafas: no se prueban comodidad, FPS, passthrough, superficies, agarre/escala, seguimiento de manos ni permisos XR en avión. Completar [QA-QUEST.md](QA-QUEST.md). La batería de tierra solo representa la propuesta del sistema, sin autonomía física simulada.

Respaldo previo: commit de preservación y etiqueta **local** `respaldo-nivel-1-20261026` en `8ba9e42`. No se creó la rama `respaldo-nivel-1` por restricción de la sesión. Se mantuvo `arena/c1eed267-dse`, integrando el historial remoto sin reescribirlo y sin force push.
