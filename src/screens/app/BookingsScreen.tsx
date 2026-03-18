import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../config/theme';
import { bookingService, BookingItem } from '../../services/bookingService';
import { notificationsService } from '../../services/notificationsService';

const getCustomerName = (job: BookingItem) => job.customer?.name || 'Customer';
const getIssueText = (job: BookingItem) =>
    job.notes?.customerNotes || job.service?.name || 'Service request';
const getAddressText = (job: BookingItem) =>
    [job.address?.street, job.address?.city, job.address?.state].filter(Boolean).join(', ') || 'Address unavailable';
const getEarnings = (job: BookingItem) => job.pricing?.totalAmount || job.pricing?.basePrice || 0;

const STATUS_TABS = ['All', 'Pending', 'Active', 'Completed', 'Cancelled'] as const;
type StatusTab = typeof STATUS_TABS[number];

const STATUS_MAP: Record<StatusTab, string> = {
    All: 'pending,confirmed,in-progress,completed,cancelled',
    Pending: 'pending',
    Active: 'confirmed,in-progress',
    Completed: 'completed',
    Cancelled: 'cancelled',
};

const statusColor = (status: string) => {
    switch (status) {
        case 'confirmed': return theme.colors.primary;
        case 'in-progress': return theme.colors.accent;
        case 'completed': return theme.colors.success;
        case 'cancelled': return theme.colors.error;
        default: return theme.colors.warning;
    }
};

export const BookingsScreen = ({ navigation }: any) => {
    const [activeTab, setActiveTab] = useState<StatusTab>('All');
    const [jobs, setJobs] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const knownPendingIds = useRef<Set<string>>(new Set());
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const loadJobs = useCallback(async (silent = false) => {
        if (!silent) setLoading(true);
        const result = await bookingService.list(STATUS_MAP[activeTab]);
        if (result.success && result.data) {
            const fetched: BookingItem[] = result.data;
            setJobs(fetched);

            // Detect brand-new pending jobs and fire sound notification
            const pendingFetched = fetched.filter(j => j.status === 'pending');
            const newOnes = pendingFetched.filter(j => !knownPendingIds.current.has(j._id));

            if (newOnes.length > 0 && knownPendingIds.current.size > 0) {
                // Only ring after first load so we don't spam on initial mount
                for (const job of newOnes) {
                    await notificationsService.displayLocalNotification(
                        '🔔 New Job Request!',
                        `${getIssueText(job)} from ${getCustomerName(job)}. Tap to view.`,
                        'new_job',
                        { bookingId: job._id, screen: 'Bookings', type: 'new_job_request' }
                    );
                }
            }

            // Update known set to all current pending IDs
            knownPendingIds.current = new Set(pendingFetched.map(j => j._id));
        }
        if (!silent) setLoading(false);
    }, [activeTab]);

    useFocusEffect(
        useCallback(() => {
            loadJobs();
            // Poll every 30 seconds silently while this screen is focused
            pollRef.current = setInterval(() => loadJobs(true), 30_000);
            return () => {
                if (pollRef.current) clearInterval(pollRef.current);
            };
        }, [loadJobs])
    );

    useEffect(() => {
        loadJobs();
    }, [activeTab]);

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <Text style={s.headerTitle}>My Bookings</Text>
            </View>

            {/* Status tabs */}
            <View style={s.tabsWrapper}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.tabsContent}
                    keyboardShouldPersistTaps="handled"
                    overScrollMode="never"
                    bounces={false}
                >
                    {STATUS_TABS.map(tab => (
                        <TouchableOpacity
                            key={tab}
                            style={[s.tab, activeTab === tab && s.tabActive]}
                            onPress={() => setActiveTab(tab)}
                            activeOpacity={0.75}
                        >
                            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={s.loadingCenter}>
                    <ActivityIndicator size="large" color={theme.colors.primary} />
                    <Text style={s.loadingText}>Loading bookings...</Text>
                </View>
            ) : jobs.length === 0 ? (
                <View style={s.emptyState}>
                    <Icon name="event-note" size={52} color={theme.colors.textMuted} />
                    <Text style={s.emptyTitle}>No {activeTab !== 'All' ? activeTab.toLowerCase() : ''} bookings</Text>
                    <Text style={s.emptySubtitle}>Bookings in this category will appear here</Text>
                </View>
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.list}>
                    {jobs.map(job => {
                        const sColor = statusColor(job.status || 'pending');
                        const isActive = job.status === 'confirmed' || job.status === 'in-progress';
                        return (
                            <TouchableOpacity
                                key={job._id}
                                style={s.card}
                                activeOpacity={0.75}
                                onPress={() => {
                                    if (job.status === 'in-progress') navigation.navigate('JobInProgress', { job });
                                    else if (job.status === 'confirmed' || job.status === 'pending') navigation.navigate('JobDetails', { job });
                                }}
                            >
                                <View style={s.cardTop}>
                                    <View style={[s.serviceIcon, { backgroundColor: sColor + '18' }]}>
                                        <Icon name={isActive ? 'engineering' : 'build'} size={20} color={sColor} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={s.serviceName} numberOfLines={1}>{getIssueText(job)}</Text>
                                        <Text style={s.customerName}>{getCustomerName(job)}</Text>
                                    </View>
                                    <Text style={[s.earnings, { color: sColor }]}>Rs {getEarnings(job)}</Text>
                                </View>

                                <View style={s.cardDivider} />

                                <View style={s.cardBottom}>
                                    <View style={s.infoItem}>
                                        <Icon name="place" size={14} color={theme.colors.textMuted} />
                                        <Text style={s.infoText} numberOfLines={1}>{getAddressText(job)}</Text>
                                    </View>
                                    <View style={[s.statusBadge, { backgroundColor: sColor + '15' }]}>
                                        <View style={[s.statusDot, { backgroundColor: sColor }]} />
                                        <Text style={[s.statusText, { color: sColor }]}>
                                            {job.status === 'in-progress' ? 'In Progress' : (job.status || 'pending')}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            )}
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
    tabsWrapper: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    tabsContent: { paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: 'row', alignItems: 'center' },
    tab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 22, backgroundColor: '#F1F1F6', justifyContent: 'center', alignItems: 'center' },
    tabActive: { backgroundColor: theme.colors.primary },
    tabText: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, lineHeight: 18 },
    tabTextActive: { color: '#fff' },
    loadingCenter: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: theme.colors.textMuted, fontSize: 14 },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 16 },
    emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center' },
    list: { padding: 16, gap: 10 },
    card: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: theme.colors.border },
    cardTop: { flexDirection: 'row', alignItems: 'center' },
    serviceIcon: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    serviceName: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    customerName: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
    earnings: { fontSize: 16, fontWeight: '800' },
    cardDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 10 },
    cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    infoItem: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 4 },
    infoText: { fontSize: 12, color: theme.colors.textSecondary, flex: 1 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
    statusDot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
});
