# Audio del PC, auriculares DJ-202 y sección central

Revisión del 6 de noviembre de 2026. Configuración indicada por el usuario:
**parlantes del PC y auriculares en la DJ-202**. Respaldo previo del mapeo:
`696a2b4` (Pitch Play). La configuración anterior de audio era FL Studio ASIO,
con una sola salida Master y ninguna de auriculares.

## Controles físicos y MIDI

| Control | Qué se comprobó | Estado |
|---|---|---|
| MASTER LEVEL | El manual de VirtualDJ para DJ-202 lo identifica como control físico de la salida RCA, sin reflejo en GUI | No se añade un CC supuesto ni controla los parlantes del PC |
| PHONES LEVEL | El mismo manual lo identifica como nivel físico de auriculares | Requiere señal de audio hacia la consola; no requiere mover un dial de Mixxx |
| MIXING | Roland describe balance cue/master. El manual de Mixxx para DJ-505 explica mezcla física; se usa como referencia de arquitectura, no como prueba MIDI de DJ-202 | Perfil preparado para alimentar ambas señales; falta confirmar balance físico en DJ-202 |
| CUE de canal | Ya mapeado a `pfl` del deck | Necesita salida de auriculares configurada |
| SAMPLER LEVEL | MIDI BF 1A ya presente en el XML | Cambiado de pregain 0–4 a volumen normalizado de los 16 samplers |
| SAMPLER CUE | MIDI 9F 1D ya presente | Ahora unifica PFL, recibe cambios de GUI y conserva estado al cambiar de modo |

No se ha medido todavía si MASTER, PHONES LEVEL o MIXING también emiten CC.
Su actuación física no demuestra ausencia de MIDI. Una captura sería necesaria
antes de afirmar que se pueden reutilizar para controlar salidas del PC.

Fuentes: [manual DJ-202 de VirtualDJ](https://virtualdj.com/manuals/hardware/roland/dj202/layout/mixer.html),
manual Roland local, página 7, y [referencia DJ-505 de Mixxx](https://manual.mixxx.org/2.5/en/hardware/controllers/roland_dj_505).

## Perfil preparado para esta máquina

Archivo: [config/soundconfig-pc-dj202.xml](config/soundconfig-pc-dj202.xml).
Se enumeraron los dispositivos con la misma biblioteca PortAudio instalada en
`D:\Mixx`. Los tres streams se pudieron abrir simultáneamente a **48 kHz**, sin
iniciar reproducción. Eso verifica acceso al driver, no la audición final en Mixxx.

| Ruta de Mixxx | Dispositivo WASAPI | Canales |
|---|---|---|
| Master | Altavoces (2- USB Audio CODEC ) | 1–2 |
| Headphones | CUE OUTPUT (DJ-202) | 1–2 de ese endpoint |
| Booth | MASTER OUTPUT (DJ-202) | 1–2 de ese endpoint |

La salida Booth es una **adaptación propia**: entrega una copia de la mezcla al
Master físico de la DJ-202 para probar el extremo MASTER de MIXING, mientras
la salida principal sigue en los parlantes del PC. No es el cableado estándar
de un único dispositivo ASIO. El nivel Booth es independiente del Master de
software; para comparar niveles, mantenerlo en unidad (100%). Si se conectan
parlantes RCA a la consola, también recibirán esta copia.

`DJ202.hardwareHeadphoneMixing = true` es una **opción propia**, activa en este
perfil: al iniciar el mapeo fija `[Master],headMix = -1` (cue puro), para que el
balance físico tenga señales separadas. No modifica Master gain ni headGain.
Si la mezcla se hace en software, cambiar esa opción a `false` evita ese ajuste
al iniciar y permite usar el balance en pantalla. La hipótesis de mezcla física
en DJ-202 todavía necesita prueba auditiva.

Los índices PortAudio de este XML son los enumerados en esta máquina; Mixxx
también resuelve el dispositivo por su nombre. No usar este perfil sin revisar
dispositivos en otro PC. Los dos dispositivos pueden tener latencias diferentes;
Mixxx ofrece sincronización para varias interfaces.

Antes de instalarlo, cerrar Mixxx. El instalador guarda el `soundconfig.xml`
anterior con sufijo de respaldo junto al original, en `%LOCALAPPDATA%\Mixxx`.
Para volver, cerrar Mixxx y copiar el respaldo sobre `soundconfig.xml`.

Confirmación posterior del usuario: la preescucha funciona con este perfil.
Master Level se conserva como control de la salida física de la consola.

Estado de instalación: perfil y mapeo instalados con respaldos; Mixxx abierto
con la interfaz principal operativa. Se comprobó la coincidencia de hashes de
los archivos instalados. No se reprodujo audio automáticamente ni se confirmó
auditivamente el balance de la perilla MIXING: realizar la prueba siguiente.

Referencia: [hardware de sonido de Mixxx](https://manual.mixxx.org/2.5/en/chapters/preferences/sound_hardware.html).
Herramienta local de diagnóstico: `python tools/list-audio.py` lista dispositivos;
`--check-outputs 23 21 22` comprueba apertura sin iniciar audio (índices de esta sesión).

## Prueba de preescucha

1. Conectar auriculares al frente de la consola y empezar con PHONES LEVEL bajo.
2. Abrir Mixxx. Comprobar en Hardware de sonido las tres rutas anteriores.
3. Reproducir una pista en el deck 1 y bajar su fader de canal a cero.
4. Activar el CUE de canal 1, poner MIXING hacia CUE y subir PHONES LEVEL lentamente.
   Debe oírse el deck en auriculares y permanecer fuera de los parlantes.
5. Subir el fader y llevar MIXING hacia MASTER: debe oírse la mezcla completa.
6. Si hacia CUE funciona y hacia MASTER hay silencio, revisar la ruta Booth a
   MASTER OUTPUT y su nivel. Si solo falla el balance físico, confirmar los
   mensajes MIDI de MIXING antes de modificar el mapeo.

MASTER LEVEL de la consola no debe tomarse como volumen de los parlantes del
PC: para esos parlantes se usa el Master de Mixxx o su propio nivel físico.

## Cambios del Sampler

- SAMPLER LEVEL usa `volume` de cada sampler con la escala normal de Mixxx.
  Ya no escribe `pregain`; se conserva el ajuste individual de ganancia existente.
  Si se había aumentado con el mapeo anterior, revisar ese trim al comparar niveles.
- CUE del sampler: si alguno está en preescucha, un toque los desactiva todos;
  si ninguno lo está, activa los dieciséis. Es una **convención de grupo propia**.
- El LED indica si hay al menos un sampler en preescucha, incluso al cambiarlo
  desde la GUI. Cambiar de modo de pads no borra ese estado.
- `bindSamplerControls = false` sigue desactivando ambas asignaciones.

Pruebas: endpoints MIDI de volumen, cambios PFL desde GUI, estados mixtos,
reconexión sin reinicio y limpieza, en `test-callbacks.cjs`. Son pruebas de
motor simulado; la prueba de audio queda a cargo de la sesión con la consola.

## Tap de efectos: limitación encontrada

Mixxx 2.5 sincroniza sus efectos temporales (excepto Reverb) con el tempo de
los decks. No se encontró un control público para definir un BPM independiente
por unidad FX, como el Tap de Serato. El Echo nativo recibe la duración del beat
de la señal procesada; su parámetro Time es un multiplicador de ese beat.

`bpm_tap` modifica la beatgrid de la pista y `tempo_tap` modifica su velocidad:
ninguno es un sustituto equivalente de un Tap dedicado a efectos.
**La asignación del botón TAP no cambió**: con foco selecciona el efecto siguiente;
con Shift, el anterior. Los efectos temporales siguen el deck automáticamente.

Un Tap independiente requeriría ampliar Mixxx o una adaptación específica de
parámetros para cada efecto, con límites claros. Sigue pendiente; esta tanda
no declara implementada esa función.

Fuentes: [efectos de Mixxx](https://manual.mixxx.org/2.5/en/chapters/effects.html),
[controles disponibles](https://manual.mixxx.org/2.5/en/chapters/appendix/mixxx_controls)
y [Echo nativo 2.5](https://github.com/mixxxdj/mixxx/blob/2.5/src/effects/backends/builtin/echoeffect.cpp).
