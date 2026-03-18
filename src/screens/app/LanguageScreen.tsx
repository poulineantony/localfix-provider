import React, { useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useTranslation } from '../../context/TranslationContext';

export const LanguageScreen = ({ navigation }: any) => {
    const { language, availableLanguages, changeLanguage } = useTranslation();
    const [changing, setChanging] = useState(false);

    const handleSelect = async (code: string) => {
        if (code === language || changing) return;
        setChanging(true);
        await changeLanguage(code);
        setChanging(false);
        navigation.goBack();
    };

    const languageInfo: Record<string, { flag: string; region: string }> = {
        en: { flag: '🇬🇧', region: 'English' },
        hi: { flag: '🇮🇳', region: 'Hindi' },
        ta: { flag: '🇮🇳', region: 'Tamil' },
        te: { flag: '🇮🇳', region: 'Telugu' },
        kn: { flag: '🇮🇳', region: 'Kannada' },
        ml: { flag: '🇮🇳', region: 'Malayalam' },
        mr: { flag: '🇮🇳', region: 'Marathi' },
        bn: { flag: '🇮🇳', region: 'Bengali' },
        gu: { flag: '🇮🇳', region: 'Gujarati' },
        pa: { flag: '🇮🇳', region: 'Punjabi' },
        ur: { flag: '🇵🇰', region: 'Urdu' },
        fr: { flag: '🇫🇷', region: 'French' },
    };

    return (
        <SafeAreaView style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Language</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <Text style={s.subheading}>Select your preferred language</Text>
                <Text style={s.subtext}>
                    This changes all text in the app to your chosen language.
                </Text>

                <View style={s.listCard}>
                    {availableLanguages.map((lang, index) => {
                        const isSelected = language === lang.code;
                        const info = languageInfo[lang.code];
                        const isLast = index === availableLanguages.length - 1;

                        return (
                            <TouchableOpacity
                                key={lang.code}
                                style={[s.langRow, isLast && { borderBottomWidth: 0 }]}
                                onPress={() => handleSelect(lang.code)}
                                activeOpacity={0.6}
                                disabled={changing}
                            >
                                <View style={s.langLeft}>
                                    <Text style={s.flag}>{info?.flag || '🌐'}</Text>
                                    <View style={s.langTextWrap}>
                                        <Text style={[s.nativeLabel, isSelected && { color: theme.colors.primary, fontWeight: '700' }]}>
                                            {lang.nativeLabel}
                                        </Text>
                                        <Text style={s.enLabel}>{info?.region || lang.code.toUpperCase()}</Text>
                                    </View>
                                </View>

                                {changing && isSelected ? (
                                    <ActivityIndicator size="small" color={theme.colors.primary} />
                                ) : isSelected ? (
                                    <View style={s.checkCircle}>
                                        <Icon name="check" size={16} color="#fff" />
                                    </View>
                                ) : (
                                    <View style={s.emptyCircle} />
                                )}
                            </TouchableOpacity>
                        );
                    })}

                    {availableLanguages.length === 0 && (
                        <View style={s.emptyWrap}>
                            <ActivityIndicator size="large" color={theme.colors.primary} />
                            <Text style={s.emptyText}>Loading languages...</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

    scroll: { padding: 20, paddingBottom: 40 },
    subheading: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 6 },
    subtext: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: 24, lineHeight: 20 },

    listCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
    },
    langRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    langLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    flag: { fontSize: 28, marginRight: 14 },
    langTextWrap: { flex: 1 },
    nativeLabel: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
    enLabel: { fontSize: 13, color: theme.colors.textMuted, marginTop: 2 },

    checkCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: theme.colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        borderColor: theme.colors.border,
    },

    emptyWrap: { padding: 40, alignItems: 'center' },
    emptyText: { marginTop: 12, color: theme.colors.textMuted, fontSize: 14 },
});
