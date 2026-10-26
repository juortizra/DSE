# DSE · Simulador educativo

**URL prevista al habilitar Pages:** https://juortizra.github.io/DSE/

No requiere cuenta, instalación ni comandos. Todo el código y Three.js se sirven desde el sitio; no hay CDN, telemetría ni servicios externos. Después de la primera carga completa en HTTPS, el service worker permite jugar offline (salvo que el navegador borre la caché). Las fotos viven en memoria: recargar las elimina.

## Publicar (requiere propietario)
1. En https://github.com/juortizra/DSE/settings/pages elige **Build and deployment → Source → GitHub Actions**.
2. Si el entorno bloquea la rama: **Settings → Environments → github-pages → Deployment branches and tags**, permite `arena/c1eed267-dse` (Selected branches and tags → Add deployment branch or tag rule).
3. **Actions → Publicar simulador → Run workflow → Branch: arena/c1eed267-dse → Run workflow**. Espera el resultado verde y abre la URL anterior. Si los workflows de esta rama no aparecen, abre el último run fallido y usa **Re-run all jobs**.

La integración pudo subir commits, pero recibió HTTP 403 al activar Pages. Por eso la URL es prevista, no una publicación comprobada.

## Controles
Elige misión. Clic en la escena captura el ratón; Esc lo libera. WASD mueve horizontalmente; Q baja, E sube; ratón o flechas orientan. F fotografía; L aterriza. También hay botones visibles. Sin controles táctiles ni gamepad de escritorio.

Hay cinco círculos: el activo es verde lima. Lee su altura y distancia en la guía. Acércate entre 1,2 y 4 m, centra el círculo, iguala su altura y suelta los controles hasta velocidad <0,35 m/s. Tras las cinco fotos, vuelve a H (x=0, z=8), baja de 0,8 m y pulsa L. La batería dura aproximadamente 13 minutos efectivos. Volver a Misiones reinicia todo.

## Qué simula
- Vuelo FPV: velocidad limitada a 3 m/s, amortiguación, altura limitada, colisiones simplificadas. HUD y video son una interfaz de juego, no transmisión del módulo añadido.
- SD virtual: fotos, distancia láser e inclinación, sin subir ni analizar nada durante el vuelo.
- Raspberry Pi: análisis **sintético**, sin modelo de IA. Modelo óptico pinhole ideal a 1920 px/FOV 65°, sin calibración real; las fisuras finas pueden quedar sin resolver. La captura de pantalla puede tener otra resolución: se usa una cámara virtual de referencia, no medición de píxeles reales.
- Agente: reglas didácticas sobre daño localizado y colapso; no clasifica edificios reales ni reproduce umbrales oficiales de la metodología colombiana. El ancho solo no determina seguridad. Tres escenarios con anchos conocidos; error orientativo y explicación al decidir.
- No se modelan vibraciones, distorsión, viento ni límites físicos reales del VL53L0X. Su rango utilizable real debe validarse en hardware; el rango de juego es una simplificación.

**Simulación educativa. La clasificación oficial la hace el evaluador certificado.** No entrar a estructuras dañadas para obtener datos sin autorización profesional.

## Meta Quest / WebXR (experimental, sin prueba física)
Mismo enlace HTTPS → inicia misión → **Entrar en VR/MR**. Si hay `immersive-ar`, se prefiere MR: maqueta 1:20, busca mesa por hit-test, gatillo coloca. Si no hay hit-test, queda delante del usuario. MR es inspección visual, no un vuelo a escala: termina la misión en pantalla. Si solo hay VR, ofrece vuelo inmersivo: palanca izquierda mueve, derecha cambia altura/giro, gatillo fotografía y A aterriza. Sal de XR para ver el análisis y escoger veredicto. Si no hay XR, sigue el modo normal.

Pendiente validar en gafas: permisos, escala/mesa/passthrough, mandos, fotografías inmersivas y comodidad. Las fotos XR pueden depender del compositor del navegador; escritorio es la ruta recomendada para evaluación completa. No se garantiza compatibilidad sin pruebas en dispositivo. Salir de XR vuelve a base sin borrar las fotos.

## Desarrollo
Aplicación estática de ES modules: servir esta carpeta por HTTP para desarrollo. Three.js 0.186.1 incluido con licencia MIT en vendor. Sin compilación ni dependencias remotas en ejecución. Cada etapa tiene su commit y push; Pages necesita la activación anterior antes de desplegar.
