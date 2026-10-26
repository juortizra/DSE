# Verificación de 1A–1D

## Etapas publicadas
- 1A: commit `45b787e`, run `40261167097`, correcto.
- 1B: commits `b28649c` / `cd6ec31`, runs `40261548223` / `40261554980`, correctos.
- 1C: commit `cf62e7d`, run `40262258205`, correcto.
- 1D: el commit de entrega activa el mismo workflow; resultado verificable en Actions.

## Pruebas realizadas
- Chromium headless con renderizado WebGL por software: tres recorridos menú → briefing → vuelo → 7 capturas aceptadas → galería → aterrizaje → análisis → decisión correcta. Se conservó también una foto rechazada por nivel y se comprobó el intervalo mínimo. Cero excepciones JavaScript observadas.
- El test de recorrido sitúa el dron frente a cada punto para comprobar captura y flujo; **no equivale a pilotar manualmente todo el recorrido**.
- Prueba separada de interiores: entrada mediante el integrador de vuelo y colisiones en los tres edificios; nueve posiciones de una ruta hasta el piso 2 comprobadas contra colisionadores mediante pequeños incrementos; oscuridad rechazada, luz aceptada y choque fuerte que finaliza la misión.
- Prueba de vuelo: inclinación en avance y mantenimiento de altura. Pruebas unitarias de calidad: distancia excesiva/insuficiente, ángulo, velocidad, oscuridad, encuadre, oclusión, láser y roce. Pruebas ópticas y de prioridad de reglas.
- La página pública se pudo leer con la herramienta externa de consulta. El navegador de pruebas local no puede conectar directamente a github.io debido a las restricciones de red del entorno: no se comprobó allí consola/renderizado del sitio remoto. Los despliegues sí se verificaron por GitHub Actions.

## Repetir pruebas (solo desarrollo)
En esta carpeta: `npm ci`, `npx playwright install chromium`, servir por HTTP (por ejemplo puerto 8000), `npm test`, `npm run test:browser`, `npm run test:interior`. `DSE_TEST_URL` cambia la URL bajo prueba; `PLAYWRIGHT_CHROMIUM_EXECUTABLE` permite un Chromium alternativo. No hace falta nada de esto para jugar.

Los tests inyectan herramientas de inspección mediante una interceptación de Playwright; el sitio distribuido no incluye una API de teletransporte. En producción no hay dependencias npm ni red externa.

## Pendiente de prueba humana
- Pilotaje cómodo y legibilidad en diferentes tamaños de pantalla; rendimiento en computadores modestos.
- Primera actualización desde la caché antigua: cerrar todas las pestañas DSE y abrir de nuevo. Modo avión después de una carga completa; el navegador puede borrar el almacenamiento offline.
- Quest: permisos, passthrough, escala, hit-test de mesa y comodidad. XR es visual/experimental; no se verificó un recorrido completo de misión en gafas.
- Modelo científico: no se validaron sensores, calibración, IA ni clasificación oficial. Geometría, iluminación, colisiones, daño e incertidumbre son simulaciones didácticas.
