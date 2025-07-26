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
        img.src = `assets/${frame}`;
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
        // Define o tamanho do canvas para ser o mesmo do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        // 1. Vira o "pincel" (contexto) do canvas horizontalmente
        context.scale(-1, 1);
        
        // 2. Move o ponto de origem para a direita para compensar o espelhamento
        context.translate(-canvas.width, 0);
        
        // Desenha a imagem (agora espelhada) da câmera no canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Reseta a transformação para que a moldura não seja espelhada junto
        context.setTransform(1, 0, 0, 1, 0, 0);

        // Carrega e desenha a moldura por cima (agora sem espelhamento)
        const frameImage = new Image();
        frameImage.src = selectedFrameSrc;
        frameImage.onload = () => {
            context.drawImage(frameImage, 0, 0, canvas.width, canvas.height);

            // Converte o canvas em uma imagem e prepara o download
            const dataUrl = canvas.toDataURL('image/png');
            photoResult.src = dataUrl;
            downloadLink.href = dataUrl;
            
            // Mostra o módulo de resultado
            resultModule.style.display = 'block';
            window.scrollTo(0, document.body.scrollHeight); // Rola para o final da página
        };
    });

    // Inicia a câmera ao carregar a página
    initCamera();
});
