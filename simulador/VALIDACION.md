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
