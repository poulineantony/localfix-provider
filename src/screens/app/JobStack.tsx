import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, Linking, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { bookingService, BookingItem } from '../../services/bookingService';
import { notificationsService } from '../../services/notificationsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 56) / 2;

const getCustomerName = (job: BookingItem, t: (key: string, defaultValue?: string) => string) =>
    job.customer?.name || t('provider.jobs.customer', 'Customer');
const getIssueText = (job: BookingItem, t: (key: string, defaultValue?: string) => string) =>
    job.notes?.customerNotes || job.service?.name || t('provider.jobs.service_request', 'Service request');
const getAddressText = (job: BookingItem, t: (key: string, defaultValue?: string) => string) =>
    [job.address?.street, job.address?.city, job.address?.state].filter(Boolean).join(', ')
    || t('provider.jobs.address_unavailable', 'Address unavailable');
const getEarnings = (job: BookingItem) => job.pricing?.totalAmount || job.pricing?.basePrice || 0;
const getReviewStatus = (provider: any) =>
    provider?.verification?.reviewStatus || (provider?.verification?.isVerified ? 'approved' : 'pending');
const getReviewerName = (provider: any) =>
    typeof provider?.verification?.reviewedBy === 'string'
        ? provider.verification.reviewedBy
        : provider?.verification?.reviewedBy?.name || provider?.verification?.reviewedBy?.email || null;
const humanizeDocumentType = (value?: string) =>
    (value || 'document')
        .split('-')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
const getProfileAvatar = (provider: any, user: any) =>
    (typeof provider?.user === 'string' ? null : provider?.user?.avatar) || user?.avatar || '';
const getInitials = (value?: string) =>
    (value || 'P')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join('');

const triggerProviderSos = (
    job: BookingItem,
    sourceLabel: string,
    t: (key: string, defaultValue?: string) => string
) => {
    Alert.alert(
        t('provider.jobs.sos.title', 'Send SOS'),
        t('provider.jobs.sos.confirm_message', 'This will immediately alert the customer for this booking.'),
        [
            { text: t('common.cancel', 'Cancel'), style: 'cancel' },
            {
                text: t('provider.jobs.sos.action', 'Send SOS'),
                style: 'destructive',
                onPress: async () => {
                    const response = await bookingService.triggerSos(
                        job._id,
                        `Provider triggered SOS from ${sourceLabel}.`
                    );

                    if (!response.success) {
                        Alert.alert(
                            t('provider.jobs.sos.failed_title', 'SOS failed'),
                            response.error || t('provider.jobs.sos.failed_message', 'Could not send the SOS alert.')
                        );
                        return;
                    }

                    Alert.alert(
                        t('provider.jobs.sos.sent_title', 'SOS sent'),
                        t('provider.jobs.sos.sent_message', 'The customer has been alerted.')
                    );
                },
            },
        ]
    );
};

// ─── Swiggy-style Online/Offline Toggle Pill ─────────────────────────
const OnlineTogglePill = ({ isOnline, onToggle }: { isOnline: boolean; onToggle: () => void }) => (
    <TouchableOpacity
        style={[s.togglePill, isOnline ? s.togglePillOnline : s.togglePillOffline]}
        onPress={onToggle}
        activeOpacity={0.8}
    >
        <View style={[s.toggleDot, isOnline ? s.toggleDotOnline : s.toggleDotOffline]} />
        <Text style={[s.toggleText, isOnline ? s.toggleTextOnline : s.toggleTextOffline]}>
            {isOnline ? 'Online' : 'Offline'}
        </Text>
    </TouchableOpacity>
);

// ─── Progress Stat Item ──────────────────────────────────────────────
const ProgressStat = ({ icon, value, label }: { icon: string; value: string; label: string }) => (
    <View style={s.progressStat}>
        <Icon name={icon} size={18} color={theme.colors.accent} />
        <Text style={s.progressValue}>{value}</Text>
        <Text style={s.progressLabel}>{label}</Text>
    </View>
);

// ─── Grid Feature Card ──────────────────────────────────────────────
const FeatureCard = ({ icon, title, subtitle, color, onPress }: any) => (
    <TouchableOpacity style={s.featureCard} onPress={onPress} activeOpacity={0.7}>
        <View style={[s.featureIconWrap, { backgroundColor: color + '18' }]}>
            <Icon name={icon} size={28} color={color} />
        </View>
        <Text style={s.featureTitle}>{title}</Text>
        {subtitle ? <Text style={s.featureSubtitle}>{subtitle}</Text> : null}
        <View style={s.featureArrow}>
            <Icon name="arrow-forward" size={16} color="#fff" />
        </View>
    </TouchableOpacity>
);

// ═══════════════════════════════════════════════════════════════
// HOME SCREEN — Clean Dashboard
// ═══════════════════════════════════════════════════════════════
export const HomeScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { provider, user, providerStats, toggleAvailability, refreshSession } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [activeJob, setActiveJob] = useState<BookingItem | null>(null);
    const [loading, setLoading] = useState(true);

    const loadJobs = async () => {
        setLoading(true);
        const latestProvider = await refreshSession();
        const nextProvider = latestProvider || provider;

        if (!nextProvider || getReviewStatus(nextProvider) !== 'approved' || !nextProvider.verification?.isVerified) {
            setLoading(false);
            return;
        }

        const result = await bookingService.list('pending,confirmed,in-progress');
        if (result.success && result.data) {
            const jobs: BookingItem[] = result.data;
            setPendingCount(jobs.filter(j => j.status === 'pending').length);
            setActiveJob(jobs.find(j => j.status === 'in-progress' || j.status === 'confirmed') || null);
        }
        setLoading(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadJobs();
        }, [])
    );

    const isOnline = provider?.availability?.isAvailable ?? false;
    const reviewStatus = getReviewStatus(provider);
    const isApproved = reviewStatus === 'approved' && provider?.verification?.isVerified;
    const reviewerName = getReviewerName(provider);
    const reviewedAtLabel = provider?.verification?.reviewedAt
        ? new Date(provider.verification.reviewedAt).toLocaleString('en-IN')
        : null;
    const reviewDocuments = provider?.verification?.documents || [];
    const profileName = provider?.businessName || user?.name || 'LocalFix Provider';

    const handleToggleAvailability = async () => {
        const result = await toggleAvailability();
        if (!result.success) {
            Alert.alert('Status Update Failed', result.error || 'Could not update availability.');
        }
    };

    // ─── Not approved / review states ──────────────────────────
    if (!provider) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.emptyCenter}>
                    <Icon name="badge" size={64} color={theme.colors.textMuted} />
                    <Text style={s.emptyTitle}>Complete your profile</Text>
                    <Text style={s.emptySubtitle}>Finish provider registration to start admin review and receive jobs.</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!isApproved) {
        return (
            <SafeAreaView style={s.container}>
                <View style={s.topBar}>
                    <Text style={s.topBarTitle}>LocalFix Provider</Text>
                </View>
                <ScrollView contentContainerStyle={{ padding: 16 }}>
                    <View style={s.reviewCard}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                            <Icon
                                name={reviewStatus === 'rejected' ? 'report-problem' : 'pending-actions'}
                                size={28}
                                color={reviewStatus === 'rejected' ? theme.colors.warning : theme.colors.accent}
                                style={{ marginRight: 16 }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={s.reviewTitle}>
                                    {reviewStatus === 'rejected' ? 'Provider review rejected' : 'Provider review in progress'}
                                </Text>
                                <Text style={s.reviewSubtitle}>
                                    {reviewStatus === 'rejected'
                                        ? 'Update the requested documents and wait for admin approval.'
                                        : 'Jobs and availability will unlock after admin approval.'}
                                </Text>
                            </View>
                        </View>

                        {!!provider?.verification?.reviewNotes && (
                            <View style={s.reviewNoteBlock}>
                                <Text style={s.reviewMetaLabel}>Review notes</Text>
                                <Text style={s.reviewMetaValue}>{provider.verification.reviewNotes}</Text>
                            </View>
                        )}

                        <View style={s.reviewMetaGrid}>
                            <View style={s.reviewMetaItem}>
                                <Text style={s.reviewMetaLabel}>Account mode</Text>
                                <Text style={s.reviewMetaValue}>{provider.providerMode || 'individual'}</Text>
                            </View>
                            <View style={s.reviewMetaItem}>
                                <Text style={s.reviewMetaLabel}>Support phone</Text>
                                <Text style={s.reviewMetaValue}>{provider.supportPhone || user?.phone || 'Not available'}</Text>
                            </View>
                            <View style={s.reviewMetaItem}>
                                <Text style={s.reviewMetaLabel}>Reviewed by</Text>
                                <Text style={s.reviewMetaValue}>{reviewerName || 'Awaiting admin'}</Text>
                            </View>
                            <View style={s.reviewMetaItem}>
                                <Text style={s.reviewMetaLabel}>Reviewed at</Text>
                                <Text style={s.reviewMetaValue}>{reviewedAtLabel || 'Awaiting review'}</Text>
                            </View>
                        </View>

                        {reviewDocuments.length > 0 && (
                            <View style={{ marginTop: 16 }}>
                                <Text style={s.reviewSectionTitle}>Submitted documents</Text>
                                {reviewDocuments.map((doc: any, i: number) => (
                                    <View key={`${doc.type}-${i}`} style={s.reviewDocRow}>
                                        <View style={{ flex: 1, marginRight: 12 }}>
                                            <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '600' }}>{humanizeDocumentType(doc.type)}</Text>
                                            <Text style={{ color: theme.colors.textSecondary, fontSize: 12 }}>{doc.reviewNote || 'Under review'}</Text>
                                        </View>
                                        <View style={[
                                            s.docStatusBadge,
                                            doc.status === 'approved' ? { backgroundColor: theme.colors.success + '20' } :
                                            doc.status === 'rejected' ? { backgroundColor: theme.colors.error + '20' } :
                                            { backgroundColor: theme.colors.accent + '20' }
                                        ]}>
                                            <Text style={[
                                                s.docStatusText,
                                                doc.status === 'approved' ? { color: theme.colors.success } :
                                                doc.status === 'rejected' ? { color: theme.colors.error } :
                                                { color: theme.colors.accent }
                                            ]}>{doc.status || 'pending'}</Text>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <Button title="Refresh review status" onPress={loadJobs} style={{ marginTop: 24 }} />
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

    // ─── Main Home Dashboard ─────────────────────────────────────
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

    return (
        <SafeAreaView style={s.container}>
            {/* Top Bar */}
            <View style={s.topBar}>
                <View>
                    <Text style={s.topBarGreeting}>{greeting} 👋</Text>
                    <Text style={s.topBarName}>{profileName}</Text>
                </View>
                <TouchableOpacity style={s.topBarIcon}>
                    <Icon name="headset-mic" size={22} color={theme.colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>

                {/* Online / Offline Hero Card */}
                <View style={[s.onlineHeroCard, isOnline ? s.onlineHeroOnline : s.onlineHeroOffline]}>
                    <View style={{ flex: 1 }}>
                        <Text style={s.onlineHeroLabel}>{isOnline ? '🟢 You are Online' : '⚫ You are Offline'}</Text>
                        <Text style={s.onlineHeroSub}>
                            {isOnline ? 'You can receive new bookings' : 'Go online to start receiving jobs'}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[s.onlineToggleBtn, isOnline ? s.onlineToggleBtnOff : s.onlineToggleBtnOn]}
                        onPress={handleToggleAvailability}
                    >
                        <Icon name={isOnline ? 'pause' : 'play-arrow'} size={18} color="#fff" />
                        <Text style={s.onlineToggleBtnText}>{isOnline ? 'Go Offline' : 'Go Online'}</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Row */}
                <View style={s.statsRow}>
                    <View style={s.statCard}>
                        <View style={[s.statIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                            <Icon name="currency-rupee" size={18} color={theme.colors.primary} />
                        </View>
                        <Text style={s.statValue}>Rs {providerStats?.totalEarnings || 0}</Text>
                        <Text style={s.statLabel}>Earnings</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCard}>
                        <View style={[s.statIconWrap, { backgroundColor: theme.colors.accent + '15' }]}>
                            <Icon name="shopping-bag" size={18} color={theme.colors.accent} />
                        </View>
                        <Text style={s.statValue}>{providerStats?.completedBookings || 0}</Text>
                        <Text style={s.statLabel}>Orders</Text>
                    </View>
                    <View style={s.statDivider} />
                    <View style={s.statCard}>
                        <View style={[s.statIconWrap, { backgroundColor: '#FFC107' + '20' }]}>
                            <Icon name="star" size={18} color="#FFC107" />
                        </View>
                        <Text style={s.statValue}>{providerStats?.rating?.average?.toFixed(1) || '—'}</Text>
                        <Text style={s.statLabel}>Rating</Text>
                    </View>
                </View>

                {/* Active job alert */}
                {!loading && activeJob && (
                    <TouchableOpacity
                        style={s.activeJobBanner}
                        onPress={() => navigation.navigate(activeJob.status === 'in-progress' ? 'JobInProgress' : 'JobDetails', { job: activeJob })}
                        activeOpacity={0.8}
                    >
                        <View style={s.activeJobDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={s.activeJobTitle}>
                                {activeJob.status === 'in-progress' ? '🔧 Job in progress' : '✅ Accepted job — tap to start'}
                            </Text>
                            <Text style={s.activeJobSub}>
                                {activeJob.service?.name || 'Service'} · {activeJob.customer?.name || 'Customer'}
                            </Text>
                        </View>
                        <Icon name="chevron-right" size={22} color={theme.colors.accent} />
                    </TouchableOpacity>
                )}

                {/* Pending requests badge */}
                {!loading && pendingCount > 0 && (
                    <TouchableOpacity
                        style={s.pendingBanner}
                        onPress={() => navigation.getParent()?.navigate('Bookings')}
                        activeOpacity={0.8}
                    >
                        <View style={s.pendingBadge}>
                            <Text style={s.pendingBadgeText}>{pendingCount}</Text>
                        </View>
                        <Text style={s.pendingBannerText}>
                            {pendingCount === 1 ? '1 new booking request' : `${pendingCount} new booking requests`} waiting
                        </Text>
                        <Text style={s.pendingBannerAction}>View →</Text>
                    </TouchableOpacity>
                )}

                {/* Quick Actions Grid */}
                <Text style={s.gridLabel}>QUICK ACTIONS</Text>
                <View style={s.featureGrid}>
                    <FeatureCard
                        icon="event-note"
                        title="Bookings"
                        subtitle="View all jobs"
                        color={theme.colors.primary}
                        onPress={() => navigation.getParent()?.navigate('Bookings')}
                    />
                    <FeatureCard
                        icon="account-balance-wallet"
                        title="Earnings"
                        subtitle="Track income"
                        color={theme.colors.accent}
                        onPress={() => navigation.getParent()?.navigate('Earnings')}
                    />
                    <FeatureCard
                        icon="calendar-today"
                        title="My Shifts"
                        subtitle="Manage schedule"
                        color={theme.colors.success}
                        onPress={() => navigation.getParent()?.navigate('MyShifts')}
                    />
                    <FeatureCard
                        icon="people"
                        title="Refer & Earn"
                        subtitle="Upto Rs 8000"
                        color="#E23744"
                        onPress={() => navigation.getParent()?.navigate('More')}
                    />
                </View>

                {/* Service Area */}
                <View style={s.serviceAreaCard}>
                    <View style={[s.statIconWrap, { backgroundColor: theme.colors.primary + '15' }]}>
                        <Icon name="place" size={18} color={theme.colors.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={s.serviceAreaTitle}>Your Service Area</Text>
                        <Text style={s.serviceAreaSub}>
                            {provider?.serviceArea?.zone?.name
                                ? `${provider.serviceArea.zone.name} (${provider.serviceArea.radius || 10} ${provider.serviceArea.unit || 'km'})`
                                : provider?.serviceArea?.cities?.filter(Boolean).join(', ')
                                || provider?.serviceArea?.formattedAddress
                                || 'Not configured — set in More'}
                        </Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
};



// ═══════════════════════════════════════════════════════════════
// JOB DETAILS SCREEN
// ═══════════════════════════════════════════════════════════════
export const JobDetailsScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { job } = route.params;
    const { provider } = useAuth();
    
    const handleNavigate = () => {
        const addr = getAddressText(job, t);
        const coords = job.address?.coordinates;
        if (!coords?.latitude || !coords?.longitude) {
            const url = Platform.select({
                ios: `maps:0,0?q=${encodeURIComponent(addr)}`,
                android: `geo:0,0?q=${encodeURIComponent(addr)}`,
            });
            if (url) Linking.openURL(url);
            return;
        }
        const url = Platform.select({
            ios: `maps:${coords.latitude},${coords.longitude}?q=${coords.latitude},${coords.longitude}`,
            android: `geo:${coords.latitude},${coords.longitude}?q=${coords.latitude},${coords.longitude}`,
        });
        if (url) Linking.openURL(url);
    };

    const isOutOfZone = job.address?.isFallbackZone || false;

    return (
        <SafeAreaView style={[s.container, { backgroundColor: '#F0F2F5' }]}>
            <View style={s.detailHeader}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.detailHeaderTitle}>Booking Details</Text>
                <TouchableOpacity onPress={() => triggerProviderSos(job, 'details', t)} style={s.sosHeaderBtn}>
                    <Icon name="sos" size={18} color={theme.colors.error} />
                </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Map View Section */}
                <View style={s.premiumMapContainer}>
                    {job.address?.coordinates ? (
                        <MapView
                            provider={PROVIDER_GOOGLE}
                            style={s.premiumMap}
                            initialRegion={{
                                latitude: job.address.coordinates.latitude,
                                longitude: job.address.coordinates.longitude,
                                latitudeDelta: 0.005,
                                longitudeDelta: 0.005,
                            }}
                        >
                            <Marker
                                coordinate={{
                                    latitude: job.address.coordinates.latitude,
                                    longitude: job.address.coordinates.longitude,
                                }}
                            >
                                <View style={s.customMarker}>
                                    <Icon name="person-pin-circle" size={40} color={theme.colors.primary} />
                                </View>
                            </Marker>
                        </MapView>
                    ) : (
                        <View style={s.mapErrorPlaceholder}>
                            <Icon name="map-off" size={48} color={theme.colors.textMuted} />
                            <Text style={s.mapErrorText}>Location coordinates not available</Text>
                        </View>
                    )}
                    
                    {/* Floating Navigation Overlay */}
                    <TouchableOpacity style={s.mapNavBtn} onPress={handleNavigate}>
                        <Icon name="navigation" size={20} color="#fff" />
                        <Text style={s.mapNavText}>NAVIGATE</Text>
                    </TouchableOpacity>
                </View>

                <View style={{ padding: 16, marginTop: -20 }}>
                    {/* Customer Info Card */}
                    <View style={s.customerPremiumCard}>
                        <View style={s.customerHeader}>
                            <View style={s.customerAvatarLarge}>
                                <Text style={s.avatarText}>{getInitials(getCustomerName(job, t))}</Text>
                            </View>
                            <View style={s.customerDetailMain}>
                                <Text style={s.customerNameText}>{getCustomerName(job, t)}</Text>
                                <View style={s.customerRatingRow}>
                                    <Icon name="star" size={14} color="#FFC107" />
                                    <Text style={s.customerRatingText}>4.8 • Preferred Customer</Text>
                                </View>
                            </View>
                            <TouchableOpacity 
                                style={s.premiumCallBtn} 
                                onPress={() => job.customer?.phone && Linking.openURL(`tel:${job.customer.phone}`)}
                            >
                                <Icon name="phone" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <View style={s.locationStrip}>
                            <View style={s.locationIconBg}>
                                <Icon name="place" size={18} color={theme.colors.primary} />
                            </View>
                            <Text style={s.locationContentText}>{getAddressText(job, t)}</Text>
                        </View>

                        {isOutOfZone && (
                            <View style={s.outOfZoneWarning}>
                                <Icon name="warning" size={14} color="#F57C00" />
                                <Text style={s.outOfZoneText}>OUT OF PRIMARY ZONE • EXTRA CHARGES APPLY</Text>
                            </View>
                        )}
                    </View>

                    {/* Job Highlights Grid */}
                    <View style={s.highlightsGrid}>
                        <View style={s.highlightItem}>
                            <Text style={s.highlightLabel}>EARNINGS</Text>
                            <Text style={s.highlightValuePremium}>Rs {getEarnings(job)}</Text>
                        </View>
                        <View style={[s.highlightItem, { borderLeftWidth: 1, borderLeftColor: '#E0E0E0' }]}>
                            <Text style={s.highlightLabel}>STATUS</Text>
                            <View style={[s.statusPill, { backgroundColor: theme.colors.primary + '15' }]}>
                                <Text style={[s.statusPillText, { color: theme.colors.primary }]}>
                                    {(job.status || 'Confirmed').toUpperCase()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Description Section */}
                    <View style={s.descCard}>
                        <Text style={s.descTitle}>JOB DESCRIPTION</Text>
                        <View style={s.descContentBox}>
                            <Icon name="format-quote" size={24} color={theme.colors.primary + '40'} style={s.quoteIcon} />
                            <Text style={s.descTextContent}>{getIssueText(job, t)}</Text>
                        </View>
                    </View>

                    {/* Schedule Card */}
                    <View style={s.schedulePremiumCard}>
                        <Icon name="event-available" size={24} color={theme.colors.textSecondary} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.scheduleDateText}>
                                {job.scheduledDate ? new Date(job.scheduledDate).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : 'As soon as possible'}
                            </Text>
                            <Text style={s.scheduleTimeText}>
                                {job.scheduledTime?.startTime || 'Morning Slot'} onwards
                            </Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            <View style={s.floatingFooter}>
                <TouchableOpacity
                    style={[s.mainActionBtn, { backgroundColor: theme.colors.primary }]}
                    onPress={() => navigation.navigate('JobInProgress', { job })}
                >
                    <Text style={s.mainActionBtnText}>START THIS VISIT</Text>
                    <Icon name="arrow-forward" size={20} color="#fff" style={{ marginLeft: 8 }} />
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════
// JOB IN PROGRESS SCREEN
// ═══════════════════════════════════════════════════════════════
import { providerTrackingService } from '../../services/providerTrackingService';

export const JobInProgressScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { job } = route.params;
    const [notes, setNotes] = useState(job.notes?.providerNotes || '');
    const [submitting, setSubmitting] = useState(false);
    const [elapsedMinutes, setElapsedMinutes] = useState(0);

    useEffect(() => {
        const startJob = async () => {
            await bookingService.updateStatus(job._id, 'in-progress');
            providerTrackingService.startTracking(job._id);
        };
        startJob();

        const interval = setInterval(() => setElapsedMinutes(m => m + 1), 60000);
        return () => {
            clearInterval(interval);
            providerTrackingService.stopTracking();
        };
    }, []);

    const handleComplete = async () => {
        setSubmitting(true);
        const result = await bookingService.updateStatus(job._id, 'completed');
        providerTrackingService.stopTracking();
        setSubmitting(false);

        if (!result.success) {
            Alert.alert('Complete Failed', result.error || 'Could not complete this job.');
            return;
        }
        navigation.navigate('Payment', { job: result.data || job, notes });
    };

    const handleNavigate = () => {
        const address = job.address;
        if (address?.coordinates?.latitude && address?.coordinates?.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${address.coordinates.latitude},${address.coordinates.longitude}`;
            Linking.openURL(url).catch(err => console.error('An error occurred opening maps', err));
        } else if (address?.street || address?.city) {
            const query = encodeURIComponent([address.street, address.city, address.state].filter(Boolean).join(', '));
            const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
            Linking.openURL(url).catch(err => console.error('An error occurred opening maps', err));
        } else {
            Alert.alert('Address Not Found', 'No valid address found for this job.');
        }
    };

    return (
        <SafeAreaView style={s.container}>
            {/* Violet header for in-progress */}
            <View style={s.inProgressHeader}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={s.inProgressHeaderTitle}>Job In Progress</Text>
                    <TouchableOpacity 
                        style={s.inProgressChatBtn} 
                        onPress={() => navigation.navigate('Chat', { 
                            bookingId: job._id, 
                            recipientId: job.customer?._id,
                            jobTitle: job.service?.name 
                        })}
                    >
                        <Icon name="chat" size={24} color="#fff" />
                    </TouchableOpacity>
                </View>
                <View style={s.inProgressTimerRow}>
                    <View style={s.inProgressTimerBadge}>
                        <Icon name="timer" size={16} color="#fff" />
                        <Text style={s.inProgressTimerText}>{elapsedMinutes}m elapsed</Text>
                    </View>
                    <View style={s.inProgressActiveBadge}>
                        <View style={s.activeDot} />
                        <Text style={s.inProgressActiveText}>ACTIVE</Text>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                {/* Customer info */}
                <View style={s.detailCard}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[s.detailAvatar, { backgroundColor: theme.colors.accentLight }]}>
                            <Icon name="person" size={24} color={theme.colors.accent} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={s.detailCustomerName}>{getCustomerName(job, t)}</Text>
                            <Text style={s.detailAddress}>{getIssueText(job, t)}</Text>
                        </View>
                    </View>
                    <TouchableOpacity 
                        style={[s.mainActionBtn, { marginTop: 16, backgroundColor: theme.colors.primaryLight }]}
                        onPress={handleNavigate}
                    >
                        <Icon name="directions" size={20} color={theme.colors.primary} />
                        <Text style={[s.mainActionBtnText, { color: theme.colors.primary, marginLeft: 8 }]}>Navigate (Google Maps)</Text>
                    </TouchableOpacity>
                </View>

                {/* Notes */}
                <View style={s.detailCard}>
                    <Text style={s.detailLabel}>PROVIDER NOTES</Text>
                    <Input
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add notes for this service..."
                        multiline
                        style={{ marginBottom: 0 }}
                    />
                </View>
            </ScrollView>

            <View style={s.detailFooter}>
                <TouchableOpacity
                    style={s.sosFloatBtn}
                    onPress={() => triggerProviderSos(job, 'job in progress', t)}
                >
                    <Icon name="sos" size={16} color="#fff" />
                    <Text style={s.sosFloatBtnText}>SOS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[s.startJobBtn, { flex: 1, marginLeft: 12, backgroundColor: theme.colors.success }]}
                    onPress={handleComplete}
                    disabled={submitting}
                >
                    <Icon name="check-circle" size={20} color="#fff" />
                    <Text style={s.startJobBtnText}>{submitting ? 'Updating...' : 'Complete Job'}</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════
// PAYMENT SCREEN
// ═══════════════════════════════════════════════════════════════
export const PaymentScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { job } = route.params;
    const [submitting, setSubmitting] = useState(false);

    const handleReceivePayment = async () => {
        setSubmitting(true);
        const result = await bookingService.updatePayment(job._id, 'paid', 'cash');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert('Payment Update Failed', result.error || 'Could not mark payment as received.');
            return;
        }
        navigation.navigate('Home');
    };

    const earnings = getEarnings(job);

    return (
        <SafeAreaView style={s.container}>
            <ScrollView contentContainerStyle={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
                {/* Success checkmark */}
                <View style={s.paymentSuccessCircle}>
                    <Icon name="check" size={48} color="#fff" />
                </View>
                <Text style={s.paymentSuccessTitle}>Job Completed!</Text>
                <Text style={s.paymentSuccessSubtitle}>Confirm the cash collection</Text>

                {/* Bill card */}
                <View style={s.billCard}>
                    <View style={s.billRow}>
                        <Text style={s.billLabel}>Base Fare</Text>
                        <Text style={s.billValue}>Rs {earnings}</Text>
                    </View>
                    <View style={s.billRow}>
                        <Text style={s.billLabel}>Platform Fee</Text>
                        <Text style={[s.billValue, { color: theme.colors.error }]}>- Rs {(earnings * 0.1).toFixed(0)}</Text>
                    </View>
                    <View style={s.billDivider} />
                    <View style={s.billRow}>
                        <Text style={s.billTotalLabel}>Your Earnings</Text>
                        <Text style={s.billTotalValue}>Rs {(earnings * 0.9).toFixed(0)}</Text>
                    </View>
                </View>

                <View style={s.paymentStatusRow}>
                    <Icon name="info-outline" size={16} color={theme.colors.warning} />
                    <Text style={s.paymentStatusText}>Status: {job.payment?.status || 'pending'}</Text>
                </View>
            </ScrollView>

            <View style={s.detailFooter}>
                <TouchableOpacity
                    style={[s.startJobBtn, { flex: 1, backgroundColor: theme.colors.success }]}
                    onPress={handleReceivePayment}
                    disabled={submitting}
                >
                    <Icon name="payments" size={20} color="#fff" />
                    <Text style={s.startJobBtnText}>{submitting ? 'Updating...' : 'Receive Payment'}</Text>
                </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ alignItems: 'center', paddingBottom: 16 }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: 14 }}>Back to Home</Text>
            </TouchableOpacity>
        </SafeAreaView>
    );
};

// ═══════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },

    // Top bar
    topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
    topBarTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    topBarGreeting: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
    topBarName: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 1 },
    topBarIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F1F6', justifyContent: 'center', alignItems: 'center' },
    sosTopBtn: { backgroundColor: theme.colors.error, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
    sosTopBtnText: { color: '#fff', fontWeight: '800', fontSize: 13 },

    // Online/Offline Hero Card
    onlineHeroCard: { margin: 16, borderRadius: 16, padding: 20, flexDirection: 'row', alignItems: 'center' },
    onlineHeroOnline: { backgroundColor: '#E8F5E9' },
    onlineHeroOffline: { backgroundColor: '#F1F1F6' },
    onlineHeroLabel: { fontSize: 17, fontWeight: '800', color: theme.colors.text },
    onlineHeroSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 4 },
    onlineToggleBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 24, gap: 6 },
    onlineToggleBtnOn: { backgroundColor: theme.colors.success },
    onlineToggleBtnOff: { backgroundColor: theme.colors.textMuted },
    onlineToggleBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },

    // Stats Row
    statsRow: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: '#fff', borderRadius: 16, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    statCard: { flex: 1, alignItems: 'center', gap: 4 },
    statIconWrap: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    statValue: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    statLabel: { fontSize: 11, color: theme.colors.textMuted, fontWeight: '500' },
    statDivider: { width: 1, height: 40, backgroundColor: theme.colors.border },

    // Active job banner
    activeJobBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E7', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#FFC10740' },
    activeJobDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accent, marginRight: 12 },
    activeJobTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    activeJobSub: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },

    // Pending requests banner
    pendingBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.primaryLight, marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 14 },
    pendingBadge: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    pendingBadgeText: { color: '#fff', fontSize: 13, fontWeight: '800' },
    pendingBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.primary },
    pendingBannerAction: { fontSize: 14, fontWeight: '700', color: theme.colors.primary },

    // Grid label
    gridLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1, marginHorizontal: 16, marginTop: 20, marginBottom: 8 },

    // Service area card
    serviceAreaCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    serviceAreaTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    serviceAreaSub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },

    // Toggle pill
    togglePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 24 },
    togglePillOnline: { backgroundColor: '#E8F5E9' },
    togglePillOffline: { backgroundColor: '#F1F1F6' },
    toggleDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
    toggleDotOnline: { backgroundColor: theme.colors.success },
    toggleDotOffline: { backgroundColor: theme.colors.textMuted },
    toggleText: { fontSize: 14, fontWeight: '700' },
    toggleTextOnline: { color: theme.colors.success },
    toggleTextOffline: { color: theme.colors.textSecondary },

    // Promo banner
    promoBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1B1B1B', paddingHorizontal: 16, paddingVertical: 14 },
    promoBannerTitle: { color: '#fff', fontWeight: '700', fontSize: 14 },
    promoBannerSubtitle: { color: '#aaa', fontSize: 12, marginTop: 2 },

    // Messages button
    messagesBtn: { backgroundColor: '#FFF3E0', marginHorizontal: 16, marginTop: 12, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
    messagesBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14 },

    // Progress card
    progressCard: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    progressCardTitle: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12, textAlign: 'center' },
    progressRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
    progressStat: { alignItems: 'center', flex: 1 },
    progressValue: { fontSize: 16, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
    progressLabel: { fontSize: 11, color: theme.colors.textMuted, marginTop: 2 },
    progressDivider: { width: 1, height: 36, backgroundColor: theme.colors.border },

    // Feature grid
    featureGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16 },
    featureCard: { width: GRID_CARD_WIDTH, backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    featureIconWrap: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    featureTitle: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
    featureSubtitle: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    featureArrow: { position: 'absolute', bottom: 12, right: 12, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },

    // Section title
    sectionTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },

    // Job cards — Swiggy style full-width
    jobCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    jobTopRow: { flexDirection: 'row', alignItems: 'center' },
    jobServiceIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
    jobServiceName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    jobCustomerName: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 1 },
    jobEarningsLarge: { fontSize: 18, fontWeight: '800', color: theme.colors.primary },
    jobDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 12 },
    jobInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
    jobInfoText: { flex: 1, fontSize: 13, color: theme.colors.textSecondary, marginLeft: 8 },
    jobBtnRow: { flexDirection: 'row', marginTop: 14, gap: 10 },
    declineBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.error },
    declineBtnText: { color: theme.colors.error, fontWeight: '700', fontSize: 14, marginLeft: 6 },
    acceptBtnFull: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, backgroundColor: theme.colors.success },
    acceptBtnFullText: { color: '#fff', fontWeight: '700', fontSize: 14, marginLeft: 6 },

    // Accepted job cards
    acceptedCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.accent + '30' },
    acceptedStatusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    acceptedStatusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
    acceptedStatusText: { fontSize: 12, fontWeight: '700' },

    // Empty states
    emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: theme.colors.textSecondary, textAlign: 'center', marginTop: 8 },
    emptyJobsCard: { backgroundColor: '#fff', borderRadius: 12, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    emptyJobsText: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginTop: 12 },

    // Offline card
    offlineCard: { backgroundColor: '#fff', margin: 16, borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border },
    offlineCardTitle: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginTop: 16 },
    offlineCardSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, textAlign: 'center' },
    goOnlineBtn: { backgroundColor: theme.colors.success, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12, marginTop: 20 },
    goOnlineBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    // Review states
    reviewCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.colors.border },
    reviewTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 4 },
    reviewSubtitle: { fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
    reviewNoteBlock: { marginTop: 16, padding: 12, borderRadius: 10, backgroundColor: '#FFF3E0' },
    reviewMetaLabel: { color: theme.colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: 4 },
    reviewMetaValue: { color: theme.colors.text, fontSize: 14, fontWeight: '600' },
    reviewMetaGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 16, marginHorizontal: -6 },
    reviewMetaItem: { width: '50%', paddingHorizontal: 6, marginBottom: 12 },
    reviewSectionTitle: { color: theme.colors.text, fontSize: 14, fontWeight: '700', marginBottom: 8 },
    reviewDocRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.colors.border },
    docStatusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    docStatusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

    // Detail screens
    detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    detailHeaderTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    sosHeaderBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },

    // Premium Job Details Styles
    premiumMapContainer: { height: 260, position: 'relative' },
    premiumMap: { ...StyleSheet.absoluteFillObject },
    customMarker: { alignItems: 'center', justifyContent: 'center' },
    mapErrorPlaceholder: { height: 260, backgroundColor: '#EAECF0', justifyContent: 'center', alignItems: 'center' },
    mapErrorText: { marginTop: 12, color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600' },
    mapNavBtn: {
        position: 'absolute', bottom: 40, right: 16,
        backgroundColor: theme.colors.primary,
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 16, paddingVertical: 10,
        borderRadius: 24, elevation: 6, shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4.5
    },
    mapNavText: { color: '#fff', fontSize: 12, fontWeight: '800', marginLeft: 8 },

    customerPremiumCard: {
        backgroundColor: '#fff', borderRadius: 20, padding: 20,
        elevation: 10, shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20
    },
    customerHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    customerAvatarLarge: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: theme.colors.primaryLight,
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: '#fff'
    },
    avatarText: { fontSize: 24, fontWeight: '800', color: theme.colors.primary },
    customerDetailMain: { flex: 1, marginLeft: 16 },
    customerNameText: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    customerRatingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    customerRatingText: { fontSize: 13, color: theme.colors.textSecondary, marginLeft: 4, fontWeight: '600' },
    premiumCallBtn: {
        width: 54, height: 54, borderRadius: 27,
        backgroundColor: theme.colors.success,
        justifyContent: 'center', alignItems: 'center',
        elevation: 5, shadowColor: theme.colors.success,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8
    },

    locationStrip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FB', padding: 12, borderRadius: 12 },
    locationIconBg: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center' },
    locationContentText: { flex: 1, marginLeft: 12, fontSize: 14, color: theme.colors.textSecondary, lineHeight: 20 },
    
    outOfZoneWarning: { 
        flexDirection: 'row', alignItems: 'center', 
        backgroundColor: '#FFF3E0', paddingHorizontal: 12, 
        paddingVertical: 8, borderRadius: 8, marginTop: 12 
    },
    outOfZoneText: { color: '#E65100', fontSize: 11, fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 },

    highlightsGrid: { 
        flexDirection: 'row', backgroundColor: '#fff', 
        borderRadius: 16, marginTop: 16, overflow: 'hidden',
        borderWidth: 1, borderColor: '#EAECF0' 
    },
    highlightItem: { flex: 1, padding: 16, alignItems: 'center' },
    highlightLabel: { fontSize: 11, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 4, letterSpacing: 1 },
    highlightValuePremium: { fontSize: 20, fontWeight: '900', color: theme.colors.primary },
    statusPill: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginTop: 4 },
    statusPillText: { fontSize: 12, fontWeight: '800' },

    descCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#EAECF0' },
    descTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.textMuted, letterSpacing: 1, marginBottom: 12 },
    descContentBox: { position: 'relative', paddingLeft: 12 },
    quoteIcon: { position: 'absolute', top: -10, left: -10 },
    descTextContent: { fontSize: 15, color: theme.colors.text, lineHeight: 24 },

    schedulePremiumCard: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#1A237E' + '10', borderRadius: 16,
        padding: 20, marginTop: 16, borderWidth: 1, borderColor: '#1A237E' + '20'
    },
    scheduleDateText: { fontSize: 16, fontWeight: '800', color: theme.colors.text },
    scheduleTimeText: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 2 },

    floatingFooter: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        padding: 16, paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#EAECF0'
    },
    mainActionBtn: {
        height: 60, borderRadius: 18,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        elevation: 8, shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10
    },
    mainActionBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 1 },

    mapPlaceholder: { height: 180, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    mapContainer: {
        height: 200,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    map: {
        ...StyleSheet.absoluteFillObject,
    },
    detailCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border },
    detailAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
    detailCustomerName: { fontSize: 16, fontWeight: '700', color: theme.colors.text },
    detailAddress: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 2 },
    callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
    detailDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 14 },
    detailLabel: { fontSize: 11, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 0.5, marginBottom: 6 },
    detailIssue: { fontSize: 15, color: theme.colors.text },
    detailEarnings: { fontSize: 20, fontWeight: '800', color: theme.colors.primary },
    statusBadge: { backgroundColor: theme.colors.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusBadgeText: { color: theme.colors.accent, fontWeight: '700', fontSize: 12, textTransform: 'capitalize' },
    detailFooter: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: theme.colors.border },
    sosFloatBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.error, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12 },
    sosFloatBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, marginLeft: 4 },
    navigateBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', marginHorizontal: 8, paddingVertical: 12, borderWidth: 1.5, borderColor: theme.colors.primary, borderRadius: 12 },
    navigateBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 14, marginLeft: 6 },
    startJobBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flex: 1, backgroundColor: theme.colors.primary, paddingVertical: 14, borderRadius: 12 },
    startJobBtnText: { color: '#fff', fontWeight: '700', fontSize: 15, marginLeft: 6 },

    // In-progress header
    inProgressHeader: { backgroundColor: theme.colors.accent, padding: 20, paddingTop: 16 },
    inProgressHeaderTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
    inProgressChatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    inProgressTimerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
    inProgressTimerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
    inProgressTimerText: { color: '#fff', fontWeight: '600', fontSize: 13, marginLeft: 6 },
    inProgressActiveBadge: { flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
    activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4ADE80', marginRight: 6 },
    inProgressActiveText: { color: '#fff', fontWeight: '700', fontSize: 12, letterSpacing: 0.5 },

    // Payment screen
    paymentSuccessCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.success, justifyContent: 'center', alignItems: 'center' },
    paymentSuccessTitle: { fontSize: 24, fontWeight: '800', color: theme.colors.text, marginTop: 16 },
    paymentSuccessSubtitle: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4, marginBottom: 24 },
    billCard: { width: '100%', backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: theme.colors.border },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billLabel: { fontSize: 14, color: theme.colors.textSecondary },
    billValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    billDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10 },
    billTotalLabel: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    billTotalValue: { fontSize: 16, fontWeight: '800', color: theme.colors.primary },
    paymentStatusRow: { flexDirection: 'row', alignItems: 'center' },
    paymentStatusText: { color: theme.colors.warning, fontSize: 13, fontWeight: '600', marginLeft: 6 },
});

