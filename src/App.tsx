import { useEffect, useState } from 'react';

function PomodoroApp() {
  const [state, setState] = useState({
    mode: 'work',
    isRunning: false,
    remainingMs: 25 * 60_000,
    useCustomSound: false,
  });
  const [history, setHistory] = useState<any[]>([]);

  // Stub functions
  const onStart = () => {};
  const onStop = () => {};
  const onReset = () => {};
  const reset = (mode: 'work' | 'break') => {};
  const mmss = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${m}:${s}`;
  };
  const setUseCustomSound = (val: boolean) =>
    setState(prev => ({ ...prev, useCustomSound: val }));

  return (
    <>
      <div className="modes">
        <button
          className={state.mode === 'work' ? 'active' : ''}
          onClick={() => reset('work')}
          disabled={state.isRunning}
        >
          Làm việc (25')
        </button>
        <button
          className={state.mode === 'break' ? 'active' : ''}
          onClick={() => reset('break')}
          disabled={state.isRunning}
        >
          Nghỉ (5')
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
            onChange={e => setUseCustomSound(e.target.checked)}
          />
          Dùng âm báo tuỳ chọn (bell)
        </label>
      </div>

      <h2>Lịch sử phiên</h2>
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
          {history.map(it => (
            <tr key={it.id}>
              <td>{it.mode === 'work' ? 'Work' : 'Break'}</td>
              <td>{new Date(it.startAt).toLocaleString()}</td>
              <td>{new Date(it.endAt).toLocaleString()}</td>
              <td>{it.completed ? 'Hoàn thành' : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer>
        <small>
          Tip: Ứng dụng vẫn đếm khi vào nền nhờ lưu thời điểm kết thúc và đặt
          Local Notification tại mốc đó.
        </small>
      </footer>
    </>
  );
}

export default PomodoroApp;
