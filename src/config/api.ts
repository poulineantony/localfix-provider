export const API_BASE_URL = 'https://localfix.xyz/api/v1';

export const API_ENDPOINTS = {
    auth: {
        sendOtp: '/auth/send-otp',
        verifyOtp: '/auth/verify-otp',
        me: '/auth/me',
        logout: '/auth/logout',
    },
    users: {
        profile: '/users/profile',
    },
    providers: {
        list: '/providers',
        create: '/providers',
        update: (id: string) => `/providers/${id}`,
        availability: (id: string) => `/providers/${id}/availability`,
        stats: (id: string) => `/providers/${id}/stats`,
    },
    bookings: {
        list: '/bookings',
        status: (id: string) => `/bookings/${id}/status`,
        cancel: (id: string) => `/bookings/${id}/cancel`,
        payment: (id: string) => `/bookings/${id}/payment`,
    },
    services: {
        list: '/services',
    },
} as const;

export const DEFAULT_DEVICE_INFO = {
    deviceModel: 'LocalFix Provider App',
    platform: 'android',
    osVersion: 'unknown',
    manufacturer: 'unknown',
    isEmulator: false,
};
