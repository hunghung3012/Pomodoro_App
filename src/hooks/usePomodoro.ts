import { useEffect, useRef, useState } from 'react';
import { Haptics } from '@capacitor/haptics';

const WORK_MIN = 25;
const BREAK_MIN = 5;

type Mode = 'work' | 'break';

interface SessionItem {
  id: string;
  mode: Mode;
  startAt: number;
  endAt: number;
  completed: boolean;
}

function now() {
  return Date.now();
}

export function usePomodoro() {
  const [state, setState] = useState(() => ({
    mode: 'work' as Mode,
    isRunning: false,
    startAt: null as number | null,
    endAt: null as number | null,
    remainingMs: WORK_MIN * 60_000,
    completedCount: 0,
    useCustomSound: false,
  }));

  const [history, setHistory] = useState<SessionItem[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);


  // ----- Notification helpers (placeholder, bạn thay bằng Capacitor LocalNotifications) -----
  function scheduleEndNotification(opts: {
    id: number;
    fireAt: Date;
    title: string;
    body: string;
    useCustomSound: boolean;
    mode: Mode;
  }) {
    console.log('Schedule notification:', opts);
  }

  function cancelNotification(id: number) {
    console.log('Cancel notification:', id);
  }

  // ----- Tick logic -----
  function startTick() {
    stopTick();
    timerRef.current = setInterval(() => {
      setState((s) => {
        if (!s.isRunning || !s.endAt) return s;
        const remaining = s.endAt - now();
        if (remaining <= 0) {
          onComplete(s.mode);
          return { ...s, isRunning: false, remainingMs: 0 };
        }
        return { ...s, remainingMs: remaining };
      });
    }, 1000);
  }

  function stopTick() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ----- Start / Pause / Resume / Reset -----
  function start(mode: Mode) {
    const duration = (mode === 'work' ? WORK_MIN : BREAK_MIN) * 60_000;
    const end = now() + duration;

    setState((s) => {
      scheduleEndNotification({
        id: 100 + (s.mode === 'work' ? 1 : 2),
        fireAt: new Date(end),
        title: s.mode === 'work' ? 'Hết phiên làm việc' : 'Hết phiên nghỉ',
        body:
          s.mode === 'work'
            ? 'Đến giờ nghỉ 5 phút!'
            : 'Bắt đầu làm việc 25 phút nhé!',
        useCustomSound: s.useCustomSound,
        mode: s.mode,
      });

      return {
        ...s,
        mode,
        isRunning: true,
        startAt: now(),
        endAt: end,
        remainingMs: duration,
      };
    });

    startTick();
  }

  function pause() {
    stopTick();
    setState((s) => ({ ...s, isRunning: false }));
  }

  function resume() {
    if (state.endAt) {
      setState((s) => ({ ...s, isRunning: true }));
      startTick();
    }
  }

  function reset(mode: Mode = 'work') {
    cancelNotification(100 + (mode === 'work' ? 1 : 2));
    stopTick();
    setState((s) => ({
      ...s,
      mode,
      isRunning: false,
      startAt: null,
      endAt: null,
      remainingMs: (mode === 'work' ? WORK_MIN : BREAK_MIN) * 60_000,
    }));
  }

  // ----- Helpers -----
  function mmss(ms: number) {
    const total = Math.ceil(ms / 1000);
    const m = Math.floor(total / 60).toString().padStart(2, '0');
    const s = (total % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }

  function onComplete(mode: Mode) {
    Haptics.vibrate({ duration: 300 });
    const item: SessionItem = {
      id: `${Date.now()}`,
      mode,
      startAt:
        state.startAt ??
        now() - (mode === 'work' ? WORK_MIN : BREAK_MIN) * 60_000,
      endAt: now(),
      completed: true,
    };
    setHistory((h) => [item, ...h].slice(0, 100));

    // Auto switch next
    if (mode === 'work') {
      setState((s) => ({ ...s, completedCount: s.completedCount + 1 }));
      reset('break');
    } else {
      reset('work');
    }
  }

  // ----- Cleanup -----
  useEffect(() => {
    return () => stopTick();
  }, []);

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
      setState((s) => ({ ...s, useCustomSound: b })),
  };
}
