# Roland DJ-202 para Mixxx

## Pitch Play

HOT CUE dos veces selecciona Pitch Play. Parameter recorre tres rangos de notas;
Shift + pad selecciona un cue existente. Las notas usan transposición de Mixxx
sin depender de la tonalidad analizada y restauran el ajuste previo al liberar
el pad o cambiar de modo/deck. Gestos y tabla de notas en
[GESTOS-CUSTOM.md](GESTOS-CUSTOM.md). Pruebas automatizadas pasadas en cuatro
decks; pendiente prueba física/audio. Respaldo anterior: `5b0ef05`.

## Slicer

Se corrigieron los ocho índices de pad, los LEDs y el aislamiento respecto al
sampler con Shift. Slicer tiene ventana móvil; Slicer Loop usa un loop fijo nativo.
Parameter cambia repetición y Shift + Parameter cambia ventana, con ajustes por
deck. Se restauran Slip y posiciones del loop al salir o cambiar de deck.
La aproximación actual requiere tempo estable y beatgrid: los límites y gestos
están en [GESTOS-CUSTOM.md](GESTOS-CUSTOM.md). Pruebas de script en cuatro decks
pasadas; falta prueba física y de audio. Respaldo anterior: `a0d7a18`.

## Pads y loops

Se corrigió el borrado de hotcues durante reproducción, Cue Loop usa los
controles nativos de Mixxx (toque alterna, Shift relanza), Loop Exit deja
la pista reproduciendo y los LEDs de Loop In/Out envían valores MIDI válidos.
El XML requiere ahora Mixxx 2.4+. Detalles y cambios de gestos en
[GESTOS-CUSTOM.md](GESTOS-CUSTOM.md). `test-callbacks.cjs` cubre los cuatro decks;
falta validación física de esta actualización. Respaldo previo: `b65448e`.

Los gestos propios, su procedencia y sus diferencias respecto a Serato están
documentados en [GESTOS-CUSTOM.md](GESTOS-CUSTOM.md). Incluye la nueva acción
**Shift + mantener FX para quitar foco** y el enrutamiento por toque corto al soltar.

## Corrección de callbacks y LEDs

Se enlazaron los callbacks de Play, cambio de deck, FX, Sync, Slip y keylock
con su componente. Sync, FX y ParamButtons conservan también su contexto al
recibir actualizaciones de Mixxx. Los efectos refrescan sus LEDs al reconectar;
el parpadeo vuelve al estado real y cancela una animación anterior.
Los temporizadores y conexiones propios se registran y limpian en `shutdown`,
junto con conexiones de componentes y scratch. No se cambiaron las asignaciones.

Pruebas: `node test-callbacks.cjs [carpeta-de-controladores-de-Mixxx]` usa las
bibliotecas reales instaladas (por defecto `D:/Mixx/controllers`) y simula el
motor y MIDI. Comprueba pulsaciones cortas/largas y doble toque de Sync,
Slip momentáneo, selección de FX, Play largo, cambio temporal de deck,
keylock mantenido, feedback de ambos lados, desactivación y reinicialización.
`node test-effects.cjs` conserva la regresión de la perilla FX.
La prueba física de esta actualización sigue pendiente.

## Corrección de la perilla FX

La perilla controla los tres metacontroles de su unidad cuando `focused_effect`
es cero; con un efecto enfocado controla solo ese efecto. Shift controla
la mezcla seco/húmedo. Se usa el rango MIDI de 7 bits de las entradas XML.
Antes, sin efecto enfocado, no se enviaba ningún cambio a Mixxx.
Al salir de Shift se protege la toma de control de los tres efectos.
La corrección está instalada en la carpeta de usuario; requiere recargar el
mapeo o reiniciar Mixxx. Prueba automatizada: `node test-effects.cjs`.
Pendiente confirmar el movimiento con el hardware.

## Punto de partida revisado el 6 de noviembre de 2026

Este repositorio contiene un mapeo XML con 356 entradas y un script JavaScript,
orientados a cuatro decks. El XML declara Mixxx 2.1.0+; esto no certifica su
compatibilidad completa con versiones posteriores. El único commit local es
`9932ccb`, del 10 de noviembre de 2025.

La instalación local examinada es **Mixxx 2.5.6 x64**, en `D:\Mixx`.
Incluye el mapeo DJ-505, pero no el DJ-202. Las dependencias del XML,
`lodash.mixxx.js` y `midi-components-0.0.js`, están presentes.

Se copiaron los dos archivos originales, sin cambios de comportamiento, a
`%LOCALAPPDATA%\Mixxx\controllers`. Se comprobó que sus SHA-256 coinciden
con los del repo. Esta carpeta de usuario permite conservarlos al actualizar
Mixxx. No se modificó la configuración de audio ni se activó el dispositivo.

## Activación

1. Abrir Mixxx; si ya estaba abierto, reiniciarlo para actualizar los presets.
2. Ir a Preferencias → Controladores y seleccionar el puerto MIDI de la DJ-202.
3. Cargar **Roland DJ-202**, marcar **Activado** y pulsar **Aplicar**.
4. Configurar por separado la salida principal y auriculares en Hardware de sonido.

Procedimiento oficial: https://manual.mixxx.org/2.5/en/chapters/controlling_mixxx.html

## Funciones presentes en el código

- Decks 1/3 y 2/4, carga y expulsión de pistas, exploración de biblioteca.
- Play, cue, reverse, Sync, quantize, Slip, keylock y rangos de tempo.
- Jogs con scratch, ajuste de velocidad y búsqueda con Shift.
- Ganancia, ecualización, filtro, volumen, crossfader y preescucha por canal.
- Hotcues, cue loops, pitch play, loops, rolls, slicer y slicer loop.
- Dieciséis samplers, controles de efectos y feedback de LEDs desde JavaScript.

La presencia de estas funciones no implica que hayan sido probadas físicamente.
Los modos SEQUENCER, INSTRUMENTRECORD y PATTERN aparecen como estados; eso
no demuestra una integración completa del secuenciador interno con Mixxx.

## Hallazgos y prioridad de mejora

1. **Contexto de callbacks:** varios `engine.beginTimer` usan `function() { ... this ... }`
   sin `.bind(this)`. Afectan pulsación larga de Play, cambio de deck, efectos,
   Sync, Slip y keylock. Por ejemplo, el temporizador de Slip no restablece el
   estado en el botón correcto, y el parpadeo de efectos intenta invocar
   `this.send` desde ese contexto. Migrar a callbacks enlazados y verificar cada gesto.
2. **Feedback de LEDs:** las conexiones personalizadas de Sync y efectos pasan
   `this.output` sin enlazarlo. La biblioteca instalada utiliza `this.output.bind(this)`.
   Revisar también las conexiones personalizadas de ParamButtons antes de probar
   los LEDs como criterio de funcionamiento.
3. **Búsqueda sin pista:** el jog con Shift divide por `duration` sin comprobar
   que sea mayor que cero; tampoco limita la posición máxima a 1.
4. **Limpieza:** `shutdown` está vacío. Registrar y detener temporizadores,
   desconectar conexiones propias y liberar scratch/estados momentáneos al salir.
5. **Samplers y LEDs:** existen FIXME sobre la zona muerta del volumen del sampler
   y feedback de pads. Comprobar resolución MIDI y comportamiento real.
6. **Mantenimiento:** `i` en `debug` y `channel` en el constructor Deck se asignan
   sin declaración local. Falta documentar los gestos y revisar atribuciones/licencia
   antes de redistribuir: el XML atribuye el mapeo a Silvio Ankermann.

La revisión inicial conservó el mapeo; las correcciones posteriores figuran arriba.

## Alternativas encontradas

- Seguimiento oficial aún abierto: https://github.com/mixxxdj/mixxx/issues/11497
  La discusión menciona fallos de LEDs y Sync al pasar de 2.3 a 2.4. En octubre
  de 2025 enlaza una adaptación específica para Mixxx 2.5.
- Adaptación: https://github.com/mrtnGLSR/DJ-202
  Su README declara Mixxx 2.5.3, Sync y Slip corregidos, pero LEDs de FX y
  controles del mezclador pendientes. Es una referencia para comparar, no hay
  evidencia suficiente para considerarla un reemplazo completo superior.
- Antecedente: https://gist.github.com/upCASE/c8dace3e70d565a4b1178f7013d3d738
- El DJ-505 incluido en Mixxx 2.5.6 sirve como referencia de implementación
  actual, pero el seguimiento oficial advierte diferencias en pads con la DJ-202.

No se encontró un reemplazo oficial completo en las fuentes consultadas.
No se hizo todavía una comparación línea por línea con la variante mrtnGLSR.

## Documentación y pruebas siguientes

Los PDF locales son el manual de usuario y la guía de inicio en español.
Describen controles y operación con Serato; no sustituyen una tabla de
implementación MIDI para confirmar canales, notas, CC y mensajes SysEx.

Orden sugerido para recuperar el estado real:

1. Activar el preset y comprobar el registro de Mixxx en busca de errores de script.
2. Probar carga, Play/Cue, faders, EQ, filtro, crossfader y preescucha en decks 1/2.
3. Probar jogs, tempo y cambio a decks 3/4.
4. Registrar por separado pulsación corta, larga, doble y Shift en Sync y Slip.
5. Probar hotcues, loops/rolls, samplers y efectos, anotando acción y LED por separado.

Verificación realizada: XML parseable, dependencias existentes, JavaScript válido
con `node --check` y copias idénticas mediante SHA-256. Pendientes: ejecución del
script dentro de Mixxx y pruebas físicas con la consola.
