# Corrección de identidad de Git

El 6 de noviembre de 2026 se corrigieron autor y committer de los commits que
usaban la identidad laboral, para asociarlos a la cuenta personal `jortolano`.
La configuración local de este repo utiliza `jortolano` y
`7166927+jortolano@users.noreply.github.com`; no se modificó la configuración global.

La corrección conservó exactamente los árboles de archivos, mensajes y fechas
de cada commit. Los hashes cambian por la identidad y por la referencia a sus
padres. Se actualizaron las referencias de checkpoints en la documentación actual.

| Hash anterior | Hash corregido | Checkpoint |
|---|---|---|
| 9932ccb | 9d3d33d | Versión inicial |
| 04a0a21 | d588bdd | Primera corrección FX y revisión |
| b6daac3 | 27d7091 | Callbacks, LEDs y limpieza |
| b65448e | 19257f8 | Shift y foco FX |
| a0d7a18 | 53ffaed | Hotcues y Cue Loop |
| 5b0ef05 | 0005154 | Slicer y Slicer Loop |
| 696a2b4 | 50fd3e1 | Pitch Play |
| f759a3a | 8e27c0e | Sección central y preescucha |
| 676846f | 5976257 | Jogs, tempo y toma suave |

El historial original completo se conserva **localmente**, sin publicarlo, en:

- Rama `backup/before-personal-identity-20261106-170618`.
- Bundle `.local/before-personal-identity-20261106-170618.bundle`.

El remoto contenía solamente el commit inicial `9932ccb` al preparar esta
corrección. La actualización de `main` usa un lease contra su hash completo
para rechazar el push si alguien publica cambios entretanto.
