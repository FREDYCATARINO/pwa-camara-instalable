# Guía para defender Inspección Visual PWA

Esta guía resume qué hace el proyecto, cómo está construido y cómo explicarlo en una presentación oral. No es necesario memorizarla palabra por palabra: úsala para entender el flujo y practicar con tus propias palabras.

## 1. Ficha rápida del proyecto

- **Nombre:** Inspección Visual PWA
- **Autor:** FREDY JULIAN CATARINO MERINO
- **Propósito:** mostrar una vista previa de la cámara trasera o frontal después de explicar el uso y recibir la confirmación de la persona usuaria.
- **Tecnologías:** HTML, CSS y JavaScript vanilla; no se usan frameworks ni librerías externas.
- **Asincronía:** Promesas con `.then()`, `.catch()` y `.finally()`; no se usa `async/await`.
- **Publicación:** [GitHub Pages](https://fredycatarino.github.io/pwa-camara-instalable/)
- **Repositorio:** [pwa-camara-instalable](https://github.com/FREDYCATARINO/pwa-camara-instalable)

> **Alcance importante:** la aplicación muestra video en directo, pero no toma, guarda ni descarga fotografías. Tampoco envía el video a un servidor. Si preguntan por captura de evidencia, explica que sería una mejora futura.

## 2. Explicación breve para empezar la exposición

> “Mi proyecto es una aplicación web progresiva para inspección visual. Permite mostrar una vista previa de la cámara frontal o trasera desde el navegador. Antes de pedir el permiso del sistema, presenta un aviso que explica el uso de la cámara y solicita una confirmación. La aplicación está hecha con HTML, CSS y JavaScript sin librerías, usa Promesas para manejar la cámara y cuenta con un manifiesto y un Service Worker para poder instalarse y cargar sus archivos estáticos desde caché.”

## 3. ¿Cómo funciona la aplicación?

El recorrido normal es:

1. Se abre la página desde su dirección HTTPS.
2. Se pulsa **Solicitar acceso a cámara**.
3. La aplicación muestra el aviso de uso consciente.
4. Se pulsa **Aceptar y encender cámara**.
5. JavaScript solicita permiso al navegador y pide la cámara trasera inicialmente.
6. El video se muestra en el elemento `<video>`.
7. Se puede cambiar de cámara o apagarla.

El aviso propio es el **pre-permiso**: explica el propósito antes del diálogo nativo del navegador. La llamada real a la cámara se hace después de que la persona confirma.

## 4. Archivos y responsabilidades

| Archivo | Responsabilidad |
|---|---|
| [index.html](./index.html) | Estructura de la interfaz, controles, aviso de permiso y enlace a los recursos PWA. |
| [styles.css](./styles.css) | Diseño visual adaptable a pantallas grandes y teléfonos. No utiliza Bootstrap ni otra librería. |
| [app.js](./app.js) | Instalación, consentimiento, acceso a cámara, alternancia de lentes, mensajes y liberación del hardware. |
| [manifest.json](./manifest.json) | Nombre, iconos, colores, orientación y modo de presentación al instalar la app. |
| [sw.js](./sw.js) | Registro de la caché y estrategia Cache First para recursos estáticos. |
| `icons/icon-192.png` | Icono PWA de 192 × 192 píxeles. |
| `icons/icon-512.png` | Icono PWA de 512 × 512 píxeles. |

## 5. Conceptos clave de `app.js`

### Estado que conserva la aplicación

- `eventoInstalacionDiferido`: almacena temporalmente el evento que permite mostrar el diálogo de instalación del navegador.
- `streamActual`: conserva el flujo multimedia activo para poder detener sus pistas.
- `modoCamaraActual`: indica el modo solicitado. `environment` representa la trasera y `user` la frontal.

### Consentimiento antes de pedir la cámara

El botón **Solicitar acceso a cámara** solo hace visible `#aviso-permiso`. El botón **Aceptar y encender cámara** oculta el aviso e inicia `iniciarCamara()`. Esta separación evita pedir permiso de forma inesperada al cargar la página.

### `iniciarCamara(modo)`

1. Llama a `detenerCamaraActiva()` para liberar una cámara anterior.
2. Limpia `visorVideo.srcObject`.
3. Comprueba que exista `navigator.mediaDevices.getUserMedia`.
4. Solicita video con `{ facingMode: modo }` y desactiva el audio con `audio: false`.
5. Si la Promesa se resuelve, guarda el flujo, lo conecta al video y actualiza el estado.
6. Si falla, muestra un mensaje según el tipo de error.

`facingMode` expresa qué cámara se prefiere. El navegador y el dispositivo determinan si pueden cumplir esa solicitud.

### Promesas y errores de cámara

`getUserMedia()` devuelve una Promesa, por eso el código encadena `.then()` y `.catch()`:

- **`NotAllowedError`:** permiso rechazado o bloqueado. Hay que habilitarlo en la configuración del sitio o del navegador.
- **`NotFoundError`:** no se encontró una cámara disponible para la solicitud.
- **Otros errores:** se muestra el mensaje proporcionado por el navegador.

No se usa `async/await`; el flujo asíncrono cumple la restricción del proyecto mediante Promesas.

### Detener y alternar cámaras

`detenerCamaraActiva()` obtiene las pistas del flujo con `getTracks()` y llama a `stop()` en cada una. Esto libera el hardware antes de cambiar de cámara y evita dejar el indicador de cámara encendido.

El botón **Cambiar a frontal/trasera** alterna entre `environment` y `user`, actualiza su etiqueta e inicia la cámara seleccionada. El botón **Apagar cámara** detiene las pistas, elimina el flujo del video y muestra **Cámara apagada**.

También se intenta detener el flujo al salir de la página mediante el evento `beforeunload`.

### Video compatible con móviles

En `<video id="visor-camara">`:

- `autoplay` intenta reproducir el flujo al asignarlo.
- `playsinline` evita que iOS fuerce el video a pantalla completa.
- `muted` evita audio y ayuda a que el navegador permita la reproducción automática.

## 6. ¿Qué hace que sea una PWA?

Una **PWA (Progressive Web App)** sigue siendo una aplicación web, pero incorpora capacidades que pueden hacerla instalable y permitir que cargue ciertos recursos desde caché.

### `manifest.json`

- `name` y `short_name`: nombre completo y corto de la app.
- `start_url`: página que se abre al iniciarla.
- `scope`: ámbito de las páginas controladas por la PWA.
- `display: "standalone"`: solicita una ventana similar a una app, sin la interfaz normal de pestañas.
- `theme_color` y `background_color`: colores para la presentación del sistema.
- `orientation`: orientación preferida.
- `icons`: rutas y tamaños de los iconos para la instalación.

Las rutas comienzan con `./` para funcionar también bajo el subdirectorio del proyecto en GitHub Pages.

### Service Worker y caché

Un Service Worker es un script que el navegador ejecuta aparte de la página y que puede interceptar solicitudes de red.

En este proyecto:

1. En `install`, se abre la caché `inspeccion-pwa-v2` y se precargan HTML, CSS, JavaScript, manifiesto e iconos.
2. `skipWaiting()` permite que la nueva versión del Service Worker no espere a que se cierre la anterior.
3. En `activate`, se eliminan las cachés de versiones anteriores y se reclaman las páginas abiertas.
4. En `fetch`, las solicitudes GET buscan primero una respuesta en caché (**Cache First**); si no está, se solicita por red.

La estrategia permite servir los archivos precargados desde la caché. No significa que todas las respuestas de red se guarden automáticamente: el código no añade a caché los recursos que no estaban precargados.

El nombre versionado de la caché es importante: cuando cambian los recursos, incrementar la versión hace que se cree una caché nueva y se retiren las versiones viejas.

### Instalación personalizada

En navegadores compatibles, `beforeinstallprompt` se guarda para mostrar el botón **Instalar app** propio. Al pulsarlo, se llama a `prompt()` y se procesa `userChoice` mediante Promesas. `appinstalled` oculta el botón si la instalación se completa.

El evento `beforeinstallprompt` no está disponible en todos los navegadores. En iPhone, la instalación normalmente se realiza desde Safari con **Compartir → Agregar a pantalla de inicio**.

## 7. Seguridad, privacidad y permisos

- La cámara requiere un **contexto seguro**, normalmente HTTPS. GitHub Pages proporciona HTTPS.
- No se solicita acceso al cargar la página: primero se presenta el aviso y la persona confirma.
- El código conecta el flujo local directamente al elemento `<video>`.
- No hay función que tome una fotografía, la suba, la almacene o la envíe a un servidor.
- `audio: false` significa que la aplicación no solicita el micrófono.
- Si se deniega el permiso, el navegador puede recordar la decisión; puede ser necesario cambiarla desde los ajustes del sitio.

Una respuesta precisa si preguntan por privacidad es: **“La aplicación solo muestra la vista previa local. No implementa captura ni envío de imágenes.”**

## 8. Diseño y accesibilidad

- El CSS adapta los controles a pantallas estrechas y amplias mediante una media query.
- Los botones tienen estados de interacción y un indicador visible de foco de teclado.
- `role="status"` y `aria-live="polite"` permiten que tecnologías de asistencia anuncien cambios de estado.
- El aviso tiene `role="dialog"` y `aria-modal="true"`.
- `prefers-reduced-motion` reduce las transiciones para las personas que solicitan menos movimiento.

## 9. Demostración recomendada en clase

Antes de empezar, abre la aplicación en el teléfono desde:

<https://fredycatarino.github.io/pwa-camara-instalable/>

1. Muestra que la página se sirve con HTTPS.
2. Pulsa **Solicitar acceso a cámara** y enseña que aparece el aviso antes del permiso nativo.
3. Lee o resume el aviso y pulsa **Aceptar y encender cámara**.
4. Acepta el permiso del navegador y muestra la vista previa.
5. Pulsa **Cambiar a frontal** y después **Cambiar a trasera**.
6. Pulsa **Apagar cámara** y confirma que se detiene el video.
7. Si la instalación está disponible, muestra **Instalar app**. En iPhone usa la opción del menú Compartir si no aparece el botón.

Prueba los permisos antes de la clase y lleva el teléfono cargado. Si el navegador ya tiene el permiso bloqueado, habilítalo en los ajustes del sitio antes de la demostración.

## 10. Preguntas frecuentes del docente

**¿Por qué no se solicita permiso al cargar la página?**  
Para evitar una solicitud inesperada y explicar primero para qué se usará la cámara. La persona confirma mediante el aviso de la aplicación antes del diálogo del navegador.

**¿Por qué detienes las pistas antes de cambiar de cámara?**  
Para liberar el sensor activo. Algunos teléfonos no permiten abrir otra cámara hasta detener el flujo anterior.

**¿Qué diferencia hay entre `user` y `environment`?**  
`user` solicita la cámara frontal; `environment`, la trasera.

**¿Por qué se necesita HTTPS?**  
El navegador restringe APIs sensibles como `getUserMedia()` a contextos seguros, salvo excepciones locales de desarrollo.

**¿Qué ocurre si el usuario rechaza el permiso?**  
La Promesa falla y la aplicación muestra un mensaje para que habilite el acceso desde los ajustes del navegador.

**¿La aplicación captura una foto?**  
No. En esta versión solo hay vista previa. Para capturar habría que añadir una función, por ejemplo dibujar un fotograma en un `<canvas>` y definir si se descarga o se conserva.

**¿Funciona sin conexión?**  
Los recursos precargados pueden abrirse desde la caché. La cámara depende de que el dispositivo y el navegador permitan el acceso; la caché no reemplaza el hardware ni los permisos.

**¿Por qué no siempre se ve el botón de instalación?**  
El navegador solo ofrece `beforeinstallprompt` si considera que se cumplen sus criterios y si implementa ese evento. En iOS se suele instalar desde el menú Compartir.

**¿Qué pasa si el usuario eligió “Bloquear” antes?**  
La página no siempre puede volver a mostrar el diálogo nativo. Hay que cambiar el permiso desde la configuración del sitio en el navegador.

## 11. Limitaciones que conviene reconocer

1. No toma ni guarda fotografías; solo muestra video en directo.
2. No tiene una API o servidor propio para subir evidencia.
3. El botón de instalación personalizado depende del soporte del navegador.
4. La disponibilidad de cámara frontal/trasera depende del dispositivo y sus permisos.
5. Si se publican cambios y el dispositivo conserva recursos antiguos, el Service Worker debe actualizar su caché. Por eso se versiona el nombre de la caché.

Reconocer una limitación y explicar cómo se ampliaría demuestra que entiendes el alcance real del código.

## 12. Términos que debes poder explicar

- **PWA:** aplicación web que puede instalarse y usar capacidades del navegador.
- **Manifest:** archivo JSON con identidad y opciones de presentación de la PWA.
- **Service Worker:** script que puede interceptar solicitudes y gestionar caché.
- **Cache First:** consultar caché primero y usar la red si no hay una respuesta guardada.
- **Promesa:** objeto que representa el resultado futuro de una operación asíncrona.
- **`getUserMedia()`:** API del navegador que solicita acceso a cámara o micrófono.
- **`MediaStream`:** flujo multimedia que contiene pistas de video o audio.
- **Pista (`track`):** componente individual de audio o video dentro del flujo.
- **`srcObject`:** propiedad del elemento multimedia a la que se asigna un flujo.
- **Contexto seguro:** origen protegido, como HTTPS, donde el navegador permite ciertas APIs sensibles.

## 13. Consejo final

No afirmes que la app toma fotografías, que funciona sin permisos o que la instalación está garantizada en todos los navegadores. Explica lo que sí hace, muestra el flujo en el teléfono y relaciona cada parte con su archivo: interfaz en HTML, presentación en CSS, comportamiento en JavaScript, metadatos en el manifiesto y caché en el Service Worker.
