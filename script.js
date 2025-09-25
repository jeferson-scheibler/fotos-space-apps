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
    captureButton.addEventListener('click', () => {
        const container = document.getElementById('camera-container');

        // Tamanhos "reais" do vídeo e aspecto do container (preview)
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        if (!vw || !vh) return; // segurança, caso a câmera ainda não tenha iniciado

        const contW = container.clientWidth;
        const contH = container.clientHeight;

        const videoAspect = vw / vh;
        const containerAspect = contW / contH;

        // Calcula o retângulo DE ORIGEM (crop) no vídeo para imitar o object-fit: cover
        let sx, sy, sWidth, sHeight;
        if (videoAspect > containerAspect) {
            // vídeo mais largo que o container -> corta laterais
            sHeight = vh;
            sWidth  = vh * containerAspect;
            sx = (vw - sWidth) / 2;
            sy = 0;
        } else {
            // vídeo mais alto que o container -> corta topo/baixo
            sWidth  = vw;
            sHeight = vw / containerAspect;
            sx = 0;
            sy = (vh - sHeight) / 2;
        }

        // Define o canvas no MESMO aspecto do preview (4:5).
        // Use a resolução que preferir. Aqui uso o tamanho do container para “o que você vê é o que você obtém”.
        canvas.width  = contW;
        canvas.height = contH;

        const ctx = canvas.getContext('2d');

        // Espelha horizontalmente para ficar igual ao preview (que está com transform: scaleX(-1))
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);

        // Desenha o recorte do vídeo já espelhado ocupando todo o canvas
        ctx.drawImage(
            video,
            sx, sy, sWidth, sHeight,   // origem (crop no vídeo)
            0, 0, canvas.width, canvas.height // destino (canvas)
        );

        ctx.restore();

        // Desenha a moldura por cima ocupando 100% do canvas
        const frameImage = new Image();
        frameImage.src = selectedFrameSrc;
        frameImage.onload = () => {
            ctx.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

            const dataUrl = canvas.toDataURL('image/png');
            photoResult.src = dataUrl;
            downloadLink.href = dataUrl;

            resultModule.style.display = 'block';
            window.scrollTo(0, document.body.scrollHeight);
        };
    });


    // Inicia a câmera ao carregar a página
    initCamera();
});