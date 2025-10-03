document.addEventListener('DOMContentLoaded', () => {
    // Elementos da página
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const captureButton = document.getElementById('capture-button');
    const downloadLink = document.getElementById('download-link');
    const frameOverlay = document.getElementById('frame-overlay');
    const frameOptionsContainer = document.getElementById('frame-options');
    const resultModule = document.querySelector('.result-module');
    const photoResult = document.getElementById('photo-result');
    const mirrorCheckbox = document.getElementById('mirror-checkbox');
    
    let isMirrored = false; // começa desligado por padrão

    // Alterna espelhamento do preview (apenas o <video>)
    mirrorCheckbox.addEventListener('change', () => {
        isMirrored = mirrorCheckbox.checked;
        video.style.transform = isMirrored ? 'scaleX(-1)' : 'none';
    });

    // Lista de molduras
    const frames = ['moldura1.png', 'moldura2.png', 'moldura3.png']; // Adicione os nomes dos seus arquivos aqui
    let selectedFrameSrc = `assets/${frames[0]}`;

    // Popula as opções de molduras
    frames.forEach((frame, index) => {
        const img = document.createElement('img');
        img.src = `assets/${frame}`; // Adiciona a fonte da imagem para a miniatura
        img.alt = `Moldura ${index + 1}`;
        img.onclick = () => selectFrame(frame);
        if (index === 0) img.classList.add('selected');
        frameOptionsContainer.appendChild(img);
    });

    // Função para iniciar a câmera
    async function initCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
            video.srcObject = stream;
        } catch (err) {
            console.error("Erro ao acessar a câmera: ", err);
            alert("Não foi possível acessar a câmera. Por favor, verifique as permissões no seu navegador.");
        }
    }

    // Função para selecionar a moldura
    function selectFrame(frameFile) {
        selectedFrameSrc = `assets/${frameFile}`;
        frameOverlay.src = selectedFrameSrc;
        
        // Atualiza a classe 'selected' para o feedback visual
        document.querySelectorAll('#frame-options img').forEach(img => {
            img.classList.remove('selected');
            if (img.src.includes(frameFile)) {
                img.classList.add('selected');
            }
        });
    }

    // Função para capturar a foto
    // === Captura 4:5, sem espelhamento, exatamente como o preview ===
    captureButton.addEventListener('click', () => {
        // resolução final (mantenha 4:5 para casar com o preview)
        const TARGET_W = 1200;
        const TARGET_H = 1500;

        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return;

        canvas.width  = TARGET_W;
        canvas.height = TARGET_H;
        const ctx = canvas.getContext('2d');

        // crop que replica object-fit: cover para o aspecto 4:5
        const videoAspect  = vw / vh;
        const targetAspect = TARGET_W / TARGET_H;

        let sx, sy, sWidth, sHeight;
        if (videoAspect > targetAspect) {
            // vídeo mais largo -> corta laterais
            sHeight = vh;
            sWidth  = vh * targetAspect;
            sx = (vw - sWidth) / 2;
            sy = 0;
        } else {
            // vídeo mais alto -> corta topo/baixo
            sWidth  = vw;
            sHeight = vw / targetAspect;
            sx = 0;
            sy = (vh - sHeight) / 2;
        }

        // desenha o recorte do vídeo (sem espelhar)
        // ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
        
        // desenha o recorte do vídeo respeitando o toggle de espelhamento
        if (isMirrored) {
            ctx.save();
            ctx.translate(TARGET_W, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
            ctx.restore();
        } else {
            ctx.drawImage(video, sx, sy, sWidth, sHeight, 0, 0, TARGET_W, TARGET_H);
        }


        // desenha a moldura por cima
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

    // Inicia a câmera ao carregar a página
    initCamera();
});