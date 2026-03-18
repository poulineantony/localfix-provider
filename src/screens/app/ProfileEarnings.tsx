import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { bookingService } from '../../services/bookingService';

// ═══════════════════════════════════════════════════════════════
// EARNINGS SCREEN — Swiggy Style
// ═══════════════════════════════════════════════════════════════
export const EarningsScreen = () => {
    const { t, language } = useTranslation();
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
            if (activeTab === 'Today') return diffDays === 0;
            if (activeTab === 'Week') return diffDays <= 7;
            return diffDays <= 31;
        });
    }, [activeTab, transactions]);

    const totalForPeriod = filteredTransactions.reduce((sum, item) => sum + (item.pricing?.totalAmount || item.pricing?.basePrice || 0), 0);

    return (
        <SafeAreaView style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>Earnings</Text>
            </View>

            {/* Tabs */}
            <View style={s.tabRow}>
                {(['Today', 'Week', 'Month'] as const).map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[s.tab, activeTab === tab && s.tabActive]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <View style={s.loadingCenter}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                    {/* Earnings card — orange gradient style */}
                    <View style={s.earningsCard}>
                        <Text style={s.earningsCardLabel}>Total Earnings</Text>
                        <Text style={s.earningsCardValue}>Rs {totalForPeriod}</Text>
                        <View style={s.earningsCardDivider} />
                        <View style={s.earningsCardRow}>
                            <View style={s.earningsCardStat}>
                                <Text style={s.earningsCardStatValue}>{filteredTransactions.length}</Text>
                                <Text style={s.earningsCardStatLabel}>Orders</Text>
                            </View>
                            <View style={s.earningsCardStatDivider} />
                            <View style={s.earningsCardStat}>
                                <Text style={s.earningsCardStatValue}>{providerStats?.rating?.average?.toFixed(1) || '0.0'}</Text>
                                <Text style={s.earningsCardStatLabel}>Rating</Text>
                            </View>
                            <View style={s.earningsCardStatDivider} />
                            <View style={s.earningsCardStat}>
                                <Text style={s.earningsCardStatValue}>{providerStats?.completedBookings || 0}</Text>
                                <Text style={s.earningsCardStatLabel}>Total Jobs</Text>
                            </View>
                        </View>
                    </View>

                    {/* Settlement info */}
                    <View style={s.settlementCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={s.settlementIcon}>
                                <Icon name="account-balance" size={20} color={theme.colors.accent} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={s.settlementTitle}>Settlement</Text>
                                <Text style={s.settlementSubtitle}>Managed by admin</Text>
                            </View>
                            <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />
                        </View>
                    </View>

                    {/* Transactions */}
                    <Text style={s.sectionTitle}>Recent Transactions</Text>

                    {filteredTransactions.length === 0 ? (
                        <View style={s.emptyCard}>
                            <Icon name="receipt-long" size={36} color={theme.colors.textMuted} />
                            <Text style={s.emptyText}>No transactions in this period</Text>
                        </View>
                    ) : (
                        filteredTransactions.map(item => (
                            <View key={item._id} style={s.txCard}>
                                <View style={s.txIconWrap}>
                                    <Icon name="call-received" size={18} color={theme.colors.success} />
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={s.txTitle}>{item.service?.name || 'Service Payment'}</Text>
                                    <Text style={s.txDate}>{new Date(item.updatedAt || item.scheduledDate).toLocaleDateString()}</Text>
                                </View>
                                <Text style={s.txAmount}>+ Rs {item.pricing?.totalAmount || item.pricing?.basePrice || 0}</Text>
                            </View>
                        ))
                    )}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════
// PROFILE / MORE SCREEN — Swiggy Style
// ═══════════════════════════════════════════════════════════════
export const ProfileScreen = ({ navigation }: any) => {
    const { t, language, availableLanguages } = useTranslation();
    const { user, provider, logout } = useAuth();
    const [toastMsg, setToastMsg] = React.useState('');
    const [toastVisible, setToastVisible] = React.useState(false);

    const showToast = (msg: string) => {
        setToastMsg(msg);
        setToastVisible(true);
        setTimeout(() => setToastVisible(false), 2200);
    };

    const providerUser: any = typeof provider?.user === 'object' ? provider.user : null;
    const avatarUrl: string | null = (
        providerUser?.profilePicture?.url
        || providerUser?.avatar
        || user?.avatar
        || null
    );

    const initials = (provider?.businessName || user?.name || 'P')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p: string) => p.charAt(0).toUpperCase())
        .join('');

    const isEmailVerified = (user as any)?.isEmailVerified ?? false;
    const hasTempEmail = !user?.email || user?.email?.endsWith('@temp.localfix.com');
    const showEmailBanner = !isEmailVerified && !hasTempEmail;

    const currentLangLabel = availableLanguages.find(l => l.code === language)?.nativeLabel || (language || 'EN').toUpperCase();

    const MenuItem = ({ icon, title, subtitle, onPress, iconColor, badge }: any) => (
        <TouchableOpacity style={s.menuItem} onPress={onPress} activeOpacity={0.6}>
            <View style={[s.menuIconWrap, { backgroundColor: (iconColor || theme.colors.accent) + '15' }]}>
                <Icon name={icon} size={20} color={iconColor || theme.colors.accent} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={s.menuTitle}>{title}</Text>
                {subtitle ? <Text style={s.menuSubtitle} numberOfLines={1}>{subtitle}</Text> : null}
            </View>
            {badge ? (
                <View style={s.badge}>
                    <Text style={s.badgeText}>{badge}</Text>
                </View>
            ) : null}
            <Icon name="chevron-right" size={22} color={theme.colors.textMuted} />
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={s.container}>
            {/* Modern copy toast */}
            {toastVisible && (
                <View style={{
                    position: 'absolute', bottom: 90, left: 24, right: 24, zIndex: 999,
                    backgroundColor: '#1a1a1a', borderRadius: 14, padding: 14,
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12, elevation: 12,
                }}>
                    <Icon name="check-circle" size={20} color={theme.colors.success} />
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>{toastMsg}</Text>
                </View>
            )}
            {/* Profile header */}
            <View style={s.profileHeader}>
                <View style={s.profileAvatarWrap}>
                    {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={s.profileAvatarImg} />
                    ) : (
                        <View style={s.profileAvatar}>
                            <Text style={s.profileInitials}>{initials}</Text>
                        </View>
                    )}
                    <View style={[s.profileOnlineDot, { backgroundColor: provider?.availability?.isAvailable ? theme.colors.success : theme.colors.textMuted }]} />
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={s.profileName}>{provider?.businessName || user?.name || 'Provider'}</Text>
                    <Text style={s.profilePhone}>+91 {user?.phone || 'Not available'}</Text>
                    <View style={s.verifiedBadge}>
                        <Icon name="verified" size={14} color={provider?.verification?.isVerified ? theme.colors.success : theme.colors.warning} />
                        <Text style={[s.verifiedText, { color: provider?.verification?.isVerified ? theme.colors.success : theme.colors.warning }]}>
                            {provider?.verification?.reviewStatus === 'approved' ? 'VERIFIED' :
                                provider?.verification?.reviewStatus === 'rejected' ? 'REJECTED' : 'PENDING REVIEW'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={s.editIconBtn}>
                    <Icon name="edit" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Email verification banner */}
            {showEmailBanner && (
                <TouchableOpacity style={s.emailBanner} onPress={() => navigation.navigate('EditProfile')}>
                    <Icon name="mail" size={18} color="#F57C00" />
                    <Text style={s.emailBannerText}>Email not verified — tap to verify</Text>
                    <Icon name="chevron-right" size={18} color="#F57C00" />
                </TouchableOpacity>
            )}

            <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

                <Text style={s.sectionHeader}>ACCOUNT</Text>
                <View style={s.menuGroup}>
                    <MenuItem
                        icon="person-outline"
                        title="Profile"
                        subtitle={user?.name || 'Edit your details'}
                        iconColor={theme.colors.primary}
                        onPress={() => navigation.navigate('EditProfile')}
                    />
                    <MenuItem
                        icon="folder-open"
                        title="Documents"
                        subtitle="View verification documents"
                        iconColor={theme.colors.accent}
                        onPress={() => navigation.navigate('Documents')}
                    />
                    <MenuItem
                        icon="account-balance"
                        title="Bank Details"
                        subtitle={provider?.bankDetails?.accountNumber ? 'Configured' : 'Not setup'}
                        iconColor={theme.colors.success}
                        onPress={() => navigation.navigate('BankDetails')}
                    />
                </View>

                <Text style={s.sectionHeader}>SERVICE</Text>
                <View style={s.menuGroup}>
                    <MenuItem
                        icon="map"
                        title="Service Areas"
                        subtitle={
                            provider?.serviceArea?.zone?.name
                                ? `${provider.serviceArea.zone.name} (${provider.serviceArea.radius || 10} ${provider.serviceArea.unit || 'km'})`
                                : provider?.serviceArea?.cities?.filter(Boolean).join(', ')
                                || provider?.serviceArea?.formattedAddress
                                || 'Not set'
                        }
                        iconColor={theme.colors.primary}
                        onPress={() => navigation.navigate('ServiceArea')}
                    />
                    <MenuItem
                        icon="build"
                        title="My Services"
                        subtitle={`${provider?.services?.length || 0} service(s) listed`}
                        iconColor={theme.colors.accent}
                        onPress={() => navigation.navigate('MyServices')}
                    />
                    <MenuItem
                        icon="badge"
                        title="Provider ID"
                        subtitle={provider?._id || 'Not created'}
                        iconColor={theme.colors.textMuted}
                        onPress={() => {
                            if (provider?._id) {
                                const rn = require('react-native');
                                if (rn.Clipboard?.setString) {
                                    rn.Clipboard.setString(provider._id);
                                } else if (rn.Share) {
                                    rn.Share.share({ message: provider._id }).catch(() => {});
                                }
                                showToast('Provider ID copied ✓');
                            }
                        }}
                    />
                    {provider?.fleetId ? (
                        <MenuItem
                            icon="groups"
                            title="Fleet ID"
                            subtitle={provider.fleetId}
                            iconColor="#E23744"
                            onPress={() => {
                                const rn = require('react-native');
                                if (rn.Clipboard?.setString) {
                                    rn.Clipboard.setString(provider.fleetId);
                                }
                                showToast('Fleet ID copied ✓');
                            }}
                        />
                    ) : null}
                </View>

                <Text style={s.sectionHeader}>LANGUAGE</Text>
                <View style={s.menuGroup}>
                    <MenuItem
                        icon="language"
                        title="App Language"
                        subtitle={currentLangLabel}
                        iconColor="#5C6BC0"
                        onPress={() => navigation.navigate('Language')}
                    />
                </View>

                <Text style={s.sectionHeader}>GROW</Text>
                <View style={s.menuGroup}>
                    <MenuItem
                        icon="people"
                        title="Refer & Earn"
                        subtitle="Earn up to Rs 8,000 per referral"
                        iconColor="#E23744"
                        onPress={() => navigation.navigate('Refer')}
                    />
                </View>

                <Text style={s.sectionHeader}>SUPPORT</Text>
                <View style={s.menuGroup}>
                    <MenuItem
                        icon="help-outline"
                        title="Help & Support"
                        subtitle="Chat with LocalFix team"
                        iconColor={theme.colors.info}
                        onPress={() => navigation.navigate('Chat', { recipientId: 'admin', jobTitle: 'LocalFix Support' })}
                    />
                    <MenuItem
                        icon="description"
                        title="Terms & Conditions"
                        iconColor={theme.colors.textMuted}
                        onPress={() => Alert.alert('Terms & Conditions', 'By using LocalFix Provider, you agree to our terms. Visit localfix.in/terms for the full document.')}
                    />
                    <MenuItem
                        icon="privacy-tip"
                        title="Privacy Policy"
                        iconColor={theme.colors.textMuted}
                        onPress={() => Alert.alert('Privacy Policy', 'We protect your data per applicable privacy laws. Visit localfix.in/privacy for details.')}
                    />
                </View>

                <TouchableOpacity style={s.logoutBtn} onPress={() => {
                    Alert.alert('Logout', 'Are you sure you want to logout?', [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Logout', onPress: logout, style: 'destructive' },
                    ]);
                }}>
                    <Icon name="logout" size={20} color={theme.colors.error} />
                    <Text style={s.logoutText}>Logout</Text>
                </TouchableOpacity>

                <Text style={s.versionText}>LocalFix Provider v1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },

    // Header (Earnings)
    header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border, alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

    // Tabs
    tabRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
    tab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 24, backgroundColor: '#F1F1F6', marginHorizontal: 4 },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: { color: theme.colors.textSecondary, fontWeight: '600', fontSize: 14 },
    tabTextActive: { color: '#fff' },

    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    // Earnings card
    earningsCard: { backgroundColor: theme.colors.primary, borderRadius: 16, padding: 20, marginBottom: 12 },
    earningsCardLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '600' },
    earningsCardValue: { color: '#fff', fontSize: 32, fontWeight: '800', marginTop: 4 },
    earningsCardDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 14 },
    earningsCardRow: { flexDirection: 'row', justifyContent: 'space-around' },
    earningsCardStat: { alignItems: 'center' },
    earningsCardStatValue: { color: '#fff', fontSize: 18, fontWeight: '700' },
    earningsCardStatLabel: { color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2 },
    earningsCardStatDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.2)' },

    // Settlement card
    settlementCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
    settlementIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentLight, justifyContent: 'center', alignItems: 'center' },
    settlementTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    settlementSubtitle: { fontSize: 12, color: theme.colors.textMuted },

    // Section title (Earnings)
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },

    // Transactions
    txCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 14, borderRadius: 10, marginBottom: 8, borderWidth: 1, borderColor: theme.colors.border },
    txIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.success + '15', justifyContent: 'center', alignItems: 'center' },
    txTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    txDate: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    txAmount: { color: theme.colors.success, fontWeight: '700', fontSize: 14 },
    emptyCard: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    emptyText: { color: theme.colors.textMuted, fontSize: 14, marginTop: 8 },

    // Profile header
    profileHeader: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    profileAvatarWrap: { position: 'relative' },
    profileAvatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: theme.colors.primary },
    profileAvatarImg: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, borderColor: theme.colors.primary },
    profileInitials: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
    profileOnlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#fff' },
    profileName: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
    profilePhone: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    verifiedText: { fontSize: 11, fontWeight: '700', marginLeft: 4, letterSpacing: 0.5 },
    editIconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.primary + '12', justifyContent: 'center', alignItems: 'center' },

    // Email verification banner
    emailBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF3E0', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#FFE0B2' },
    emailBannerText: { marginLeft: 8, color: '#E65100', fontSize: 13, fontWeight: '600', flex: 1 },

    // Menu
    sectionHeader: { color: theme.colors.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 20, marginLeft: 4 },
    menuGroup: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    menuIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    menuTitle: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    menuSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 1 },

    // Badge
    badge: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 2, marginRight: 6 },
    badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

    // Logout
    logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 28, paddingVertical: 14, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.error + '30' },
    logoutText: { color: theme.colors.error, fontSize: 15, fontWeight: '700', marginLeft: 8 },
    versionText: { textAlign: 'center', color: theme.colors.textMuted, fontSize: 12, marginTop: 16 },
});
