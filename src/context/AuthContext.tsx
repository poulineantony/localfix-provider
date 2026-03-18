import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService, AuthUser } from '../services/authService';
import { apiClient } from '../services/apiClient';
import {
    isMissingProviderDraftRouteError,
    providerService,
    ProviderDraftPayload,
    ProviderOnboardingDraft,
    ProviderPayload,
    ProviderProfile,
    ProviderStats,
} from '../services/providerService';
import { deviceService } from '../services/deviceService';
import { notificationsService } from '../services/notificationsService';

const getOnboardingRouteName = (provider: ProviderProfile | null) => {
    const stage = provider?.onboarding?.currentStage;

    if (stage === 'service') {
        return 'RegistrationService';
    }

    if (stage === 'documents') {
        return 'RegistrationDocuments';
    }

    if (stage === 'bank') {
        return 'RegistrationBank';
    }

    return 'RegistrationPersonal';
};

const getOnboardingAccountType = (provider: ProviderProfile | null): 'individual' | 'fleet_member' => {
    return provider?.providerMode === 'fleet_member' ? 'fleet_member' : 'individual';
};

const getProviderReviewStatus = (provider: ProviderProfile | null) =>
    provider?.verification?.reviewStatus || (provider?.verification?.isVerified ? 'approved' : 'pending');

const mergeProviderDraft = (
    currentDraft?: ProviderOnboardingDraft,
    nextDraft?: ProviderOnboardingDraft,
): ProviderOnboardingDraft => ({
    ...(currentDraft || {}),
    ...(nextDraft || {}),
    personal: {
        ...(currentDraft?.personal || {}),
        ...(nextDraft?.personal || {}),
    },
    service: {
        ...(currentDraft?.service || {}),
        ...(nextDraft?.service || {}),
        location: {
            ...(currentDraft?.service?.location || {}),
            ...(nextDraft?.service?.location || {}),
        },
    },
    bank: {
        ...(currentDraft?.bank || {}),
        ...(nextDraft?.bank || {}),
    },
});

const buildLocalDraftProvider = (
    currentProvider: ProviderProfile | null,
    user: AuthUser | null,
    payload: ProviderDraftPayload,
): ProviderProfile => {
    const nextStage = payload.onboarding?.currentStage || currentProvider?.onboarding?.currentStage || 'personal';
    const nextDraft = mergeProviderDraft(currentProvider?.onboarding?.draft, payload.onboarding?.draft);
    const fallbackUser = {
        _id: user?.id || 'local-draft-user',
        name: user?.name,
        phone: user?.phone,
        email: user?.email,
        avatar: user?.avatar,
    };

    return {
        _id: currentProvider?._id || 'local-draft-provider',
        user: currentProvider?.user || fallbackUser,
        businessName:
            currentProvider?.businessName
            || nextDraft.personal?.name
            || user?.name
            || user?.phone
            || 'Provider Draft',
        providerMode: payload.providerMode || currentProvider?.providerMode || 'individual',
        partnerType: currentProvider?.partnerType,
        fleetId: nextDraft.personal?.fleetId || currentProvider?.fleetId,
        fleetIdSource: currentProvider?.fleetIdSource,
        ownerName: currentProvider?.ownerName,
        supportPhone: currentProvider?.supportPhone,
        teamSize: currentProvider?.teamSize,
        services: currentProvider?.services || [],
        experience: currentProvider?.experience,
        serviceArea: currentProvider?.serviceArea,
        availability: currentProvider?.availability || { isAvailable: false },
        verification: currentProvider?.verification || {
            isVerified: false,
            reviewStatus: 'pending',
            documents: [],
        },
        onboarding: {
            currentStage: nextStage,
            isComplete: payload.onboarding?.isComplete === true,
            lastSavedAt: new Date().toISOString(),
            draft: nextDraft,
        },
        bankDetails: currentProvider?.bankDetails,
        rating: currentProvider?.rating,
        completedJobs: currentProvider?.completedJobs,
    };
};

interface AuthContextValue {
    isAuthenticated: boolean;
    needsOnboarding: boolean;
    isBootstrapping: boolean;
    isSubmitting: boolean;
    user: AuthUser | null;
    provider: ProviderProfile | null;
    providerStats: ProviderStats | null;
    sendOtp: (phone: string) => Promise<{ success: boolean; error?: string; otp?: string }>;
    verifyOtp: (phone: string, otp: string, accountType?: 'individual' | 'fleet_member') => Promise<{ success: boolean; error?: string }>;
    refreshSession: () => Promise<ProviderProfile | null>;
    saveProviderDraft: (payload: ProviderDraftPayload) => Promise<{ success: boolean; error?: string; provider?: ProviderProfile | null }>;
    submitProviderProfile: (payload: ProviderPayload) => Promise<{ success: boolean; error?: string }>;
    toggleAvailability: () => Promise<{ success: boolean; error?: string }>;
    loadProviderStats: () => Promise<void>;
    logout: () => Promise<void>;
    onboardingRouteName: string;
    onboardingAccountType: 'individual' | 'fleet_member';
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [provider, setProvider] = useState<ProviderProfile | null>(null);
    const [providerStats, setProviderStats] = useState<ProviderStats | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isBootstrapping, setIsBootstrapping] = useState(true);

    // Restore session from persisted tokens on app startup
    useEffect(() => {
        bootstrapSession();
    }, []);

    const bootstrapSession = async () => {
        try {
            const hasToken = await apiClient.restoreTokens();
            if (!hasToken) {
                setIsBootstrapping(false);
                return;
            }

            // Token found — validate it by calling /auth/me
            let meResult = await authService.getMe();

            // If token expired, try refreshing before giving up
            if (!meResult.success) {
                const refreshResult = await authService.refreshToken();
                if (refreshResult.success) {
                    meResult = await authService.getMe();
                }
            }

            if (!meResult.success || !meResult.data) {
                // Token truly invalid — clear and send to login
                apiClient.clearTokens();
                setIsBootstrapping(false);
                return;
            }

            const restoredUser: AuthUser = {
                id: meResult.data.id || meResult.data._id || '',
                name: meResult.data.name,
                email: meResult.data.email,
                phone: meResult.data.phone,
                language: meResult.data.language,
                role: meResult.data.role,
                roles: meResult.data.roles || [],
                avatar: meResult.data.avatar,
                isVerified: meResult.data.isVerified,
            };
            setUser(restoredUser);

            // Load provider profile — don't clear session if this fails
            try {
                const providerResult = await providerService.getMine();
                if (providerResult.success && providerResult.data) {
                    setProvider(providerResult.data);

                    // Load stats (non-critical)
                    try {
                        const statsResult = await providerService.getStats(providerResult.data._id);
                        if (statsResult.success) {
                            setProviderStats(statsResult.data || null);
                        }
                    } catch (statsError) {
                        console.warn('Failed to load provider stats during bootstrap:', statsError);
                    }
                }
            } catch (providerError) {
                // Provider profile fetch failed — user is still authenticated
                // They'll see onboarding or can retry later
                console.warn('Failed to load provider profile during bootstrap:', providerError);
            }
        } catch (error) {
            // Only clear tokens if the /auth/me call itself threw (network error during token validation)
            console.error('Session bootstrap failed:', error);
            // Don't clear tokens on network errors — let user retry on next app open
        } finally {
            setIsBootstrapping(false);
        }
    };

    const refreshSession = async (): Promise<ProviderProfile | null> => {
        if (!user?.id) {
            return null;
        }

        const providerResult = await providerService.getMine();
        if (providerResult.success) {
            const nextProvider = providerResult.data || null;
            const previousStatus = getProviderReviewStatus(provider);
            const nextStatus = getProviderReviewStatus(nextProvider);

            setProvider(nextProvider);

            if (provider && previousStatus !== nextStatus) {
                if (nextStatus === 'approved') {
                    await notificationsService.displayLocalNotification(
                        'Provider profile approved',
                        'Admin approved your LocalFix provider account. You can now go online and receive jobs.',
                        'security',
                        {
                            screen: 'Home',
                            reviewStatus: nextStatus,
                        }
                    );
                } else if (nextStatus === 'rejected') {
                    await notificationsService.displayLocalNotification(
                        'Provider review updated',
                        nextProvider?.verification?.reviewNotes || 'Admin reviewed your provider profile. Check the review notes before continuing.',
                        'security',
                        {
                            screen: 'Home',
                            reviewStatus: nextStatus,
                        }
                    );
                }
            }

            if (nextProvider?._id) {
                const statsResult = await providerService.getStats(nextProvider._id);
                if (statsResult.success) {
                    setProviderStats(statsResult.data || null);
                }
            }

            return nextProvider;
        }

        return null;
    };

    const sendOtp = async (phone: string) => {
        setIsSubmitting(true);
        const deviceInfo = await deviceService.getDeviceInfo();
        const result = await authService.sendOtp(phone, deviceInfo);
        setIsSubmitting(false);

        return {
            success: result.success,
            error: result.error,
            otp: result.data?.otp,
        };
    };

    const verifyOtp = async (phone: string, otp: string, accountType: 'individual' | 'fleet_member' = 'individual') => {
        setIsSubmitting(true);
        const deviceInfo = await deviceService.getDeviceInfo();
        const result = await authService.verifyOtp(phone, otp, deviceInfo);

        if (result.success && result.data) {
            setUser(result.data.user);
            let nextProvider: ProviderProfile | null = null;
            const providerResult = await providerService.getMine();
            if (providerResult.success) {
                nextProvider = providerResult.data || null;
            }

            if (!nextProvider || nextProvider.onboarding?.isComplete !== true) {
                const draftResult = await providerService.upsertDraft({
                    providerMode: nextProvider?.providerMode || accountType,
                    onboarding: {
                        currentStage: nextProvider?.onboarding?.currentStage || 'personal',
                        isComplete: false,
                    },
                });

                if (draftResult.success) {
                    nextProvider = draftResult.data || nextProvider;
                } else if (isMissingProviderDraftRouteError(draftResult.error)) {
                    nextProvider = buildLocalDraftProvider(nextProvider, result.data.user, {
                        providerMode: nextProvider?.providerMode || accountType,
                        onboarding: {
                            currentStage: nextProvider?.onboarding?.currentStage || 'personal',
                            isComplete: false,
                        },
                    });
                }
            }

            setProvider(nextProvider);
        }

        setIsSubmitting(false);

        return {
            success: result.success,
            error: result.error,
        };
    };

    const saveProviderDraft = async (payload: ProviderDraftPayload) => {
        const result = await providerService.upsertDraft(payload);

        if (result.success) {
            setProvider(result.data || null);
            return {
                success: true,
                error: result.error,
                provider: result.data || null,
            };
        }

        if (isMissingProviderDraftRouteError(result.error)) {
            const fallbackProvider = buildLocalDraftProvider(provider, user, payload);
            setProvider(fallbackProvider);

            return {
                success: true,
                provider: fallbackProvider,
            };
        }

        return {
            success: result.success,
            error: result.error,
            provider: result.data || null,
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
                    language: meResult.data.language || user.language,
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

    const isAuthenticated = !!user && (user.role === 'provider' || provider?.onboarding?.isComplete === true);
    const needsOnboarding = !!user && !isAuthenticated;
    const onboardingRouteName = getOnboardingRouteName(provider);
    const onboardingAccountType = getOnboardingAccountType(provider);

    const value = useMemo<AuthContextValue>(() => ({
        isAuthenticated,
        needsOnboarding,
        isBootstrapping,
        isSubmitting,
        user,
        provider,
        providerStats,
        sendOtp,
        verifyOtp,
        refreshSession,
        saveProviderDraft,
        submitProviderProfile,
        toggleAvailability,
        loadProviderStats,
        logout,
        onboardingRouteName,
        onboardingAccountType,
    }), [isAuthenticated, isBootstrapping, isSubmitting, needsOnboarding, onboardingAccountType, onboardingRouteName, provider, providerStats, user]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }

    return context;
};
