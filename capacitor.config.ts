import { CapacitorConfig } from '@capacitor/cli';


const config: CapacitorConfig = {
appId: 'com.example.pomodoro',
appName: 'Pomodoro',
webDir: 'dist',
server: {
androidScheme: 'https'
}
};


export default config;