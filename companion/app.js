// Friend Companion Client Script
// Analyzes local microphone via Web Audio API, applies VAD debounce, and emits speaking state via WebSocket

let ws = null;
let audioContext = null;
let analyser = null;
let animFrameId = null;
let mediaStream = null;

let isSpeaking = false;
let speechStartTimer = null;
let speechEndTimer = null;

// Configurable Debounce / Hysteresis (ms)
const SPEECH_START_DELAY = 60; // Must exceed threshold for 60ms to trigger speaking
const SPEECH_END_DELAY = 220;  // Must stay below threshold for 220ms to end speaking (prevents flicker)

const serverUrlInput = document.getElementById('serverUrl');
const roomIdInput = document.getElementById('roomId');
const userIdInput = document.getElementById('userId');
const micSelect = document.getElementById('micSelect');
const sensSlider = document.getElementById('sensSlider');
const sensVal = document.getElementById('sensVal');
const connectBtn = document.getElementById('connectBtn');
const disconnectBtn = document.getElementById('disconnectBtn');
const statusBadge = document.getElementById('statusBadge');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const meterSection = document.getElementById('meterSection');
const meterBar = document.getElementById('meterBar');
const volumeNumber = document.getElementById('volumeNumber');
const thresholdLine = document.getElementById('thresholdLine');
const speakingPill = document.getElementById('speakingPill');

// Auto-detect default WS URL based on current host if served by server
if (window.location.protocol === 'https:') {
  serverUrlInput.value = `wss://${window.location.host}`;
} else if (window.location.protocol === 'http:') {
  serverUrlInput.value = `ws://${window.location.host}`;
} else {
  serverUrlInput.value = 'ws://localhost:8080';
}

// Restore saved settings
const savedUserId = localStorage.getItem('companion_userId');
if (savedUserId) userIdInput.value = savedUserId;
const savedRoomId = localStorage.getItem('companion_roomId');
if (savedRoomId) roomIdInput.value = savedRoomId;

function updateThresholdPosition() {
  const sens = Number(sensSlider.value);
  sensVal.textContent = sens;
  const percent = Math.min(100, (sens / 40) * 100);
  thresholdLine.style.left = `${percent}%`;
}
sensSlider.addEventListener('input', updateThresholdPosition);
updateThresholdPosition();

// Populate Audio Devices
async function getAudioDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    micSelect.innerHTML = '<option value="">Default Microphone</option>';
    devices
      .filter(d => d.kind === 'audioinput')
      .forEach(device => {
        const opt = document.createElement('option');
        opt.value = device.deviceId;
        opt.textContent = device.label || `Microphone ${micSelect.length + 1}`;
        micSelect.appendChild(opt);
      });
  } catch (e) {
    console.warn('Could not enumerate audio devices:', e);
  }
}

if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
  navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
}

// Initialize Local Microphone
async function startMicrophoneStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
  }

  const deviceId = micSelect.value;
  const constraints = {
    audio: deviceId ? { exact: deviceId } : true,
  };

  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  await getAudioDevices(); // Refresh list with labels after permission granted

  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.5;

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);

  detectVolume();
}

function sendSpeakingState(speaking) {
  if (isSpeaking === speaking) return;
  isSpeaking = speaking;

  if (isSpeaking) {
    statusDot.className = 'dot speaking';
    speakingPill.className = 'speaking-pill active';
    speakingPill.textContent = 'TALKING 🎤';
  } else {
    statusDot.className = 'dot connected';
    speakingPill.className = 'speaking-pill';
    speakingPill.textContent = 'SILENT';
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      type: 'speaking',
      roomId: roomIdInput.value.trim().toUpperCase(),
      userId: userIdInput.value.trim(),
      speaking: isSpeaking,
    }));
  }
}

function detectVolume() {
  if (!analyser) return;

  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);

  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i];
  }
  const avg = sum / data.length;
  const currentVolume = Math.round(avg);

  // Update UI meter
  volumeNumber.textContent = currentVolume;
  const barPercent = Math.min(100, (currentVolume / 40) * 100);
  meterBar.style.width = `${barPercent}%`;

  const threshold = Number(sensSlider.value);

  // VAD Debounce & Hysteresis Logic
  if (currentVolume > threshold) {
    if (speechEndTimer) {
      clearTimeout(speechEndTimer);
      speechEndTimer = null;
    }
    if (!isSpeaking && !speechStartTimer) {
      speechStartTimer = setTimeout(() => {
        sendSpeakingState(true);
        speechStartTimer = null;
      }, SPEECH_START_DELAY);
    }
  } else {
    if (speechStartTimer) {
      clearTimeout(speechStartTimer);
      speechStartTimer = null;
    }
    if (isSpeaking && !speechEndTimer) {
      speechEndTimer = setTimeout(() => {
        sendSpeakingState(false);
        speechEndTimer = null;
      }, SPEECH_END_DELAY);
    }
  }

  animFrameId = requestAnimationFrame(detectVolume);
}

// Connect to WebSocket Server
async function connect() {
  const serverUrl = serverUrlInput.value.trim();
  const roomId = roomIdInput.value.trim().toUpperCase();
  const userId = userIdInput.value.trim();

  if (!serverUrl || !roomId || !userId) {
    alert('Please enter Server URL, Room ID, and your User ID.');
    return;
  }

  localStorage.setItem('companion_userId', userId);
  localStorage.setItem('companion_roomId', roomId);

  try {
    statusText.textContent = 'Starting Microphone...';
    await startMicrophoneStream();
  } catch (e) {
    alert('Microphone access is required to detect speaking.');
    statusText.textContent = 'Mic Error';
    return;
  }

  statusText.textContent = 'Connecting...';
  statusDot.className = 'dot';

  try {
    ws = new WebSocket(serverUrl);
  } catch (err) {
    alert('Invalid WebSocket URL.');
    statusText.textContent = 'Connection Failed';
    return;
  }

  ws.onopen = () => {
    statusText.textContent = `Connected (${userId})`;
    statusDot.className = 'dot connected';
    connectBtn.style.display = 'none';
    disconnectBtn.style.display = 'block';
    meterSection.style.display = 'block';

    // Send Join Message
    ws.send(JSON.stringify({
      type: 'join',
      roomId,
      userId,
      role: 'companion',
    }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);
      if (msg.type === 'joined') {
        console.log('Joined room:', msg);
      }
    } catch (e) {}
  };

  ws.onclose = () => {
    handleDisconnect();
    statusText.textContent = 'Disconnected';
    statusDot.className = 'dot';
  };

  ws.onerror = (e) => {
    console.error('WebSocket Error:', e);
    statusText.textContent = 'Connection Error';
    statusDot.className = 'dot';
  };
}

function handleDisconnect() {
  if (speechStartTimer) clearTimeout(speechStartTimer);
  if (speechEndTimer) clearTimeout(speechEndTimer);
  speechStartTimer = null;
  speechEndTimer = null;
  isSpeaking = false;

  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  if (audioContext) audioContext.close();

  animFrameId = null;
  mediaStream = null;
  audioContext = null;
  analyser = null;

  connectBtn.style.display = 'block';
  disconnectBtn.style.display = 'none';
  meterSection.style.display = 'none';
  statusDot.className = 'dot';
  statusText.textContent = 'Disconnected';
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  handleDisconnect();
}

connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
micSelect.addEventListener('change', () => {
  if (audioContext) startMicrophoneStream();
});
