document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureButton = document.getElementById('capture-button');
    const downloadLink = document.getElementById('download-link');
    const frameOverlay = document.getElementById('frame-overlay');
    const frameOptionsContainer = document.getElementById('frame-options');
    const resultModule = document.querySelector('.result-module');
    const photoResult = document.getElementById('photo-result');
    const mirrorCheckbox = document.getElementById('mirror-checkbox');

    // NOVO: refs do botão e estado
    const switchCamBtn = document.getElementById('switch-camera-button');
    let currentFacingMode = 'user';  // 'user' | 'environment'
    let currentStream = null;

    // começa ligado por padrão (espelhado)
    let isMirrored = mirrorCheckbox.checked; 
    video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';

    mirrorCheckbox.addEventListener('change', () => {
        isMirrored = mirrorCheckbox.checked;
        video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
    });

    const frames = ['moldura1.png', 'moldura2.png', 'moldura3.png'];
    let selectedFrameSrc = `assets/${frames[0]}`;

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

    // NOVO: helper para encerrar stream anterior
    function stopCurrentStream() {
        if (currentStream) {
            currentStream.getTracks().forEach(t => t.stop());
            currentStream = null;
        }
    }

    // NOVO: inicia câmera com facingMode OU deviceId
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
            currentFacingMode = deviceId ? currentFacingMode : facingMode;

            // Se for câmera traseira, desliga espelhamento por padrão
            if (currentFacingMode === 'environment') {
                isMirrored = false;
                mirrorCheckbox.checked = false;
                video.style.transform = 'none';
            } else {
                // mantém o estado escolhido pelo usuário
                video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
            }

            // Depois de ter permissão, checa se há mais de uma câmera e decide mostrar botão
            maybeShowSwitchButton();
        } catch (err) {
            console.error("Erro ao acessar a câmera: ", err);
            alert("Não foi possível acessar a câmera. Verifique as permissões no navegador.");
        }
    }

    // NOVO: detectar múltiplas câmeras e exibir botão (apenas mobile)
    async function maybeShowSwitchButton() {
        if (!switchCamBtn) return;

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoInputs = devices.filter(d => d.kind === 'videoinput');

            // mostra o botão se houver 2+ câmeras (comum em celulares)
            if (videoInputs.length >= 2) {
                switchCamBtn.style.display = '';
            } else {
                // fallback: alguns browsers suportam facingMode environment mesmo com 1 device visível
                // deixa visível em mobile/coarse pointer
                switchCamBtn.style.display = '';
            }
        } catch {
            // se não conseguir enumerar, silencia e não mostra
            switchCamBtn.style.display = 'none';
        }
    }

    // NOVO: alternar entre 'user' e 'environment'
    if (switchCamBtn) {
        switchCamBtn.addEventListener('click', async () => {
            const next = currentFacingMode === 'user' ? 'environment' : 'user';
            switchCamBtn.disabled = true;

            try {
                // Primeiro tenta por facingMode (mais simples e rápido)
                await initCamera({ facingMode: next });
                switchCamBtn.textContent = next === 'environment'
                  ? '🔄 Usar câmera frontal'
                  : '🔄 Usar câmera traseira';
            } catch (e1) {
                // fallback: tenta achar deviceId pelo label (requer permissão já concedida)
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices();
                    const videos = devices.filter(d => d.kind === 'videoinput');

                    // heurística: procura por 'back'/'rear' no label p/ traseira; caso contrário pega o último
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

    // CAPTURA (inalterado, só usa isMirrored atual)
    captureButton.addEventListener('click', () => {
        const TARGET_W = 1200;
        const TARGET_H = 1500;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;

        canvas.width  = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');

        const videoAspect  = vw / vh;
        const targetAspect = TARGET_W / TARGET_H;

        let sx, sy, sWidth, sHeight;
        if (videoAspect > targetAspect) {
            sHeight = vh;
            sWidth  = vh * targetAspect;
            sx = (vw - sWidth) / 2;
            sy = 0;
        } else {
            sWidth  = vw;
            sHeight = vw / targetAspect;
            sx = 0;
            sy = (vh - sHeight) / 2;
        }

        if (isMirrored) {
            ctx.save();
            ctx.translate(TARGET_W, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
            ctx.restore();
        } else {
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
        }

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

    // Inicia na frontal
    initCamera({ facingMode: 'user' });
});
