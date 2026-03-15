import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { bookingService } from '../../services/bookingService';

export const EarningsScreen = () => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<'Today' | 'Week' | 'Month'>('Week');
    const { providerStats, loadProviderStats } = useAuth();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await loadProviderStats();
            const result = await bookingService.list('completed');
            if (result.success) {
                setTransactions(result.data || []);
            } else {
                Alert.alert(t('common.error', 'Error'), result.error || t('provider.earnings.unavailable', 'Could not load earnings data.'));
            }
            setLoading(false);
        };

        loadData();
    }, [activeTab]);

    const filteredTransactions = useMemo(() => {
        const now = new Date();

        return transactions.filter(item => {
            const createdAt = new Date(item.updatedAt || item.scheduledDate);
            const diffDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

            if (activeTab === 'Today') {
                return diffDays === 0;
            }

            if (activeTab === 'Week') {
                return diffDays <= 7;
            }

            return diffDays <= 31;
        });
    }, [activeTab, transactions]);

    const StatCard = ({ title, value, icon }: any) => (
        <View style={styles.statCard}>
            <View style={styles.statIcon}>
                <Icon name={icon} size={24} color={theme.colors.primary} />
            </View>
            <View>
                <Text style={styles.statLabel}>{title}</Text>
                <Text style={styles.statValue}>{value}</Text>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('provider.nav.earnings', 'Earnings')}</Text>
            </View>

            <View style={styles.tabs}>
                {(['Today', 'Week', 'Month'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={styles.loadingState}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content}>
                    <View style={styles.balanceCard}>
                        <Text style={styles.balanceLabel}>Total Earnings</Text>
                        <Text style={styles.balanceValue}>Rs {providerStats?.totalEarnings || 0}</Text>
                        <Button
                            title="Settlement Managed by Admin"
                            onPress={() => {}}
                            style={{ marginTop: 16, backgroundColor: 'rgba(0,0,0,0.2)' }}
                        />
                    </View>

                    <View style={styles.statsRow}>
                        <StatCard title="Completed Jobs" value={providerStats?.completedBookings || 0} icon="work" />
                        <StatCard title="Avg. Rating" value={providerStats?.rating?.average?.toFixed(1) || '0.0'} icon="star" />
                    </View>

                    <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    {filteredTransactions.length === 0 ? (
                        <Text style={styles.emptyText}>{t('provider.earnings.empty', 'No completed transactions in this period.')}</Text>
                    ) : (
                        filteredTransactions.map(item => (
                            <View key={item._id} style={styles.transactionCard}>
                                <View style={styles.txIcon}>
                                    <Icon name="call-received" size={20} color={theme.colors.success} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.txTitle}>{item.service?.name || 'Service Payment'} - {item.bookingNumber || item._id.slice(-4)}</Text>
                                    <Text style={styles.txDate}>{new Date(item.updatedAt || item.scheduledDate).toLocaleString()}</Text>
                                </View>
                                <Text style={styles.txAmount}>+ Rs {item.pricing?.totalAmount || item.pricing?.basePrice || 0}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

export const ProfileScreen = () => {
    const { t, language, availableLanguages, changeLanguage } = useTranslation();
    const { user, provider, logout } = useAuth();

    const MenuItem = ({ icon, title, subtitle, onPress }: any) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <View style={styles.menuIcon}>
                <Icon name={icon} size={24} color={theme.colors.textSecondary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.menuTitle}>{title}</Text>
                {subtitle ? <Text style={styles.menuSubtitle}>{subtitle}</Text> : null}
            </View>
            <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.profileHeader}>
                <View style={styles.profileAvatar}>
                    <Icon name="person" size={40} color={theme.colors.text} />
                </View>
                <Text style={styles.profileName}>{provider?.businessName || user?.name || t('provider.profile.no_name', 'Provider')}</Text>
                <Text style={styles.profilePhone}>+91 {user?.phone || t('provider.profile.phone_missing', 'Not available')}</Text>
                <View style={styles.verifiedBadge}>
                    <Icon name="verified" size={16} color={theme.colors.success} />
                    <Text style={{ color: theme.colors.success, marginLeft: 4, fontSize: 12, fontWeight: 'bold' }}>
                        {provider?.verification?.isVerified
                            ? t('provider.profile.verified', 'VERIFIED PROVIDER')
                            : t('provider.profile.pending', 'VERIFICATION PENDING')}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.sectionHeader}>{t('provider.profile.account', 'ACCOUNT')}</Text>
                <MenuItem icon="person-outline" title={t('profile.title', 'Profile')} subtitle={user?.name || t('provider.profile.no_name', 'No name available')} />
                <MenuItem icon="folder-open" title={t('provider.profile.documents', 'Documents')} subtitle={t('provider.profile.documents_subtitle', 'Verification submitted through provider API')} />
                <MenuItem
                    icon="account-balance"
                    title={t('provider.profile.bank_details', 'Bank Details')}
                    subtitle={provider?.bankDetails?.ifscCode || t('provider.profile.bank_missing', 'Bank details not available')}
                />

                <Text style={styles.sectionHeader}>{t('provider.profile.service', 'SERVICE')}</Text>
                <MenuItem
                    icon="build-circle"
                    title={t('provider.profile.service_areas', 'Service Areas')}
                    subtitle={provider?.serviceArea?.cities?.join(', ') || t('provider.profile.service_area_missing', 'No service area available')}
                />
                <MenuItem
                    icon="badge"
                    title={t('provider.profile.provider_id', 'Provider ID')}
                    subtitle={provider?._id || t('provider.profile.not_created', 'Not created')}
                />
                {provider?.fleetId ? (
                    <MenuItem
                        icon="groups"
                        title={t('provider.profile.fleet_id', 'Fleet ID')}
                        subtitle={`${provider.fleetId}${provider.providerMode === 'fleet_member' ? ` - ${t('provider.profile.linked_member', 'Linked fleet member')}` : ''}`}
                    />
                ) : null}

                {availableLanguages.length > 0 ? (
                    <>
                        <Text style={styles.sectionHeader}>{t('profile.language', 'Language')}</Text>
                        <View style={styles.languageWrap}>
                            {availableLanguages.map((languageOption) => {
                                const isActive = language === languageOption.code;

                                return (
                                    <TouchableOpacity
                                        key={languageOption.code}
                                        style={[styles.languageChip, isActive && styles.languageChipActive]}
                                        onPress={() => changeLanguage(languageOption.code)}
                                    >
                                        <Text style={[styles.languageChipText, isActive && styles.languageChipTextActive]}>
                                            {languageOption.nativeLabel}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </>
                ) : null}

                <Text style={styles.sectionHeader}>{t('provider.profile.support', 'SUPPORT')}</Text>
                <MenuItem icon="help-outline" title={t('profile.help_support', 'Help & Support')} subtitle={t('provider.profile.support_subtitle', 'Contact LocalFix admin team')} />

                <TouchableOpacity style={styles.logoutButton} onPress={logout}>
                    <Text style={styles.logoutText}>{t('auth.logout', 'Logout')}</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        padding: theme.spacing.m,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    content: {
        padding: theme.spacing.l,
    },
    tabs: {
        flexDirection: 'row',
        padding: theme.spacing.m,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        marginHorizontal: 4,
    },
    activeTab: {
        backgroundColor: theme.colors.primary,
    },
    tabText: {
        color: theme.colors.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
    },
    loadingState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    balanceCard: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.l,
        marginBottom: theme.spacing.l,
    },
    balanceLabel: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    balanceValue: {
        color: '#fff',
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.l,
    },
    statCard: {
        flex: 1,
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 4,
    },
    statIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    statLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    statValue: {
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    emptyText: {
        color: theme.colors.textSecondary,
    },
    transactionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginBottom: 8,
    },
    txIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    txTitle: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '500',
    },
    txDate: {
        color: theme.colors.textMuted,
        fontSize: 12,
    },
    txAmount: {
        color: theme.colors.success,
        fontWeight: 'bold',
    },
    profileHeader: {
        alignItems: 'center',
        padding: theme.spacing.xl,
        backgroundColor: theme.colors.surface,
    },
    profileAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 2,
        borderColor: theme.colors.primary,
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    profilePhone: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 230, 118, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 12,
    },
    sectionHeader: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginBottom: 8,
        marginTop: 24,
        marginLeft: 4,
    },
    languageWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    languageChip: {
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: 18,
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: theme.colors.surface,
    },
    languageChipActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    languageChipText: {
        color: theme.colors.textSecondary,
        fontWeight: '700',
        fontSize: 12,
    },
    languageChipTextActive: {
        color: '#fff',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
    },
    menuIcon: {
        width: 32,
        alignItems: 'center',
    },
    menuTitle: {
        fontSize: 16,
        color: theme.colors.text,
    },
    menuSubtitle: {
        fontSize: 12,
        color: theme.colors.textMuted,
        marginTop: 2,
    },
    logoutButton: {
        marginTop: 32,
        padding: 16,
        alignItems: 'center',
    },
    logoutText: {
        color: theme.colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    versionText: {
        textAlign: 'center',
        color: theme.colors.textMuted,
        fontSize: 12,
        marginBottom: 32,
    },
});
