const numberOfBars = 64; // Keep 64 total bars to fill the width nicely
const barElements = [];
let audioContext = null;
let analyser = null;
let sourceNode = null;
let isAudioInitialized = false;

// 1. Generate all 64 visual elements across the container
const container = document.getElementById("visualizer-container");
for (let i = 0; i < numberOfBars; i++) {
    const bar = document.createElement('div');
    bar.classList.add("bar");
    container.appendChild(bar);
    barElements.push(bar);
}

const audioUpload = document.getElementById("audio-upload");
const audioPlayer = document.getElementById("audio-player");

audioUpload.addEventListener('change', function(){
    const files = this.files;
    if (files.length === 0) return;

    audioPlayer.src = URL.createObjectURL(files[0]);
    audioPlayer.play();

    if (!isAudioInitialized) {
        setupAudioEngine();
        isAudioInitialized = true;
    }
});

function setupAudioEngine() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    
    // We only need 128 fftSize because we are focusing on a 40-bar active pocket anyway
    analyser.fftSize = 128; 
    
    sourceNode = audioContext.createMediaElementSource(audioPlayer);
    sourceNode.connect(analyser);
    analyser.connect(audioContext.destination);
    renderFrame();
}

function renderFrame() {
    requestAnimationFrame(renderFrame);
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteFrequencyData(dataArray);

    // --- THE CORES VS WINGS ZONE LAYOUT ---
    const wingSize = 12; // 12 completely flat bars on the left, 12 on the right
    const activeSize = numberOfBars - (wingSize * 2); // 40 dancing bars left in the middle

    for (let i = 0; i < numberOfBars; i++) {
        // ZONE 1 & ZONE 3: If we are in the outer left or right wings, force rest height
        if (i < wingSize || i >= numberOfBars - wingSize) {
            barElements[i].style.height = `4px`; 
            continue; // Skip the rest of the loop for this bar and move to the next one
        }

        // ZONE 2: We are in the active center pocket! Normalize our index from 0 to 39
        const activeIndex = i - wingSize;
        let volumeValue = 0;

        // Symmetric mirroring logic inside the active 40-bar center pocket
        if (activeIndex < activeSize / 2) {
            volumeValue = dataArray[activeIndex * 2];
        } else {
            const reverseIndex = (activeSize - 1) - activeIndex;
            volumeValue = dataArray[reverseIndex * 2];
        }

        // Smoothly taper the active edges so they blend into the static wings nicely
        const centerProgress = Math.min(activeIndex, (activeSize - 1) - activeIndex) / (activeSize / 2);
        volumeValue = volumeValue * (0.1 + centerProgress * 0.9);

        // Convert the volume data into a clean vertical scale percentage
        const heightPercent = (volumeValue / 255) * 100;

        // Render the active moving bar
        barElements[i].style.height = `${Math.max(4, heightPercent)}%`;
    }
}