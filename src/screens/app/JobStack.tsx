import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useFocusEffect } from '@react-navigation/native';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { bookingService, BookingItem } from '../../services/bookingService';
import { notificationsService } from '../../services/notificationsService';

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

export const HomeScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const { provider, user, toggleAvailability, refreshSession } = useAuth();
    const [jobs, setJobs] = useState<BookingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

    const loadJobs = async () => {
        setLoading(true);
        const latestProvider = await refreshSession();
        const nextProvider = latestProvider || provider;

        if (!nextProvider || getReviewStatus(nextProvider) !== 'approved' || !nextProvider.verification?.isVerified) {
            setJobs([]);
            setLoading(false);
            return;
        }

        const result = await bookingService.list('pending,confirmed,in-progress');
        if (result.success) {
            setJobs(result.data || []);
        } else {
            Alert.alert(
                t('provider.jobs.unavailable_title', 'Jobs Unavailable'),
                result.error || t('provider.jobs.unavailable_message', 'Could not load bookings.')
            );
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

    const handleAccept = async (job: BookingItem) => {
        setUpdatingStatus(job._id);
        const result = await bookingService.updateStatus(job._id, 'confirmed');
        setUpdatingStatus(null);

        if (!result.success) {
            Alert.alert(
                t('provider.jobs.accept_failed_title', 'Accept Failed'),
                result.error || t('provider.jobs.accept_failed_message', 'Could not accept this job.')
            );
            return;
        }

        await notificationsService.displayLocalNotification(
            t('provider.jobs.accepted_title', 'Job accepted'),
            t('provider.jobs.accepted_message', 'A new booking has been accepted.'),
            'booking',
            {
                bookingId: job._id,
                screen: 'Home',
                type: 'booking_confirmed',
            }
        );
        await notificationsService.scheduleJobReminder(result.data || job);
        navigation.navigate('JobDetails', { job: result.data || job });
        await loadJobs();
    };

    const handleReject = async (job: BookingItem) => {
        setUpdatingStatus(job._id);
        const result = await bookingService.cancel(job._id, 'Rejected by provider');
        setUpdatingStatus(null);

        if (!result.success) {
            Alert.alert(
                t('provider.jobs.reject_failed_title', 'Reject Failed'),
                result.error || t('provider.jobs.reject_failed_message', 'Could not reject this job.')
            );
            return;
        }

        await loadJobs();
    };

    const handleToggleAvailability = async () => {
        const result = await toggleAvailability();
        if (!result.success) {
            Alert.alert(
                t('provider.jobs.status_update_failed_title', 'Status Update Failed'),
                result.error || t('provider.jobs.status_update_failed_message', 'Could not update availability.')
            );
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
                        <Text style={styles.name}>{provider?.businessName || user?.name || t('provider.jobs.provider_name', 'LocalFix Provider')}</Text>
                        <View style={styles.ratingRow}>
                            <Icon name="star" size={14} color={theme.colors.primary} />
                            <Text style={styles.rating}>{provider?.rating?.average?.toFixed(1) || '0.0'}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.statusToggle}>
                    {isApproved ? (
                        <>
                            <Text style={[styles.statusText, { color: isOnline ? theme.colors.success : theme.colors.textMuted }]}>
                                {isOnline ? t('provider.jobs.online', 'Online') : t('provider.jobs.offline', 'Offline')}
                            </Text>
                            <Switch
                                value={isOnline}
                                onValueChange={handleToggleAvailability}
                                trackColor={{ false: '#cbd5e1', true: theme.colors.success }}
                                thumbColor={'#fff'}
                            />
                        </>
                    ) : (
                        <View style={[
                            styles.reviewBadge,
                            reviewStatus === 'rejected' ? styles.reviewBadgeRejected : styles.reviewBadgePending,
                        ]}>
                            <Text style={styles.reviewBadgeText}>
                                {reviewStatus === 'rejected'
                                    ? t('provider.jobs.review_rejected', 'Review rejected')
                                    : t('provider.jobs.review_pending', 'Admin review pending')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {!provider ? (
                    <View style={styles.offlineState}>
                        <Icon name="badge" size={64} color={theme.colors.textMuted} />
                        <Text style={styles.offlineTitle}>{t('provider.jobs.profile_required_title', 'Complete your profile')}</Text>
                        <Text style={styles.offlineSubtitle}>{t('provider.jobs.profile_required_subtitle', 'Finish provider registration to start admin review and receive jobs.')}</Text>
                    </View>
                ) : !isApproved ? (
                    <View style={styles.reviewCard}>
                        <View style={styles.reviewCardHeader}>
                            <Icon
                                name={reviewStatus === 'rejected' ? 'report-problem' : 'pending-actions'}
                                size={28}
                                color={reviewStatus === 'rejected' ? theme.colors.warning : theme.colors.primary}
                                style={{ marginRight: theme.spacing.m }}
                            />
                            <View style={{ flex: 1 }}>
                                <Text style={styles.reviewTitle}>
                                    {reviewStatus === 'rejected'
                                        ? t('provider.jobs.review_rejected_title', 'Provider review rejected')
                                        : t('provider.jobs.review_pending_title', 'Provider review in progress')}
                                </Text>
                                <Text style={styles.reviewSubtitle}>
                                    {reviewStatus === 'rejected'
                                        ? t('provider.jobs.review_rejected_subtitle', 'Update the requested documents and wait for admin approval before going online.')
                                        : t('provider.jobs.review_pending_subtitle', 'Jobs, support routing, and availability will unlock after admin approval.')}
                                </Text>
                            </View>
                        </View>

                        {!!provider?.verification?.reviewNotes && (
                            <View style={styles.reviewNoteBlock}>
                                <Text style={styles.reviewMetaLabel}>{t('provider.jobs.review_notes', 'Review notes')}</Text>
                                <Text style={styles.reviewMetaValue}>{provider.verification.reviewNotes}</Text>
                            </View>
                        )}

                        <View style={styles.reviewMetaGrid}>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>{t('provider.jobs.account_mode', 'Account mode')}</Text>
                                <Text style={styles.reviewMetaValue}>{provider.providerMode || 'individual'}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>{t('provider.jobs.support_phone', 'Support phone')}</Text>
                                <Text style={styles.reviewMetaValue}>{provider.supportPhone || user?.phone || t('provider.jobs.not_available', 'Not available')}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>{t('provider.jobs.reviewed_by', 'Reviewed by')}</Text>
                                <Text style={styles.reviewMetaValue}>{reviewerName || t('provider.jobs.awaiting_admin', 'Awaiting admin')}</Text>
                            </View>
                            <View style={styles.reviewMetaItem}>
                                <Text style={styles.reviewMetaLabel}>{t('provider.jobs.reviewed_at', 'Reviewed at')}</Text>
                                <Text style={styles.reviewMetaValue}>{reviewedAtLabel || t('provider.jobs.awaiting_review', 'Awaiting review')}</Text>
                            </View>
                        </View>

                        {reviewDocuments.length > 0 ? (
                            <View style={styles.reviewDocuments}>
                                <Text style={styles.reviewSectionTitle}>{t('provider.jobs.documents', 'Submitted documents')}</Text>
                                {reviewDocuments.map((document: any, index: number) => (
                                    <View key={`${document.type}-${index}`} style={styles.reviewDocumentRow}>
                                        <View style={{ flex: 1, marginRight: theme.spacing.m }}>
                                            <Text style={styles.reviewDocumentTitle}>{humanizeDocumentType(document.type)}</Text>
                                            <Text style={styles.reviewDocumentNote}>
                                                {document.reviewNote || t('provider.jobs.document_under_review', 'Document status is recorded for admin review.')}
                                            </Text>
                                        </View>
                                        <Text style={[
                                            styles.reviewDocumentStatus,
                                            document.status === 'approved'
                                                ? styles.reviewDocumentStatusApproved
                                                : document.status === 'rejected'
                                                    ? styles.reviewDocumentStatusRejected
                                                    : styles.reviewDocumentStatusPending,
                                        ]}>
                                            {document.status || 'pending'}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}

                        <Button
                            title={t('provider.jobs.refresh_review_status', 'Refresh review status')}
                            onPress={loadJobs}
                            style={{ marginTop: 24 }}
                        />
                    </View>
                ) : !isOnline ? (
                    <View style={styles.offlineState}>
                        <Icon name="power-settings-new" size={64} color={theme.colors.textMuted} />
                        <Text style={styles.offlineTitle}>{t('provider.jobs.offline_title', 'You are Offline')}</Text>
                        <Text style={styles.offlineSubtitle}>{t('provider.jobs.offline_subtitle', 'Go online to start receiving job requests assigned to your provider profile.')}</Text>
                        <Button title={t('provider.jobs.go_online', 'Go Online')} onPress={handleToggleAvailability} style={{ marginTop: 24, width: 200 }} />
                    </View>
                ) : loading ? (
                    <View style={styles.offlineState}>
                        <ActivityIndicator size="large" color={theme.colors.primary} />
                        <Text style={styles.offlineSubtitle}>{t('provider.jobs.loading', 'Loading your live bookings...')}</Text>
                    </View>
                ) : (
                    <>
                        <Text style={styles.sectionTitle}>{`${t('provider.jobs.active_requests', 'Active Requests')} (${jobs.length})`}</Text>
                        {jobs.length === 0 ? (
                            <View style={styles.offlineState}>
                                <Icon name="hourglass-empty" size={52} color={theme.colors.textMuted} />
                                <Text style={styles.offlineSubtitle}>{t('provider.jobs.empty', 'No active jobs right now. New bookings will appear here.')}</Text>
                            </View>
                        ) : (
                            jobs.map(job => (
                                <View key={job._id} style={styles.jobCard}>
                                    <View style={styles.jobHeader}>
                                        <View style={{ flex: 1, paddingRight: theme.spacing.m }}>
                                            <Text style={styles.customerName}>{getCustomerName(job, t)}</Text>
                                            <Text style={styles.issueText}>{getIssueText(job, t)}</Text>
                                        </View>
                                        <View style={styles.earningsBadge}>
                                            <Text style={styles.earningsText}>Rs {getEarnings(job)}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.jobMeta}>
                                        <View style={styles.metaItem}>
                                            <Icon name="place" size={16} color={theme.colors.textSecondary} />
                                            <Text style={styles.metaText}>{job.address?.city || t('provider.jobs.city', 'City')}</Text>
                                        </View>
                                        <View style={styles.metaItem}>
                                            <Icon name="schedule" size={16} color={theme.colors.textSecondary} />
                                            <Text style={styles.metaText}>{job.scheduledTime?.startTime || t('provider.jobs.scheduled', 'Scheduled')}</Text>
                                        </View>
                                    </View>

                                    <Text style={styles.address}>{getAddressText(job, t)}</Text>

                                    <View style={styles.actionRow}>
                                        <Button
                                            title={updatingStatus === job._id ? t('provider.jobs.please_wait', 'Please wait') : t('provider.jobs.reject', 'Reject')}
                                            variant="outline"
                                            onPress={() => handleReject(job)}
                                            style={{ flex: 1, marginRight: 8, borderColor: theme.colors.error }}
                                            disabled={updatingStatus === job._id}
                                        />
                                        <Button
                                            title={updatingStatus === job._id ? t('provider.jobs.please_wait', 'Please wait') : t('provider.jobs.accept', 'Accept')}
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
    const { t } = useTranslation();
    const { job } = route.params;

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('provider.jobs.job_details', 'Job Details')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.mapPlaceholder}>
                    <Icon name="map" size={48} color={theme.colors.textMuted} />
                    <Text style={{ color: theme.colors.textMuted, marginTop: 8 }}>{t('provider.jobs.map_pending', 'Map integration pending')}</Text>
                </View>

                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={{ flex: 1, paddingRight: theme.spacing.m }}>
                            <Text style={styles.customerName}>{getCustomerName(job, t)}</Text>
                            <Text style={styles.address}>{getAddressText(job, t)}</Text>
                        </View>
                        <TouchableOpacity style={styles.callButton}>
                            <Icon name="call" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.divider} />

                    <Text style={styles.sectionLabel}>{t('provider.jobs.issue', 'Issue')}</Text>
                    <Text style={styles.issueDetail}>{getIssueText(job, t)}</Text>
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.row}>
                    <Button
                        title={t('provider.jobs.navigate', 'Navigate')}
                        variant="outline"
                        onPress={() => {}}
                        style={{ flex: 1, marginRight: 8 }}
                    />
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={() => triggerProviderSos(job, 'job details', t)}
                    >
                        <Icon name="sos" size={18} color="#fff" />
                        <Text style={styles.sosButtonText}>{t('provider.jobs.sos.action', 'SOS')}</Text>
                    </TouchableOpacity>
                    <Button
                        title={t('provider.jobs.start_job', 'Start Job')}
                        onPress={() => navigation.navigate('JobInProgress', { job })}
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

export const JobInProgressScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { job } = route.params;
    const [notes, setNotes] = useState(job.notes?.providerNotes || '');
    const [submitting, setSubmitting] = useState(false);

    const handleStart = async () => {
        setSubmitting(true);
        const result = await bookingService.updateStatus(job._id, 'in-progress');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert(
                t('provider.jobs.start_failed_title', 'Start Failed'),
                result.error || t('provider.jobs.start_failed_message', 'Could not mark this job in progress.')
            );
            return;
        }
    };

    const handleComplete = async () => {
        setSubmitting(true);
        const result = await bookingService.updateStatus(job._id, 'completed');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert(
                t('provider.jobs.complete_failed_title', 'Complete Failed'),
                result.error || t('provider.jobs.complete_failed_message', 'Could not complete this job.')
            );
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
                <Text style={styles.headerTitle}>{t('provider.jobs.in_progress_title', 'Job In Progress')}</Text>
            </View>

            <View style={styles.timerContainer}>
                <Text style={styles.timerTitle}>{t('provider.jobs.current_status', 'Current Status')}</Text>
                <Text style={styles.timerValue}>{t('provider.jobs.active', 'ACTIVE')}</Text>
                <View style={styles.timerBadge}>
                    <Text style={{ color: theme.colors.background, fontWeight: 'bold' }}>{t('provider.jobs.in_progress_badge', 'In Progress')}</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={styles.card}>
                    <Text style={styles.sectionLabel}>{t('provider.jobs.customer_label', 'Customer')}</Text>
                    <Text style={styles.customerName}>{getCustomerName(job, t)}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sectionLabel}>{t('provider.jobs.provider_notes', 'Provider Notes')}</Text>
                    <Input
                        value={notes}
                        onChangeText={setNotes}
                        placeholder={t('provider.jobs.provider_notes_placeholder', 'Add notes for this service...')}
                        multiline
                        style={{ marginBottom: 0 }}
                    />
                </View>
            </ScrollView>

            <View style={styles.footer}>
                <View style={styles.row}>
                    <TouchableOpacity
                        style={styles.sosButton}
                        onPress={() => triggerProviderSos(job, 'job in progress', t)}
                    >
                        <Icon name="sos" size={18} color="#fff" />
                        <Text style={styles.sosButtonText}>{t('provider.jobs.sos.action', 'SOS')}</Text>
                    </TouchableOpacity>
                    <Button
                        title={submitting ? t('provider.jobs.updating', 'Updating...') : t('provider.jobs.complete_job', 'Complete Job')}
                        onPress={handleComplete}
                        variant="success"
                        disabled={submitting}
                        style={{ flex: 1, marginLeft: 8 }}
                    />
                </View>
            </View>
        </SafeAreaView>
    );
};

export const PaymentScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { job } = route.params;
    const [submitting, setSubmitting] = useState(false);

    const handleReceivePayment = async () => {
        setSubmitting(true);
        const result = await bookingService.updatePayment(job._id, 'paid', 'cash');
        setSubmitting(false);

        if (!result.success) {
            Alert.alert(
                t('provider.jobs.payment_update_failed_title', 'Payment Update Failed'),
                result.error || t('provider.jobs.payment_update_failed_message', 'Could not mark payment as received.')
            );
            return;
        }

        navigation.navigate('Home');
    };

    const earnings = getEarnings(job);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Icon name="check-circle" size={80} color={theme.colors.success} />
                <Text style={styles.successTitle}>{t('provider.jobs.job_completed', 'Job Completed!')}</Text>
                <Text style={styles.testPaymentText}>{t('provider.jobs.confirm_cash_collection', 'Confirm the cash collection before marking the payment as received.')}</Text>

                <View style={styles.billCard}>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>{t('provider.jobs.base_fare', 'Base Fare')}</Text>
                        <Text style={styles.billValue}>Rs {earnings}</Text>
                    </View>
                    <View style={styles.billRow}>
                        <Text style={styles.billLabel}>{t('provider.jobs.platform_fee', 'Platform Fee')}</Text>
                        <Text style={styles.billValue}>Rs {(earnings * 0.1).toFixed(0)}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.billRow}>
                        <Text style={styles.totalLabel}>{t('provider.jobs.estimated_earnings', 'Estimated Earnings')}</Text>
                        <Text style={styles.totalValue}>Rs {(earnings * 0.9).toFixed(0)}</Text>
                    </View>
                </View>

                <Text style={styles.paymentStatus}>{`${t('provider.jobs.payment_status', 'Status')}: ${job.payment?.status || t('provider.jobs.pending', 'pending')}`}</Text>
            </View>

            <View style={styles.footer}>
                <Button
                    title={submitting ? t('provider.jobs.updating', 'Updating...') : t('provider.jobs.receive_payment', 'Receive Payment')}
                    onPress={handleReceivePayment}
                    disabled={submitting}
                />
                <TouchableOpacity onPress={() => navigation.navigate('Home')} style={{ marginTop: 16, alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.textSecondary }}>{t('provider.jobs.back_home', 'Back to Home')}</Text>
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
    reviewBadge: {
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    reviewBadgePending: {
        backgroundColor: 'rgba(99, 102, 241, 0.14)',
    },
    reviewBadgeRejected: {
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
    },
    reviewBadgeText: {
        color: theme.colors.text,
        fontSize: 12,
        fontWeight: '700',
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
    reviewCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.l,
        padding: theme.spacing.l,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    reviewCardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    reviewTitle: {
        color: theme.colors.text,
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 4,
    },
    reviewSubtitle: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        lineHeight: 20,
    },
    reviewNoteBlock: {
        marginTop: theme.spacing.l,
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surfaceHighlight,
    },
    reviewMetaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: theme.spacing.l,
        marginHorizontal: -6,
    },
    reviewMetaItem: {
        width: '50%',
        paddingHorizontal: 6,
        marginBottom: 12,
    },
    reviewMetaLabel: {
        color: theme.colors.textMuted,
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    reviewMetaValue: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    reviewDocuments: {
        marginTop: theme.spacing.s,
    },
    reviewSectionTitle: {
        color: theme.colors.text,
        fontSize: 15,
        fontWeight: '700',
        marginBottom: theme.spacing.s,
    },
    reviewDocumentRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    reviewDocumentTitle: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    reviewDocumentNote: {
        color: theme.colors.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    reviewDocumentStatus: {
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'capitalize',
        overflow: 'hidden',
    },
    reviewDocumentStatusApproved: {
        backgroundColor: 'rgba(34, 197, 94, 0.16)',
        color: theme.colors.success,
    },
    reviewDocumentStatusRejected: {
        backgroundColor: 'rgba(245, 158, 11, 0.16)',
        color: theme.colors.warning,
    },
    reviewDocumentStatusPending: {
        backgroundColor: 'rgba(99, 102, 241, 0.14)',
        color: theme.colors.primary,
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
    sosButton: {
        minWidth: 92,
        height: 52,
        borderRadius: theme.borderRadius.l,
        backgroundColor: theme.colors.error,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
        paddingHorizontal: 16,
    },
    sosButtonText: {
        color: '#fff',
        fontWeight: '800',
        marginLeft: 6,
        letterSpacing: 0.4,
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
