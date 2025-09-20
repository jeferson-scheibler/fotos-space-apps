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
        // Define o tamanho do canvas para ser o mesmo do vídeo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        const context = canvas.getContext('2d');
        
        // --- CORREÇÃO APLICADA AQUI ---
        // As linhas que espelhavam a imagem foram removidas.
        // Agora a imagem é desenhada diretamente, sem inversão.
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Carrega e desenha a moldura por cima
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