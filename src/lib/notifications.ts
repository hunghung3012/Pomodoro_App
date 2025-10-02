import { Capacitor } from '@capacitor/core';
import { LocalNotifications, type LocalNotificationSchema } from '@capacitor/local-notifications';


export async function ensureNotificationPermission() {
const perm = await LocalNotifications.checkPermissions();
if (perm.display !== 'granted') {
const req = await LocalNotifications.requestPermissions();
if (req.display !== 'granted') throw new Error('Notifications permission denied');
}
}


export async function createAndroidChannel(useCustomSound: boolean) {
if (Capacitor.getPlatform() !== 'android') return;
// Channel id khác nhau nếu muốn đổi âm thanh mà không cần xoá app
const id = useCustomSound ? 'pomodoro_bell' : 'pomodoro_default';
await LocalNotifications.createChannel({
id,
name: 'Pomodoro',
description: 'Pomodoro session notifications',
importance: 5,
sound: useCustomSound ? 'bell' : undefined,
vibration: true,
visibility: 1,
lights: true,
lightColor: '#FF5500',
});
return id;
}


export async function scheduleEndNotification(params: {
id: number;
fireAt: Date;
title: string;
body: string;
useCustomSound: boolean;
mode: 'work' | 'break';
}) {
const { id, fireAt, title, body, useCustomSound, mode } = params;
const platform = Capacitor.getPlatform();


let channelId: string | undefined = undefined;
if (platform === 'android') {
channelId = await createAndroidChannel(useCustomSound);
}


const notif: LocalNotificationSchema = {
id,
title,
body,
schedule: { at: fireAt },
channelId,
// iOS: nếu có file tuỳ chỉnh
sound: platform === 'ios' && useCustomSound ? 'bell.caf' : undefined,
extra: { mode }
};


await LocalNotifications.schedule({ notifications: [notif] });
}


export async function cancelNotification(id: number) {
await LocalNotifications.cancel({ notifications: [{ id }] });
}