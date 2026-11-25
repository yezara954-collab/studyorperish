import { focus } from "./config";

let audio: AudioContext | undefined;
const clips = new Map<string, HTMLAudioElement>();

export function unlockFocusAudio() {
  try {
    const Audio =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Audio) return;
    audio ??= new Audio();
    void audio.resume().catch(() => {});
    const silent = audio.createBufferSource();
    silent.buffer = audio.createBuffer(1, 1, audio.sampleRate);
    silent.connect(audio.destination);
    silent.start();
  } catch {
    // Visual reminders also work when Web Audio is unavailable.
  }
}

function voice(
  ctx: AudioContext,
  start: number,
  duration: number,
  pitches: number[],
  volume: number,
  type: OscillatorType,
) {
  const oscillator = ctx.createOscillator(),
    gain = ctx.createGain(),
    filter = ctx.createBiquadFilter();
  oscillator.type = type;
  filter.type = "lowpass";
  filter.frequency.value = 1000;
  pitches.forEach((pitch, index) => {
    const time = start + (duration * index) / (pitches.length - 1);
    if (index) oscillator.frequency.exponentialRampToValueAtTime(pitch, time);
    else oscillator.frequency.setValueAtTime(pitch, time);
  });
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.07);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(filter).connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playVoice(
  sound: keyof typeof focus.sounds,
  delayMs: number,
  volume: number,
  enabled: () => boolean,
  synthesize: () => void,
) {
  const path = focus.sounds[sound];
  if (!path) {
    synthesize();
    return;
  }
  window.setTimeout(() => {
    if (!enabled()) return;
    const clip = clips.get(sound) ?? new Audio(path);
    clips.set(sound, clip);
    clip.currentTime = 0;
    clip.volume = Math.min(1, volume);
    void clip.play().catch(synthesize);
  }, delayMs);
}

export function playFocusAlert(
  anger: number,
  rest: boolean,
  enabled: () => boolean,
) {
  const ctx = audio;
  if (!ctx || !enabled()) return;
  void ctx
    .resume()
    .then(() => {
      if (!enabled() || ctx.state !== "running") return;
      const now = ctx.currentTime + 0.02;
      if (rest) {
        voice(ctx, now, 0.32, [440, 660], 0.085, "sine");
        return;
      }
      const intensity = 0.11 + anger * 0.032;
      playVoice("howl", 0, 0.43 + anger * 0.13, enabled, () => {
        if (enabled())
          voice(
            ctx,
            Math.max(now, ctx.currentTime),
            0.76,
            [260, 395, 310, 245],
            intensity,
            "sawtooth",
          );
      });
      playVoice("cry", 520, 0.36 + anger * 0.12, enabled, () => {
        if (enabled()) {
          const at = Math.max(now + 0.52, ctx.currentTime);
          voice(
            ctx,
            at,
            0.48,
            [635, 820, 525, 429],
            intensity * 0.73,
            "triangle",
          );
          voice(
            ctx,
            at + 0.48,
            0.34,
            [670, 755, 466],
            intensity * 0.53,
            "triangle",
          );
        }
      });
    })
    .catch(() => {});
}
