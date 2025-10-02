export type Mode = 'work' | 'break';
export interface PomodoroState {
mode: Mode;
isRunning: boolean;
startAt: number | null; // epoch ms
endAt: number | null; // epoch ms
remainingMs: number; // cập nhật UI khi ở foreground
completedCount: number; // số phiên work đã hoàn thành
useCustomSound: boolean; // mở rộng: chọn âm báo tùy chọn
}
export interface SessionItem {
id: string;
mode: Mode;
startAt: number;
endAt: number;
completed: boolean;
}
