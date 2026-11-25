import { cardRules } from "./config";

type Cue = keyof typeof cardRules.audio;
let context: AudioContext | undefined;
const samples = new Map<Cue, Promise<AudioBuffer | undefined>>();

export function unlockCardAudio() {
  try {
    const Audio =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Audio) return;
    context ??= new Audio();
    void context.resume().catch(() => {});
    for (const cue of ["tear", "reveal"] as const) {
      const { path } = cardRules.audio[cue];
      if (!path || samples.has(cue)) continue;
      const audio = context;
      samples.set(
        cue,
        fetch(path)
          .then((response) => {
            if (!response.ok) throw new Error("Audio unavailable");
            return response.arrayBuffer();
          })
          .then((bytes) => audio.decodeAudioData(bytes))
          .catch(() => undefined),
      );
    }
  } catch {
    // The reveal remains functional when sound is unavailable.
  }
}

export async function playCardAudio(cue: Cue) {
  try {
    const audio = context;
    if (!audio || audio.state !== "running") return;
    const sample = await samples.get(cue);
    const { duration, volume } = cardRules.audio[cue];
    const start = audio.currentTime;
    const envelope = audio.createGain();
    envelope.gain.value = volume;
    envelope.connect(audio.destination);
    if (sample || cue === "tear") {
      const source = audio.createBufferSource();
      source.buffer =
        sample ??
        audio.createBuffer(
          1,
          Math.round(audio.sampleRate * duration),
          audio.sampleRate,
        );
      if (!sample) {
        const data = source.buffer.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < data.length; i += 1) {
          const noise = Math.random() * 2 - 1;
          data[i] = (noise - previous) * (1 - i / data.length) ** 2;
          previous = noise;
        }
      }
      source.connect(envelope);
      source.onended = () => envelope.disconnect();
      source.start();
      return;
    }

    const notes = [523.25, 659.25, 783.99];
    notes.forEach((frequency, index) => {
      const tone = audio.createOscillator();
      const gain = audio.createGain();
      const onset = start + index * 0.075;
      tone.frequency.value = frequency;
      gain.gain.setValueAtTime(0.001, onset);
      gain.gain.exponentialRampToValueAtTime(0.32, onset + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, onset + duration);
      tone.connect(gain).connect(envelope);
      if (index === notes.length - 1)
        tone.onended = () => envelope.disconnect();
      tone.start(onset);
      tone.stop(onset + duration);
    });
  } catch {
    // Optional effects should never interrupt a draw.
  }
}
