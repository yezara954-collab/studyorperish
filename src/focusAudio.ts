import { focus, type FocusPartner } from "./config";
import { translator } from "./i18n";

let audio: AudioContext | undefined;
const clips = new Map<string, Promise<AudioBuffer | null>>();

function warmSpeech(lang: string) {
  if (!window.speechSynthesis || typeof SpeechSynthesisUtterance !== "function")
    return;
  const silent = new SpeechSynthesisUtterance(
    translator(lang.startsWith("zh") ? "zh" : "en")("focusTimeUp"),
  );
  silent.volume = 0;
  silent.lang = lang;
  window.speechSynthesis.getVoices();
  window.speechSynthesis.speak(silent);
}

export function unlockFocusAudio(partner: FocusPartner, lang: string) {
  try {
    if (partner === "howler") warmSpeech(lang);
  } catch {}
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
    for (const path of Object.values(focus.sounds)) {
      if (!path || clips.has(path)) continue;
      const context = audio;
      clips.set(
        path,
        fetch(path)
          .then((response) => {
            if (!response.ok) throw new Error("Audio unavailable");
            return response.arrayBuffer();
          })
          .then((bytes) => context.decodeAudioData(bytes))
          .catch(() => null),
      );
    }
  } catch {}
}

function stopWithSignal(source: AudioScheduledSourceNode, signal: AbortSignal) {
  const stop = () => {
    try {
      source.stop();
    } catch {}
  };
  signal.addEventListener("abort", stop, { once: true });
  source.onended = () => signal.removeEventListener("abort", stop);
}

function voice(
  ctx: AudioContext,
  offset: number,
  duration: number,
  pitches: number[],
  volume: number,
  type: OscillatorType,
  signal: AbortSignal,
) {
  if (signal.aborted) return;
  const start = ctx.currentTime + offset + 0.01;
  const oscillator = ctx.createOscillator(),
    gain = ctx.createGain(),
    filter = ctx.createBiquadFilter();
  oscillator.type = type;
  filter.type = "lowpass";
  filter.frequency.value = 1400;
  pitches.forEach((pitch, index) => {
    const time = start + (duration * index) / (pitches.length - 1);
    if (index) oscillator.frequency.exponentialRampToValueAtTime(pitch, time);
    else oscillator.frequency.setValueAtTime(pitch, time);
  });
  gain.gain.setValueAtTime(0, start);
  gain.gain.linearRampToValueAtTime(volume, start + 0.06);
  gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
  oscillator.connect(filter).connect(gain).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
  stopWithSignal(oscillator, signal);
}

function play(
  ctx: AudioContext,
  kind: keyof typeof focus.sounds,
  volume: number,
  signal: AbortSignal,
  fallback: () => void,
) {
  const path = focus.sounds[kind];
  const clip = path && clips.get(path);
  if (!clip) {
    fallback();
    return;
  }
  void clip.then((buffer) => {
    if (signal.aborted) return;
    if (!buffer) {
      fallback();
      return;
    }
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.value = volume;
    source.connect(gain).connect(ctx.destination);
    source.start();
    stopWithSignal(source, signal);
  });
}

function withAudio(run: (ctx: AudioContext) => void) {
  const ctx = audio;
  if (!ctx) return;
  if (ctx.state === "running") run(ctx);
  else
    void ctx
      .resume()
      .then(() => {
        if (ctx.state === "running") run(ctx);
      })
      .catch(() => {});
}

export function playFocusChime(signal: AbortSignal) {
  withAudio((ctx) =>
    play(ctx, "chime", 0.6, signal, () => {
      voice(ctx, 0, 0.29, [440, 660], 0.19, "sine", signal);
    }),
  );
}

export function playFocusBurst(options: {
  partner: FocusPartner;
  line: string;
  lang: string;
  anger: number;
  first: boolean;
  signal: AbortSignal;
}) {
  const { partner, line, lang, anger, first, signal } = options;
  if (first) playFocusChime(signal);
  const volume = 0.14 + anger * 0.037;
  const howl = () =>
    withAudio((ctx) =>
      play(ctx, "howl", 0.52 + anger * 0.11, signal, () => {
        voice(ctx, 0, 0.77, [250, 388, 296, 192], volume, "sawtooth", signal);
      }),
    );
  const cry = () =>
    withAudio((ctx) =>
      play(ctx, "cry", 0.43 + anger * 0.13, signal, () => {
        voice(ctx, 0, 0.48, [610, 841, 544, 391], volume, "triangle", signal);
        voice(
          ctx,
          0.48,
          0.37,
          [660, 798, 429],
          volume * 0.84,
          "triangle",
          signal,
        );
        voice(
          ctx,
          0.83,
          0.34,
          [590, 740, 350],
          volume * 0.71,
          "triangle",
          signal,
        );
      }),
    );

  let fallbackTimer: number | undefined;
  let utterance: SpeechSynthesisUtterance | undefined;
  let fellBack = false;
  const synth = window.speechSynthesis;
  function fallback() {
    if (fellBack || signal.aborted) return;
    fellBack = true;
    window.clearTimeout(fallbackTimer);
    howl();
  }
  const delay = window.setTimeout(
    () => {
      if (signal.aborted) return;
      if (partner === "mandrake") {
        cry();
        return;
      }
      if (!synth || typeof SpeechSynthesisUtterance !== "function") {
        fallback();
        return;
      }
      try {
        synth.cancel();
        utterance = new SpeechSynthesisUtterance(line);
        utterance.lang = lang;
        utterance.volume = 1;
        utterance.rate = focus.speech.rate;
        utterance.pitch = focus.speech.pitch;
        utterance.onstart = () => window.clearTimeout(fallbackTimer);
        utterance.onerror = fallback;
        fallbackTimer = window.setTimeout(() => {
          fallback();
          synth.cancel();
        }, focus.speech.timeoutMs);
        synth.speak(utterance);
      } catch {
        fallback();
      }
    },
    first ? focus.speech.startDelayMs : 0,
  );
  signal.addEventListener(
    "abort",
    () => {
      window.clearTimeout(delay);
      window.clearTimeout(fallbackTimer);
      if (utterance) synth?.cancel();
    },
    { once: true },
  );
}
