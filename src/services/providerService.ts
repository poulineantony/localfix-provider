import { API_ENDPOINTS } from '../config/api';
import { apiClient, ApiResult } from './apiClient';

export interface ProviderProfile {
    _id: string;
    user:
        | string
        | {
              _id: string;
              name?: string;
              phone?: string;
              email?: string;
              avatar?: string;
          };
    businessName: string;
    providerMode?: 'individual' | 'fleet_member' | 'partner';
    partnerType?: 'agency' | 'head_office';
    fleetId?: string;
    fleetIdSource?: 'manual' | 'generated' | 'linked';
    ownerName?: string;
    supportPhone?: string;
    teamSize?: number;
    services: Array<{ _id: string; name?: string; category?: string } | string>;
    experience?: {
        years: number;
        description?: string;
    };
    serviceArea?: {
        cities?: string[];
        radius?: number;
        unit?: string;
    };
    availability?: {
        isAvailable?: boolean;
    };
    verification?: {
        isVerified?: boolean;
    };
    bankDetails?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    };
    rating?: {
        average?: number;
        count?: number;
    };
    completedJobs?: number;
}

export interface ProviderStats {
    totalBookings: number;
    completedBookings: number;
    pendingBookings: number;
    totalEarnings: number;
    rating?: {
        average: number;
        count: number;
    };
    completedJobs?: number;
}

export interface ProviderPayload {
    businessName: string;
    providerMode?: 'individual' | 'fleet_member' | 'partner';
    partnerType?: 'agency' | 'head_office';
    fleetId?: string;
    ownerName?: string;
    supportPhone?: string;
    teamSize?: number;
    services: string[];
    experience?: {
        years: number;
        description?: string;
    };
    serviceArea?: {
        cities?: string[];
        radius?: number;
        unit?: string;
    };
    verification?: {
        documents?: Array<{
            type: string;
            documentUrl?: string;
            status?: 'pending' | 'approved' | 'rejected';
        }>;
    };
    bankDetails?: {
        accountHolderName?: string;
        accountNumber?: string;
        ifscCode?: string;
        bankName?: string;
    };
}

const getUserId = (provider: ProviderProfile) => {
    if (typeof provider.user === 'string') {
        return provider.user;
    }

    return provider.user?._id;
};

export const providerService = {
    async getMine(userId: string): Promise<ApiResult<ProviderProfile | null>> {
        const result = await apiClient.get<ProviderProfile[]>(`${API_ENDPOINTS.providers.list}?limit=100`);

        if (!result.success || !result.data) {
            return {
                success: false,
                error: result.error,
            };
        }

        const provider = result.data.find((item) => getUserId(item) === userId) || null;

        return {
            success: true,
            data: provider,
        };
    },

    async create(data: ProviderPayload) {
        return apiClient.post<ProviderProfile>(API_ENDPOINTS.providers.create, data);
    },

    async findFleetById(fleetId: string): Promise<ApiResult<ProviderProfile | null>> {
        const normalizedFleetId = fleetId.trim().toUpperCase();
        const result = await apiClient.get<ProviderProfile[]>(
            `${API_ENDPOINTS.providers.list}?fleetId=${encodeURIComponent(normalizedFleetId)}&providerMode=partner&limit=1`
        );

        if (!result.success) {
            return {
                success: false,
                error: result.error,
            };
        }

        return {
            success: true,
            data: result.data?.[0] || null,
        };
    },

    async update(id: string, data: ProviderPayload) {
        return apiClient.put<ProviderProfile>(API_ENDPOINTS.providers.update(id), data);
    },

    async toggleAvailability(id: string) {
        return apiClient.patch<ProviderProfile>(API_ENDPOINTS.providers.availability(id), {});
    },

    async getStats(id: string) {
        return apiClient.get<ProviderStats>(API_ENDPOINTS.providers.stats(id));
    },
};
