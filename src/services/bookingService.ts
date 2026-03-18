import { API_ENDPOINTS } from '../config/api';
import { apiClient } from './apiClient';

export interface BookingItem {
    _id: string;
    bookingNumber?: string;
    customer?: {
        name?: string;
        phone?: string;
    };
    service?: {
        _id?: string;
        name?: string;
        category?: string;
        pricing?: {
            basePrice?: number;
        };
    };
    provider?: string;
    scheduledDate: string;
    scheduledTime?: {
        startTime?: string;
        endTime?: string;
    };
    address?: {
        street?: string;
        city?: string;
        state?: string;
        zipCode?: string;
        landmark?: string;
        coordinates?: {
            latitude: number;
            longitude: number;
        };
    };
    status: 'pending' | 'confirmed' | 'in-progress' | 'completed' | 'cancelled' | 'rescheduled';
    pricing?: {
        basePrice?: number;
        totalAmount?: number;
    };
    payment?: {
        status?: 'pending' | 'paid' | 'failed' | 'refunded';
    };
    notes?: {
        customerNotes?: string;
        providerNotes?: string;
    };
    updatedAt?: string;
}

export const bookingService = {
    async list(status?: string) {
        const query = status ? `?status=${encodeURIComponent(status)}` : '';
        return apiClient.get<BookingItem[]>(`${API_ENDPOINTS.bookings.list}${query}`);
    },
    async updateStatus(id: string, status: BookingItem['status']) {
        return apiClient.patch<BookingItem>(API_ENDPOINTS.bookings.status(id), { status });
    },
    async cancel(id: string, reason: string) {
        return apiClient.patch<BookingItem>(API_ENDPOINTS.bookings.cancel(id), { reason });
    },
    async triggerSos(id: string, message?: string) {
        return apiClient.post<{ bookingId: string }>(API_ENDPOINTS.notifications.triggerSos(id), { message });
    },
    async updatePayment(id: string, status: 'pending' | 'paid', method: string) {
        return apiClient.patch<BookingItem>(API_ENDPOINTS.bookings.payment(id), { status, method });
    },
};
