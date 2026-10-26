# Lista de contraste con el prototipo

Fuente editable: **config.js**. Todos los valores siguientes son de diseño o ejemplo, NO resultados verificados en hardware.

| Grupo | Valores iniciales [VERIFICAR] |
|---|---|
| Cámara | 1280×720, HFOV 82°, obturador 150 ms, JPEG 0,78; ruido ±5 niveles, exposición ±8%, desenfoque 3 px/(m/s). Enfoque mínimo y calibración intrínseca/distorsión pendientes. |
| Montaje | Cámara 0,15 m por delante del centro de colisión; láser co-localizado con cámara `[0,0,0]` por defecto. Medir desfase, paralaje y orientación reales. |
| VL53L0X | 50–1200 mm, ±(3% + 3 mm), 25 Hz, cono total 25°; discretización: 2 anillos ×12 rayos más centro. No reproduce óptica integrada real. |
| Materiales/sol | Reflectancia ficticia 0,45 para texturas; umbrales oscuro 0,08/brillante 0,92; probabilidad de interferencia solar 12%, error ×2 al sol. Vidrio devuelve inválido. |
| MPU6050 | Error actitud ±0,5°; deriva yaw 2°/min sin calibrar, 0,5°/min calibrado; calibración quieto 3 s. Sin magnetómetro. Normal al muro/inclinación de edificio sintéticas, no medidas directas del IMU. |
| Batería | 480 s nominales en simulación; consumo por velocidad +35% al máximo y luz +8%; alertas 25%/15%; descenso automático 0,45 m/s. Confirmar estrategia real de emergencia. |
| SD | 60 fotos por salida: límite didáctico, no capacidad física. Archivo acumulado en tierra entre salidas. |
| Vuelo | 2,4 m/s; control fino ×0,15; radio colisión 0,18 m; choque fuerte >1,7 m/s; roce afecta 1,5 s. Aterrizaje: radio 1,7 m, altura <0,75 m, velocidad <0,3 m/s. |
| Calidad | ≥60%; distancia 0,05–1,2 m; ángulo ≤25°; velocidad ≤0,35 m/s; iluminación ≥0,25. ROI de segmento 24×28 mm. Pesos y escalas editables. |
| Medición | Mínimo 2 px y error de segmentación ±0,5 px; error angular incluye actitud y deriva acumulada. RSS es una aproximación, no una distribución de errores validada. |
| Pi Zero 2 W | TFT 320×240, 0,5–2 s/foto. Tiempos ficticios, no rendimiento medido. |
| Detector | Falso positivo 8% por foto; falso negativo adicional 25% con baja calidad, y no resolución por debajo de 2 px. Perturbación de borde ±0,15 px. No confundir con métricas de IA real. |
| Reglas | Inclinación: amarillo ≥0,5°, rojo ≥1°; grietas: 1/5 mm, daño severo extendido desde 3 elementos. Colapso/amenaza inminente rojo; amenaza externa mínimo amarillo. Validar con evaluador y procedimiento oficial. |
| Puntaje | 45/25/15/15; sobreclasificar un nivel 30/45, dos 20/45; subclasificar uno 10/45; rojo→verde total 0. Penalizaciones de seguridad 0,2 por contacto y 0,25 por límite de zona. |
| Dificultades | Aprendiz: batería ×1,5/sin viento; Normal ×1/viento 0,08 m/s; Experto ×0,75/viento 0,3 m/s. Viento ilustrativo, no meteorológico. |
| Tutorial/réplica/audio | Tutorial objetivo 120 s; réplica opcional a 45 s, duración 4 s. Sacudida, partículas y frecuencias de sonido son ilustrativas. |
| Escenarios | Edificios ficticios de 2/4/5 pisos, 3 m/piso; anchos reales de grietas e inclinación de escenario en configuración. No son mediciones de un edificio real. |

Con la óptica indicada, escalas a 300/500/1000 mm: **0,40748 / 0,67913 / 1,35826 mm/px**. El mínimo de 2 px a 900 mm es **2,4449 mm**. Para 0,2 mm, el máximo teórico es aproximadamente **73,6 mm**: comprobar enfoque y seguridad antes de proponer esa aproximación real.
