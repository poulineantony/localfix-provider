import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { bookingService, BookingItem } from '../../services/bookingService';

const getCustomerName = (job: BookingItem) => job.customer?.name || 'Customer';
const getIssueText = (job: BookingItem) => job.notes?.customerNotes || job.service?.name || 'Service request';
const getAddressText = (job: BookingItem) =>
    [job.address?.street, job.address?.city, job.address?.state].filter(Boolean).join(', ') || 'Address unavailable';
const getEarnings = (job: BookingItem) => job.pricing?.totalAmount || job.pricing?.basePrice || 0;

export const HomeScreen = ({ navigation }: any) => {
    const { provider, user, toggleAvailability, refreshSession } = useAuth();
    const [jobs, setJobs] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    const loadJobs = async () => {
        setLoading(true);
        await refreshSession();
        const result = await bookingService.list('pending,confirmed,in-progress');
        if (result.success) {
            setJobs(result.data || []);
        } else {
            Alert.alert('Jobs Unavailable', result.error || 'Could not load bookings.');
        }
        setLoading(false);
    };

    useFocusEffect(
        React.useCallback(() => {
            loadJobs();
        }, [])
    );

    const isOnline = provider?.availability?.isAvailable ?? false;

    const handleAccept = async (job: BookingItem) => {
        setUpdatingStatus(job._id);
        const result = await bookingService.updateStatus(job._id, 'confirmed');
        setUpdatingStatus(null);

        if (!result.success) {
            Alert.alert('Accept Failed', result.error || 'Could not accept this job.');
            return;
        }

        navigation.navigate('JobDetails', { job: result.data || job });
        await loadJobs();
    };

    const handleReject = async (job: BookingItem) => {
        setUpdatingStatus(job._id);
        const result = await bookingService.cancel(job._id, 'Rejected by provider');
        setUpdatingStatus(null);

        if (!result.success) {
            Alert.alert('Reject Failed', result.error || 'Could not reject this job.');
            return;
        }

        await loadJobs();
    };

    const handleToggleAvailability = async () => {
        const result = await toggleAvailability();
        if (!result.success) {
            Alert.alert('Status Update Failed', result.error || 'Could not update availability.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.profileRow}>
                    <View style={styles.avatar}>
                        <Icon name="person" size={24} color={theme.colors.text} />
                    </View>
                    <View style={{ marginLeft: 12 }}>
                        <Text style={styles.name}>{provider?.businessName || user?.name || 'LocalFix Provider'}</Text>
                        <View style={styles.ratingRow}>
                            <Icon name="star" size={14} color={theme.colors.primary} />
                            <Text style={styles.rating}>{provider?.rating?.average?.toFixed(1) || '0.0'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statusToggle}>
                    <Text style={[styles.statusText, { color: isOnline ? theme.colors.success : theme.colors.textMuted }]}>
                        {isOnline ? 'Online' : 'Offline'}
                    </Text>
                    <Switch
                        value={isOnline}
                        onValueChange={handleToggleAvailability}
                        trackColor={{ false: '#cbd5e1', true: theme.colors.success }}
                        thumbColor={'#fff'}
                    />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {!isOnline ? (
                    <View style={styles.offlineState}>
                        <Icon name="power-settings-new" size={64} color={theme.colors.textMuted} />
                        <Text style={styles.offlineTitle}>You are Offline</Text>
                        <Text style={styles.offlineSubtitle}>Go online to start receiving job requests assigned to your provider profile.</Text>
                        <Button title="Go Online" onPress={handleToggleAvailability} style={{ marginTop: 24, width: 200 }} />
                    </View>
                ) : loading ? (
                    <View style={styles.offlineState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.offlineSubtitle}>Loading your live bookings...</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>Active Requests ({jobs.length})</Text>
                        {jobs.length === 0 ? (
                            <View style={styles.offlineState}>
                                <Icon name="hourglass-empty" size={52} color={theme.colors.textMuted} />
                                <Text style={styles.offlineSubtitle}>No active jobs right now. New bookings will appear here.</Text>
                            </View>
                        ) : (
                            jobs.map(job => (
                                <View key={job._id} style={styles.jobCard}>
                                    <View style={styles.jobHeader}>
                                        <View style={{ flex: 1, paddingRight: theme.spacing.m }}>
                                            <Text style={styles.customerName}>{getCustomerName(job)}</Text>
                                            <Text style={styles.issueText}>{getIssueText(job)}</Text>
                                        </View>
                                        <View style={styles.earningsBadge}>
                                            <Text style={styles.earningsText}>Rs {getEarnings(job)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.jobMeta}>
                                        <View style={styles.metaItem}>
                                            <Icon name="place" size={16} color={theme.colors.textSecondary} />
                                            <Text style={styles.metaText}>{job.address?.city || 'City'}</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Icon name="schedule" size={16} color={theme.colors.textSecondary} />
                                            <Text style={styles.metaText}>{job.scheduledTime?.startTime || 'Scheduled'}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.address}>{getAddressText(job)}</Text>

                                    <View style={styles.actionRow}>
                                        <Button
                                            title={updatingStatus === job._id ? 'Please wait' : 'Reject'}
                                            variant="outline"
                                            onPress={() => handleReject(job)}
                                            style={{ flex: 1, marginRight: 8, borderColor: theme.colors.error }}
                                            disabled={updatingStatus === job._id}
                                        />
                                        <Button
                                            title={updatingStatus === job._id ? 'Please wait' : 'Accept'}
                                            onPress={() => handleAccept(job)}
                                            style={{ flex: 1, marginLeft: 8 }}
                                            disabled={updatingStatus === job._id}
                                        />
                                    </View>
                                </View>
                            ))
                        )}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

export const JobDetailsScreen = ({ navigation, route }: any) => {
    const { job } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Job Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mapPlaceholder}>
                    <Icon name="map" size={48} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>Map integration pending</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, paddingRight: theme.spacing.m }}>
                            <Text style={styles.customerName}>{getCustomerName(job)}</Text>
                            <Text style={styles.address}>{getAddressText(job)}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton}>
                            <Icon name="call" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionLabel}>Issue</Text>
                    <Text style={styles.issueDetail}>{getIssueText(job)}</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.row}>
                    <Button
                        title="Navigate"
                        variant="outline"
                        onPress={() => {}}
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <Button
                        title="Start Job"
                        onPress={() => navigation.navigate('JobInProgress', { job })}
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

export const JobInProgressScreen = ({ navigation, route }: any) => {
    const { job } = route.params;
    const [notes, setNotes] = useState(job.notes?.providerNotes || '');
    const [submitting, setSubmitting] = useState(false);

    const handleStart = async () => {
        setSubmitting(true);
        const result = await bookingService.updateStatus(job._id, 'in-progress');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert('Start Failed', result.error || 'Could not mark this job in progress.');
            return;
        }
    };

    const handleComplete = async () => {
        setSubmitting(true);
        const result = await bookingService.updateStatus(job._id, 'completed');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert('Complete Failed', result.error || 'Could not complete this job.');
            return;
        }

        navigation.navigate('Payment', { job: result.data || job, notes });
    };

    useEffect(() => {
        handleStart();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Job In Progress</Text>
            </View>

            <View style={styles.timerContainer}>
                <Text style={styles.timerTitle}>Current Status</Text>
                <Text style={styles.timerValue}>ACTIVE</Text>
                <View style={styles.timerBadge}>
                    <Text style={{ color: theme.colors.background, fontWeight: 'bold' }}>In Progress</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>Customer</Text>
                    <Text style={styles.customerName}>{getCustomerName(job)}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionLabel}>Provider Notes</Text>
                    <Input
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Add notes for this service..."
                        multiline
                        style={{ marginBottom: 0 }}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <Button
                    title={submitting ? 'Updating...' : 'Complete Job'}
                    onPress={handleComplete}
                    variant="success"
                    disabled={submitting}
                />
            </View>
        </SafeAreaView>
    );
};

export const PaymentScreen = ({ navigation, route }: any) => {
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
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Icon name="check-circle" size={80} color={theme.colors.success} />
                <Text style={styles.successTitle}>Job Completed!</Text>
                <Text style={styles.testPaymentText}>Payment test mode is enabled for provider settlement updates.</Text>

                <View style={styles.billCard}>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Base Fare</Text>
                        <Text style={styles.billValue}>Rs {earnings}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>Platform Fee</Text>
                        <Text style={styles.billValue}>Rs {(earnings * 0.1).toFixed(0)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.billRow}>
                        <Text style={styles.totalLabel}>Estimated Earnings</Text>
                        <Text style={styles.totalValue}>Rs {(earnings * 0.9).toFixed(0)}</Text>
                    </View>
                </View>

                <Text style={styles.paymentStatus}>Status: {job.payment?.status || 'pending'}</Text>
            </View>

            <View style={styles.footer}>
                <Button
                    title={submitting ? 'Updating...' : 'Receive Payment'}
                    onPress={handleReceivePayment}
                    disabled={submitting}
                />
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>Back to Home</Text>
                </TouchableOpacity>
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
        padding: theme.spacing.l,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    profileRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    name: {
        color: theme.colors.text,
        fontWeight: '600',
        fontSize: 16,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rating: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        marginLeft: 4,
    },
    statusToggle: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        marginRight: 8,
        fontSize: 12,
        fontWeight: '600',
    },
    offlineState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 100,
    },
    offlineTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginTop: theme.spacing.l,
    },
    offlineSubtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        textAlign: 'center',
        marginTop: theme.spacing.s,
        paddingHorizontal: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.m,
    },
    jobCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
        borderLeftWidth: 4,
        borderLeftColor: theme.colors.primary,
    },
    jobHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: theme.spacing.m,
    },
    customerName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
    },
    issueText: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        marginTop: 4,
    },
    earningsBadge: {
        backgroundColor: 'rgba(99, 102, 241, 0.12)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    earningsText: {
        color: theme.colors.primary,
        fontWeight: 'bold',
        fontSize: 16,
    },
    jobMeta: {
        flexDirection: 'row',
        marginBottom: theme.spacing.s,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    metaText: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginLeft: 4,
    },
    actionRow: {
        flexDirection: 'row',
        marginTop: theme.spacing.m,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    mapPlaceholder: {
        height: 200,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
    },
    card: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.l,
        borderRadius: theme.borderRadius.m,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    address: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginTop: 4,
    },
    callButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    divider: {
        height: 1,
        backgroundColor: theme.colors.border,
        marginVertical: theme.spacing.l,
    },
    sectionLabel: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    issueDetail: {
        color: theme.colors.text,
        fontSize: 16,
        marginBottom: theme.spacing.m,
    },
    footer: {
        padding: theme.spacing.l,
        backgroundColor: theme.colors.surface,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    timerContainer: {
        alignItems: 'center',
        padding: theme.spacing.l,
        backgroundColor: theme.colors.surfaceHighlight,
        marginBottom: theme.spacing.m,
    },
    timerTitle: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
    },
    timerValue: {
        color: theme.colors.text,
        fontSize: 34,
        fontWeight: 'bold',
    },
    timerBadge: {
        backgroundColor: theme.colors.success,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        marginTop: 8,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginVertical: theme.spacing.l,
        textAlign: 'center',
    },
    billCard: {
        backgroundColor: theme.colors.surface,
        padding: theme.spacing.xl,
        borderRadius: theme.borderRadius.m,
        width: '100%',
        marginBottom: theme.spacing.xl,
    },
    billRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    billLabel: {
        color: theme.colors.textSecondary,
        fontSize: 16,
    },
    billValue: {
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: '500',
    },
    totalLabel: {
        color: theme.colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    totalValue: {
        color: theme.colors.primary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    paymentStatus: {
        textAlign: 'center',
        color: theme.colors.warning,
        fontSize: 14,
    },
    testPaymentText: {
        textAlign: 'center',
        color: theme.colors.primary,
        fontSize: 13,
        marginBottom: theme.spacing.m,
        fontWeight: '600',
    },
});
