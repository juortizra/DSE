# QA en Meta Quest — pendiente en hardware real

No hay gafas conectadas al entorno de desarrollo. Implementación WebXR, NO certificación de compatibilidad ni comodidad. Registrar modelo Quest, versión del navegador/OS, URL, fecha y resultado de cada casilla. Probar sentado, con espacio despejado, detenerse ante mareo.

## Preparación y recuperación
- [ ] Abrir el link HTTPS público en Quest Browser con internet. Esperar «Sin conexión listo» en /conectar.
- [ ] En computador sin WebXR: Jugar, foto y análisis siguen funcionando; botones VR/MR ocultos y mensaje claro.
- [ ] Rechazar permisos o provocar un fallo de sesión: no se pierde el juego normal.
- [ ] Verificar entrada con funciones opcionales no disponibles (reintentos mínimos). No pide cámara real.

## VR
- [ ] Iniciar una misión y pulsar Entrar en VR: monitor de aproximadamente 1,2 m a 1,5 m, fijo respecto al espacio del operador.
- [ ] Mover la cabeza: NO cambia la orientación ni la foto del dron.
- [ ] Izquierdo arriba/abajo: altura; izquierda/derecha: giro. Derecho: desplazamiento. Gatillo: foto.
- [ ] A/X: retorno automático por ruta libre y aterrizaje; en tierra inserta SD o acepta la sugerencia calculada. Para discrepar con razón, salir a pantalla. B/Y: FPV/inmersiva. Si no encuentra ruta, mensaje y control manual.
- [ ] Foto durante XR: no corrompe sesión; imagen 1280×720, lecturas sincronizadas. Volver a FPV. Luz se enciende al entrar en XR; hay HUD con rango, batería y checkpoint. La foto aceptada avanza automáticamente al siguiente punto.
- [ ] En Controles, activar vista inmersiva opcional: velocidad reducida, transición oscura, viñeta al girar y cámara suavizada. Probar sentado. No continuar si resulta incómodo.
- [ ] Choque en inmersiva: negro, SD preservada, informe disponible. Se recomienda salir y volver a FPV.
- [ ] Gafas sin foco: vuelo pausado. Mandos apagados tras haber estado conectados: pausa, no movimiento residual. Reconectar y comprobar recuperación.

## MR
- [ ] Entrar en MR: passthrough del sistema, sin acceder a imágenes de cámara real.
- [ ] Maqueta inicial 1:60 delante del usuario. Sin hit-test pero con referencia de suelo: altura 0,8 m. Si tampoco hay referencia de suelo: posición aproximadamente 0,8 m bajo los ojos (mesa estimada a 0,8 m sobre el suelo para operador sentado/altura de ojos de referencia 1,6 m; ajustar).
- [ ] Apuntar a mesa real con el visor; B/Y coloca usando hit-test. Sin soporte, mover con agarre.
- [ ] Agarre cerca de maqueta: mover. Ambos agarres: escalar (1:150 a 1:20). No introducir desplazamientos bruscos del operador.
- [ ] Miniatura del dron se mueve con el vuelo, pantalla FPV visible, unidad de tierra sobre la mesa.
- [ ] Aterrizar: agarrar SD a menos de 18 cm, soltar a menos de 20 cm de unidad. Inicia análisis; TFT representa cola real simulada.
- [ ] Respaldo: gatillo tras aterrizar o botón Insertar SD (overlay si está soportado). No inicia análisis en vuelo.
- [ ] Seguimiento de manos es opcional; gestos select/squeeze dependen del navegador. Si no los emite, usar mandos. No se implementa reconocimiento propio de manos.

## Salida y offline
- [ ] Salir con botón del navegador o Salir de XR (si hay overlay). Reentrar varias veces, sin errores ni recursos acumulados visibles.
- [ ] Tras salir, teclado/ratón y sensores siguen en la pose del dron, no la cabeza.
- [ ] Con carga completa previa, activar modo avión, recargar MISMA URL, iniciar misión, VR/MR, foto, aterrizar y analizar. Repetir después de cerrar/reabrir navegador.
- [ ] El navegador puede desalojar caché; borrar datos requiere otra carga con internet. WebXR y passthrough offline dependen del navegador y permisos persistentes: confirmar en Quest.

## Registro
| Prueba | Quest/OS/navegador | Resultado | Síntoma/pasos |
|---|---|---|---|
| Pendiente | Sin dispositivo disponible | No probado | Completar en clase |
