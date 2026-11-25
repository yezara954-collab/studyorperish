import { useEffect, useRef, useState } from "react";
import { focus, type FocusPartner } from "./config";
import { playFocusBurst, playFocusChime } from "./focusAudio";

type Alarm = {
  id: string;
  partner: FocusPartner;
  line: string;
  anger: number;
  rest: boolean;
  preview: boolean;
};

export function useFocusAlarm(
  alarm: Alarm | null,
  lang: string,
  sound: boolean,
  vibration: boolean,
  enabled: boolean,
) {
  const [beat, setBeat] = useState(false);
  const [retry, setRetry] = useState(0);
  const options = useRef({ alarm, lang, sound, vibration });
  options.current = { alarm, lang, sound, vibration };

  useEffect(() => {
    if (!alarm || !enabled) {
      setBeat(false);
      return;
    }
    let first = true,
      repeat: number,
      animation: number;
    let audio: AbortController | undefined;

    function stop() {
      window.clearTimeout(repeat);
      window.clearTimeout(animation);
      audio?.abort();
      setBeat(false);
    }
    function burst() {
      const current = options.current;
      if (document.hidden || !current.alarm) return;
      const { partner, line, anger, rest, preview } = current.alarm;
      audio?.abort();
      audio = new AbortController();
      setBeat(true);
      if (current.sound) {
        if (rest) playFocusChime(audio.signal);
        else
          playFocusBurst({
            partner,
            line,
            lang: current.lang,
            anger,
            first,
            signal: audio.signal,
          });
      }
      if (first && current.vibration && !preview) {
        try {
          navigator.vibrate?.(rest ? 100 : [160, 70, 220]);
        } catch {}
      }
      first = false;
      animation = window.setTimeout(
        () => setBeat(false),
        focus.animation.burstMs,
      );
      if (!preview && !rest)
        repeat = window.setTimeout(burst, focus.animation.repeatMs);
    }
    function visibility() {
      stop();
      if (
        !document.hidden &&
        (!alarm?.preview || first) &&
        (!alarm?.rest || first)
      )
        burst();
    }
    burst();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [alarm?.id, enabled, retry, sound]);

  return { beat, replaySound: () => setRetry((value) => value + 1) };
}
