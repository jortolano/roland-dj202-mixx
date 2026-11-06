# Gestos propios del mapeo para Mixxx

Este documento describe decisiones de nuestro mapeo, **no instrucciones de
Serato**. La referencia comparativa es [COMPARATIVA-SERATO.md](COMPARATIVA-SERATO.md).
La documentación pública no confirma todos los detalles de pulsación o MIDI;
cuando no hay evidencia, no se presenta la conducta como nativa.

## Efectos: comportamiento implementado

| Gesto | Acción en Mixxx | Procedencia |
|---|---|---|
| Toque corto FX 1/2/3 | Encender/apagar ese efecto al soltar | Asignación básica comparable con Serato |
| Mantener FX 1/2/3 | Seleccionar el foco de ese efecto, sin cambiar su activación | Convención propia heredada |
| Shift + mantener FX 1/2/3 | Quitar el foco de toda esa unidad, sin modificar activación ni enrutamiento | **Convención propia nueva**, no confirmada en Serato |
| Perilla FX sin foco | Mover los tres metacontroles de esa unidad | Adaptación propia a los controles de Mixxx |
| Perilla FX con foco | Mover solamente el metacontrol del efecto enfocado | Convención propia heredada |
| Shift + perilla FX | Mezcla seco/húmedo de la unidad | Convención propia; la referencia Serato indica multiplicador rítmico |
| Shift + toque corto FX 1 | Enrutar el deck actual a la unidad de efectos 1 | Convención propia heredada |
| Shift + toque corto FX 2 | Enrutar el deck actual a la unidad de efectos 2 | Convención propia heredada |
| Shift + toque corto FX 3 | Enrutar auriculares a la unidad de ese lado | Convención propia heredada |
| Botón FX Mode/Tap con foco | Seleccionar el efecto siguiente al soltar | Convención propia heredada; **no hace tap tempo de FX** |
| Shift + FX Mode/Tap con foco | Seleccionar el efecto anterior al soltar | Convención propia heredada |
| FX Mode/Tap sin foco | No seleccionar otro efecto | Conducta actual; primero mantener FX 1/2/3 |

El foco es un estado de Mixxx: cero significa control conjunto; uno, dos o tres
selecciona una ranura. No debe confundirse con encendido o enrutamiento.

### Cómo quitar el foco

1. Mantener Shift.
2. Pulsar y mantener cualquiera de los botones FX 1/2/3 de esa unidad por más
   de 275 ms (umbral actual de la biblioteca de componentes).
3. Soltar. Se puede soltar Shift antes que FX.
4. Mover la perilla FX sin Shift: vuelve a controlar las tres ranuras.

El gesto usa el estado de Shift **al pulsar FX**. Si primero se pulsa FX y
después Shift, sigue siendo una pulsación normal: seleccionará el foco.
Esta regla evita que un gesto cambie de acción a mitad de camino.
La selección siguiente/anterior también conserva dirección y ranura desde
el momento de pulsar, aunque Shift se suelte antes.

La pulsación larga produce un parpadeo breve; al terminar vuelve el LED al
estado de la capa actual (efecto activado, o enrutamiento si Shift está pulsado).
El LED no queda encendido permanentemente para indicar foco.

**Cambio respecto a la versión confirmada `b6daac3`:** Shift + toque corto FX
aplica el enrutamiento al **soltar**, antes lo aplicaba al pulsar. Es necesario
esperar para distinguir un toque corto de la nueva acción de mantener.
El umbral es configurable en la biblioteca y no debe asumirse idéntico en
otras versiones de Mixxx. El tap tempo de efectos sigue pendiente; no se añadió
una asignación nueva al botón FX Mode/Tap.

## Pads y loops: correcciones posteriores

| Modo / gesto | Comportamiento actual | Procedencia |
|---|---|---|
| Hotcue + Shift + pad | Borrar el cue, también mientras reproduce; no recrearlo | Corrección para coincidir con el borrado documentado |
| Cue Loop + pad | Alternar bucle desde el cue; si está vacío, crear cue y bucle | Control nativo `hotcue_X_cueloop` de Mixxx 2.4+ |
| Cue Loop + Shift + pad | Relanzar desde un cue existente y reproducir en bucle | Control nativo `hotcue_X_gotoandloop`; no borra el cue |
| Pad Loop Exit (7) | Desactivar el loop sin detener reproducción ni mover la pista | Corrección del anterior `reloop_andstop` |

Cue Loop ya no es momentáneo: soltar el pad no sale del bucle; otro toque
lo alterna. Se usa `cueLoopLength=2` para cues normales. Los loops guardados
usan su propia duración, gestionada por Mixxx. Shift sobre un pad vacío en Cue
Loop no crea uno: necesita un cue existente para relanzar. Sin pista cargada
no se envía ninguna acción de Cue Loop.

Esta adaptación sustituye cálculo manual de muestras y BPM por controles del
programa, que también definen cómo operar sin beatgrid. La escritura de la
duración seleccionada de loop a dos beats es una decisión propia del mapeo.
Requiere Mixxx 2.4 o posterior, indicado ahora en el XML.

Los LEDs de Loop In/Out se convierten a valores MIDI 0/127 a partir de si existe
una posición de loop; antes se enviaban posiciones en muestras como intensidad.
Si se pulsa un hotcue normal y después Shift, soltar el pad libera la activación
original: evita dejar una preescucha retenida por un cambio de modificador.

Referencia técnica: [controles de Mixxx 2.5](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls).
Las pruebas verifican las órdenes y LEDs en los cuatro decks con motor simulado;
el comportamiento de audio y la confirmación física siguen pendientes.

## Slicer y Slicer Loop

### Selección física y diferencia con Sampler

Según el manual Roland local, página 6:

- SAMPLER una vez: Sampler; botón encendido fijo.
- Shift + SAMPLER: Slicer; botón con parpadeo lento. Soltar ambos antes de probar pads.
- SAMPLER dos veces: Slicer Loop; botón con parpadeo rápido.
- Shift + SAMPLER dos veces: disposición sampler/loops dividida; no es Slicer Loop.

En el Sampler de nuestro mapeo, un pad vacío carga la pista seleccionada en la
biblioteca (`LoadSelectedTrack`); un pad cargado la reproduce como fuente auxiliar
(`cue_gotoandplay`). No graba ni recorta la parte que está sonando en un deck.
Mantener el pad no determina la duración de una grabación. Shift + pad detiene
un sample que está reproduciendo o expulsa uno detenido.

Para probar Slicer: reproducir una pista, mantener Shift, pulsar SAMPLER una
sola vez, soltar ambos y comprobar parpadeo lento antes de mantener un pad.
Debe repetir una porción del deck, sin cargar una pista en el sampler.
Si aun con parpadeo lento carga una pista auxiliar, investigar la recepción
del cambio de modo: la luz física por sí sola no prueba que el script lo recibió.

| Gesto / modo | Comportamiento implementado | Procedencia |
|---|---|---|
| Slicer | Ventana móvil dividida en ocho partes; mantener un pad repite desde esa parte | Adaptación propia sobre controles de Mixxx; no copia del código de Serato |
| Slicer Loop | Ventana fija que se repite; mantener un pad repite una porción y soltar vuelve a la ventana fija | Adaptación propia con loop nativo de Mixxx |
| Parameter − / + | Repetición de 1/8, 1/4, 1/2 o 1 beat | Valores y gesto de la referencia Serato; implementación propia |
| Shift + Parameter − / + | Ventana de 2, 4, 8, 16, 32 o 64 beats | Valores y gesto de la referencia Serato; implementación propia |
| Shift + pad | Mantener la acción Slicer; no ejecutar acciones de sampler | Decisión propia para evitar expulsiones accidentales |

Los ajustes son independientes para cada deck, también 3 y 4. Empiezan en
ventana de ocho beats y repetición de un beat. Se conservan durante esta sesión,
pero no se guardan en disco. El tamaño de repetición es independiente del tamaño
de cada porción de la ventana.

Al cambiar la ventana o repetición se libera cualquier pad mantenido y se
reinicializa la ventana. Si se pulsan varios pads, el último domina; soltar un
pad anterior no cancela el último. Para volver al audio normal en Slicer se
suelta el último pad. En Slicer Loop sigue sonando la ventana fija hasta salir
del modo. Cambiar de deck o salir del modo también libera la acción anterior.

El mapeo conserva Slip, tamaño, ancla y posiciones del loop anterior y su estado
activado/desactivado, y los restaura al liberar la acción correspondiente.
Se usa `loop_remove` para desacoplar el loop temporal de un posible loop guardado
antes de modificar posiciones: no se pretende editar el hotcue guardado.
La restauración recupera posiciones y estado, **no el vínculo de edición con la
ranura de un loop guardado**. Si se carga otra pista, se descartan las posiciones
anteriores para no escribirlas en la nueva pista.

Los LEDs de los ocho pads quedan a cargo de Slicer mientras ese modo está activo.
En Slicer se ilumina la porción actual; en Slicer Loop se invierte ese patrón.
No se altera la biblioteca de samples al usar pads de Slicer con Shift.

### Límites y pruebas

La posición se calcula sobre muestras de la pista, usando su BPM local (o de
archivo), la fase de `beat_closest` y el tamaño de la ventana. El fader de tempo
no define el tamaño de los cortes. **Es una aproximación para pistas con tempo
estable**: no implementa reconstrucción de una beatgrid con cambios de tempo.
Sin pista, sin BPM/beatgrid o sin duración/sample rate válidos no dispara cortes.
Una ventana fija que exceda el inicio o final de la pista no se activa.

No se afirma equivalencia temporal con el Slicer de Serato. La cuantización
implementada es el tamaño de repetición del loop temporal, no un planificador
de disparos que espera una futura división del beat.

`test-callbacks.cjs` cubre los ocho pads en cuatro decks, fase de beatgrid,
independencia del fader de tempo, ajustes y límites de Parameter, conservación
de Slip/loop, cambio de modo/deck con pads mantenidos, descarga de pista y
aislamiento del sampler con Shift. Simula las operaciones nativas de loop y
no sustituye una prueba de audio en Mixxx.

Respaldo antes de estos cambios: `a0d7a18` (pads y loops confirmados).

## Pitch Play

Para entrar, pulsar **HOT CUE dos veces, sin Shift**. Según el manual Roland
(página 5), el botón parpadea rápido. HOT CUE una vez es Hotcue normal y
Shift + HOT CUE es Cue Loop: son tres modos diferentes.

Pitch Play reproduce un hotcue del deck con distintas transposiciones; no
graba un fragmento ni carga un archivo en el sampler.

| Gesto | Comportamiento actual | Procedencia |
|---|---|---|
| Mantener un pad | Reproducir el cue seleccionado con el intervalo del pad | Interpretación propia mediante `pitch_adjust` y `hotcue_X_activate` de Mixxx |
| Soltar el último pad | Liberar la preescucha y restaurar el ajuste de tono previo | **Convención propia**; no se afirma que Serato restaure el tono así |
| Shift + pad | Seleccionar un cue existente, sin dispararlo ni borrarlo | Selección comparable con Serato; el tratamiento de pads vacíos es propio |
| Parameter − / + | Recorrer grave → medio → agudo, sin circular en los extremos | Rangos basados en la referencia Serato; recorrido limitado propio |
| Shift + Parameter − / + | La misma selección de rango | Convención propia; no añade otra transposición |
| Ambos Parameter | Volver al rango medio | Convención propia; no ejecuta `reset_key` en este modo |

### Notas de los pads

Valores en semitonos; los pads 1–4 son la fila superior y 5–8 la inferior.

| Rango | Pad 1 | 2 | 3 | 4 | Pad 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Grave | −3 | −2 | −1 | **0** | −7 | −6 | −5 | −4 |
| Medio (inicial) | **0** | +1 | +2 | +3 | −4 | −3 | −2 | −1 |
| Agudo | +4 | +5 | +6 | +7 | **0** | +1 | +2 | +3 |

Sin Shift se ilumina la nota de intervalo cero y, mientras se toca, el pad
activo. Con Shift se ilumina el cue seleccionado. Los Parameter indican
si queda un rango inferior o superior disponible.

### Reglas y diferencias propias

- Inicialmente se selecciona el primer cue existente. Shift sobre un pad vacío
  no crea un cue ni cambia la selección; sin cues, los pads no disparan nada.
  La guía Serato describe creación de cue vacío: **aquí se exige prepararlo
  previamente en Hotcue**, para evitar creaciones accidentales.
- Rango y selección se conservan por deck durante la sesión al cambiar de modo
  o entre 1/3 y 2/4. Cargar otra pista reinicia al rango medio y primer cue disponible.
- Se usa `pitch_adjust`, no la suma de `file_key` y un número de pad; funciona
  también sin análisis de tonalidad. El intervalo se aplica respecto a la base
  de tempo/keylock de Mixxx. Para comparar notas con tempo modificado, activar
  Keylock antes de probar; el mapeo no cambia ese botón automáticamente.
- Al soltar o salir del modo se restaura el `pitch_adjust` anterior al primer pad
  mantenido. Si ya había reproducción normal, continúa; si era preescucha con
  el deck detenido, Mixxx termina la preescucha al liberar el cue.
- No hay acordes: el último pad pulsado domina. Soltar un pad anterior no cancela
  la última nota. Cambiar Shift durante una pulsación no convierte su liberación
  en borrado o selección de otro cue.
- Cambiar de modo/deck o desactivar el mapeo libera la nota y restaura el ajuste.
  Un cambio de pista descarta ese ajuste previo para no aplicarlo a la nueva.
- Si el cue seleccionado es un loop guardado, `hotcue_X_activate` conserva el
  comportamiento nativo de Mixxx y puede activar ese loop. Usar un hotcue normal
  para la prueba básica de Pitch Play.

Prueba rápida: crear un hotcue al comienzo de una voz, pausar, pulsar HOT CUE
dos veces y mantener sucesivamente los pads 1, 2 y 3. En rango medio deberían
sonar a 0, +1 y +2 semitonos mientras se mantienen. Parameter + lleva al rango
agudo; el pad 5 pasa a ser la nota cero. Shift + otro pad con cue cambia la voz
o el punto desde el que se toca.

Las pruebas automatizadas usan los componentes reales de Mixxx y motor simulado:
ocho notas en tres rangos/cuatro decks, selección con Shift, pads vacíos,
liberación, superposición, cambios de modo/deck/pista y apagado del mapeo.
Pendiente validar sonido y selección física con la consola.
Respaldo antes de Pitch Play: `5b0ef05` (Slicer/Slicer Loop confirmados).

Fuentes: [guía Serato DJ-202](https://support.serato.com/hc/en-us/articles/10173607099919-Roland-DJ-202-Quickstart-Guide),
[controles Mixxx 2.5](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls)
y [control de tono de Mixxx 2.5](https://github.com/mixxxdj/mixxx/blob/2.5/src/engine/controls/keycontrol.cpp).
El código de Mixxx permite valores fuera del rango nominal del dial al escribir
`pitch_adjust`, empleado aquí para los extremos de ±7 semitonos.

## Otras diferencias ya existentes

No se modifican en esta actualización. Son decisiones heredadas o adaptaciones
propias, no errores que deban sustituirse automáticamente por la función Serato:

- Shift + Play: reverse. Play mantenido: freno/arranque suave.
- Shift + Cue: comportamiento reverse roll configurado en CueButton.
- Sync: toque para sincronizar, mantener para bloqueo; doble toque restaura BPM
  de archivo. Shift actúa sobre quantize.
- El botón Jog Mode está usado como Slip momentáneo, con doble toque para retener.
- Shift + tempo modifica el tono; no implementa el clutch de tempo de la referencia.
- Shift + Load expulsa la pista; no ordena la biblioteca.
- Shift + jog busca en la pista.
- Keylock mantenido habilita ajuste de tono con Parameter; ambos Parameter
  reinician tono. Shift + Keylock recorre rangos de tempo 8%, 16% y 50%.
- Parameter se usa para beatjump, desplazamiento/tamaño de loop y ajuste de tono.
- Cue Loop usa dos beats por defecto. Pitch Play y Slicer se describen arriba.
- El sampler usa dieciséis posiciones fijas; no replica bancos/salidas de Serato.

Para estado de cobertura, límites y funciones aún ausentes, consultar la matriz.
Agregar aquí cualquier gesto nuevo o cambio de comportamiento antes de instalarlo.

## Verificación de esta actualización

`node test-callbacks.cjs` verifica los seis botones FX, toque corto/largo,
retirada de foco, enrutamiento y cambios de Shift durante la pulsación.
También verifica la selección de efecto usando el manejador global de Shift.
`node test-effects.cjs` comprueba la perilla con y sin foco y con Shift.
Usan motor/MIDI simulados: la validación física sigue pendiente.
