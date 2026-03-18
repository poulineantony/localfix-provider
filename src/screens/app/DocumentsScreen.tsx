import React from 'react';
import {
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

type DocumentType =
    | 'aadhaar'
    | 'driving-license'
    | 'passport-or-voter-id'
    | 'skill-certificate'
    | 'selfie'
    | 'company-registration'
    | 'owner-id'
    | 'office-proof';

const DOC_LABELS: Record<string, string> = {
    'aadhaar': 'Aadhaar Card',
    'driving-license': 'Driving License',
    'passport-or-voter-id': 'Passport / Voter ID',
    'skill-certificate': 'Skill Certificate',
    'selfie': 'Selfie / Photo ID',
    'company-registration': 'Company Registration',
    'owner-id': 'Owner ID',
    'office-proof': 'Office Address Proof',
};

const DOC_ICONS: Record<string, string> = {
    'aadhaar': 'credit-card',
    'driving-license': 'drive-eta',
    'passport-or-voter-id': 'badge',
    'skill-certificate': 'workspace-premium',
    'selfie': 'face',
    'company-registration': 'business',
    'owner-id': 'person',
    'office-proof': 'location-city',
};

export const DocumentsScreen = ({ navigation }: any) => {
    const { provider } = useAuth();

    const documents: Array<{ type: string; documentUrl: string }> =
        (provider as any)?.verification?.documents || [];

    const openDocument = (url: string) => {
        Linking.openURL(url).catch(() => {
            // silently fail on bad URL
        });
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Verification Documents</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {/* Review status banner */}
                <View style={[
                    s.statusBanner,
                    {
                        backgroundColor:
                            provider?.verification?.reviewStatus === 'approved' ? '#E8F5E9' :
                                provider?.verification?.reviewStatus === 'rejected' ? '#FFEBEE' :
                                    '#FFF8E1',
                    }
                ]}>
                    <Icon
                        name={
                            provider?.verification?.reviewStatus === 'approved' ? 'check-circle' :
                                provider?.verification?.reviewStatus === 'rejected' ? 'cancel' :
                                    'hourglass-top'
                        }
                        size={20}
                        color={
                            provider?.verification?.reviewStatus === 'approved' ? theme.colors.success :
                                provider?.verification?.reviewStatus === 'rejected' ? theme.colors.error :
                                    '#F9A825'
                        }
                    />
                    <Text style={[s.statusText, {
                        color:
                            provider?.verification?.reviewStatus === 'approved' ? theme.colors.success :
                                provider?.verification?.reviewStatus === 'rejected' ? theme.colors.error :
                                    '#F9A825'
                    }]}>
                        {provider?.verification?.reviewStatus === 'approved'
                            ? 'All documents approved'
                            : provider?.verification?.reviewStatus === 'rejected'
                                ? 'Some documents were rejected — please contact support'
                                : 'Documents under review by admin'}
                    </Text>
                </View>

                {documents.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <Icon name="folder-open" size={52} color={theme.colors.textMuted} />
                        <Text style={s.emptyTitle}>No documents uploaded</Text>
                        <Text style={s.emptySubtitle}>
                            Complete your onboarding to upload verification documents.
                        </Text>
                    </View>
                ) : (
                    <View style={s.grid}>
                        {documents.map((doc, index) => {
                            const label = DOC_LABELS[doc.type] || doc.type;
                            const isImage = doc.documentUrl?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);

                            return (
                                <View key={`${doc.type}-${index}`} style={s.docCard}>
                                    <View style={s.docHeader}>
                                        <Text style={s.docLabel}>{label}</Text>
                                        <View style={s.docStatusBadge}>
                                            <Icon name="check-circle" size={12} color={theme.colors.success} />
                                            <Text style={s.docStatusText}>Uploaded</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity 
                                        style={s.docPreviewWrap} 
                                        onPress={() => openDocument(doc.documentUrl)}
                                        activeOpacity={0.8}
                                    >
                                        {doc.documentUrl && isImage ? (
                                            <Image 
                                                source={{ uri: doc.documentUrl }} 
                                                style={s.docImage}
                                                resizeMode="cover"
                                            />
                                        ) : doc.documentUrl ? (
                                            <View style={s.docFallback}>
                                                <Icon name="insert-drive-file" size={40} color={theme.colors.primary} />
                                                <Text style={s.docFallbackText}>Tap to view PDF</Text>
                                            </View>
                                        ) : null}
                                        <View style={s.viewOverlay}>
                                            <View style={s.viewActionBadge}>
                                                <Icon name="visibility" size={16} color="#fff" />
                                                <Text style={s.viewActionText}>View</Text>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={[s.helpCard, { marginTop: 16 }]}>
                    <Icon name="info-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={s.helpText}>
                        To update or replace a document, please contact LocalFix support at support@localfix.in
                    </Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    },
    backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },

    scroll: { padding: 16, paddingBottom: 48 },

    statusBanner: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, borderRadius: 12, marginBottom: 16,
    },
    statusText: { marginLeft: 10, fontSize: 14, fontWeight: '600', flex: 1, lineHeight: 20 },

    grid: {
        gap: 16,
    },
    docCard: {
        backgroundColor: '#fff', 
        borderRadius: 16,
        borderWidth: 1, 
        borderColor: theme.colors.border, 
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
    },
    docHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    docLabel: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
    docStatusBadge: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: theme.colors.success + '1A', 
        paddingHorizontal: 8, 
        paddingVertical: 4, 
        borderRadius: 12 
    },
    docStatusText: { fontSize: 11, color: theme.colors.success, fontWeight: '700', marginLeft: 4 },
    docPreviewWrap: {
        width: '100%',
        height: 180,
        backgroundColor: '#F1F3F5',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    docImage: {
        width: '100%',
        height: '100%',
    },
    docFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    docFallbackText: {
        marginTop: 8,
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    viewOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'flex-end',
        alignItems: 'flex-end',
        padding: 12,
    },
    viewActionBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    viewActionText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
        marginLeft: 6,
    },

    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: 14 },
    emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },

    helpCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#EEF2FF', borderRadius: 10, padding: 14,
    },
    helpText: { marginLeft: 8, flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
