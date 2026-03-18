import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import { API_ENDPOINTS } from '../config/api';
import { AuthUser } from './authService';
import { BookingItem } from './bookingService';
import { apiClient, ApiResult } from './apiClient';
import { deviceService } from './deviceService';

type NativeNotificationModule = {
    getFcmToken: () => Promise<string>;
    displayLocalNotification: (
        title: string,
        body: string,
        channelId?: string | null,
        data?: Record<string, unknown>,
    ) => Promise<boolean>;
    scheduleLocalNotification: (
        notificationKey: string,
        title: string,
        body: string,
        triggerAtMs: number,
        channelId?: string | null,
        data?: Record<string, unknown>,
    ) => Promise<boolean>;
};

const nativeNotifications = NativeModules.LocalFixNotifications as NativeNotificationModule | undefined;

type DeviceRegistrationResult = {
    device: {
        id: string;
        deviceId: string;
        deviceModel?: string;
        manufacturer?: string;
        brand?: string;
        platform?: string;
        osVersion?: string;
        appVersion?: string;
        buildNumber?: string;
        pushEnabled?: boolean;
        notificationPermissionGranted?: boolean;
    };
    bootstrapNotifications?: Array<{
        type: string;
        channel?: string;
        title: string;
        body: string;
    }>;
    notificationsConfigured?: boolean;
    pushTransport?: string;
};

const resolveLocale = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().locale;
    } catch (error) {
        return 'en-IN';
    }
};

const resolveTimeZone = () => {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (error) {
        return 'Asia/Calcutta';
    }
};

const formatReminderTime = (scheduledDate?: string) => {
    if (!scheduledDate) {
        return 'your job time';
    }

    try {
        return new Date(scheduledDate).toLocaleString('en-IN', {
            day: 'numeric',
            month: 'short',
            hour: 'numeric',
            minute: '2-digit',
        });
    } catch (error) {
        return scheduledDate;
    }
};

export const notificationsService = {
    async requestPermission(): Promise<boolean> {
        if (Platform.OS !== 'android') {
            return true;
        }

        if (Number(Platform.Version) < 33) {
            return true;
        }

        try {
            const result = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
            );
            return result === PermissionsAndroid.RESULTS.GRANTED;
        } catch (error) {
            console.error('Failed to request provider notification permission:', error);
            return false;
        }
    },

    async getFcmToken(): Promise<string | null> {
        if (!nativeNotifications?.getFcmToken) {
            return null;
        }

        try {
            return await nativeNotifications.getFcmToken();
        } catch (error) {
            console.error('Failed to fetch provider FCM token:', error);
            return null;
        }
    },

    async displayLocalNotification(
        title: string,
        body: string,
        channelId: 'general' | 'security' | 'booking' | 'new_job' | 'reminder' | 'sos' = 'general',
        data: Record<string, unknown> = {},
    ) {
        if (!nativeNotifications?.displayLocalNotification) {
            return false;
        }

        try {
            return await nativeNotifications.displayLocalNotification(title, body, channelId, data);
        } catch (error) {
            console.error('Failed to display provider notification:', error);
            return false;
        }
    },

    async scheduleLocalNotification(
        notificationKey: string,
        title: string,
        body: string,
        triggerAtMs: number,
        channelId: 'general' | 'security' | 'booking' | 'reminder' | 'sos' = 'reminder',
        data: Record<string, unknown> = {},
    ) {
        if (!nativeNotifications?.scheduleLocalNotification) {
            return false;
        }

        try {
            return await nativeNotifications.scheduleLocalNotification(
                notificationKey,
                title,
                body,
                triggerAtMs,
                channelId,
                data
            );
        } catch (error) {
            console.error('Failed to schedule provider notification:', error);
            return false;
        }
    },

    async registerCurrentDevice(user: AuthUser | null): Promise<ApiResult<DeviceRegistrationResult> | null> {
        if (!user) {
            return null;
        }

        const permissionGranted = await this.requestPermission();
        const deviceInfo = await deviceService.getDeviceInfo();
        const fcmToken = await this.getFcmToken();
        const response = await apiClient.post<DeviceRegistrationResult>(API_ENDPOINTS.devices.register, {
            appType: 'provider',
            ...deviceInfo,
            fcmToken,
            pushEnabled: Boolean(permissionGranted && fcmToken),
            notificationPermissionGranted: permissionGranted,
            locale: resolveLocale(),
            timezone: resolveTimeZone(),
        });

        if (response.success && response.data?.bootstrapNotifications?.length && !response.data.notificationsConfigured) {
            for (const entry of response.data.bootstrapNotifications) {
                const channel = entry.channel === 'security' ? 'security' : 'general';
                await this.displayLocalNotification(entry.title, entry.body, channel, {
                    type: entry.type,
                    screen: 'Home',
                });
            }
        }

        return response;
    },

    async scheduleJobReminder(job: Partial<BookingItem>) {
        if (!job?._id || !job.scheduledDate) {
            return false;
        }

        const scheduledAt = new Date(job.scheduledDate).getTime();
        if (Number.isNaN(scheduledAt)) {
            return false;
        }

        const now = Date.now();
        const remaining = scheduledAt - now;
        if (remaining <= 2 * 60 * 1000) {
            return false;
        }

        const leadMinutes = remaining > 90 * 60 * 1000 ? 60 : remaining > 30 * 60 * 1000 ? 15 : 5;
        const triggerAt = scheduledAt - leadMinutes * 60 * 1000;

        if (triggerAt <= now + 60 * 1000) {
            return false;
        }

        return this.scheduleLocalNotification(
            `provider-job-reminder-${job._id}`,
            'Upcoming LocalFix job',
            `${job.customer?.name || 'Customer'} is scheduled for ${job.service?.name || 'your service'} at ${formatReminderTime(job.scheduledDate)}.`,
            triggerAt,
            'reminder',
            {
                bookingId: job._id,
                screen: 'Home',
                type: 'reminder',
            }
        );
    },
};
