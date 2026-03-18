import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Asset, launchImageLibrary } from 'react-native-image-picker';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';

export const EditProfileScreen = ({ navigation }: any) => {
    const { user, provider } = useAuth();

    const providerUser: any = typeof provider?.user === 'object' ? provider.user : null;
    const avatarUrl: string | null =
        providerUser?.profilePicture?.url || providerUser?.avatar || user?.avatar || null;

    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(
        user?.email?.endsWith('@temp.localfix.com') ? '' : (user?.email || '')
    );
    const [saving, setSaving] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [currentAvatar, setCurrentAvatar] = useState<string | null>(avatarUrl);

    const isEmailVerified = (user as any)?.isEmailVerified ?? false;
    const hasRealEmail = !user?.email?.endsWith('@temp.localfix.com') && !!user?.email;
    const [resendingVerification, setResendingVerification] = useState(false);

    const handlePickAvatar = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.8,
            maxWidth: 800,
            maxHeight: 800,
        });

        if (result.didCancel || !result.assets?.[0]) return;

        const asset: Asset = result.assets[0];
        if (!asset.uri) return;

        const payload = {
            uri: asset.uri,
            name: asset.fileName || `avatar-${Date.now()}.jpg`,
            type: asset.type || 'image/jpeg',
        };

        setUploadingAvatar(true);
        const res = await userService.uploadAvatar(payload);
        setUploadingAvatar(false);

        if (res.success && res.data?.avatar) {
            setCurrentAvatar(res.data.avatar);
            Alert.alert('✅ Done', 'Profile photo updated!');
        } else {
            Alert.alert('Error', res.error || 'Failed to upload photo');
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            Alert.alert('Required', 'Please enter your name');
            return;
        }

        setSaving(true);
        const res = await userService.updateProfile({ name: name.trim(), email: email.trim() || undefined });
        setSaving(false);

        if (res.success) {
            Alert.alert('✅ Saved', 'Your profile has been updated.' + (email && !isEmailVerified ? '\n\nA verification link has been sent to your email.' : ''));
            navigation.goBack();
        } else {
            Alert.alert('Error', res.error || 'Failed to save profile');
        }
    };

    const handleResendVerification = async () => {
        if (resendingVerification) return;
        setResendingVerification(true);
        const res = await authService.resendEmailVerification();
        setResendingVerification(false);
        if (res.success) {
            Alert.alert('📧 Sent!', `Verification link sent to ${user?.email}`);
        } else {
            Alert.alert('Error', 'Failed to send verification link.');
        }
    };

    const initials = (user?.name || 'P').split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving} style={s.saveBtn}>
                    {saving ? (
                        <ActivityIndicator size="small" color={theme.colors.primary} />
                    ) : (
                        <Text style={s.saveBtnText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
                {/* Avatar */}
                <View style={s.avatarSection}>
                    <TouchableOpacity onPress={handlePickAvatar} disabled={uploadingAvatar} style={s.avatarWrap}>
                        {currentAvatar ? (
                            <Image source={{ uri: currentAvatar }} style={s.avatarImg} />
                        ) : (
                            <View style={s.avatarPlaceholder}>
                                <Text style={s.avatarInitials}>{initials}</Text>
                            </View>
                        )}
                        {uploadingAvatar ? (
                            <View style={s.avatarOverlay}>
                                <ActivityIndicator color="#fff" />
                            </View>
                        ) : (
                            <View style={s.cameraOverlay}>
                                <Icon name="camera-alt" size={18} color="#fff" />
                            </View>
                        )}
                    </TouchableOpacity>
                    <Text style={s.changePhotoText}>
                        {uploadingAvatar ? 'Uploading...' : 'Tap to change photo'}
                    </Text>
                </View>

                {/* Fields */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>PERSONAL INFO</Text>

                    <View style={s.field}>
                        <Text style={s.label}>Full Name *</Text>
                        <TextInput
                            style={s.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="Enter your full name"
                            placeholderTextColor={theme.colors.textMuted}
                        />
                    </View>

                    <View style={s.divider} />

                    <View style={s.field}>
                        <Text style={s.label}>Phone Number</Text>
                        <View style={s.readOnlyRow}>
                            <Text style={s.readOnlyText}>+91 {user?.phone || '—'}</Text>
                            <View style={s.verifiedPill}>
                                <Icon name="verified" size={13} color={theme.colors.success} />
                                <Text style={s.verifiedPillText}>Verified</Text>
                            </View>
                        </View>
                    </View>

                    <View style={s.divider} />

                    <View style={s.field}>
                        <View style={s.labelRow}>
                            <Text style={s.label}>Email Address</Text>
                            {hasRealEmail && (
                                isEmailVerified ? (
                                    <View style={s.verifiedPill}>
                                        <Icon name="verified" size={13} color={theme.colors.success} />
                                        <Text style={s.verifiedPillText}>Verified</Text>
                                    </View>
                                ) : (
                                    <View style={[s.verifiedPill, { backgroundColor: '#FFF3E0' }]}>
                                        <Icon name="warning" size={13} color="#F57C00" />
                                        <Text style={[s.verifiedPillText, { color: '#F57C00' }]}>Unverified</Text>
                                    </View>
                                )
                            )}
                        </View>
                        <TextInput
                            style={s.input}
                            value={email}
                            onChangeText={setEmail}
                            placeholder="Enter your email address"
                            placeholderTextColor={theme.colors.textMuted}
                            keyboardType="email-address"
                            autoCapitalize="none"
                        />
                        {hasRealEmail && !isEmailVerified && (
                            <TouchableOpacity onPress={handleResendVerification} disabled={resendingVerification} style={s.resendLink}>
                                <Icon name="email" size={14} color={theme.colors.primary} />
                                <Text style={s.resendLinkText}>
                                    {resendingVerification ? 'Sending...' : 'Resend verification link'}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Provider info (read only) */}
                <View style={s.card}>
                    <Text style={s.sectionTitle}>PROVIDER INFO</Text>
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Business Name</Text>
                        <Text style={s.infoValue}>{provider?.businessName || '—'}</Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Provider ID</Text>
                        <Text style={s.infoValue}>
                            {provider?._id ? provider._id.slice(-10).toUpperCase() : '—'}
                        </Text>
                    </View>
                    <View style={s.divider} />
                    <View style={s.infoRow}>
                        <Text style={s.infoLabel}>Status</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[
                                s.statusDot,
                                { backgroundColor: provider?.verification?.isVerified ? theme.colors.success : '#F57C00' }
                            ]} />
                            <Text style={[s.infoValue, {
                                color: provider?.verification?.isVerified ? theme.colors.success : '#F57C00'
                            }]}>
                                {provider?.verification?.reviewStatus === 'approved' ? 'Approved' :
                                    provider?.verification?.reviewStatus === 'rejected' ? 'Rejected' :
                                        'Pending Review'}
                            </Text>
                        </View>
                    </View>
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
    saveBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.colors.primary + '15', borderRadius: 20 },
    saveBtnText: { color: theme.colors.primary, fontWeight: '700', fontSize: 15 },

    scroll: { padding: 16, paddingBottom: 48 },

    avatarSection: { alignItems: 'center', paddingVertical: 24 },
    avatarWrap: { position: 'relative', width: 96, height: 96, borderRadius: 48 },
    avatarImg: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: theme.colors.primary },
    avatarPlaceholder: {
        width: 96, height: 96, borderRadius: 48,
        backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center',
        borderWidth: 3, borderColor: theme.colors.primary,
    },
    avatarInitials: { fontSize: 32, fontWeight: '800', color: theme.colors.primary },
    avatarOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 48, backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center', alignItems: 'center',
    },
    cameraOverlay: {
        position: 'absolute', bottom: 0, right: 0,
        width: 30, height: 30, borderRadius: 15,
        backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center',
        borderWidth: 2, borderColor: '#fff',
    },
    changePhotoText: { marginTop: 10, color: theme.colors.primary, fontWeight: '600', fontSize: 14 },

    card: {
        backgroundColor: '#fff', borderRadius: 14, borderWidth: 1,
        borderColor: theme.colors.border, padding: 16, marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 11, fontWeight: '700', color: theme.colors.textMuted,
        letterSpacing: 1, marginBottom: 14,
    },
    field: { paddingVertical: 4 },
    label: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '600', marginBottom: 6 },
    labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
    input: {
        borderWidth: 1.5, borderColor: theme.colors.border, borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: theme.colors.text,
        backgroundColor: '#FAFAFA',
    },
    divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 14 },

    readOnlyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    readOnlyText: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    verifiedPill: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: theme.colors.success + '15',
        borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3,
    },
    verifiedPillText: { color: theme.colors.success, fontSize: 12, fontWeight: '700', marginLeft: 3 },

    resendLink: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
    resendLinkText: { color: theme.colors.primary, fontSize: 13, fontWeight: '600', marginLeft: 4 },

    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
    infoLabel: { fontSize: 14, color: theme.colors.textSecondary },
    infoValue: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
});
