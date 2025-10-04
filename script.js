// script.js — versão completa e atualizada
document.addEventListener('DOMContentLoaded', () => {
  // ==== Referências de elementos ====
  const video = document.getElementById('video');
  const canvas = document.getElementById('canvas');
  const captureButton = document.getElementById('capture-button');
  const downloadLink = document.getElementById('download-link');
  const frameOverlay = document.getElementById('frame-overlay');
  const frameOptionsContainer = document.getElementById('frame-options');
  const resultModule = document.querySelector('.result-module');
  const photoResult = document.getElementById('photo-result');
  const mirrorCheckbox = document.getElementById('mirror-checkbox');
  const switchCamBtn = document.getElementById('switch-camera-button'); // pode não existir no desktop

  // Upload da galeria
  const uploadInput = document.getElementById('upload-input');   // input file hidden
  const uploadButton = document.getElementById('upload-button'); // label estilizada (opcional)

  // ==== Estado ====
  let isMirrored = mirrorCheckbox ? mirrorCheckbox.checked : true;
  let currentFacingMode = 'user';  // 'user' | 'environment'
  let currentStream = null;

  // Aplica espelhamento inicial no preview da câmera
  video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';

  // Alterna espelhamento do preview (apenas o <video>)
  if (mirrorCheckbox) {
    mirrorCheckbox.addEventListener('change', () => {
      isMirrored = mirrorCheckbox.checked;
      video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
    });
  }

  // ==== Molduras ====
  const frames = ['moldura1.png', 'moldura2.png', 'moldura3.png']; // adicione mais se quiser
  let selectedFrameSrc = `assets/${frames[0]}`;

  // Popula opções de molduras
  frames.forEach((frame, index) => {
    const img = document.createElement('img');
    img.src = `assets/${frame}`;
    img.alt = `Moldura ${index + 1}`;
    img.onclick = () => selectFrame(frame);
    if (index === 0) img.classList.add('selected');
    frameOptionsContainer.appendChild(img);
  });

  function selectFrame(frameFile) {
    selectedFrameSrc = `assets/${frameFile}`;
    frameOverlay.src = selectedFrameSrc;

    document.querySelectorAll('#frame-options img').forEach(img => {
      img.classList.remove('selected');
      if (img.src.includes(frameFile)) img.classList.add('selected');
    });
  }

  // ==== Câmera: helpers ====
  function stopCurrentStream() {
    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }
  }

  // Inicia câmera com facingMode OU deviceId
  async function initCamera({ facingMode = 'user', deviceId = null } = {}) {
    try {
      stopCurrentStream();

      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { facingMode: { exact: facingMode } },
        audio: false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      currentStream = stream;
      video.srcObject = stream;

      // Atualiza estado do modo atual se foi por facingMode
      if (!deviceId) {
        currentFacingMode = facingMode;
      }

      // Se for câmera traseira, desliga espelhamento por padrão (fica mais natural)
      if (currentFacingMode === 'environment') {
        isMirrored = false;
        if (mirrorCheckbox) mirrorCheckbox.checked = false;
        video.style.transform = 'none';
      } else {
        video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
      }

      // Mostra/oculta botão de alternância conforme suporte
      maybeShowSwitchButton();
    } catch (err) {
      console.error('Erro ao acessar a câmera:', err);
      alert('Não foi possível acessar a câmera. Verifique as permissões do navegador.');
    }
  }

  // Detecta múltiplas câmeras para decidir exibir o botão (mobile)
  async function maybeShowSwitchButton() {
    if (!switchCamBtn) return;

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = devices.filter(d => d.kind === 'videoinput');

      // Se houver 2+ câmeras, mostra o botão. Senão, tenta deixar visível em mobile como fallback.
      if (videoInputs.length >= 2) {
        switchCamBtn.style.display = '';
      } else {
        // fallback (alguns navegadores expõem apenas 1 device mas aceitam 'environment')
        switchCamBtn.style.display = '';
      }
    } catch {
      // Se não conseguir enumerar, esconde
      switchCamBtn.style.display = 'none';
    }
  }

  // Alternância entre frontal e traseira
  if (switchCamBtn) {
    switchCamBtn.addEventListener('click', async () => {
      const next = currentFacingMode === 'user' ? 'environment' : 'user';
      switchCamBtn.disabled = true;

      try {
        // Tenta via facingMode (mais direto)
        await initCamera({ facingMode: next });
        switchCamBtn.textContent = next === 'environment'
          ? '🔄 Usar câmera frontal'
          : '🔄 Usar câmera traseira';
      } catch (e1) {
        // Fallback via deviceId (requer permissão concedida)
        try {
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videos = devices.filter(d => d.kind === 'videoinput');

          let target = null;
          if (next === 'environment') {
            target = videos.find(d => /back|rear|environment/i.test(d.label)) || videos[videos.length - 1];
          } else {
            target = videos.find(d => /front|user|face/i.test(d.label)) || videos[0];
          }

          if (target) {
            await initCamera({ deviceId: target.deviceId });
            currentFacingMode = next;
            switchCamBtn.textContent = next === 'environment'
              ? '🔄 Usar câmera frontal'
              : '🔄 Usar câmera traseira';
          } else {
            alert('Não foi possível alternar a câmera neste dispositivo.');
          }
        } catch (e2) {
          console.error('Falha ao alternar câmera:', e1, e2);
          alert('Não foi possível alternar a câmera neste dispositivo.');
        }
      } finally {
        switchCamBtn.disabled = false;
      }
    });
  }

  // ==== Utilitário: recorte "object-fit: cover" para 4:5 ====
  function drawCoverToCanvas(ctx, source, sw, sh, TARGET_W, TARGET_H, mirror = false) {
    const srcAspect = sw / sh;
    const dstAspect = TARGET_W / TARGET_H;

    let sx, sy, sWidth, sHeight;
    if (srcAspect > dstAspect) {
      // fonte mais larga -> corta laterais
      sHeight = sh;
      sWidth  = sh * dstAspect;
      sx = (sw - sWidth) / 2;
      sy = 0;
    } else {
      // fonte mais alta -> corta topo/baixo
      sWidth  = sw;
      sHeight = sw / dstAspect;
      sx = 0;
      sy = (sh - sHeight) / 2;
    }

    if (mirror) {
      ctx.save();
      ctx.translate(TARGET_W, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
      ctx.restore();
    } else {
      ctx.drawImage(source, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
    }
  }

  // ==== Captura da câmera ====
  captureButton.addEventListener('click', () => {
    const TARGET_W = 1200;
    const TARGET_H = 1500;

    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (!vw || !vh) return;

    canvas.width  = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext('2d');

    // Desenha o recorte do vídeo respeitando o espelho
    drawCoverToCanvas(ctx, video, vw, vh, TARGET_W, TARGET_H, isMirrored);

    // Desenha a moldura por cima
    const frameImage = new Image();
    frameImage.onload = () => {
      ctx.drawImage(frameImage, 0, 0, TARGET_W, TARGET_H);

      const dataUrl = canvas.toDataURL('image/png');
      photoResult.src = dataUrl;
      downloadLink.href = dataUrl;

      resultModule.style.display = 'block';
      resultModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    frameImage.src = selectedFrameSrc;
  });

  // ==== Upload da galeria ====
  if (uploadInput) {
    uploadInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        renderUploaded(img);
        // Permite reenviar a mesma imagem depois
        uploadInput.value = '';
      };
      img.onerror = () => {
        alert('Não foi possível carregar a imagem selecionada.');
      };

      const reader = new FileReader();
      reader.onload = (ev) => { img.src = ev.target.result; };
      reader.readAsDataURL(file);
    });
  }

  function renderUploaded(img) {
    const TARGET_W = 1200;
    const TARGET_H = 1500;

    canvas.width  = TARGET_W;
    canvas.height = TARGET_H;
    const ctx = canvas.getContext('2d');

    // Para fotos da galeria, normalmente NÃO espelhamos
    drawCoverToCanvas(ctx, img, img.naturalWidth, img.naturalHeight, TARGET_W, TARGET_H, false);

    const frameImage = new Image();
    frameImage.onload = () => {
      ctx.drawImage(frameImage, 0, 0, TARGET_W, TARGET_H);

      const dataUrl = canvas.toDataURL('image/png');
      photoResult.src = dataUrl;
      downloadLink.href = dataUrl;

      resultModule.style.display = 'block';
      resultModule.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    frameImage.src = selectedFrameSrc;
  }

  // ==== Inicializa câmera frontal ao carregar ====
  initCamera({ facingMode: 'user' });
});
