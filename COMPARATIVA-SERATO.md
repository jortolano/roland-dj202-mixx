# DJ-202: comparación de funciones con Serato

Actualización posterior a la revisión: se corrigieron los enlaces de contexto
de temporizadores y conexiones de LEDs, el parpadeo FX y la limpieza de recursos.
Ver README y `test-callbacks.cjs`. Las filas siguientes conservan el diagnóstico
del respaldo `04a0a21`; las asignaciones siguen siendo las mismas.

Actualización pads/loops: borrado de hotcue sin recreación, Cue Loop nativo con
alternancia y Shift para relanzar, salida del loop sin detener playback y LEDs
de posiciones corregidos. Son cambios posteriores a la matriz histórica;
su contrato actual está en GESTOS-CUSTOM.md.

Actualización Slicer: parámetros de repetición/ventana por deck, numeración de
los ocho pads corregida, ventana fija nativa en Slicer Loop y limpieza al cambiar
modo/deck. La temporización sigue siendo una aproximación para tempo estable;
no se afirma paridad con Serato. Ver GESTOS-CUSTOM.md para límites y pruebas.

Actualización Pitch Play: tres rangos de notas con Parameter, selección de cue
con Shift, uso de `pitch_adjust` sin requerir análisis tonal y restauración del
ajuste anterior al liberar/salir. Los pads vacíos no crean cues; Shift + Parameter
repite la selección de rango. Son decisiones propias documentadas; la matriz
siguiente conserva el diagnóstico inicial y no describe estas correcciones.

Revisión estática: 6 de noviembre de 2026. Respaldo anterior a esta comparación:
**04a0a21**. Incluye la corrección de FX, pruebas y los dos manuales locales.
Esta revisión no modifica las asignaciones ni el mapeo instalado.

## Qué pudimos consultar

No accedimos a un archivo interno del mapeo nativo de Serato. La comparación
usa sus guías públicas y nuestro XML/JavaScript. No se ha demostrado que Serato
permita exportar su asignación nativa completa, incluidos mensajes de inicio y LEDs.
Un preset personalizado exportado tampoco debe suponerse una copia completa.

Fuentes oficiales:

- [DJ-202 con Serato Pro](https://support.serato.com/hc/en-us/articles/10173607099919-Roland-DJ-202-Quickstart-Guide)
- [DJ-202 con Serato Lite](https://support.serato.com/hc/en-us/articles/10321908928655-Roland-DJ-202-Quickstart-Guide-Lite)
- [Manuales Roland](https://www.roland.com/us/support/by_product/dj-202/owners_manuals/)
- Manuales en español incluidos en este repo.

Hay diferencias entre Lite y Pro; no corresponde sumar ambas asignaciones como
si fueran una sola. Además, las tablas web tienen inconsistencias: por ejemplo,
la descripción de HEADPHONE MIX dice navegación, en conflicto con el manual
Roland. Para esos controles debe primar el manual de la consola y una prueba MIDI.
No se consiguió una tabla MIDI oficial independiente en las fuentes consultadas.

## Matriz de diferencias

La columna Serato resume sus guías; la columna Mixxx describe código inspeccionado,
no una garantía de funcionamiento físico. «Diferente» no significa «averiado».

| Control o función | Referencia Serato | Nuestro mapeo | Evaluación |
|---|---|---|---|
| Play y Cue | Transporte | Play, cue; Play largo con freno/arranque | Presente; temporizador por corregir |
| Shift + Play | Stutter | Reverse | Diferente |
| Shift + Cue de transporte | Pista anterior | CueButton con reverseRollOnShift | Diferente; verificar comportamiento heredado |
| Sync / Shift | Activar/desactivar Sync | Sincronizar, mantener para bloqueo, doble toque BPM original; Shift quantize | Diferente y callbacks defectuosos |
| Jog Mode / Shift | Jog / Slip | Botón implementado como Slip; scratch al tocar jog | Diferente; falta comprobar modo vinyl frente a bend |
| Shift + tempo | Ignorar ajuste | Cambiar tono musical | Diferente; no hay clutch equivalente aquí |
| Shift + Load | Ordenar biblioteca | Expulsar pista | Diferente |
| Shift + fader de canal | Fader start | Sin rama específica en el componente volume | Falta ese gesto |
| FX Level / Shift | Intensidad / multiplicador rítmico | Meta de efectos / mezcla seco-húmedo | Normal corregido; Shift diferente |
| Shift + FX 1/2/3 | Elegir efecto | Enrutamiento a decks/auriculares | Diferente |
| Tap FX / mantener | Tempo FX / automático | effectMode recorre effect_selector del efecto enfocado | Falta equivalente de tap FX |
| Keylock / Shift | Bloqueo / rango tempo | Keylock / 8, 16 y 50%; largo cambia modo de tono | Presente; temporizador por corregir |
| Hotcues | Crear, lanzar, borrar | Ocho pads; Shift borra y puede recrear si reproduce | Presente con diferencia al borrar durante reproducción |
| Cue Loop | Alternar bucle desde cue | Duración fija cueLoopLength=2; rama existente activa al pulsar y desactiva al soltar | Parcial/diferente |
| Loop / Roll | Bucles / rolls | Tamaños por potencias de dos; rolls fraccionarios | Presente; verificar tamaños y pads |
| Loops manuales guardados | Guardar/recuperar | Controles manuales presentes; sin gestión explícita de bancos guardados | Parcial |
| Pitch Play | Rangos seleccionables | Un rango fijo en HotcueButton, selección de cue con Shift | Parcial; sin selector de rangos |
| Slicer y Slicer Loop | Dominio y cuantización | Ventana global fija de ocho beats; ParamButtons no implementa selección específica | Parcial |
| Sampler | Bancos y salida seleccionables | Dieciséis samplers con asignación fija; volumen y PFL globales | Parcial; sin navegación de bancos/salidas |
| TR-S y patrones | Secuenciar y sincronizar | Estados declarados; sin clase de secuenciador, reloj o reproducción de pasos | Integración con software ausente; no implica que falle el motor interno |
| Flip | Expansión Pro | Sin implementación equivalente | Función específica de otro software; no añadir como asignación trivial |
| Pads divididos Lite | Cuatro funciones y cuatro loops | Sin selección explícita de ese diseño completo | No hay paridad demostrada |
| Ganancia, EQ, filtro, canal, crossfader y CUE | Mezclador | Componentes presentes | Pendiente verificación física y toma suave |
| Master y auriculares | Salidas/monitorización | No hay asignaciones explícitas para nivel Master, nivel de auriculares o mezcla de auriculares | Investigar si actúan en hardware o emiten MIDI antes de añadir |

## Errores de implementación independientes de Serato

- Callbacks `beginTimer` con `this` sin enlazar: Play, selección de deck, FX,
  Sync, Slip y keylock. Deben probarse pulsación, liberación, doble toque y cambio
  de Shift mientras se mantiene el botón.
- `makeConnection(..., this.output)` en componentes personalizados carece del
  enlace que usa la biblioteca instalada. Puede separar la acción del estado LED.
- `FlashingButton.flash` utiliza `this.send` y `this.flash` desde un callback sin
  enlace; además declara un `value` local que se referencia a sí mismo.
- El jog con Shift divide por duración sin validar pista y no limita el máximo.
- `shutdown` vacío: revisar temporizadores, conexiones y scratch al desactivar.
- Slicer elige lado y deck a partir del número de sampler: revisar selección
  efectiva de decks 3/4 antes de considerarlo compatible con cuatro decks.
- Los estados de secuenciador declarados no prueban soporte; parte de la consola
  funciona internamente y debe separarse del intercambio con el programa.

## Orden recomendado de trabajo

1. Corregir contexto y ciclo de vida de callbacks, con regresiones para Sync,
   Slip y FX. Conservar gestos actuales mientras se estabilizan.
2. Crear una lista de comprobación por control: nota/CC, acción al pulsar y soltar,
   Shift, pulsación larga, LED, decks 1/2 y 3/4. Capturar MIDI real donde haya dudas.
3. Resolver FX completo: selección, feedback, tap y enrutamiento. Elegir y documentar
   los gestos cuando la función actual compite con la referencia de Serato.
4. Completar parámetros de slicer, pitch play, cue loops y bancos de sampler.
5. Abordar TR-S como integración propia: sincronización, audio del instrumento,
   secuenciación de samplers y persistencia, con pruebas separadas.

No conviene reescribir todos los gestos para imitar Serato de una vez: perderíamos
funciones actuales como reverse, quantize, beatjump y expulsión. Las diferencias
deben convertirse en decisiones explícitas, y los defectos en correcciones.
