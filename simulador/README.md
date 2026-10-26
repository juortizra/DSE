# DSE — guía rápida de evaluación (nivel 3)

**Juego:** https://juortizra.github.io/DSE/  
**Conexión y QR:** https://juortizra.github.io/DSE/conectar/  
**Autor:** juortizra (nombre público del repositorio; nombre completo [VERIFICAR]).  
**Código:** https://github.com/juortizra/DSE

## Evaluarlo en tres minutos
1. Abrir en Chrome o Edge de computador y pulsar **Ver demostración**. Inspecciona apartamentos, captura los siete puntos, regresa, analiza y acepta automáticamente la sugerencia **calculada**, sin consultar el color esperado. Busca rutas con A* usando las cajas de colisión. Objetivo 2–3 minutos con pestaña visible; en equipos lentos puede tardar más. «Tomar el control» interrumpe el recorrido conservando las fotos.
2. **Acerca del proyecto** explica componentes, ODS y límites. No requiere iniciar sesión.
3. **Jugar** abre tres misiones. El mejor puntaje y completados se guardan localmente tras decidir con cobertura completa; la demostración automática no acredita progreso.
4. **Controles**, siempre arriba, permite texto 100–160%, volumen/mute, subtítulos, reducción de movimiento y rendimiento sin sombras. Las clasificaciones llevan texto y formas: círculo con visto / triángulo / octágono, no solo color.

## Qué representa cada parte
| Sistema propuesto | Simulación / implementación |
|---|---|
| Dron y módulo autónomo con batería | Vuelo, cámara renderizada, IMU y láser con error y limitaciones; batería de vuelo simulada |
| SD | Fotos y lecturas con un mismo instante; no hay envío ni IA durante el vuelo |
| Unidad de tierra con batería | Cola local y TFT; batería de tierra propuesta, sin modelo de autonomía eléctrica |
| IA liviana | Detector **sintético**, no red entrenada ni benchmark de Raspberry Pi |
| Agente | Reglas ejecutadas sobre datos simulados, umbrales e incertidumbre, razones explicables |
| Decisión | Recomendación provisional + elección del jugador e informe; autoridad oficial: evaluador certificado |

ODS 11 principal, 9, 3 y 10: resiliencia, instrumentación, reducir exposición y acceso educativo sin red. El terremoto del **10 de agosto de 2026 en Colombia** se usa como contexto del ejercicio solicitado; fecha/evento histórico no verificados, no se afirma como noticia real.

## Controles de computador
W/S avance; A/D lateral; Q/E altura; ratón/flechas orientación; Shift precisión; F foto; T luz; G SD solo en tierra; B **guía manual** a base; L aterrizar; P pausa; Esc libera ratón. Espacio físico/joystick no requerido. Al abrir Controles se pausa el vuelo.

## Gafas
En una misión aparecen VR/MR solo tras comprobar soporte. Predeterminado: monitor FPV estable; la cabeza no altera cámara ni sensores del dron. Inmersiva opcional, velocidad reducida, viñeta y transición oscura; modo sentado recomendado, no hay locomoción física forzada. MR inicia 1:60; hit-test opcional para mesa, agarres mueven y escalan; SD se inserta tras aterrizar con gesto o respaldo. Mandos: izquierdo altura/giro; derecho desplazamiento; gatillo foto; A/X retorno y aterrizaje, luego insertar SD o aceptar sugerencia; B/Y alterna vista VR o coloca MR en el plano detectado. Para discrepar del agente con razón, salir de XR y usar el informe completo. Seguimiento de manos depende de eventos select/squeeze del navegador y no tiene reconocedor propio.

**No se ha probado en hardware Quest.** Comprobar comodidad, controladores, hit-test, gestos, vuelta de sesión y modo avión con [QA-QUEST.md](QA-QUEST.md). Ante permisos rechazados/fallo, el modo normal se conserva; reintento con menos funciones opcionales. No se leen imágenes de la cámara real.

## Offline
Primera carga completa con red y contexto seguro; esperar «Sin conexión listo» en /conectar. Service worker guarda módulos, Three.js, QR, guías y licencias localmente, sin CDN, fuentes remotas, telemetría ni servicios de IA. Reabrir la misma URL/navegador; caché sujeta a borrado/desalojo y modo privado. Puede aparecer «Actualizar» para activar una versión nueva. Si se borran los datos hace falta recargar con red. Que la aplicación esté en caché no garantiza permisos/passthrough WebXR offline: probarlos en las gafas.

## Pendientes [VERIFICAR]
- Quest Browser/OS, controladores, passthrough, hit-test, agarres, foco, pérdida de mandos, comodidad y FPS reales; anclas se solicitan solo opcionalmente y no hay persistencia de colocación.
- Posición fallback MR usa referencia local: 0,8 m bajo altura inicial de los ojos; equivale aproximadamente a mesa de 0,8 m si ojos a 1,6 m. Ajustar con agarre.
- QR/LAN/ADB y confianza TLS en la administración concreta de las gafas.
- Nombre completo del autor y referencia del sismo del ejercicio.
- Baterías y autonomía física de módulo/unidad de tierra, cámara, sensores, modelo IA real y política de cotas ópticas: [VERIFICAR.md](VERIFICAR.md).
- No se mide el consumo eléctrico de la unidad de tierra ni se certifica habitabilidad.

[Créditos/licencias](CREDITOS.md) · [Pruebas](VALIDACION.md).

---
## Documentación técnica e histórica del simulador

# DSE · Módulo autónomo y unidad de tierra (2A–2G)

**Jugar:** https://juortizra.github.io/DSE/ — sin cuenta, instalación ni servicios externos.

## Recorrido
Selecciona edificio y dificultad → briefing → **prevuelo** (batería/SD y calibración quieto 3 s, o despegue sin calibrar) → fotos de 7 puntos → regreso y aterrizaje → lectura de SD en Pi Zero 2 W/TFT virtual → agente → tu decisión → puntaje/informe → ZIP.

- **WASD:** desplazamiento. **Q/E:** bajar/subir. **Ratón** (clic en escena) o flechas: orientación; **Esc** libera el ratón.
- **Shift:** aproximación fina. **F:** dispara tras 150 ms; espera al menos 1 s entre fotos. **T:** luz. **P:** pausa. **B:** guía a base, no piloto automático. **L:** aterriza en H.
- En vuelo solo hay video y HUD local; **G no consulta la SD**. Las fotos y detecciones se revisan **en tierra**.
- Entra por ACCESO; el hueco para subir está al frente-derecha visto desde la calle. Choques fuertes terminan el vuelo y conservan la SD.
- Se puede aterrizar incompleto. **INDETERMINADO** por falta de fotos/lecturas ofrece segunda salida con nueva batería/SD de vuelo, conservando el archivo previo de la misión en tierra. Recargar o abandonar borra la sesión.

## Lectura del láser y repetición de fotos
El HUD muestra **milímetros** y el motivo real si no hay retorno (rango, vidrio o sol). La guía al checkpoint usa el origen de la cámara, no el centro del dron. La calidad de cada foto usa exactamente la lectura guardada al exponer, no una lectura anterior del HUD.

**Encuadre aceptado no significa grieta medible.** El HUD indica el ancho mínimo correspondiente a 2 píxeles a esa distancia. En tierra se distingue láser inválido de lectura válida con resolución insuficiente, y se indica cómo repetir la toma. No se rellenan distancias ni se fuerza un color si faltan datos.

## Sensores y medición
Cámara virtual 1280×720/HFOV 82°, con exposición, ruido, desplazamiento de imagen por movimiento y JPEG. Láser de 50–1200 mm con error y cono discretizado, interferencia solar, vidrio y reflectancia simplificada. IMU con error de actitud y deriva de yaw; no hay magnetómetro. Batería nominal de 8 minutos **simulados**, con consumo variable; SD de 60 fotos por salida.

Todos los parámetros funcionales se concentran en [`config.js`](config.js), con **[VERIFICAR]**. No son una validación del hardware. Las constantes de dibujo/decoración heredadas no representan parámetros calibrados.

`fx = (1280/2)/tan(82°/2)`; `mm/px = láser × cos(ángulo estimado) / fx`; `ancho = píxeles × mm/px`. Mínimo: **2 píxeles**. Incertidumbre por propagación RSS de láser, segmentación y ángulo/deriva; no es un intervalo de confianza calibrado.

**Límite importante:** una fisura de 0,2 mm necesita acercarse a unos 7 cm para alcanzar 2 píxeles con esta óptica. Se encuadra un **segmento pequeño**, no toda la grieta. Enfoque mínimo, paralaje, seguridad y viabilidad física deben probarse en el prototipo. El ángulo al muro y la inclinación del edificio usan referencias geométricas **sintéticas**; el MPU6050 por sí solo no las identifica.

## Unidad de tierra, agente e informe
TFT lógica 320×240, cola de 0,5–2 s/foto **simulados**, cajas sobre regiones de inspección, cobertura y reglas activadas. `detector.js` expone un adaptador reemplazable: la implementación actual usa verdad de terreno y calidad, con falsos positivos/negativos; **no es un modelo de IA real ni un benchmark de Raspberry Pi**.

El agente considera colapso, inclinación, daño localizado/extendido, amenazas e incertidumbre. **Cobertura fotográfica no es lo mismo que medición de anchos:** ya no se exige medir numéricamente cada fisura para evaluar las demás evidencias. En una región de buena calidad con láser válido, una traza no resoluble aporta una cota óptica conservadora (no un ancho medido), incluyendo margen de píxeles, láser y ángulo. Si esa cota alcanza 1 mm, se aplica amarillo por precaución; solo se permite verde si todas las medidas/cotas permanecen por debajo y no hay otras alarmas. El colapso, la inclinación y las amenazas mantienen su prioridad. Sin cobertura o sin datos utilizables se conserva INDETERMINADO. Las limitaciones reducen la confianza y permiten una segunda salida opcional. Esta cota está condicionada al modelo sintético y no es una garantía de detección en hardware real. La confianza resume cobertura/calidad, **no probabilidad de seguridad**. Si hay réplica opcional, se invalida la cobertura de fotos anteriores y se recuerda repetir la Fase 1.

La verdad de terreno solo se muestra al abrir el informe final/parcial. El ZIP contiene JPEG sintéticos, `telemetria.csv`, `verdad-terreno.json`, `informe.json`, `configuracion.json` y aviso `LEEME.txt`; no sube archivos a ningún servidor.

**Clasificación provisional; no sustituye al evaluador certificado ni a la Fase 2.** La clasificación oficial la hace el evaluador certificado. Los umbrales de reglas son ejemplos didácticos, no normativa oficial.

## Offline, pruebas y gafas
Después de una carga completa se puede usar offline. Para actualizar una caché antigua, cierra todas las pestañas DSE o usa el aviso de actualización. La cabecera dice **2G**. WebXR conserva inspección visual experimental; no se probó en Quest y el flujo completo se hace en escritorio.

Consulta [VALIDACION.md](VALIDACION.md) y [VERIFICAR.md](VERIFICAR.md). Desarrollo: `npm ci`, instalar Chromium de Playwright, servir por HTTP; `npm test`, `npm run test:project2`, `npm run test:offline`. No se necesitan comandos para jugar.

## Nivel 3 — conectar Quest y preparar un salón sin internet

Página del juego: https://juortizra.github.io/DSE/ · Conexión: https://juortizra.github.io/DSE/conectar/

A: abrir URL pública una vez en Quest Browser, esperar caché completa y verificar modo avión. B: servidor HTTP en computador, `adb reverse tcp:8000 tcp:8000`, abrir `http://localhost:8000` desde Quest autorizada por USB. El QR se genera localmente y solo contiene la URL, no empareja dispositivos.

### C: servidor LAN HTTPS
Preparar herramientas y certificado **antes** de ir al salón. No hay dependencias de ejecución externas. En el computador instalar Python 3 y mkcert mediante los canales oficiales; ejecutar (sustituir `192.168.1.50` por su IP LAN):

```sh
mkcert -install
mkcert -cert-file aula.pem -key-file aula-key.pem 192.168.1.50 localhost 127.0.0.1
python simulador/serve-https.py --cert aula.pem --key aula-key.pem --port 8443
```

Conectar computador y gafas al mismo Wi-Fi sin aislamiento; permitir TCP 8443 en el firewall local. Abrir `https://192.168.1.50:8443/conectar/`. Las gafas deben confiar en la CA pública de mkcert (`mkcert -CAROOT` → rootCA.pem), instalada por un mecanismo compatible con su administración. **Nunca distribuir rootCA-key.pem ni la clave del servidor**. Verificar candado/contexto seguro en las gafas, no eludir advertencias TLS. Si la CA no se puede instalar, esta opción NO está preparada: usar A o B. El certificado debe incluir la IP real; los cambios de IP requieren regenerarlo. No exponer este servidor didáctico a internet. No guardar certificados ni claves en Git.

La red local puede no tener internet; la primera carga proviene del computador. Luego el service worker guarda módulos, Three.js, guía y QR local. La caché depende del navegador/almacenamiento y no garantiza permisos WebXR offline: probar con QA-QUEST.md.
