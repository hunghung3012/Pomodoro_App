import { useEffect, useRef, useState } from 'react';
import { Dialog } from '@capacitor/dialog';
import { LocalNotifications } from '@capacitor/local-notifications';
import type { PluginListenerHandle } from '@capacitor/core';

import { ensureNotificationPermission } from './lib/notifications';
import { usePomodoro } from './hooks/usePomodoro';
import { setOnAlarm } from './hooks/usePomodoro'; // thêm để nhận callback

import './style.css';

export default function App() {
  const {
    state,
    history,
    startWork,
    startBreak,
    pause,
    reset,
    mmss,
    setUseCustomSound,
    setWorkDuration,
    setBreakDuration,
    selectedSound,
    setSelectedSound,
  } = usePomodoro();

  const [permOk, setPermOk] = useState<boolean>(false);
  const [workMin, setWorkMin] = useState(25);
  const [workSec, setWorkSec] = useState(0);
  const [breakMin, setBreakMin] = useState(5);
  const [breakSec, setBreakSec] = useState(0);

  const [tempSound, setTempSound] = useState(selectedSound);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- trạng thái play ---
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState(false);
  const [alarmMsg, setAlarmMsg] = useState<string | null>(null);

  // toggle nghe thử
  const playPreview = () => {
    if (isPreviewPlaying) {
      audioRef.current?.pause();
      audioRef.current = null;
      setIsPreviewPlaying(false);
      return;
    }
    const audio = new Audio(`/sounds/${tempSound}.mp3`);
    audioRef.current = audio;
    setIsPreviewPlaying(true);
    audio.play();
    audio.onended = () => setIsPreviewPlaying(false);
  };

  // dừng chuông hết giờ
  const stopAlarm = () => {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0; // 🔑 reset lại từ đầu
    audioRef.current = null;
  }
  setIsAlarmPlaying(false);
};

  // xin quyền thông báo
  useEffect(() => {
    let listener: PluginListenerHandle | undefined;
    (async () => {
      try {
        await ensureNotificationPermission();
        setPermOk(true);
      } catch {
        setPermOk(false);
      }
      listener = await LocalNotifications.addListener(
        'localNotificationActionPerformed',
        (info) => console.log('Notification action:', info)
      );
    })();
    return () => {
      listener?.remove();
    };
  }, []);

  // nhận callback khi hết giờ
  useEffect(() => {
  setOnAlarm((msg) => {
    setAlarmMsg(msg);
    const audio = new Audio(`/sounds/${selectedSound}.mp3`);
    audioRef.current = audio;
    setIsAlarmPlaying(true);
    audio.play();
    audio.onended = () => {
      setIsAlarmPlaying(false);
      audioRef.current = null; // ✅ khi hết tự reset luôn
    };
  });
}, [selectedSound]);


  // --- Actions ---
  const onStart = async () => {
    const { value } = await Dialog.confirm({
      title: 'Bắt đầu?',
      message:
        state.mode === 'work'
          ? `Bắt đầu phiên làm việc ${workMin}p${workSec}s?`
          : `Bắt đầu nghỉ ${breakMin}p${breakSec}s?`,
    });
    if (value) state.mode === 'work' ? startWork() : startBreak();
  };

  const onStop = async () => {
    const { value } = await Dialog.confirm({
      title: 'Tạm dừng?',
      message: 'Tạm dừng phiên hiện tại?',
    });
    if (value) pause();
  };

  const onReset = async () => {
    const { value } = await Dialog.confirm({
      title: 'Reset?',
      message: 'Đặt lại phiên?',
    });
    if (value) reset('work');
  };

  const saveDurations = () => {
    setWorkDuration((workMin * 60 + workSec) * 1000);
    setBreakDuration((breakMin * 60 + breakSec) * 1000);
    reset(state.mode);
  };

  const handleNumberInput = (value: string, setFn: (n: number) => void) => {
    let num = parseInt(value || '0', 10);
    if (isNaN(num)) num = 0;
    if (num < 0) num = 0;
    if (num > 59) num = 59;
    setFn(num);
  };

  // --- UI ---
  return (
    <div className="container">
      <h1>Pomodoro</h1>
      {!permOk && (
        <div className="warn">
          Bạn cần cấp quyền Thông báo để nhận chuông báo.
        </div>
      )}

      <div className="mode-switch">
        <button
          className={state.mode === 'work' ? 'active' : ''}
          onClick={() => reset('work')}
          disabled={state.isRunning}
        >
          Làm việc
        </button>
        <button
          className={state.mode === 'break' ? 'active' : ''}
          onClick={() => reset('break')}
          disabled={state.isRunning}
        >
          Nghỉ
        </button>
      </div>

      <div className="timer">
        <div className="time">{mmss(state.remainingMs)}</div>
        <div className="status">
          {state.isRunning ? 'Đang chạy' : 'Tạm dừng'}
        </div>
      </div>

      <div className="controls">
        {!state.isRunning ? (
          <button className="primary" onClick={onStart}>
            Bắt đầu
          </button>
        ) : (
          <button onClick={onStop}>Tạm dừng</button>
        )}
        <button onClick={onReset} disabled={state.isRunning}>
          Reset
        </button>
      </div>

      <div className="options">
        <label>
          <input
            type="checkbox"
            checked={state.useCustomSound}
            onChange={(e) => setUseCustomSound(e.target.checked)}
          />
          Dùng âm báo tuỳ chọn
        </label>

        {state.useCustomSound && (
          <div className="sound-settings">
            <h3>Âm báo</h3>
            <div className="row">
              <select

                value={tempSound}
                onChange={(e) => setTempSound(e.target.value)}
              >
                <option value="bell">Bell</option>
                <option value="iphone">Iphone 1</option>
                <option value="iphone1">Iphone 2</option>
                <option value="chill1">Chill 3</option>
              </select>
              <button onClick={playPreview}>
                {isPreviewPlaying ? '⏹ Dừng' : 'Test Sound'}
              </button>
              <button onClick={() => setSelectedSound(tempSound)}>
                 Submit
              </button>
            </div>
            <small>Âm báo hiện tại: {selectedSound}</small>
          </div>
        )}

        <div className="duration-settings">
          <h3>Cấu hình thời gian</h3>
          <div className="row">
            <label>
              Work:
              <input
                type="number"
                value={workMin.toString().padStart(2, '0')}
                min={0}
                max={59}
                onChange={(e) => handleNumberInput(e.target.value, setWorkMin)}
              />{' '}
              phút
              <input
                type="number"
                value={workSec.toString().padStart(2, '0')}
                min={0}
                max={59}
                onChange={(e) => handleNumberInput(e.target.value, setWorkSec)}
              />{' '}
              giây
            </label>
          </div>
          <div className="row">
            <label>
              Break:
              <input
                type="number"
                value={breakMin.toString().padStart(2, '0')}
                min={0}
                max={59}
                onChange={(e) => handleNumberInput(e.target.value, setBreakMin)}
              />{' '}
              phút
              <input
                type="number"
                value={breakSec.toString().padStart(2, '0')}
                min={0}
                max={59}
                onChange={(e) => handleNumberInput(e.target.value, setBreakSec)}
              />{' '}
              giây
            </label>
          </div>
          <button onClick={saveDurations}> Lưu thời gian</button>
        </div>
      </div>

      {alarmMsg && (
        <div className="alarm-box">
          <strong>{alarmMsg}</strong>
          {isAlarmPlaying && (
            <button onClick={stopAlarm}>⏹ Dừng chuông</button>
          )}
        </div>
      )}

      <h2>Lịch sử</h2>
      <table className="history">
        <thead>
          <tr>
            <th>Loại</th>
            <th>Bắt đầu</th>
            <th>Kết thúc</th>
            <th>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {history.length === 0 && (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center' }}>
                Chưa có dữ liệu
              </td>
            </tr>
          )}
          {history.map((it) => (
            <tr key={it.id}>
              <td>{it.mode === 'work' ? 'Work' : 'Break'}</td>
              <td>{new Date(it.startAt).toLocaleString()}</td>
              <td>{new Date(it.endAt).toLocaleString()}</td>
              <td>{it.completed ? 'Hoàn thành' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
