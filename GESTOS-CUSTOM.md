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
- Slicer usa una ventana fija de ocho beats; Cue Loop usa dos beats por defecto;
  Pitch Play usa un rango fijo. Son implementaciones parciales/adaptadas.
- El sampler usa dieciséis posiciones fijas; no replica bancos/salidas de Serato.

Para estado de cobertura, límites y funciones aún ausentes, consultar la matriz.
Agregar aquí cualquier gesto nuevo o cambio de comportamiento antes de instalarlo.

## Verificación de esta actualización

`node test-callbacks.cjs` verifica los seis botones FX, toque corto/largo,
retirada de foco, enrutamiento y cambios de Shift durante la pulsación.
También verifica la selección de efecto usando el manejador global de Shift.
`node test-effects.cjs` comprueba la perilla con y sin foco y con Shift.
Usan motor/MIDI simulados: la validación física sigue pendiente.
