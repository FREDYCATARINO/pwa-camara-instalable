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

La solicitud tiene esta forma:

```js
const restricciones = {
  video: { facingMode: modo },
  audio: false
};

navigator.mediaDevices.getUserMedia(restricciones)
```

- `video` solicita una pista de video.
- `facingMode` indica la cámara preferida: `environment` para la trasera y `user` para la frontal.
- `audio: false` indica que no se solicita el micrófono.
- La función solicita acceso. Si el usuario autoriza la cámara, la Promesa se resuelve con un `MediaStream`.

### Promesas y errores de cámara

`getUserMedia()` devuelve una Promesa, por eso el código encadena `.then()` y `.catch()`:

- **`NotAllowedError`:** permiso rechazado o bloqueado. Hay que habilitarlo en la configuración del sitio o del navegador.
- **`NotFoundError`:** no se encontró una cámara disponible para la solicitud.
- **Otros errores:** se muestra el mensaje proporcionado por el navegador.

No se usa `async/await`; el flujo asíncrono cumple la restricción del proyecto mediante Promesas.

### Detener y alternar cámaras

#### ¿Qué es una pista (`track`)?

Un `MediaStream` es el flujo multimedia completo que entrega `getUserMedia()`. Ese flujo contiene una o varias pistas (`MediaStreamTrack`): normalmente una pista por cada fuente de video o audio. En esta app se solicita video y se desactiva el audio, así que se espera una pista de video y ninguna de micrófono.

Una pista es el componente que representa la captura de un medio. El objeto `track` no es el video de la página: es la conexión activa con el sensor. Si solo se oculta el video o se pone `srcObject` en `null`, la cámara podría seguir capturando. Por eso también hay que detener las pistas.

#### ¿Qué hace `getTracks().forEach(track => track.stop())`?

```js
streamActual.getTracks().forEach((track) => {
  track.stop();
});
```

- `streamActual.getTracks()` devuelve un arreglo con todas las pistas del flujo.
- `.forEach(...)` recorre ese arreglo y ejecuta la función una vez por pista.
- `track.stop()` termina la captura de esa pista. Al detener las pistas de este flujo, el navegador puede liberar la cámara si ningún otro flujo la está usando.
- `streamActual = null` borra la referencia que guardaba la aplicación. Esta asignación, por sí sola, no detiene la cámara; la detención real la hace `track.stop()`.

Se usan todas las pistas con `getTracks()` en vez de detener solo video para que la función también libere cualquier pista de audio si en el futuro se agregara.

#### Diferencia entre detener y desconectar el video

- `track.stop()` detiene la captura y libera el uso de esa pista.
- `visorVideo.srcObject = null` desconecta el flujo del elemento `<video>` y limpia la vista.

Se hacen ambas cosas: apagar la pista libera el sensor; limpiar `srcObject` quita del reproductor el flujo que ya se detuvo.

#### Alternancia de lente paso a paso

Al pulsar **Cambiar a frontal/trasera**, el manejador:

1. Invierte `modoCamaraActual`: `environment` pasa a `user` y `user` a `environment`.
2. Cambia el texto del botón para indicar cuál sería el siguiente lente.
3. Vuelve a llamar a `iniciarCamara()` con el modo nuevo.
4. `iniciarCamara()` detiene el flujo anterior antes de pedir el otro.

El permiso inicial del aviso de la aplicación y el permiso del navegador son dos cosas distintas: el primero explica y confirma la intención en la interfaz; el segundo es la autorización del sistema para usar el hardware.

El botón **Apagar cámara** llama a `detenerCamaraActiva()`, establece `srcObject` en `null` y muestra **Cámara apagada**. También se intenta detener el flujo al salir de la página mediante el evento `beforeunload`.

### Métodos y propiedades de JavaScript usados

| Método o propiedad | Qué hace en este proyecto |
|---|---|
| `document.getElementById(id)` | Busca un elemento HTML por su atributo `id`, por ejemplo el video o un botón. |
| `element.addEventListener(tipo, funcion)` | Registra una función para responder a un evento, como `click`, `beforeinstallprompt` o `beforeunload`. |
| `event.preventDefault()` | Evita la acción de instalación automática del navegador para poder ofrecer el botón propio. |
| `navigator.mediaDevices.getUserMedia(restricciones)` | Solicita permiso y acceso a cámara/micrófono; devuelve una Promesa con el `MediaStream` autorizado. |
| `stream.getTracks()` | Obtiene todas las pistas multimedia que forman el flujo. |
| `track.stop()` | Finaliza una pista y detiene su captura. |
| `video.srcObject = stream` | Asigna el flujo al elemento de video para presentar la cámara. Es una propiedad, no un método. |
| `element.textContent = mensaje` | Cambia el texto de estado de forma directa, sin interpretarlo como HTML. |
| `element.hidden = true/false` | Oculta o muestra elementos como el aviso y el botón de instalación. |
| `Promise.resolve()` | Devuelve una Promesa ya resuelta cuando no existe la API de cámara; así `iniciarCamara()` conserva un retorno de tipo Promesa. El estado de la interfaz sigue indicando que no hay cámara disponible. |
| `navigator.serviceWorker.register('./sw.js')` | Registra el Service Worker para que el navegador pueda instalarlo y controlar el ámbito de la app. |

### Cómo leer el encadenamiento de Promesas

```js
getUserMedia(restricciones)
  .then((stream) => {
    // Se ejecuta si el navegador concede el acceso.
  })
  .catch((error) => {
    // Se ejecuta si la solicitud falla o es rechazada.
  });
```

- `.then(...)` procesa el resultado exitoso. El parámetro `stream` es el `MediaStream` que entrega el navegador.
- `.catch(...)` procesa un rechazo, por ejemplo falta de permiso o de cámara.
- `.finally(...)` se ejecuta al final tanto si la Promesa se cumple como si se rechaza. En la instalación se usa para limpiar la referencia al evento, que solo se debe utilizar una vez.
- `return` delante de `getUserMedia(...)` permite que quien llame a `iniciarCamara()` reciba esa Promesa.

En palabras sencillas: **`then` es el camino exitoso; `catch`, el camino de error; `finally`, la limpieza que siempre debe ocurrir.**

### Funciones propias de `app.js`

| Función | Cuándo se usa y para qué sirve |
|---|---|
| `actualizarMensajeEstado(mensaje)` | Escribe el mensaje recibido en `#estado-camara`, por ejemplo “Cámara apagada” o un error. Centraliza ese cambio para no repetir la asignación a `textContent`. |
| `detenerCamaraActiva()` | Si existe `streamActual`, obtiene todas sus pistas, las detiene y luego limpia la variable. Se llama antes de iniciar otro lente y al apagar la cámara. |
| `iniciarCamara(modo)` | Detiene el flujo anterior, construye las restricciones, pide el nuevo flujo con `getUserMedia()` y actualiza video y estado según el resultado. |
| Manejador de `#btn-preparar-camara` | Muestra la tarjeta explicativa; todavía no pide acceso al hardware. |
| Manejador de `#btn-confirmar-permiso` | Oculta la tarjeta y llama a `iniciarCamara(modoCamaraActual)`. |
| Manejador de `#btn-alternar-camara` | Cambia el valor del modo, actualiza el texto del botón y vuelve a iniciar la cámara. |
| Manejador de `#btn-apagar-camara` | Detiene pistas, desconecta el video y muestra el estado apagado. |
| Manejador de `beforeunload` | Llama a `detenerCamaraActiva()` cuando la página está por descargarse. Es una limpieza adicional; el botón de apagado es el control explícito. |

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

#### Métodos del Service Worker

- `event.waitUntil(promesa)`: informa al navegador que la instalación o activación sigue trabajando hasta que termine esa Promesa.
- `caches.open(nombre)`: abre la caché con ese nombre o la crea si no existe.
- `cache.addAll(ARCHIVOS)`: solicita y guarda todos los recursos de la lista de precarga.
- `self.skipWaiting()`: pide que el Service Worker nuevo pase a activarse sin esperar a que el anterior deje de controlar todas las páginas.
- `caches.keys()`: obtiene los nombres de las cachés existentes.
- `caches.delete(nombre)`: borra una caché antigua.
- `Promise.all(promesas)`: espera a que se completen todas las eliminaciones de caché.
- `self.clients.claim()`: hace que el Service Worker activo controle las páginas abiertas de su ámbito.
- `caches.match(solicitud)`: busca en las cachés una respuesta para una solicitud.
- `fetch(solicitud)`: pide el recurso por red cuando no se encontró en caché.

### Instalación personalizada

En navegadores compatibles, `beforeinstallprompt` se guarda para mostrar el botón **Instalar app** propio:

1. `event.preventDefault()` evita que el navegador muestre su aviso automático de inmediato.
2. `eventoInstalacionDiferido = event` conserva el evento para usarlo cuando la persona pulse el botón.
3. `eventoInstalacionDiferido.prompt()` abre el diálogo de instalación del navegador. No instala por la fuerza: la persona decide.
4. `eventoInstalacionDiferido.userChoice` es una Promesa con la decisión; si `resultado.outcome` es `accepted`, se oculta el botón.
5. `.finally(...)` limpia la referencia al evento, porque ese evento de instalación debe tratarse como una oportunidad de un solo uso.
6. El evento `appinstalled` también oculta el botón después de una instalación confirmada.

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
`getUserMedia()` entrega un `MediaStream`, y ese flujo contiene pistas (`MediaStreamTrack`) conectadas a las fuentes multimedia. `getTracks()` obtiene esas pistas y `track.stop()` termina cada captura. Detenerlas libera el sensor antes de solicitar el otro lente; dejar `srcObject` en `null` solo desconecta el reproductor y no sustituye la detención de las pistas.

**¿Qué es una pista y qué contiene?**

Es una fuente individual de audio o video dentro de un `MediaStream`. En esta app se solicita video y se configura `audio: false`, así que no se pide una pista de micrófono.

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
6. Si se cierra el diálogo de instalación en vez de aceptar, el código actual limpia el evento diferido en `finally`, pero solo oculta el botón cuando la instalación fue aceptada. Sería posible mejorar ese caso ocultando el botón hasta recibir un nuevo `beforeinstallprompt`.

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
