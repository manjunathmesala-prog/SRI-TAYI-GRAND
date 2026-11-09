'use client';

/**
 * Procedural Luxury Hotel Notification Chime
 * Synthesizes a warm, elegant two-tone chime (F#5 -> C#6) using Web Audio API.
 * Non-blocking, zero external MP3 network dependencies, zero asset bloat.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function playNotificationChime(severity: 'INFO' | 'SUCCESS' | 'WARNING' | 'CRITICAL' = 'INFO'): void {
  if (typeof window === 'undefined') return;

  // Check mute preference
  const isMuted = localStorage.getItem('stg_notif_sound_muted') === 'true';
  if (isMuted) return;

  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  if (severity === 'CRITICAL' || severity === 'WARNING') {
    // Alert dual-pulse chime (523Hz -> 659Hz -> 523Hz)
    playTone(ctx, now, 523.25, 0.15, 0.18, 'sine');
    playTone(ctx, now + 0.14, 659.25, 0.22, 0.22, 'triangle');
  } else if (severity === 'SUCCESS') {
    // Ascending celebratory major chord (G5 -> B5 -> D6)
    playTone(ctx, now, 783.99, 0.12, 0.15, 'sine');
    playTone(ctx, now + 0.09, 987.77, 0.14, 0.15, 'sine');
    playTone(ctx, now + 0.18, 1174.66, 0.35, 0.25, 'sine');
  } else {
    // Default elegant hotel concierge bell (A5 -> E6)
    playTone(ctx, now, 880.0, 0.16, 0.15, 'sine');
    playTone(ctx, now + 0.12, 1318.51, 0.4, 0.2, 'sine');
  }
}

function playTone(
  ctx: AudioContext,
  startTime: number,
  freq: number,
  duration: number,
  volume: number,
  type: OscillatorType
) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  } catch {
    // Non-fatal if browser blocks autoplay before user gesture
  }
}
