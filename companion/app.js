// Friend Companion Client Script — v2.4.0
// Production background-proof audio engine using Web Worker 50Hz polling,
// AnalyserNode, AudioContext auto-resume, and silent media keepalive.
// Runs non-stop in the background when minimized, tab-switched, or playing full-screen games.

let ws = null;
let currentConnectionGeneration = 0;
let reconnectAttempts = 0;
let reconnectTimer = null;
let voiceHeartbeatTimer = null;
let manualDisconnect = false;

let audioContext = null;
let analyser = null;
let analyserData = null;
let mediaStream = null;
let uiAnimFrameId = null;
let vadWorker = null;
let silentAudioEl = null;

let isSpeaking = false;
let latestVolume = 0;
let speechStartTime = 0;
let lastAboveThresholdTime = 0;

const SPEECH_START_DELAY = 60; // ms above threshold to trigger speaking
const SPEECH_END_DELAY = 220;  // ms below threshold to end speaking
const VOICE_HEARTBEAT_INTERVAL_MS = 1500; // ms between state refresh heartbeats

// UI Elements
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
const testSpeakBtn = document.getElementById('testSpeakBtn');
const testSilentBtn = document.getElementById('testSilentBtn');
const testFeedback = document.getElementById('testFeedback');

// Debug Elements
const dbgConnection = document.getElementById('dbgConnection');
const dbgReadyState = document.getElementById('dbgReadyState');
const dbgServerUrl = document.getElementById('dbgServerUrl');
const dbgRoomUser = document.getElementById('dbgRoomUser');
const dbgLastEvent = document.getElementById('dbgLastEvent');
const dbgLastMsgIn = document.getElementById('dbgLastMsgIn');
const dbgLastMsgOut = document.getElementById('dbgLastMsgOut');
const dbgLastError = document.getElementById('dbgLastError');
const dbgReconnects = document.getElementById('dbgReconnects');
const dbgCloseCode = document.getElementById('dbgCloseCode');
const dbgCloseReason = document.getElementById('dbgCloseReason');
const dbgMicDevice = document.getElementById('dbgMicDevice');
const dbgMicPerm = document.getElementById('dbgMicPerm');
const dbgVisibility = document.getElementById('dbgVisibility');
const dbgLastHeartbeat = document.getElementById('dbgLastHeartbeat');
const dbgAudioCtx = document.getElementById('dbgAudioCtx');
const dbgMicLevel = document.getElementById('dbgMicLevel');
const dbgVadTransition = document.getElementById('dbgVadTransition');
const debugToggle = document.getElementById('debugToggle');
const debugGrid = document.getElementById('debugGrid');
const debugArrow = document.getElementById('debugArrow');

const READY_STATE_MAP = {
  0: '0 CONNECTING',
  1: '1 OPEN',
  2: '2 CLOSING',
  3: '3 CLOSED',
};

const CLOSE_CODE_EXPLANATIONS = {
  1000: '1000 Normal Closure (Clean close)',
  1001: '1001 Going Away (Browser tab closed or refreshed)',
  1002: '1002 Protocol Error',
  1003: '1003 Unsupported Data',
  1005: '1005 No Status Received',
  1006: '1006 Abnormal Closure (Socket dropped without close frame)',
  1008: '1008 Policy Violation',
  1011: '1011 Server Error (Crash or unexpected condition)',
};

function ts() {
  const d = new Date();
  return d.toTimeString().split(' ')[0] + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

// Collapsible debug grid
if (debugToggle) {
  debugToggle.addEventListener('click', () => {
    const isHidden = debugGrid.style.display === 'none';
    debugGrid.style.display = isHidden ? 'grid' : 'none';
    debugArrow.textContent = isHidden ? '▼' : '▶';
  });
}

// Auto-detect default WS URL
if (window.location.protocol === 'https:') {
  serverUrlInput.value = `wss://${window.location.host}`;
} else if (window.location.protocol === 'http:') {
  serverUrlInput.value = `ws://${window.location.host}`;
} else {
  serverUrlInput.value = 'wss://reactive-avatars.onrender.com';
}

// Restore saved settings
const savedUserId = localStorage.getItem('companion_userId');
if (savedUserId) userIdInput.value = savedUserId;
const savedRoomId = localStorage.getItem('companion_roomId');
if (savedRoomId) roomIdInput.value = savedRoomId;
const savedServerUrl = localStorage.getItem('companion_serverUrl');
if (savedServerUrl) serverUrlInput.value = savedServerUrl;

function updateThresholdPosition() {
  const sens = Number(sensSlider.value);
  sensVal.textContent = sens;
  const percent = Math.min(100, (sens / 40) * 100);
  thresholdLine.style.left = `${percent}%`;
}
sensSlider.addEventListener('input', updateThresholdPosition);
updateThresholdPosition();

// ── Silent Audio Media Keepalive ─────────────────────────────────
// Playing a silent audio element marks this tab as an active media player in Chrome/Firefox/Edge,
// which prevents the browser from throttling JavaScript, suspending AudioContext, or pausing Web Audio.
function startSilentMediaKeepalive() {
  if (!silentAudioEl) {
    silentAudioEl = document.createElement('audio');
    silentAudioEl.setAttribute('playsinline', '');
    silentAudioEl.setAttribute('autoplay', '');
    silentAudioEl.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
    silentAudioEl.loop = true;
    silentAudioEl.volume = 0.01;
    silentAudioEl.style.display = 'none';
    document.body.appendChild(silentAudioEl);
  }
  silentAudioEl.play().catch(() => {});
}

function stopSilentMediaKeepalive() {
  if (silentAudioEl) {
    try {
      silentAudioEl.pause();
      silentAudioEl.currentTime = 0;
    } catch (e) {}
  }
}

// ── Unthrottled Background Web Worker ────────────────────────────
// Web Workers are executed on a separate thread and are NOT throttled by Chrome when minimized.
function initVadWorker() {
  if (vadWorker) return;
  const workerCode = `
    let timer = null;
    self.onmessage = function(e) {
      if (e.data === 'start') {
        if (timer) clearInterval(timer);
        timer = setInterval(function() {
          self.postMessage('tick');
        }, 20); // 50 Hz unthrottled audio analysis
      } else if (e.data === 'stop') {
        if (timer) clearInterval(timer);
        timer = null;
      }
    };
  `;
  const blob = new Blob([workerCode], { type: 'application/javascript' });
  vadWorker = new Worker(URL.createObjectURL(blob));

  vadWorker.onmessage = (e) => {
    if (e.data === 'tick') {
      processAudioFrame();
    }
  };
}

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
    dbgMicPerm.textContent = 'GRANTED';
    dbgMicPerm.className = 'debug-value ok';
  } catch (e) {
    console.warn('Could not enumerate audio devices:', e);
    dbgMicPerm.textContent = 'DENIED / BLOCKED';
    dbgMicPerm.className = 'debug-value err';
  }
}

if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
  navigator.mediaDevices.addEventListener('devicechange', getAudioDevices);
}

// Check initial permissions
if (navigator.permissions && navigator.permissions.query) {
  navigator.permissions.query({ name: 'microphone' }).then(result => {
    dbgMicPerm.textContent = result.state.toUpperCase();
    dbgMicPerm.className = result.state === 'granted' ? 'debug-value ok' : 'debug-value warn';
    result.onchange = () => {
      dbgMicPerm.textContent = result.state.toUpperCase();
      dbgMicPerm.className = result.state === 'granted' ? 'debug-value ok' : 'debug-value warn';
    };
  }).catch(() => {});
}

// ── Background-Proof Web Audio Setup ─────────────────────────────
async function startMicrophoneStream() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
  }

  const deviceId = micSelect.value;
  const constraints = {
    audio: deviceId ? { exact: deviceId } : true,
  };

  mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
  await getAudioDevices();

  const selectedOpt = micSelect.options[micSelect.selectedIndex];
  dbgMicDevice.textContent = selectedOpt ? selectedOpt.text : 'Default';

  // Create AudioContext
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  dbgAudioCtx.textContent = audioContext.state.toUpperCase();
  dbgAudioCtx.className = audioContext.state === 'running' ? 'debug-value ok' : 'debug-value warn';

  analyser = audioContext.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.4;
  analyserData = new Uint8Array(analyser.frequencyBinCount);

  // Mute gain connects to destination to ensure the browser continuously pulls
  // hardware audio buffers from the microphone even when the tab is minimized.
  const muteGain = audioContext.createGain();
  muteGain.gain.value = 0.0;

  const source = audioContext.createMediaStreamSource(mediaStream);
  source.connect(analyser);
  analyser.connect(muteGain);
  muteGain.connect(audioContext.destination);

  // Keep AudioContext and tab media session alive and active
  startSilentMediaKeepalive();
  initVadWorker();
  vadWorker.postMessage('start');

  startUIRefreshLoop();
}

function processAudioFrame() {
  if (!analyser || !analyserData || !audioContext) return;

  // Auto-resume if suspended by browser
  if (audioContext.state === 'suspended') {
    audioContext.resume().catch(() => {});
  }

  analyser.getByteFrequencyData(analyserData);

  let sum = 0;
  for (let i = 0; i < analyserData.length; i++) {
    sum += analyserData[i];
  }
  const avg = sum / analyserData.length;
  latestVolume = Math.round(avg);

  const now = performance.now();
  const threshold = Number(sensSlider.value);

  // VAD Debouncing & Hysteresis Logic
  if (latestVolume > threshold) {
    lastAboveThresholdTime = now;
    if (!isSpeaking) {
      if (speechStartTime === 0) speechStartTime = now;
      if (now - speechStartTime >= SPEECH_START_DELAY) {
        sendSpeakingState(true);
        speechStartTime = 0;
      }
    }
  } else {
    speechStartTime = 0;
    if (isSpeaking) {
      if (now - lastAboveThresholdTime >= SPEECH_END_DELAY) {
        sendSpeakingState(false);
      }
    }
  }
}

function startUIRefreshLoop() {
  function renderUI() {
    if (audioContext) {
      volumeNumber.textContent = latestVolume;
      const barPercent = Math.min(100, (latestVolume / 40) * 100);
      meterBar.style.width = `${barPercent}%`;

      const threshold = Number(sensSlider.value);
      dbgMicLevel.textContent = `${latestVolume} / ${threshold}`;
    }
    uiAnimFrameId = requestAnimationFrame(renderUI);
  }
  if (uiAnimFrameId) cancelAnimationFrame(uiAnimFrameId);
  uiAnimFrameId = requestAnimationFrame(renderUI);
}

function updateDebugSocketState() {
  if (!ws) {
    dbgConnection.textContent = '🔴 DISCONNECTED';
    dbgConnection.className = 'debug-value err';
    dbgReadyState.textContent = '3 CLOSED (null)';
    return;
  }
  const rs = ws.readyState;
  dbgReadyState.textContent = READY_STATE_MAP[rs] || `${rs} UNKNOWN`;
  if (rs === WebSocket.OPEN) {
    dbgConnection.textContent = '🟢 CONNECTED';
    dbgConnection.className = 'debug-value ok';
  } else if (rs === WebSocket.CONNECTING) {
    dbgConnection.textContent = '🟡 CONNECTING';
    dbgConnection.className = 'debug-value warn';
  } else {
    dbgConnection.textContent = '🔴 DISCONNECTED';
    dbgConnection.className = 'debug-value err';
  }
}

function sendSpeakingState(speaking, isManualTest = false) {
  const prevSpeaking = isSpeaking;
  isSpeaking = speaking;

  if (prevSpeaking !== isSpeaking) {
    const transitionStr = `${prevSpeaking ? 'SPEAKING' : 'SILENT'} → ${isSpeaking ? 'SPEAKING' : 'SILENT'} (${ts()})`;
    dbgVadTransition.textContent = transitionStr;
    dbgVadTransition.className = isSpeaking ? 'debug-value ok' : 'debug-value';
  }

  if (isSpeaking) {
    statusDot.className = 'dot speaking';
    speakingPill.className = 'speaking-pill active';
    speakingPill.textContent = 'TALKING 🎤';
  } else {
    statusDot.className = ws && ws.readyState === WebSocket.OPEN ? 'dot connected' : 'dot';
    speakingPill.className = 'speaking-pill';
    speakingPill.textContent = 'SILENT';
  }

  const payload = {
    type: 'speaking',
    roomId: roomIdInput.value.trim().toUpperCase(),
    userId: userIdInput.value.trim(),
    speaking: isSpeaking,
  };

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(payload));
    dbgLastMsgOut.textContent = `${ts()} [speaking=${isSpeaking}]`;
  } else {
    dbgLastMsgOut.textContent = `${ts()} [NOT SENT: Socket not open]`;
  }

  if (isManualTest) {
    testFeedback.textContent = `TEST SENT ✓ (${speaking ? 'SPEAKING' : 'SILENT'} @ ${ts()})`;
    setTimeout(() => {
      if (testFeedback.textContent.includes('TEST SENT')) {
        testFeedback.textContent = '';
      }
    }, 4000);
  }
}

function sendVoiceHeartbeat(generation) {
  if (generation !== currentConnectionGeneration) return;
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const payload = {
    type: 'voice_heartbeat',
    roomId: roomIdInput.value.trim().toUpperCase(),
    userId: userIdInput.value.trim(),
    speaking: isSpeaking,
  };

  try {
    ws.send(JSON.stringify(payload));
    if (dbgLastHeartbeat) {
      dbgLastHeartbeat.textContent = `${ts()} [speaking=${isSpeaking}]`;
    }
  } catch (e) {}
}

// ── Visibility & Focus Handling ──────────────────────────────────
function handleVisibilityChange() {
  const isHidden = document.visibilityState === 'hidden';
  if (dbgVisibility) {
    dbgVisibility.textContent = isHidden ? 'BACKGROUND / MINIMIZED (Worker Active)' : 'VISIBLE';
    dbgVisibility.className = isHidden ? 'debug-value warn' : 'debug-value ok';
  }

  if (audioContext && audioContext.state === 'suspended') {
    audioContext.resume().then(() => {
      if (dbgAudioCtx) {
        dbgAudioCtx.textContent = audioContext.state.toUpperCase();
        dbgAudioCtx.className = 'debug-value ok';
      }
    }).catch(() => {});
  }
}

document.addEventListener('visibilitychange', handleVisibilityChange);
window.addEventListener('blur', handleVisibilityChange);
window.addEventListener('focus', handleVisibilityChange);

// ── Connect to WebSocket Server with generation token protection ─
async function connect() {
  manualDisconnect = false;
  const serverUrl = serverUrlInput.value.trim();
  const roomId = roomIdInput.value.trim().toUpperCase();
  const userId = userIdInput.value.trim();

  if (!serverUrl || !roomId || !userId) {
    alert('Please enter Server URL, Room ID, and your User ID.');
    return;
  }

  localStorage.setItem('companion_userId', userId);
  localStorage.setItem('companion_roomId', roomId);
  localStorage.setItem('companion_serverUrl', serverUrl);

  dbgServerUrl.textContent = serverUrl;
  dbgRoomUser.textContent = `${roomId} / ${userId}`;

  // 1. Safely close any existing socket
  if (ws) {
    try {
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      ws.close();
    } catch (e) {}
    ws = null;
  }

  // 2. Increment generation token
  const myGeneration = ++currentConnectionGeneration;

  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (voiceHeartbeatTimer) {
    clearInterval(voiceHeartbeatTimer);
    voiceHeartbeatTimer = null;
  }

  try {
    statusText.textContent = 'Starting Mic...';
    dbgAudioCtx.textContent = 'STARTING...';
    await startMicrophoneStream();
  } catch (e) {
    alert('Microphone access is required to detect speaking: ' + e.message);
    statusText.textContent = 'Mic Error';
    dbgLastError.textContent = `Mic Error: ${e.message}`;
    return;
  }

  statusText.textContent = 'Connecting...';
  statusDot.className = 'dot connecting';
  dbgLastEvent.textContent = `${ts()} CONNECTING (gen #${myGeneration})`;
  updateDebugSocketState();

  try {
    const socket = new WebSocket(serverUrl);
    ws = socket;
    updateDebugSocketState();

    socket.onopen = () => {
      if (myGeneration !== currentConnectionGeneration) return;
      reconnectAttempts = 0;
      dbgReconnects.textContent = '0';
      dbgLastEvent.textContent = `${ts()} OPEN (Connected)`;
      dbgLastError.textContent = 'None';
      updateDebugSocketState();

      statusText.textContent = `Connected (${userId})`;
      statusDot.className = 'dot connected';
      connectBtn.style.display = 'none';
      disconnectBtn.style.display = 'block';
      meterSection.style.display = 'block';

      // Send Join Message
      const joinMsg = {
        type: 'join',
        roomId,
        userId,
        role: 'companion',
      };
      socket.send(JSON.stringify(joinMsg));
      dbgLastMsgOut.textContent = `${ts()} [join room=${roomId} user=${userId}]`;

      // Start periodic state refresh heartbeat
      if (voiceHeartbeatTimer) clearInterval(voiceHeartbeatTimer);
      voiceHeartbeatTimer = setInterval(() => {
        sendVoiceHeartbeat(myGeneration);
      }, VOICE_HEARTBEAT_INTERVAL_MS);
    };

    socket.onmessage = (event) => {
      if (myGeneration !== currentConnectionGeneration) return;
      try {
        const msg = JSON.parse(event.data);
        dbgLastMsgIn.textContent = `${ts()} [type=${msg.type || 'unknown'}]`;

        if (msg.type === 'joined') {
          dbgLastMsgIn.textContent = `${ts()} [joined room=${msg.roomId} count=${msg.users?.length || 1}]`;
        } else if (msg.type === 'ping') {
          socket.send(JSON.stringify({ type: 'pong', time: ts() }));
        }
      } catch (e) {
        dbgLastMsgIn.textContent = `${ts()} [raw non-json: ${event.data.slice(0, 30)}]`;
      }
    };

    socket.onclose = (event) => {
      if (myGeneration !== currentConnectionGeneration) return;
      if (voiceHeartbeatTimer) {
        clearInterval(voiceHeartbeatTimer);
        voiceHeartbeatTimer = null;
      }

      const code = event.code;
      const reason = event.reason || '';

      dbgCloseCode.textContent = `${code} (${CLOSE_CODE_EXPLANATIONS[code] || 'Custom/Unknown'})`;
      dbgCloseReason.textContent = reason || (code === 1006 ? 'Abnormal closure (no close frame received)' : 'None');
      dbgLastEvent.textContent = `${ts()} CLOSED (code=${code})`;
      updateDebugSocketState();

      if (!manualDisconnect) {
        reconnectAttempts++;
        dbgReconnects.textContent = String(reconnectAttempts);
        statusText.textContent = `Disconnected (Retrying #${reconnectAttempts}...)`;
        statusDot.className = 'dot';

        reconnectTimer = setTimeout(() => {
          if (!manualDisconnect) {
            connect();
          }
        }, 3000);
      } else {
        handleDisconnect();
        statusText.textContent = 'Disconnected';
        statusDot.className = 'dot';
      }
    };

    socket.onerror = (err) => {
      if (myGeneration !== currentConnectionGeneration) return;
      const errMsg = err?.message || 'WebSocket Error';
      dbgLastError.textContent = `${ts()} ${errMsg}`;
      dbgLastEvent.textContent = `${ts()} ERROR`;
      statusText.textContent = 'Connection Error';
      statusDot.className = 'dot';
      updateDebugSocketState();
    };
  } catch (err) {
    dbgLastError.textContent = `${ts()} ${err.message}`;
    alert('Invalid WebSocket URL: ' + err.message);
    statusText.textContent = 'Connection Failed';
    updateDebugSocketState();
  }
}

function handleDisconnect() {
  if (voiceHeartbeatTimer) clearInterval(voiceHeartbeatTimer);
  voiceHeartbeatTimer = null;
  isSpeaking = false;
  speechStartTime = 0;
  lastAboveThresholdTime = 0;

  if (vadWorker) {
    vadWorker.postMessage('stop');
  }

  stopSilentMediaKeepalive();

  if (uiAnimFrameId) cancelAnimationFrame(uiAnimFrameId);
  uiAnimFrameId = null;

  if (mediaStream) mediaStream.getTracks().forEach(t => t.stop());
  if (audioContext) {
    try { audioContext.close(); } catch (e) {}
  }

  mediaStream = null;
  audioContext = null;
  analyser = null;
  analyserData = null;

  connectBtn.style.display = 'block';
  disconnectBtn.style.display = 'none';
  meterSection.style.display = 'none';
  statusDot.className = 'dot';
  statusText.textContent = 'Disconnected';
  dbgAudioCtx.textContent = 'CLOSED';
  dbgAudioCtx.className = 'debug-value';
  updateDebugSocketState();
}

function disconnect() {
  manualDisconnect = true;
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (voiceHeartbeatTimer) {
    clearInterval(voiceHeartbeatTimer);
    voiceHeartbeatTimer = null;
  }
  if (ws) {
    try {
      ws.close(1000, 'User initiated disconnect');
    } catch (e) {}
    ws = null;
  }
  handleDisconnect();
}

// Wire events
connectBtn.addEventListener('click', connect);
disconnectBtn.addEventListener('click', disconnect);
micSelect.addEventListener('change', () => {
  if (audioContext) startMicrophoneStream();
});

// Test button listeners
testSpeakBtn.addEventListener('click', () => {
  sendSpeakingState(true, true);
});

testSilentBtn.addEventListener('click', () => {
  sendSpeakingState(false, true);
});
