import { useEffect, useRef, useState } from 'react';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// import { Capacitor } from '@capacitor/core';

import type { PluginListenerHandle } from '@capacitor/core';
import { getJSON, setJSON } from '../lib/storage';
import { cancelNotification, scheduleEndNotification } from '../lib/notifications';
import type { PomodoroState, SessionItem, Mode } from '../types/pomodoro';

// --- Constants ---
const KEY_STATE = 'pomodoro_state_v1';
const KEY_HISTORY = 'pomodoro_history_v1';

function now() {
  return Date.now();
}

// Dedupe lịch sử
function dedupeHistory(list: SessionItem[]): SessionItem[] {
  const seen = new Set<string>();
  const out: SessionItem[] = [];
  for (const it of list) {
    const key = `${it.mode}-${Math.round(it.startAt / 1000)}-${Math.round(it.endAt / 1000)}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(it);
    }
  }
  return out;
}

// --- Callback cho App ---
let onAlarmCb: ((msg: string) => void) | null = null;
export function setOnAlarm(cb: (msg: string) => void) {
  onAlarmCb = cb;
}

export function usePomodoro() {
  const [state, setState] = useState<PomodoroState>({
    mode: 'work',
    isRunning: false,
    startAt: null,
    endAt: null,
    remainingMs: 25 * 60_000,
    completedCount: 0,
    useCustomSound: true,
  });

  const [history, setHistory] = useState<SessionItem[]>([]);
  const tickRef = useRef<number | null>(null);

  // --- cấu hình động ---
  const [workDuration, setWorkDuration] = useState(25 * 60_000);
  const [breakDuration, setBreakDuration] = useState(5 * 60_000);
  const [selectedSound, setSelectedSound] = useState('bell');

  // chống gọi onComplete nhiều lần
  const completedForRef = useRef<number | null>(null);

  // --- Init ---
  useEffect(() => {
    (async () => {
      const saved = await getJSON<PomodoroState | null>(KEY_STATE, null);
      const hist = await getJSON<SessionItem[]>(KEY_HISTORY, []);
      if (saved) setState(reconcile(saved));
      setHistory(dedupeHistory(hist));
    })();
  }, []);

  // --- Persist ---
  useEffect(() => {
    setJSON(KEY_STATE, state);
  }, [state]);

  useEffect(() => {
    setJSON(KEY_HISTORY, history);
  }, [history]);

  // --- Handle app background ---
  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    (async () => {
      listener = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          setState(s => reconcile(s));
          startTick();
        } else {
          stopTick();
        }
      });
    })();
    startTick();
    return () => {
      listener?.remove();
      stopTick();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Helpers ---
  function triggerCompleteOnce(s: PomodoroState) {
    if (!s.endAt) return;
    if (completedForRef.current === s.endAt) return;
    completedForRef.current = s.endAt;
    onCompleteSnapshot(s);
  }

  function reconcile(s: PomodoroState): PomodoroState {
    if (!s.endAt) return s;
    const rem = Math.max(0, s.endAt - now());
    if (rem === 0 && s.isRunning) {
      triggerCompleteOnce(s);
      return { ...s, isRunning: false, startAt: null, endAt: null, remainingMs: 0 };
    }
    return { ...s, remainingMs: rem };
  }

  function startTick() {
    if (tickRef.current) return;
    tickRef.current = window.setInterval(() => {
      setState(s => {
        if (!s.isRunning || !s.endAt) return s;
        const rem = Math.max(0, s.endAt - now());
        if (rem === 0) {
          stopTick();
          triggerCompleteOnce(s);
          return { ...s, isRunning: false, startAt: null, endAt: null, remainingMs: 0 };
        }
        return { ...s, remainingMs: rem };
      });
    }, 250);
  }

  function stopTick() {
    if (tickRef.current) {
      window.clearInterval(tickRef.current);
      tickRef.current = null;
    }
  }

  function mmss(ms: number) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  // --- Actions ---
  async function start(mode: Mode) {
    const durMs = mode === 'work' ? workDuration : breakDuration;
    const end = now() + durMs;
    const id = 100 + (mode === 'work' ? 1 : 2);

    await scheduleEndNotification({
      id,
      fireAt: new Date(end),
      title: mode === 'work' ? 'Hết phiên làm việc' : 'Hết phiên nghỉ',
      body: mode === 'work' ? 'Đến giờ nghỉ!' : 'Bắt đầu làm việc!',
      useCustomSound: state.useCustomSound,
      mode,
      soundName: selectedSound,
    });

    completedForRef.current = null;

    setState(s => ({
      ...s,
      mode,
      isRunning: true,
      startAt: now(),
      endAt: end,
      remainingMs: durMs,
    }));

    Haptics.impact({ style: ImpactStyle.Medium });
    startTick();
  }

  async function pause() {
    setState(s => {
      if (!s.isRunning || !s.endAt) return s;
      const rem = Math.max(0, s.endAt - now());
      cancelNotification(100 + (s.mode === 'work' ? 1 : 2));
      return { ...s, isRunning: false, startAt: null, endAt: null, remainingMs: rem };
    });
    Haptics.impact({ style: ImpactStyle.Light });
    stopTick();
  }

  async function resume() {
    setState(s => {
      if (s.isRunning || s.remainingMs <= 0) return s;
      const end = now() + s.remainingMs;

      scheduleEndNotification({
        id: 100 + (s.mode === 'work' ? 1 : 2),
        fireAt: new Date(end),
        title: s.mode === 'work' ? 'Hết phiên làm việc' : 'Hết phiên nghỉ',
        body: s.mode === 'work' ? 'Đến giờ nghỉ!' : 'Bắt đầu làm việc!',
        useCustomSound: s.useCustomSound,
        mode: s.mode,
        soundName: selectedSound,
      });

      completedForRef.current = null;

      return { ...s, isRunning: true, startAt: now(), endAt: end };
    });
    startTick();
  }

  function reset(mode: Mode = 'work') {
    cancelNotification(100 + (mode === 'work' ? 1 : 2));
    completedForRef.current = null;
    setState(s => ({
      ...s,
      mode,
      isRunning: false,
      startAt: null,
      endAt: null,
      remainingMs: mode === 'work' ? workDuration : breakDuration,
    }));
    stopTick();
  }

  // --- Khi hoàn tất ---
  function onCompleteSnapshot(snapshot: PomodoroState) {
    const mode = snapshot.mode;
    const usedDuration = mode === 'work' ? workDuration : breakDuration;
    const startAt = snapshot.startAt ?? now() - usedDuration;

    Haptics.vibrate({ duration: 300 });

    // Gửi callback cho App
    if (onAlarmCb) {
      const msg =
        mode === 'work'
          ? '⏰ Hết phiên làm việc! Đến giờ nghỉ.'
          : '⏰ Hết phiên nghỉ! Vào làm thôi.';
      onAlarmCb(msg);
    }

    const item: SessionItem = {
      id: `${Date.now()}`,
      mode,
      startAt,
      endAt: now(),
      completed: true,
    };

    setHistory(h => {
      const next = [item, ...h];
      return dedupeHistory(next).slice(0, 100);
    });

    if (mode === 'work') {
      setState(s => ({ ...s, completedCount: s.completedCount + 1 }));
      reset('break');
    } else {
      reset('work');
    }
  }

  // --- Public API ---
  return {
    state,
    history,
    startWork: () => start('work'),
    startBreak: () => start('break'),
    pause,
    resume,
    reset,
    mmss,
    setUseCustomSound: (b: boolean) =>
      setState(s => ({ ...s, useCustomSound: b })),
    setWorkDuration,
    setBreakDuration,
    selectedSound,
    setSelectedSound,
  };
}
