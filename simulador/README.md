# DSE · Inspección postsismo con dron

**Jugar:** https://juortizra.github.io/DSE/ — navegador de escritorio, sin cuenta ni instalación.

## Cómo jugar
Selecciona un sitio → lee el briefing → despega → fotografía 4 puntos exteriores y 3 interiores → regresa a H → aterriza → analiza la SD → decide verde, amarillo o rojo.

| Control | Acción |
|---|---|
| W / S · A / D | Avanzar/retroceder · desplazamiento lateral |
| Q / E | Bajar / subir |
| Ratón (clic en escena) o ← / → | Girar; Esc libera el ratón |
| ↑ / ↓ | Inclinar orientación de cámara/cuerpo |
| F | Foto real renderizada, intervalo mínimo de 1 segundo |
| G | Galería de aceptadas y rechazadas; pausa la misión |
| T | Luz del módulo, necesaria en interiores oscuros |
| B | Guía hacia base (no piloto automático) |
| L | Aterrizar en H, altura <0,75 m y velocidad <0,3 m/s |
| P | Pausa / continuar |

**Captura:** acércate a 0,45–1,2 m, sitúate de frente y suelta los controles. Centra el círculo completo. Se acepta con calidad ≥60%; los rechazos explican distancia, ángulo, movimiento, oscuridad, encuadre u oclusión. Selecciona un punto en la lista para repetirlo. G muestra todos los disparos con calidad; haz clic en una imagen para ampliarla.

**Interiores:** entra por ACCESO. El hueco de ascenso al segundo piso está al frente-derecha visto desde la calle. Usa el pasillo central y evita escombros. Un choque a velocidad >1,7 m/s termina el vuelo; un roce invalida la estabilidad 1,5 s. Las fotos se conservan en el análisis, pero un vuelo incompleto no permite emitir veredicto.

## Qué simula y qué no
- Tres edificios distintos: vivienda de dos pisos, apartamentos de cuatro y edificio de cinco con piso blando. Texturas procedurales locales, daños, obstáculos y base con carpa/unidad de tierra.
- Cámara fija al cuerpo con inclinación al desplazarse, velocidad limitada a 2,4 m/s y mantenimiento de altura al soltar controles. Colisionadores AABB y movimiento subdividido; no es un modelo aerodinámico.
- SD en memoria: fotografías reales de la cámara virtual a 1920×1080 y metadatos de captura. Recargar o abandonar borra la sesión. No se transmiten datos; video/HUD son la interfaz del juego.
- IA y agente **sintéticos**, no un modelo entrenado: resolución óptica ideal, anchos conocidos del escenario y margen orientativo. Las grietas son geometría con ancho en metros convertido desde mm; las más finas apenas se ven. Los anchos por sí solos no determinan seguridad.
- La luz del módulo, rango de juego del láser y reglas de calidad son ayudas educativas, no validación física del VL53L0X ni reglas oficiales colombianas.

**Simulación educativa. La clasificación oficial la hace el evaluador certificado.** Es apoyo de triage, no autorización para entrar a edificios dañados.

## Sin conexión y actualizaciones
Todos los recursos se sirven desde el sitio, sin CDN ni servicios externos. Tras una carga completa, el service worker guarda la aplicación para uso offline. La caché depende del navegador. Si aparece una versión anterior, cierra **todas** las pestañas DSE y vuelve a abrir. Las versiones nuevas muestran un aviso para actualizar sin reemplazar archivos a mitad de un vuelo.

## XR y publicación
El botón WebXR conserva una inspección visual experimental en gafas; MR coloca la maqueta sobre una mesa mediante hit-test. El flujo de inspección/decisión se realiza en escritorio. No se probó físicamente en Quest.

GitHub Actions publica esta carpeta en la misma URL, desde `arena/c1eed267-dse` o `main`, y comprueba las pruebas unitarias antes de desplegar. No se modificó el dominio ni se requiere cambiar Settings. Para desarrollo y detalles de pruebas, consulta [VALIDACION.md](VALIDACION.md).
