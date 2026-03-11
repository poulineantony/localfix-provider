import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Image, FlatList, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import LottieView from 'lottie-react-native';

const { width } = Dimensions.get('window');

const CARDS = [
    {
        id: 1,
        title: 'Get nearby jobs',
        desc: 'Customers near you send requests directly to your phone.',
        icon: 'location-on',
        bgColor: '#6366f1',
        iconColor: '#ffffff',
        image: require('../../assets/nearby_jobs.png')
    },
    {
        id: 2,
        title: 'Accept & fix',
        desc: 'Choose the jobs you want. Navigate easily. Do your best work.',
        icon: 'build',
        bgColor: '#10b981',
        iconColor: '#ffffff',
        image: require('../../assets/accept_fix.png')
    },
    {
        id: 3,
        title: 'Get paid fast',
        desc: 'Weekly or instant settlements directly to your bank account.',
        icon: 'account-balance-wallet',
        bgColor: '#f59e0b',
        iconColor: '#ffffff',
        image: require('../../assets/get_paid.png')
    }
];

export const WelcomeScreen = ({ navigation }: any) => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.pageNumber}>Page 1</Text>
                <View style={{ flex: 1 }} />
                <TouchableOpacity style={styles.langButton}>
                    <Icon name="language" size={20} color={theme.colors.textSecondary} />
                    <Text style={styles.langText}>English</Text>
                    <Icon name="arrow-drop-down" size={20} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.content}>
                <View style={{ alignItems: 'center', marginBottom: theme.spacing.l, width: '100%', height: 280 }}>
                    <LottieView
                        source={require('../../assets/hero_anim.json')}
                        autoPlay
                        loop
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                    />
                </View>
                <Text style={styles.tagline}>SERVICE PARTNER APP</Text>
                <Text style={styles.title}>Earn more with LocalFix Pro</Text>
                <Text style={styles.subtitle}>Get nearby service requests directly on your phone.</Text>
            </View>

            <View style={styles.footer}>
                <Button
                    title="Continue"
                    onPress={() => navigation.navigate('ModeSelection')}
                />
            </View>
        </SafeAreaView>
    );
};

export const ModeSelectionScreen = ({ navigation }: any) => {
    const modes = [
        {
            key: 'individual',
            title: 'Individual',
            subtitle: 'Take jobs directly and work as a single service provider.',
            icon: 'person',
            accent: theme.colors.primary,
            onPress: () => navigation.navigate('HowItWorks', { accountType: 'individual' }),
        },
        {
            key: 'fleet_member',
            title: 'Fleet Member',
            subtitle: 'Join an agency or head office using the fleet ID they created in the partner app.',
            icon: 'badge',
            accent: theme.colors.orange,
            onPress: () => navigation.navigate('HowItWorks', { accountType: 'fleet_member' }),
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.modeHeader}>
                <Text style={styles.pageNumber}>Mode Select</Text>
            </View>

            <View style={styles.modeContent}>
                <Text style={styles.tagline}>Choose your path</Text>
                <Text style={styles.title}>How do you want to join LocalFix?</Text>
                <Text style={styles.subtitle}>
                    Select the setup that matches your work model. You can tailor the onboarding flow from here.
                </Text>

                <View style={styles.modeCardList}>
                    {modes.map((mode) => (
                        <TouchableOpacity
                            key={mode.key}
                            style={[styles.modeCard, { borderColor: mode.accent }]}
                            onPress={mode.onPress}
                            activeOpacity={0.9}
                        >
                            <View style={[styles.modeIconWrap, { backgroundColor: `${mode.accent}15` }]}>
                                <Icon name={mode.icon} size={30} color={mode.accent} />
                            </View>
                            <View style={styles.modeTextWrap}>
                                <Text style={styles.modeTitle}>{mode.title}</Text>
                                <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                            </View>
                            <Icon name="arrow-forward-ios" size={18} color={mode.accent} />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </SafeAreaView>
    );
};

export const HowItWorksScreen = ({ navigation, route }: any) => {
    const [activeIndex, setActiveIndex] = useState(0);
    const accountType = route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
    const listRef = useRef<FlatList<any>>(null);
    const isLastSlide = activeIndex === CARDS.length - 1;

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
            <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <Text style={styles.pageNumber}>Page 2</Text>
            </View>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>How it works</Text>
            </View>

            <FlatList
                ref={listRef}
                data={CARDS}
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
                {CARDS.map((_, i) => (
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
                    title="Next"
                    onPress={() => navigation.navigate('Requirements', { accountType })}
                    disabled={!isLastSlide}
                />
                {!isLastSlide ? (
                    <Text style={styles.slideHint}>Swipe the slides below or tap the points. Next unlocks on the last slide.</Text>
                ) : null}
            </View>
        </SafeAreaView>
    );
};

export const RequirementsScreen = ({ navigation, route }: any) => {
    const accountType = route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
    const requirements = accountType === 'fleet_member'
        ? [
            'Valid phone number',
            'Fleet ID from your agency or head office',
            'ID proof (Aadhaar / DL)',
            'Skill details and bank account'
        ]
        : [
            'Valid phone number',
            'ID proof (Aadhaar / DL)',
            'Skill details & Experience',
            'Bank account for payments'
        ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <Text style={styles.pageNumber}>Page 3</Text>
            </View>
            <View style={styles.content}>
                <Text style={styles.title}>What you need to join</Text>
                <Text style={styles.subtitle}>
                    {accountType === 'fleet_member'
                        ? 'Keep your fleet ID ready before starting. Your agency or head office must already exist in the partner app.'
                        : 'Make sure you have these ready for a smooth registration.'}
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

            <View style={styles.footer}>
                <Button
                    title="Start Registration"
                    onPress={() => navigation.navigate('RegistrationPhone', { accountType })}
                />
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    content: {
        flex: 1,
        padding: theme.spacing.xl,
        justifyContent: 'flex-start',
        alignItems: 'center',
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
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.s,
        justifyContent: 'space-between',
    },
    pageNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.error, // Red for visibility as it is "for reference"
        backgroundColor: 'rgba(255,0,0,0.1)',
        padding: 4,
        borderRadius: 4,
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
    listText: {
        marginLeft: theme.spacing.m,
        color: theme.colors.text,
        fontSize: 16,
        flex: 1,
    },
    modeHeader: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
    },
    modeContent: {
        flex: 1,
        paddingHorizontal: theme.spacing.xl,
        paddingTop: theme.spacing.xl,
        paddingBottom: theme.spacing.l,
    },
    modeCardList: {
        marginTop: theme.spacing.xl,
        gap: theme.spacing.m,
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
    modeIconWrap: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.m,
    },
    modeTextWrap: {
        flex: 1,
        paddingRight: theme.spacing.m,
    },
    modeTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: theme.colors.text,
        marginBottom: 4,
    },
    modeSubtitle: {
        fontSize: 14,
        lineHeight: 22,
        color: theme.colors.textSecondary,
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
    }
});
