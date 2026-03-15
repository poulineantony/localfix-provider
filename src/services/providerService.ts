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
        formattedAddress?: string;
        postalCode?: string;
        coordinates?: {
            latitude?: number;
            longitude?: number;
        };
        zone?: {
            zoneId?: string;
            name?: string;
            city?: string;
            state?: string;
            country?: string;
        };
        radius?: number;
        unit?: string;
    };
    availability?: {
        isAvailable?: boolean;
    };
    verification?: {
        isVerified?: boolean;
        reviewStatus?: 'pending' | 'approved' | 'rejected';
        submittedAt?: string;
        reviewedAt?: string;
        reviewedBy?:
            | string
            | {
                  _id: string;
                  name?: string;
                  email?: string;
              };
        reviewNotes?: string;
        documents?: Array<{
            type: string;
            documentUrl?: string;
            status?: 'pending' | 'approved' | 'rejected';
            uploadedAt?: string;
            reviewedAt?: string;
            reviewedBy?:
                | string
                | {
                      _id: string;
                      name?: string;
                      email?: string;
                  };
            reviewNote?: string;
        }>;
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
        formattedAddress?: string;
        postalCode?: string;
        coordinates?: {
            latitude?: number;
            longitude?: number;
        };
        zone?: {
            zoneId?: string;
            name?: string;
            city?: string;
            state?: string;
            country?: string;
        };
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

export const providerService = {
    async getMine(): Promise<ApiResult<ProviderProfile | null>> {
        return apiClient.get<ProviderProfile | null>(API_ENDPOINTS.providers.me);
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
