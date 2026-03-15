import { NativeModules } from 'react-native';

export interface ProviderDeviceInfo {
    deviceId: string;
    deviceModel: string;
    deviceName?: string;
    manufacturer: string;
    brand?: string;
    platform: string;
    osVersion: string;
    sdkInt?: number;
    appVersion?: string;
    buildNumber?: string;
    isEmulator: boolean;
}

type NativeNotificationModule = {
    getDeviceInfo: () => Promise<ProviderDeviceInfo>;
};

const nativeNotifications = NativeModules.LocalFixNotifications as NativeNotificationModule | undefined;

export const deviceService = {
    async getDeviceInfo(): Promise<ProviderDeviceInfo> {
        if (nativeNotifications?.getDeviceInfo) {
            try {
                return await nativeNotifications.getDeviceInfo();
            } catch (error) {
                console.error('Failed to get provider device info:', error);
            }
        }

        return {
            deviceId: `provider-${Date.now()}`,
            deviceModel: 'LocalFix Provider App',
            deviceName: 'Unknown Android',
            manufacturer: 'Unknown',
            brand: 'Unknown',
            platform: 'android',
            osVersion: '0',
            sdkInt: 0,
            appVersion: '1.0.0',
            buildNumber: '1',
            isEmulator: false,
        };
    },
};
