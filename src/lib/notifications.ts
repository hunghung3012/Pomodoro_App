import { Capacitor } from '@capacitor/core';
import {
  LocalNotifications,
  type LocalNotificationSchema,
} from '@capacitor/local-notifications';

// Kiểm tra & yêu cầu quyền thông báo
export async function ensureNotificationPermission() {
  const perm = await LocalNotifications.checkPermissions();
  if (perm.display !== 'granted') {
    const req = await LocalNotifications.requestPermissions();
    if (req.display !== 'granted') {
      throw new Error('Notifications permission denied');
    }
  }
}

// Tạo channel riêng trên Android (để đổi âm báo)
export async function createAndroidChannel(
  useCustomSound: boolean,
  soundName?: string
) {
  if (Capacitor.getPlatform() !== 'android') return;

  // Channel id khác nhau nếu muốn đổi âm thanh mà không cần xoá app
  const id = useCustomSound ? `pomodoro_${soundName ?? 'bell'}` : 'pomodoro_default';

  await LocalNotifications.createChannel({
    id,
    name: 'Pomodoro',
    description: 'Pomodoro session notifications',
    importance: 5,
    sound: useCustomSound ? (soundName ?? 'bell') : undefined, // tên file trong res/raw
    vibration: true,
    visibility: 1,
    lights: true,
    lightColor: '#FF5500',
  });

  return id;
}

// Lên lịch thông báo khi kết thúc phiên
export async function scheduleEndNotification(params: {
  id: number;
  fireAt: Date;
  title: string;
  body: string;
  useCustomSound: boolean;
  mode: 'work' | 'break';
  soundName?: string; // thêm field
}) {
  const { id, fireAt, title, body, useCustomSound, mode, soundName } = params;
  const platform = Capacitor.getPlatform();

  let channelId: string | undefined = undefined;
  if (platform === 'android') {
    channelId = await createAndroidChannel(useCustomSound, soundName);
  }

  const notif: LocalNotificationSchema = {
    id,
    title,
    body,
    schedule: { at: fireAt },
    channelId,
    // iOS: nếu có file tuỳ chỉnh
    sound:
      platform === 'ios' && useCustomSound
        ? `${soundName ?? 'bell'}.mp3`
        : undefined,
    extra: { mode, soundName },
  };

  await LocalNotifications.schedule({ notifications: [notif] });
}

// Huỷ thông báo theo id
export async function cancelNotification(id: number) {
  await LocalNotifications.cancel({ notifications: [{ id }] });
}
