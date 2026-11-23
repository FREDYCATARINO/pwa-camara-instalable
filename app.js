'use strict';

let eventoInstalacionDiferido = null;
let streamActual = null;
let modoCamaraActual = 'environment';

const visorVideo = document.getElementById('visor-camara');
const estadoCamara = document.getElementById('estado-camara');
const btnInstalar = document.getElementById('btn-instalar');
const btnAlternar = document.getElementById('btn-alternar-camara');

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  eventoInstalacionDiferido = event;
  btnInstalar.hidden = false;
});

btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) {
    return;
  }

  eventoInstalacionDiferido.prompt();
  eventoInstalacionDiferido.userChoice
    .then((resultado) => {
      if (resultado.outcome === 'accepted') {
        btnInstalar.hidden = true;
      }
    })
    .catch(() => {
      actualizarMensajeEstado('No fue posible completar la instalación.');
    })
    .finally(() => {
      eventoInstalacionDiferido = null;
    });
});

window.addEventListener('appinstalled', () => {
  btnInstalar.hidden = true;
  eventoInstalacionDiferido = null;
});

function actualizarMensajeEstado(mensaje) {
  estadoCamara.textContent = mensaje;
}

function detenerCamaraActiva() {
  if (streamActual) {
    streamActual.getTracks().forEach((track) => {
      track.stop();
    });
    streamActual = null;
  }
}

function iniciarCamara(modo) {
  detenerCamaraActiva();
  visorVideo.srcObject = null;

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    actualizarMensajeEstado('La cámara no está disponible. Abre la app mediante HTTPS.');
    return Promise.resolve();
  }

  const restricciones = {
    video: { facingMode: modo },
    audio: false
  };

  return navigator.mediaDevices.getUserMedia(restricciones)
    .then((stream) => {
      streamActual = stream;
      visorVideo.srcObject = stream;
      actualizarMensajeEstado(
        `Cámara activa (${modo === 'environment' ? 'Trasera' : 'Frontal'})`
      );
    })
    .catch((error) => {
      visorVideo.srcObject = null;

      if (error.name === 'NotAllowedError') {
        actualizarMensajeEstado(
          'Permiso denegado. Habilita el acceso a la cámara en los ajustes de tu navegador.'
        );
      } else if (error.name === 'NotFoundError') {
        actualizarMensajeEstado('No se detectó el sensor de cámara solicitado en este dispositivo.');
      } else {
        actualizarMensajeEstado(`Error al acceder al hardware: ${error.message}`);
      }
    });
}

document.getElementById('btn-preparar-camara').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = false;
});

document.getElementById('btn-confirmar-permiso').addEventListener('click', () => {
  document.getElementById('aviso-permiso').hidden = true;
  iniciarCamara(modoCamaraActual);
});

btnAlternar.addEventListener('click', () => {
  modoCamaraActual = modoCamaraActual === 'environment' ? 'user' : 'environment';
  btnAlternar.textContent =
    modoCamaraActual === 'environment' ? 'Cambiar a frontal' : 'Cambiar a trasera';
  iniciarCamara(modoCamaraActual);
});

document.getElementById('btn-apagar-camara').addEventListener('click', () => {
  detenerCamaraActiva();
  visorVideo.srcObject = null;
  actualizarMensajeEstado('Cámara apagada');
});

window.addEventListener('beforeunload', detenerCamaraActiva);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js')
    .then((registration) => {
      console.log('Service Worker registrado:', registration.scope);
    })
    .catch((error) => {
      console.error('No fue posible registrar el Service Worker:', error);
    });
}
