# Validación y límites

- Se probaron localmente en Chromium headless las tres misiones completas: entrada desde menú, rechazo por distancia inicial, cinco capturas válidas, aterrizaje, análisis y veredicto coincidente. Cero excepciones JavaScript observadas. El test coloca el dron frente a cada punto para verificar el flujo; no sustituye una prueba de pilotaje humano.
- Pruebas de reglas con `npm test`: consistencia de escenarios, prioridad del colapso, pérdida de resolución con distancia y márgenes de estimación.
- Para repetir el flujo con herramientas de desarrollo: instalar dependencias de desarrollo y Chromium de Playwright, servir esta carpeta por HTTP, ejecutar `npm run test:browser`. `DSE_TEST_URL` permite apuntar al sitio publicado; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite un Chromium alternativo. Esto no es necesario para el profesor.
- Recursos de ejecución locales y rutas relativas. La caché offline es opcional y depende del almacenamiento permitido por el navegador.
- Pages: inicialmente la API devolvió 403 al intentar activarlo. Luego apareció habilitado, pero el entorno `github-pages` solo autoriza `main`: el run 40259617796 falló antes de ejecutar pasos. Añadir `arena/c1eed267-dse` por API también devolvió 403. Es necesaria la autorización de esa rama por el propietario. No se pudo comprobar la URL pública; además el entorno de desarrollo no permite acceso directo a github.io.
- No hay dispositivo Quest conectado. WebXR y las fotos inmersivas requieren pruebas físicas. MR ofrece maqueta visual, no todo el flujo de juego a escala. La decisión final se hace en pantalla.
- La simulación usa geometría y datos sintéticos, no un modelo de IA, no criterios oficiales ni una calibración de sensores reales.
