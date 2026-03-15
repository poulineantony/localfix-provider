export const API_BASE_URL = 'https://localfix.xyz/api/v1';

export const API_ENDPOINTS = {
    auth: {
        sendOtp: '/auth/send-otp',
        verifyOtp: '/auth/verify-otp',
        me: '/auth/me',
        logout: '/auth/logout',
    },
    devices: {
        register: '/devices/register',
        me: '/devices/me',
    },
    notifications: {
        list: '/notifications',
        markRead: (id: string) => `/notifications/${id}/read`,
        triggerSos: (bookingId: string) => `/notifications/sos/${bookingId}`,
    },
    users: {
        profile: '/users/profile',
        avatar: '/users/profile/avatar',
    },
    providers: {
        list: '/providers',
        me: '/providers/me',
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
        categories: '/services/categories/list',
    },
    translations: {
        languages: '/translations/languages',
        byLanguage: (lang: string) => `/translations/${encodeURIComponent(lang)}`,
    },
    zones: {
        validate: '/zones/validate',
        addressSuggestions: '/zones/address-suggestions',
    },
} as const;

export const DEFAULT_DEVICE_INFO = {
    deviceModel: 'LocalFix Provider App',
    platform: 'android',
    osVersion: 'unknown',
    manufacturer: 'unknown',
    isEmulator: false,
};
