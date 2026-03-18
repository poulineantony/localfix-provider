import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
import { useAuth } from './AuthContext';
import { userService } from '../services/userService';

import { apiClient } from '../services/apiClient';

type TranslationMap = Record<string, string>;

export interface SupportedLanguage {
    code: string;
    label: string;
    nativeLabel: string;
    isDefault: boolean;
}

interface TranslationContextValue {
    t: (key: string, defaultValue?: string) => string;
    language: string;
    availableLanguages: SupportedLanguage[];
    changeLanguage: (lang: string) => Promise<void>;
    loading: boolean;
    languagesLoading: boolean;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const isSupportedLanguage = (lang: string, languages: SupportedLanguage[]) =>
    languages.some((languageOption) => languageOption.code === lang);

export const TranslationProvider = ({ children }: { children: React.ReactNode }) => {
    const { user } = useAuth();
    const [translations, setTranslations] = useState<TranslationMap>({});
    const [language, setLanguage] = useState('en');
    const [availableLanguages, setAvailableLanguages] = useState<SupportedLanguage[]>([]);
    const [loading, setLoading] = useState(true);
    const [languagesLoading, setLanguagesLoading] = useState(true);
    const [manualLanguage, setManualLanguage] = useState<string | null>(null);

    useEffect(() => {
        void initializeTranslations();
    }, [user?.language]);

    const initializeTranslations = async () => {
        setLoading(true);
        setLanguagesLoading(true);

        let nextLanguages: SupportedLanguage[] = [];
        let defaultLanguage = 'en';

        try {
            const languagePayload = await apiClient.get<SupportedLanguage[]>(API_ENDPOINTS.translations.languages);

            if (languagePayload.success && Array.isArray(languagePayload.data)) {
                nextLanguages = languagePayload.data;
                const defaultLangObj = (languagePayload as any).defaultLanguage || nextLanguages.find((languageOption) => languageOption.isDefault)?.code;
                defaultLanguage = defaultLangObj || 'en';
                setAvailableLanguages(nextLanguages);
            } else {
                setAvailableLanguages([]);
            }
        } catch (error) {
            console.error('Failed to load supported languages:', error);
            setAvailableLanguages([]);
        } finally {
            setLanguagesLoading(false);
        }

        const nextLanguage = [manualLanguage, user?.language, defaultLanguage, 'en'].find((candidate) => {
            if (!candidate) {
                return false;
            }

            return nextLanguages.length === 0 || isSupportedLanguage(candidate, nextLanguages);
        }) || 'en';

        setLanguage(nextLanguage);

        try {
            const translationPayload = await apiClient.get<TranslationMap>(API_ENDPOINTS.translations.byLanguage(nextLanguage));
            if (translationPayload.success && translationPayload.data) {
                setTranslations(translationPayload.data);
            } else {
                setTranslations({});
            }
        } catch (error) {
            console.error(`Failed to load translations for ${nextLanguage}:`, error);
            setTranslations({});
        } finally {
            setLoading(false);
        }
    };

    const changeLanguage = async (lang: string) => {
        setManualLanguage(lang);
        setLanguage(lang);
        setLoading(true);

        try {
            const translationPayload = await apiClient.get<TranslationMap>(API_ENDPOINTS.translations.byLanguage(lang));
            if (translationPayload.success && translationPayload.data) {
                setTranslations(translationPayload.data);
            } else {
                setTranslations({});
            }
        } catch (error) {
            console.error(`Failed to switch language to ${lang}:`, error);
            setTranslations({});
        }

        try {
            if (user?.id && user.language !== lang) {
                await userService.updateProfile({ language: lang });
            }
        } catch (error) {
            console.error(`Failed to persist language ${lang}:`, error);
        } finally {
            setLoading(false);
        }
    };

    const value = useMemo<TranslationContextValue>(() => ({
        t: (key, defaultValue) => translations[key] || defaultValue || key,
        language,
        availableLanguages,
        changeLanguage,
        loading,
        languagesLoading,
    }), [availableLanguages, language, loading, languagesLoading, translations]);

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => {
    const context = useContext(TranslationContext);

    if (!context) {
        throw new Error('useTranslation must be used within TranslationProvider');
    }

    return context;
};
