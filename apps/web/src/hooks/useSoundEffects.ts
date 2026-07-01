"use client";

import { useCallback, useRef, useState } from "react";

export type SoundName =
  | "correct"
  | "wrong"
  | "question-start"
  | "timer-low"
  | "finish";

function synthesize(ctx: AudioContext, sound: SoundName): void {
  const now = ctx.currentTime;

  if (sound === "correct") {
    // Two ascending tones — success feel
    [523.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.25, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.22);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.23);
    });
    return;
  }

  if (sound === "wrong") {
    // Short descending buzz
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sawtooth";
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.linearRampToValueAtTime(110, now + 0.18);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc.start(now);
    osc.stop(now + 0.2);
    return;
  }

  if (sound === "question-start") {
    // Single mid-pitch ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.setValueAtTime(660, now);
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc.start(now);
    osc.stop(now + 0.35);
    return;
  }

  if (sound === "timer-low") {
    // Rapid short beep
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.setValueAtTime(880, now);
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    osc.start(now);
    osc.stop(now + 0.09);
    return;
  }

  if (sound === "finish") {
    // Triumphant ascending arpeggio
    [392, 523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + i * 0.1);
      gain.gain.setValueAtTime(0, now + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.1 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.28);
      osc.start(now + i * 0.1);
      osc.stop(now + i * 0.1 + 0.3);
    });
  }
}

export function useSoundEffects(enabled: boolean) {
  const ctxRef = useRef<AudioContext | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);

  const unlock = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    if (ctxRef.current.state === "suspended") {
      ctxRef.current.resume();
    }
    setIsUnlocked(true);
  }, []);

  const play = useCallback(
    (sound: SoundName) => {
      if (!enabled || !ctxRef.current) return;
      synthesize(ctxRef.current, sound);
    },
    [enabled],
  );

  return { isUnlocked, unlock, play };
}
