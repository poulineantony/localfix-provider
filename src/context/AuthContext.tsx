import React, { createContext, useContext, useMemo, useState } from 'react';
import { authService, AuthUser } from '../services/authService';
import { providerService, ProviderPayload, ProviderProfile, ProviderStats } from '../services/providerService';

interface AuthContextValue {
    isAuthenticated: boolean;
    isBootstrapping: boolean;
    isSubmitting: boolean;
    user: AuthUser | null;
    provider: ProviderProfile | null;
    providerStats: ProviderStats | null;
    sendOtp: (phone: string) => Promise<{ success: boolean; error?: string; otp?: string }>;
    verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
    refreshSession: () => Promise<void>;
    submitProviderProfile: (payload: ProviderPayload) => Promise<{ success: boolean; error?: string }>;
    toggleAvailability: () => Promise<{ success: boolean; error?: string }>;
    loadProviderStats: () => Promise<void>;
    logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [provider, setProvider] = useState<ProviderProfile | null>(null);
    const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const refreshSession = async () => {
        if (!user?.id) {
            return;
        }

        const providerResult = await providerService.getMine(user.id);
        if (providerResult.success) {
            setProvider(providerResult.data || null);

            if (providerResult.data?._id) {
                const statsResult = await providerService.getStats(providerResult.data._id);
                if (statsResult.success) {
                    setProviderStats(statsResult.data || null);
                }
            }
        }
    };

    const sendOtp = async (phone: string) => {
        setIsSubmitting(true);
        const result = await authService.sendOtp(phone);
        setIsSubmitting(false);

        return {
            success: result.success,
            error: result.error,
            otp: result.data?.otp,
        };
    };

    const verifyOtp = async (phone: string, otp: string) => {
        setIsSubmitting(true);
        const result = await authService.verifyOtp(phone, otp);

        if (result.success && result.data) {
            setUser(result.data.user);
            const providerResult = await providerService.getMine(result.data.user.id);
            if (providerResult.success) {
                setProvider(providerResult.data || null);
            }
        }

        setIsSubmitting(false);

        return {
            success: result.success,
            error: result.error,
        };
    };

    const submitProviderProfile = async (payload: ProviderPayload) => {
        if (!user) {
            return { success: false, error: 'Please login first' };
        }

        setIsSubmitting(true);
        const result = provider?._id
            ? await providerService.update(provider._id, payload)
            : await providerService.create(payload);

        if (result.success && result.data) {
            setProvider(result.data);
            const meResult = await authService.getMe();
            if (meResult.success && meResult.data) {
                setUser({
                    id: meResult.data.id || meResult.data._id || user.id,
                    name: meResult.data.name,
                    email: meResult.data.email,
                    phone: meResult.data.phone,
                    role: meResult.data.role,
                    roles: meResult.data.roles || [],
                    avatar: meResult.data.avatar,
                    isVerified: meResult.data.isVerified,
                });
            }

            const statsResult = await providerService.getStats(result.data._id);
            if (statsResult.success) {
                setProviderStats(statsResult.data || null);
            }
        }

        setIsSubmitting(false);
        return { success: result.success, error: result.error };
    };

    const toggleAvailability = async () => {
        if (!provider?._id) {
            return { success: false, error: 'Provider profile not found' };
        }

        const result = await providerService.toggleAvailability(provider._id);
        if (result.success && result.data) {
            setProvider(result.data);
        }

        return { success: result.success, error: result.error };
    };

    const loadProviderStats = async () => {
        if (!provider?._id) {
            return;
        }

        const result = await providerService.getStats(provider._id);
        if (result.success) {
            setProviderStats(result.data || null);
        }
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
        setProvider(null);
        setProviderStats(null);
    };

    const value = useMemo<AuthContextValue>(() => ({
        isAuthenticated: !!user && (user.role === 'provider' || !!provider),
        isBootstrapping: false,
        isSubmitting,
        user,
        provider,
        providerStats,
        sendOtp,
        verifyOtp,
        refreshSession,
        submitProviderProfile,
        toggleAvailability,
        loadProviderStats,
        logout,
    }), [isSubmitting, provider, providerStats, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
};
