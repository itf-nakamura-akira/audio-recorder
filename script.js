let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyser;
let dataArray;
let animationId;

// Speech Recognition
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let currentTranscript = "";

const recordButton = document.getElementById('recordButton');
const statusDiv = document.getElementById('status');
const statusText = statusDiv.querySelector('.status-text');
const recordingsList = document.getElementById('recordingsList');
const canvas = document.getElementById('visualizer');
const canvasCtx = canvas.getContext('2d');
const transcriptArea = document.getElementById('transcriptArea');

let isRecording = false;

// Initialize Speech Recognition
if (SpeechRecognition) {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'ja-JP'; // Default to Japanese, can be changed!

    recognition.onresult = (event) => {
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                currentTranscript += transcript + " ";
            } else {
                interimTranscript += transcript;
            }
        }
        updateTranscriptDisplay(currentTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
        console.error("Speech Recognition Error:", event.error);
    };
}

function updateTranscriptDisplay(text) {
    if (text.trim() === "") {
        transcriptArea.innerHTML = '<p class="transcript-placeholder">Your transcript will appear here... ✨</p>';
    } else {
        transcriptArea.textContent = text;
        transcriptArea.scrollTop = transcriptArea.scrollHeight; // Auto scroll
    }
}

// Initialize Visualizer
function initVisualizer(stream) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);

    draw();
}

function draw() {
    const width = canvas.width;
    const height = canvas.height;
    
    animationId = requestAnimationFrame(draw);
    analyser.getByteFrequencyData(dataArray);

    canvasCtx.fillStyle = '#f1f2f6';
    canvasCtx.fillRect(0, 0, width, height);

    const barWidth = (width / dataArray.length) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < dataArray.length; i++) {
        barHeight = dataArray[i] / 2;

        // Gradient for bars
        canvasCtx.fillStyle = `rgb(${barHeight + 100}, 92, 231)`;
        canvasCtx.fillRect(x, height - barHeight, barWidth, barHeight);

        x += barWidth + 1;
    }
}

async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        
        mediaRecorder.ondataavailable = (event) => {
            audioChunks.push(event.data);
        };

        mediaRecorder.onstop = () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            addRecordingToList(audioUrl, currentTranscript);
            audioChunks = [];
            
            // Stop visualizer
            cancelAnimationFrame(animationId);
            stream.getTracks().forEach(track => track.stop());
        };

        // Reset transcript
        currentTranscript = "";
        updateTranscriptDisplay("");

        // Start Recording & Recognition
        mediaRecorder.start();
        if (recognition) recognition.start();
        initVisualizer(stream);
        
        isRecording = true;
        updateUI();
    } catch (err) {
        console.error("Error accessing microphone:", err);
        alert("Oops! Could not access your microphone. 🎙️");
    }
}

function stopRecording() {
    mediaRecorder.stop();
    if (recognition) recognition.stop();
    isRecording = false;
    updateUI();
}

function updateUI() {
    if (isRecording) {
        recordButton.classList.add('recording');
        recordButton.querySelector('.btn-text').textContent = 'Stop Recording';
        recordButton.querySelector('.btn-icon').textContent = '⏹️';
        statusDiv.classList.add('recording');
        statusText.textContent = 'Recording...';
    } else {
        recordButton.classList.remove('recording');
        recordButton.querySelector('.btn-text').textContent = 'Start Recording';
        recordButton.querySelector('.btn-icon').textContent = '🎙️';
        statusDiv.classList.remove('recording');
        statusText.textContent = 'Idle';
    }
}

function addRecordingToList(url, transcript) {
    // Remove empty message if it exists
    const emptyMsg = recordingsList.querySelector('.empty-msg');
    if (emptyMsg) emptyMsg.remove();

    const timestamp = new Date().toLocaleString();
    const recordingItem = document.createElement('div');
    recordingItem.className = 'recording-item';
    
    const displayTranscript = transcript.trim() || "No text detected... 🔇";

    recordingItem.innerHTML = `
        <div class="recording-header">
            <span>Recording ${recordingsList.children.length + 1}</span>
            <span>${timestamp}</span>
        </div>
        <audio controls src="${url}"></audio>
        <div class="recording-transcript">
            <h4>Transcript</h4>
            <p>${displayTranscript}</p>
        </div>
    `;
    
    recordingsList.prepend(recordingItem);
}

recordButton.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        startRecording();
    }
});

// Resize canvas to match its displayed size
function resizeCanvas() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
