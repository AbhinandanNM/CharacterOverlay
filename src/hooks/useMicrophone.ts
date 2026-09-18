import { useCallback, useEffect, useRef, useState } from 'react';

interface UseMicrophoneResult {
  volume: number;
  micStarted: boolean;
  startMicrophone: () => Promise<void>;
}

/**
 * Microphone detection hook.
 * Returns the current average volume (0–255) and a function to start capturing.
 * The onVolumeChange callback fires every animation frame with the current average.
 */
export function useMicrophone(
  onVolumeChange?: (average: number) => void
): UseMicrophoneResult {
  const [micStarted, setMicStarted] = useState(false);
  const [volume, setVolume] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onVolumeChangeRef = useRef(onVolumeChange);

  useEffect(() => {
    onVolumeChangeRef.current = onVolumeChange;
  }, [onVolumeChange]);

  const detectVolume = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;

    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);

    let total = 0;
    for (const value of data) total += value;
    const average = total / data.length;

    setVolume(Math.round(average));
    onVolumeChangeRef.current?.(average);
  }, []);

  const startMicrophone = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStarted(true);

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.7;

      const microphone = audioContext.createMediaStreamSource(stream);
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(detectVolume, 35);
    } catch (error) {
      console.error(error);
      alert('Microphone permission was denied.');
    }
  }, [detectVolume]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioContextRef.current?.close();
    };
  }, []);

  return { volume, micStarted, startMicrophone };
}
