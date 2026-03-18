import React, { useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import LottieView from 'lottie-react-native';
import { useTranslation } from '../../context/TranslationContext';

const { width } = Dimensions.get('window');

const CARD_ASSETS = [
    {
        id: 1,
        image: require('../../assets/nearby_jobs_card.jpg')
    },
    {
        id: 2,
        image: require('../../assets/accept_fix_card.jpg')
    },
    {
        id: 3,
        image: require('../../assets/get_paid_card.jpg')
    }
];

export const WelcomeScreen = ({ navigation }: any) => {
    const { t, language, availableLanguages, changeLanguage, languagesLoading } = useTranslation();
    const usesIndicTypography = ['ta', 'te', 'ml', 'kn', 'hi'].includes(language);
    const welcomeTagline = t('provider.welcome.tagline', 'Service Partner App');
    const welcomeTitle = t('provider.welcome.title', 'Earn more with LocalFix Pro');
    const welcomeSubtitle = t('provider.welcome.subtitle', 'Get nearby service requests directly on your phone.');
    const needsCompactWelcomeLayout =
        usesIndicTypography
        || welcomeTitle.length > 40
        || welcomeSubtitle.length > 96;

    const languageSelector = !languagesLoading && availableLanguages.length > 0 ? (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.languageScrollContent}
        >
            {availableLanguages.map((languageOption) => {
                const isActive = language === languageOption.code;

                return (
                    <TouchableOpacity
                        key={languageOption.code}
                        style={[styles.langButton, isActive && styles.langButtonActive]}
                        onPress={() => changeLanguage(languageOption.code)}
                    >
                        <Icon name="language" size={18} color={isActive ? '#fff' : theme.colors.textSecondary} />
                        <Text style={[styles.langText, isActive && styles.langTextActive]}>
                            {languageOption.label}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </ScrollView>
    ) : null;

    if (!needsCompactWelcomeLayout) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.headerRow}>
                    {languageSelector}
                </View>

                <View style={[styles.content, styles.standardWelcomeContent]}>
                    <View style={[styles.heroWrap, styles.heroWrapStandard]}>
                        <LottieView
                            source={require('../../assets/hero_anim.json')}
                            autoPlay
                            loop
                            style={styles.heroAnimation}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={styles.tagline}>{welcomeTagline}</Text>
                    <Text style={styles.title}>{welcomeTitle}</Text>
                    <Text style={styles.subtitle}>{welcomeSubtitle}</Text>
                </View>

                <View style={styles.footer}>
                    <Button
                        title={t('common.continue', 'Continue')}
                        onPress={() => navigation.navigate('ModeSelection')}
                    />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                {languageSelector}
            </View>

            <ScrollView
                style={styles.screenScrollView}
                contentContainerStyle={styles.compactWelcomeScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.welcomeContent, styles.compactWelcomeContent]}>
                    <View style={[styles.heroWrap, styles.heroWrapCompact]}>
                        <LottieView
                            source={require('../../assets/hero_anim.json')}
                            autoPlay
                            loop
                            style={styles.heroAnimation}
                            resizeMode="cover"
                        />
                    </View>
                    <Text style={[styles.tagline, styles.compactTagline]}>{welcomeTagline}</Text>
                    <Text style={[styles.title, styles.compactTitle, usesIndicTypography && styles.indicCompactTitle]}>{welcomeTitle}</Text>
                    <Text style={[styles.subtitle, styles.compactSubtitle]}>{welcomeSubtitle}</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={t('common.continue', 'Continue')}
                    onPress={() => navigation.navigate('ModeSelection')}
                />
            </View>
        </SafeAreaView>
    );
};

export const ModeSelectionScreen = ({ navigation }: any) => {
    const { t, language } = useTranslation();
    const usesIndicTypography = ['ta', 'te', 'ml', 'kn', 'hi'].includes(language);
    const modeHeading = t('provider.mode.title', 'How do you want to join LocalFix?');
    const modeIntro = t('provider.mode.subtitle', 'Select the setup that matches your work model. You can tailor the onboarding flow from here.');

    const modes = [
        {
            key: 'individual',
            title: t('provider.mode.individual.title', 'Individual'),
            subtitle: t('provider.mode.individual.subtitle', 'Take jobs directly and work as a single service provider.'),
            icon: 'person',
            accent: theme.colors.primary,
            onPress: () => navigation.navigate('HowItWorks', { accountType: 'individual' }),
        },
        {
            key: 'fleet_member',
            title: t('provider.mode.fleet_member.title', 'Fleet Member'),
            subtitle: t('provider.mode.fleet_member.subtitle', 'Join an agency or head office using the fleet ID they created in the partner app.'),
            icon: 'badge',
            accent: theme.colors.orange,
            onPress: () => navigation.navigate('HowItWorks', { accountType: 'fleet_member' }),
        }
    ];
    const useCompactModeTypography =
        usesIndicTypography
        || modeHeading.length > 36
        || modeIntro.length > 110
        || modes.some((mode) => mode.subtitle.length > 72);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.screenScrollView}
                contentContainerStyle={styles.modeScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.modeContent, styles.roomyModeContent, useCompactModeTypography && styles.compactModeContent, usesIndicTypography && styles.indicModeContent]}>
                    <Text style={styles.tagline}>{t('provider.mode.tagline', 'Choose your path')}</Text>
                    <Text style={[styles.title, useCompactModeTypography && styles.compactModeScreenTitle, usesIndicTypography && styles.indicModeScreenTitle]}>{modeHeading}</Text>
                    <Text style={[styles.subtitle, styles.roomyModeScreenSubtitle, useCompactModeTypography && styles.compactModeScreenSubtitle, usesIndicTypography && styles.indicModeScreenSubtitle]}>
                        {modeIntro}
                    </Text>

                    <View style={[styles.modeCardList, styles.roomyModeCardList, useCompactModeTypography && styles.compactModeCardList, usesIndicTypography && styles.indicModeCardList]}>
                        {modes.map((mode) => (
                            <TouchableOpacity
                                key={mode.key}
                                style={[styles.modeCard, styles.roomyModeCard, { borderColor: mode.accent }, useCompactModeTypography && styles.compactModeCard, usesIndicTypography && styles.indicModeCard]}
                                onPress={mode.onPress}
                                activeOpacity={0.9}
                            >
                                <View style={[styles.modeIconWrap, { backgroundColor: `${mode.accent}15` }, useCompactModeTypography && styles.compactModeIconWrap]}>
                                    <Icon name={mode.icon} size={30} color={mode.accent} />
                                </View>
                                <View style={[styles.modeTextWrap, styles.roomyModeTextWrap, useCompactModeTypography && styles.compactModeTextWrap, usesIndicTypography && styles.indicModeTextWrap]}>
                                    <Text style={[styles.modeTitle, styles.roomyModeTitle, useCompactModeTypography && styles.compactModeTitle, usesIndicTypography && styles.indicModeTitle]}>{mode.title}</Text>
                                    <Text style={[styles.modeSubtitle, styles.roomyModeSubtitle, useCompactModeTypography && styles.compactModeSubtitle, usesIndicTypography && styles.indicModeSubtitle]}>{mode.subtitle}</Text>
                                </View>
                                <Icon name="arrow-forward-ios" size={18} color={mode.accent} />
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

export const HowItWorksScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [activeIndex, setActiveIndex] = useState(0);
    const accountType = route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
    const listRef = useRef<FlatList<any>>(null);
    const cards = useMemo(() => ([
        {
            ...CARD_ASSETS[0],
            title: t('provider.card.nearby.title', 'Get nearby jobs'),
            desc: t('provider.card.nearby.desc', 'Customers near you send requests directly to your phone.'),
        },
        {
            ...CARD_ASSETS[1],
            title: t('provider.card.accept.title', 'Accept & fix'),
            desc: t('provider.card.accept.desc', 'Choose the jobs you want. Navigate easily. Do your best work.'),
        },
        {
            ...CARD_ASSETS[2],
            title: t('provider.card.paid.title', 'Get paid fast'),
            desc: t('provider.card.paid.desc', 'Weekly or instant settlements directly to your bank account.'),
        },
    ]), [t]);
    const isLastSlide = activeIndex === cards.length - 1;

    const handleScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const slideSize = event.nativeEvent.layoutMeasurement.width;
        const index = event.nativeEvent.contentOffset.x / slideSize;
        setActiveIndex(Math.round(index));
    };

    const handleDotPress = (index: number) => {
        listRef.current?.scrollToIndex({ index, animated: true });
        setActiveIndex(index);
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('provider.how_it_works.title', 'How it works')}</Text>
            </View>

            <FlatList
                ref={listRef}
                data={cards}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScrollEnd}
                contentContainerStyle={styles.scrollContent}
                keyExtractor={(item) => item.id.toString()}
                bounces={false}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                    length: width,
                    offset: width * index,
                    index,
                })}
                onScrollToIndexFailed={(info) => {
                    listRef.current?.scrollToOffset({
                        offset: info.averageItemLength * info.index,
                        animated: true,
                    });
                }}
                renderItem={({ item }) => (
                    <View style={styles.cardContainer}>
                        <View style={{ width: 400, height: 330, marginBottom: theme.spacing.xl, alignItems: 'center', justifyContent: 'center' }}>
                            <Image
                                source={item.image}
                                style={{ width: '100%', height: '100%' }}
                                resizeMode="contain"
                            />
                        </View>
                        <Text style={styles.cardTitle}>{item.title}</Text>
                        <Text style={styles.cardDesc}>{item.desc}</Text>
                    </View>
                )}
            />

            <View style={styles.pagination}>
                {cards.map((_, i) => (
                    <TouchableOpacity
                        key={i}
                        activeOpacity={0.85}
                        onPress={() => handleDotPress(i)}
                        style={[
                            styles.dot,
                            activeIndex === i ? styles.activeDot : null
                        ]}
                    />
                ))}
            </View>

            <View style={styles.footer}>
                <Button
                    title={t('provider.how_it_works.next', 'Next')}
                    onPress={() => navigation.navigate('Requirements', { accountType })}
                    disabled={!isLastSlide}
                />
                {!isLastSlide ? (
                    <Text style={styles.slideHint}>{t('provider.how_it_works.slide_hint', 'Swipe the slides below or tap the points. Next unlocks on the last slide.')}</Text>
                ) : null}
            </View>
        </SafeAreaView>
    );
};

export const RequirementsScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const accountType = route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
    const requirements = accountType === 'fleet_member'
        ? [
            t('provider.requirements.item.phone', 'Valid phone number'),
            t('provider.requirements.item.fleet_id', 'Fleet ID from your agency or head office'),
            t('provider.requirements.item.id_proof', 'ID proof (Aadhaar / DL)'),
            t('provider.requirements.item.skills_bank', 'Skill details and bank account')
        ]
        : [
            t('provider.requirements.item.phone', 'Valid phone number'),
            t('provider.requirements.item.id_proof', 'ID proof (Aadhaar / DL)'),
            t('provider.requirements.item.skills_experience', 'Skill details & Experience'),
            t('provider.requirements.item.bank', 'Bank account for payments')
        ];

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                style={styles.screenScrollView}
                contentContainerStyle={styles.requirementsScrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    <Text style={styles.title}>{t('provider.requirements.title', 'What you need to join')}</Text>
                    <Text style={styles.subtitle}>
                        {accountType === 'fleet_member'
                            ? t('provider.requirements.fleet.subtitle', 'Keep your fleet ID ready before starting. Your agency or head office must already exist in the partner app.')
                            : t('provider.requirements.individual.subtitle', 'Make sure you have these ready for a smooth registration.')}
                    </Text>

                    <View style={styles.listContainer}>
                        {requirements.map((req, index) => (
                            <View key={index} style={styles.listItem}>
                                <Icon name="check-circle" size={24} color={theme.colors.success} />
                                <Text style={styles.listText}>{req}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                <View style={styles.inlineFooter}>
                    <Button
                        title={t('provider.requirements.start', 'Start Registration')}
                        onPress={() => navigation.navigate('RegistrationPhone', { accountType })}
                    />
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        padding: theme.spacing.xl,
        justifyContent: 'flex-start',
        alignItems: 'center',
    },
    screenScrollView: {
        flex: 1,
    },
    welcomeScrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl,
    },
    compactWelcomeScrollContent: {
        flexGrow: 1,
    },
    modeScrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl,
    },
    requirementsScrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.xl,
    },
    header: {
        padding: theme.spacing.l,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: theme.typography.h2.fontSize,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    iconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    tagline: {
        color: theme.colors.primary,
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: theme.spacing.s,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: theme.typography.h1.fontSize,
        fontWeight: 'bold',
        color: theme.colors.text,
        textAlign: 'center',
        marginBottom: theme.spacing.m,
    },
    subtitle: {
        fontSize: theme.typography.body.fontSize,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    languageSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    langText: {
        color: theme.colors.text,
        marginHorizontal: theme.spacing.s,
        fontWeight: '600',
    },
    footer: {
        padding: theme.spacing.xl,
    },
    inlineFooter: {
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.xl,
    },
    standardWelcomeContent: {
        flex: 1,
    },
    slideHint: {
        textAlign: 'center',
        color: theme.colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
        marginTop: theme.spacing.s,
    },
    // HowItWorks styles
    scrollContent: {
        alignItems: 'center',
    },
    cardContainer: {
        width: width,
        alignItems: 'center',
        padding: theme.spacing.xl,
    },
    cardIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    cardTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    cardDesc: {
        fontSize: 18,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 28,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: theme.spacing.l,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.surfaceHighlight,
        marginHorizontal: 4,
    },
    activeDot: {
        backgroundColor: theme.colors.primary,
        width: 24,
    },
    // Requirements styles
    listContainer: {
        width: '100%',
        marginTop: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    headerRow: {
        paddingBottom: theme.spacing.m,
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.s,
        justifyContent: 'center',
    },
    languageScrollContent: {
        flexDirection: 'row',
        gap: theme.spacing.s,
        paddingRight: theme.spacing.m,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    langButtonActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    listText: {
        marginLeft: theme.spacing.m,
        color: theme.colors.text,
        fontSize: 16,
        flex: 1,
    },
    langTextActive: {
        color: '#fff',
    },
    modeContent: {
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.l,
    },
    roomyModeContent: {
        paddingTop: 36,
        paddingBottom: 28,
    },
    compactModeContent: {
        paddingTop: theme.spacing.l,
    },
    indicModeContent: {
        paddingTop: 40,
        paddingBottom: 32,
    },
    modeCardList: {
        marginTop: theme.spacing.xl,
        gap: theme.spacing.m,
    },
    roomyModeCardList: {
        marginTop: 28,
        gap: 20,
    },
    compactModeCardList: {
        marginTop: theme.spacing.l,
    },
    indicModeCardList: {
        marginTop: 30,
        gap: 22,
    },
    modeCard: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1.5,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        flexDirection: 'row',
        alignItems: 'center',
        ...theme.shadows.small,
    },
    roomyModeCard: {
        paddingVertical: 22,
        paddingHorizontal: 22,
    },
    compactModeCard: {
        paddingVertical: 18,
        paddingHorizontal: 18,
    },
    indicModeCard: {
        paddingVertical: 24,
        paddingHorizontal: 22,
    },
    modeIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    compactModeIconWrap: {
        width: 48,
        height: 48,
        borderRadius: 14,
        marginRight: 12,
    },
    modeTextWrap: {
        flex: 1,
        paddingRight: theme.spacing.m,
    },
    roomyModeTextWrap: {
        paddingRight: 12,
    },
    compactModeTextWrap: {
        paddingRight: 8,
    },
    indicModeTextWrap: {
        paddingRight: 14,
    },
    modeTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    roomyModeTitle: {
        marginBottom: 8,
    },
    compactModeTitle: {
        fontSize: 18,
    },
    indicModeTitle: {
        marginBottom: 10,
    },
    modeSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        color: theme.colors.textSecondary,
    },
    roomyModeSubtitle: {
        lineHeight: 24,
    },
    compactModeSubtitle: {
        fontSize: 13,
        lineHeight: 20,
    },
    indicModeSubtitle: {
        lineHeight: 26,
    },
    compactModeScreenTitle: {
        fontSize: 31,
        lineHeight: 38,
    },
    indicModeScreenTitle: {
        fontSize: 29,
        lineHeight: 36,
    },
    roomyModeScreenSubtitle: {
        marginTop: 4,
        maxWidth: '94%',
    },
    compactModeScreenSubtitle: {
        fontSize: 15,
        lineHeight: 22,
        maxWidth: '96%',
    },
    indicModeScreenSubtitle: {
        lineHeight: 24,
    },
    partnerHero: {
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    partnerBadge: {
        width: 88,
        height: 88,
        borderRadius: 28,
        backgroundColor: '#dcfce7',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    backLink: {
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
    },
    backLinkText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        fontWeight: '600',
    },
    welcomeContent: {
        paddingHorizontal: theme.spacing.xl,
        alignItems: 'center',
    },
    compactWelcomeContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingBottom: theme.spacing.l,
    },
    heroWrap: {
        alignItems: 'center',
        marginBottom: theme.spacing.l,
        width: '100%',
    },
    heroWrapStandard: {
        height: 280,
    },
    heroWrapCompact: {
        height: 292,
    },
    heroAnimation: {
        width: '100%',
        height: '100%',
    },
    compactTagline: {
        fontSize: 13,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    compactTitle: {
        fontSize: 42,
        lineHeight: 50,
        maxWidth: '96%',
    },
    indicCompactTitle: {
        fontSize: 36,
        lineHeight: 44,
    },
    compactSubtitle: {
        fontSize: 15,
        lineHeight: 22,
        maxWidth: '94%',
    },
});
