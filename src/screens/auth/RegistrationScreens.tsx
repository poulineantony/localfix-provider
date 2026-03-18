import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Keyboard, Modal, FlatList, Alert, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { Asset, launchImageLibrary } from 'react-native-image-picker';

import LottieView from 'lottie-react-native';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Header } from '../../components/Header'; // We'll create this later or inline it
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../context/TranslationContext';
import { providerService } from '../../services/providerService';
import { userService } from '../../services/userService';
import { serviceService, ServiceCategoryItem, ServiceItem } from '../../services/serviceService';

type RegistrationAccountType = 'individual' | 'fleet_member';
type VerificationDocumentType =
    | 'aadhaar'
    | 'driving-license'
    | 'passport-or-voter-id'
    | 'skill-certificate'
    | 'selfie'
    | 'company-registration'
    | 'owner-id'
    | 'office-proof';
type UploadedVerificationDocument = {
    type: VerificationDocumentType;
    documentUrl: string;
    localUri?: string;
    fileName?: string;
    mimeType?: string;
};
type UploadedVerificationDocumentMap = Partial<Record<VerificationDocumentType, UploadedVerificationDocument>>;

type RegistrationLocation = {
    addressLine: string;
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
    placeId?: string;
    latitude?: number;
    longitude?: number;
    zoneId?: string;
    zoneName?: string;
};

const FieldLabel = ({
    text,
    required = false,
    optional = false,
    style,
}: {
    text: string;
    required?: boolean;
    optional?: boolean;
    style?: any;
}) => (
    <Text style={[styles.label, style]}>
        {text}
        {required ? <Text style={styles.requiredMark}> *</Text> : null}
        {!required && optional ? <Text style={styles.optionalText}> (Optional)</Text> : null}
    </Text>
);

const getAccountType = (route: any): RegistrationAccountType => {
    return route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
};

const LEGACY_CATEGORY_MAP: Record<string, string> = {
    Electrician: 'electrical',
    Plumber: 'plumbing',
    'AC Technician': 'ac-repair',
    Mechanic: 'appliance-repair',
    Carpenter: 'carpentry',
    Painter: 'painting',
    Driver: 'other',
};

const buildServiceIdsFromCategories = (
    selectedCategoryValues: string[],
    availableCategories: ServiceCategoryItem[] = []
) => {
    const ids = new Set<string>();

    availableCategories
        .filter((category) => selectedCategoryValues.includes(category.value))
        .forEach((category) => {
            category.services.forEach((service) => ids.add(service._id));
        });

    return Array.from(ids);
};

const formatCategoryLabel = (value: string) =>
    value
        .split(/[-_]/g)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');

const buildCategoriesFromServices = (services: ServiceItem[]): ServiceCategoryItem[] => {
    const grouped = services.reduce<Record<string, ServiceCategoryItem>>((accumulator, service) => {
        if (!accumulator[service.category]) {
            accumulator[service.category] = {
                value: service.category,
                label: formatCategoryLabel(service.category),
                count: 0,
                services: [],
            };
        }

        accumulator[service.category].count += 1;
        accumulator[service.category].services.push({
            _id: service._id,
            name: service.name,
        });

        return accumulator;
    }, {});

    return Object.values(grouped).sort((left, right) => left.label.localeCompare(right.label));
};

const resolveServiceIds = async (categories: string[]) => {
    const servicesResult = await serviceService.getAll();

    if (!servicesResult.success || !servicesResult.data) {
        return {
            success: false,
            error: servicesResult.error || 'Unable to load services',
            data: [] as string[],
        };
    }

    const mappedCategories = categories.map((category) => LEGACY_CATEGORY_MAP[category] || category.toLowerCase());
    const serviceIds = servicesResult.data
        .filter((service) => mappedCategories.includes(service.category))
        .map((service) => service._id);

    return {
        success: serviceIds.length > 0,
        error: serviceIds.length > 0 ? undefined : 'No matching backend services found for the selected categories',
        data: serviceIds,
    };
};

const buildUploadPayload = (asset: Asset, prefix: string) => {
    if (!asset.uri) {
        return null;
    }

    const fallbackExtension = asset.type?.split('/')[1] || 'jpg';
    const sanitizedExtension = fallbackExtension.replace(/[^a-zA-Z0-9]/g, '') || 'jpg';
    const name = asset.fileName || `${prefix}-${Date.now()}.${sanitizedExtension}`;

    return {
        uri: asset.uri,
        name,
        type: asset.type || 'image/jpeg',
    };
};

const buildAvatarUploadPayload = (asset: Asset) => buildUploadPayload(asset, 'provider-avatar');

const buildDocumentUploadPayload = (asset: Asset, documentType: VerificationDocumentType) =>
    buildUploadPayload(asset, `provider-${documentType}`);

const mapVerificationDocumentsToUploadMap = (documents: Array<{ type?: string; documentUrl?: string }> = []): UploadedVerificationDocumentMap =>
    documents.reduce<UploadedVerificationDocumentMap>((accumulator, document) => {
        if (!document?.type || !document?.documentUrl) {
            return accumulator;
        }

        accumulator[document.type as VerificationDocumentType] = {
            type: document.type as VerificationDocumentType,
            documentUrl: document.documentUrl,
        };

        return accumulator;
    }, {});

// 1. Phone Login
export const RegistrationPhoneScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [phone, setPhone] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const { height } = useWindowDimensions();
    const isCompactHeight = height < 840;
    const accountType = getAccountType(route);
    const { sendOtp, isSubmitting } = useAuth();

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true); // or some other action
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false); // or some other action
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const handlePhoneChange = (text: string) => {
        // Only allow numbers
        const cleaned = text.replace(/[^0-9]/g, '');
        // Limit to 10 digits
        if (cleaned.length <= 10) {
            setPhone(cleaned);
        }
    };

    const handleSendOtp = async () => {
        const result = await sendOtp(phone);

        if (!result.success) {
            Alert.alert(t('common.error', 'Error'), result.error || t('provider.auth.phone.send_failed', 'Unable to send OTP right now.'));
            return;
        }

        navigation.navigate('RegistrationOTP', {
            accountType,
            phone,
            debugOtp: result.otp,
        });
    };

    const sendOtpButton = (
        <Button
            title={isSubmitting ? t('provider.auth.phone.sending', 'Sending...') : t('provider.auth.phone.send', 'Send OTP')}
            onPress={handleSendOtp}
            disabled={phone.length < 10 || isSubmitting}
            icon={<Icon name="arrow-forward" size={20} color="#fff" />}
            style={{ backgroundColor: phone.length < 10 ? theme.colors.surfaceHighlight : theme.colors.primary }}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.authScrollContent} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={[styles.content, isCompactHeight && styles.compactContent]}>
                        {!isKeyboardVisible && (
                            <View style={[styles.heroContainer, isCompactHeight && styles.compactHeroContainer]}>
                                <Image
                                    source={require('../../assets/login_hero_card.jpg')}
                                    style={[styles.heroImage, isCompactHeight && styles.compactHeroImage]}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        <View style={[styles.authIntro, isCompactHeight && styles.compactAuthIntro]}>
                            <Text style={[styles.title, isCompactHeight && styles.compactTitle]}>{t('provider.auth.phone.title_primary', 'Earn more with')}</Text>
                            <Text style={[styles.title, isCompactHeight && styles.compactTitle, { color: theme.colors.primary }]}>{t('provider.auth.phone.title_secondary', 'Local Fix Pro')}</Text>
                            <Text style={[styles.subtitle, isCompactHeight && styles.compactSubtitle]}>
                                {accountType === 'fleet_member'
                                    ? t('provider.auth.phone.subtitle.fleet_member', 'Enter the number linked to your fleet membership.')
                                    : t('provider.auth.phone.subtitle.individual', 'Enter your phone number to login or register.')}
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.prefixContainer}>
                                <Text style={styles.prefix}>🇮🇳 +91</Text>
                            </View>
                            <Input
                                value={phone}
                                onChangeText={handlePhoneChange}
                                placeholder={t('provider.auth.phone.placeholder', 'Phone number')}
                                keyboardType="phone-pad"
                                maxLength={10}
                                style={{ flex: 1, marginBottom: 0 }}
                                inputStyle={{
                                    fontSize: 18,
                                    fontWeight: '600',
                                    height: 56,
                                    textAlignVertical: 'center'
                                }}
                            />
                        </View>

                        <Text style={[styles.helperText, isCompactHeight && styles.compactHelperText]}>
                            {t('provider.auth.phone.helper', 'We will send a 4-digit OTP to verify your number.')}
                        </Text>

                        {isKeyboardVisible ? (
                            <View style={styles.keyboardActionWrap}>
                                {sendOtpButton}
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
                {!isKeyboardVisible ? (
                    <View style={[styles.footer, isCompactHeight && styles.compactFooter]}>
                        {sendOtpButton}
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// 2. OTP Verification
export const RegistrationOTPScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [otp, setOtp] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || '';
    const debugOtp = typeof route?.params?.debugOtp === 'string'
        ? route.params.debugOtp.replace(/\D/g, '').slice(0, 4)
        : '';
    const { verifyOtp, isSubmitting } = useAuth();
    const otpTitle = t('provider.auth.otp.title', 'Verify Identity');
    const otpTitleParts = otpTitle.split(' ');
    const otpTitlePrimary = otpTitleParts.length > 1 ? otpTitleParts.slice(0, -1).join(' ') : otpTitle;
    const otpTitleAccent = otpTitleParts.length > 1 ? otpTitleParts.slice(-1).join(' ') : '';

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        if (debugOtp) {
            setOtp(debugOtp);
        }
    }, [debugOtp]);

    const handleOtpChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '').slice(0, 4);
        setOtp(cleaned);
    };

    const handleVerifyOtp = async () => {
        const result = await verifyOtp(phone, otp, accountType);

        if (!result.success) {
            Alert.alert(t('common.error', 'Error'), result.error || t('provider.auth.otp.invalid', 'Invalid OTP'));
            return;
        }

        navigation.navigate('RegistrationPersonal', {
            accountType,
            phone,
        });
    };

    const verifyOtpButton = (
        <Button
            title={isSubmitting ? t('provider.auth.otp.verifying', 'Verifying...') : t('provider.auth.otp.verify', 'Verify Securely')}
            onPress={handleVerifyOtp}
            disabled={otp.length < 4 || isSubmitting}
            icon={<Icon name="shield" size={20} color="#fff" />}
            style={{ backgroundColor: otp.length < 4 ? theme.colors.surfaceHighlight : theme.colors.primary }}
        />
    );

    const resendCodeButton = (
        <TouchableOpacity style={styles.resendButton}>
            <Text style={styles.resendButtonText}>{t('provider.auth.otp.resend', 'Resend Code')}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.authScrollContent} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={styles.content}>
                        {!isKeyboardVisible && (
                            <View style={{ alignItems: 'center', marginBottom: theme.spacing.l }}>
                                <Image
                                    source={require('../../assets/otp_hero_card.jpg')}
                                    style={{ width: 200, height: 200 }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: theme.spacing.xl, alignItems: 'center', marginTop: isKeyboardVisible ? theme.spacing.l : 0 }}>
                            <Text style={[styles.title, { textAlign: 'center' }]}>
                                {otpTitlePrimary}
                                {otpTitleAccent ? (
                                    <>
                                        {' '}
                                        <Text style={{ color: theme.colors.primary }}>{otpTitleAccent}</Text>
                                    </>
                                ) : null}
                            </Text>
                            <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 300 }]}>{t('provider.auth.otp.subtitle', 'Enter the 4-digit code sent to your number.')}</Text>
                        </View>

                        <Input
                            value={otp}
                            onChangeText={handleOtpChange}
                            placeholder={t('provider.auth.otp.placeholder', '0 0 0 0')}
                            keyboardType="number-pad"
                            maxLength={4}
                            selectTextOnFocus={Boolean(debugOtp)}
                            inputStyle={{
                                textAlign: 'center',
                                letterSpacing: 14,
                                fontSize: 24,
                                fontWeight: 'bold',
                                height: 64
                            }}
                        />

                        {isKeyboardVisible ? (
                            <View style={styles.keyboardActionWrap}>
                                {verifyOtpButton}
                                {resendCodeButton}
                            </View>
                        ) : null}
                    </View>
                </ScrollView>
                {!isKeyboardVisible ? (
                    <View style={styles.footer}>
                        {verifyOtpButton}
                        {resendCodeButton}
                    </View>
                ) : null}
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

// 3. Personal Details
export const RegistrationPersonalScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { user, provider, saveProviderDraft } = useAuth();
    const draftPersonal = provider?.onboarding?.draft?.personal;
    const routePersonal = route?.params?.personal || {};
    const [name, setName] = useState(routePersonal.name || draftPersonal?.name || user?.name || '');
    const [day, setDay] = useState(routePersonal.day || draftPersonal?.day || '');
    const [month, setMonth] = useState(routePersonal.month || draftPersonal?.month || '');
    const [year, setYear] = useState(routePersonal.year || draftPersonal?.year || '');
    const [fleetId, setFleetId] = useState(routePersonal.fleetId || draftPersonal?.fleetId || '');
    const [linkedFleetName, setLinkedFleetName] = useState(routePersonal.linkedFleetName || draftPersonal?.linkedFleetName || '');
    const [fleetIdError, setFleetIdError] = useState('');
    const [isCheckingFleet, setIsCheckingFleet] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [avatarUrl, setAvatarUrl] = useState(routePersonal.avatar || draftPersonal?.avatar || user?.avatar || '');
    const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || user?.phone || '';

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    // Generate years from 1960 to Current Year
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: currentYear - 1959 }, (_, i) => (currentYear - i).toString());

    const handleDayChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned === '' || (parseInt(cleaned) <= 31 && cleaned.length <= 2)) {
            setDay(cleaned);
        }
    };

    const handleMonthChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        if (cleaned === '' || (parseInt(cleaned) <= 12 && cleaned.length <= 2)) {
            setMonth(cleaned);
        }
    };

    const handleYearChange = (text: string) => {
        const cleaned = text.replace(/[^0-9]/g, '');
        const currentYear = new Date().getFullYear();
        if (cleaned === '' || (parseInt(cleaned) <= currentYear && cleaned.length <= 4)) {
            setYear(cleaned);
        }
    };

    const handleBlurDay = () => {
        if (day.length === 1) {
            setDay(`0${day}`);
        }
    };

    const handleBlurMonth = () => {
        if (month.length === 1) {
            setMonth(`0${month}`);
        }
    };

    const handlePickProfilePhoto = async () => {
        const result = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.8,
            maxWidth: 1600,
            maxHeight: 1600,
        });

        if (result.didCancel) {
            return;
        }

        if (result.errorCode) {
            Alert.alert(
                t('provider.personal.photo_failed_title', 'Photo Upload Failed'),
                result.errorMessage || t('provider.personal.photo_failed_open', 'Could not open your photo library.')
            );
            return;
        }

        const selectedAsset = result.assets?.[0];
        const uploadPayload = selectedAsset ? buildAvatarUploadPayload(selectedAsset) : null;

        if (!uploadPayload) {
            Alert.alert(
                t('provider.personal.photo_failed_title', 'Photo Upload Failed'),
                t('provider.personal.photo_failed_invalid', 'Please choose a valid image.')
            );
            return;
        }

        const previousAvatarUrl = avatarUrl;
        setAvatarUrl(uploadPayload.uri);
        setIsUploadingAvatar(true);

        const uploadResult = await userService.uploadAvatar(uploadPayload);
        setIsUploadingAvatar(false);

        if (!uploadResult.success || !uploadResult.data?.avatar) {
            setAvatarUrl(previousAvatarUrl);
            Alert.alert(
                t('provider.personal.photo_failed_title', 'Photo Upload Failed'),
                uploadResult.error || t('provider.personal.photo_failed_upload', 'Could not upload your profile photo.')
            );
            return;
        }

        setAvatarUrl(uploadResult.data.avatar);
    };

    const handleVerifyFleetId = async () => {
        if (accountType !== 'fleet_member') {
            return true;
        }

        if (!fleetId) {
            setFleetIdError(t('provider.personal.fleet.error_required', 'Enter the fleet ID shared by your agency or head office.'));
            setLinkedFleetName('');
            return false;
        }

        setIsCheckingFleet(true);
        setFleetIdError('');

        const result = await providerService.findFleetById(fleetId);
        setIsCheckingFleet(false);

        if (!result.success) {
            setFleetIdError(result.error || t('provider.personal.fleet.error_verify', 'Unable to verify this fleet ID right now.'));
            setLinkedFleetName('');
            return false;
        }

        if (!result.data) {
            setFleetIdError(t('provider.personal.fleet.error_not_found', 'Fleet ID not found. Check with your agency or head office.'));
            setLinkedFleetName('');
            return false;
        }

        setLinkedFleetName(result.data.businessName || result.data.ownerName || result.data.fleetId || '');
        setFleetIdError('');
        return true;
    };

    const handleContinue = async () => {
        const canProceed = await handleVerifyFleetId();
        if (!canProceed) {
            return;
        }

        setIsSavingDraft(true);
        const draftResult = await saveProviderDraft({
            providerMode: accountType,
            onboarding: {
                currentStage: 'service',
                isComplete: false,
                draft: {
                    personal: {
                        name,
                        day,
                        month,
                        year,
                        avatar: avatarUrl,
                        fleetId,
                        linkedFleetName,
                    },
                },
            },
        });
        setIsSavingDraft(false);

        if (!draftResult.success) {
            Alert.alert(
                t('provider.personal.save_failed_title', 'Unable to Save'),
                draftResult.error || t('provider.personal.save_failed_message', 'Could not save your onboarding progress right now.')
            );
            return;
        }

        navigation.navigate('RegistrationService', {
            accountType,
            phone,
            personal: { name, day, month, year, fleetId, linkedFleetName, avatar: avatarUrl },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.personal.header', 'Profile Setup')} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={{ marginBottom: theme.spacing.l }}>
                        <Text style={styles.title}>
                            {t('provider.personal.title.primary', 'Who are')} <Text style={{ color: theme.colors.primary }}>{t('provider.personal.title.accent', 'You?')}</Text>
                        </Text>
                    </View>

                    {!isKeyboardVisible && (
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity style={styles.avatarButton} onPress={handlePickProfilePhoto} disabled={isUploadingAvatar}>
                                <View style={styles.avatarInner}>
                                    {avatarUrl ? (
                                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} resizeMode="cover" />
                                    ) : (
                                        <Icon name="account-circle" size={72} color={theme.colors.primary} />
                                    )}
                                    {isUploadingAvatar ? (
                                        <View style={styles.avatarLoadingOverlay}>
                                            <ActivityIndicator size="small" color="#fff" />
                                        </View>
                                    ) : null}
                                </View>
                                <View style={styles.avatarBadge}>
                                    <Icon name="add-a-photo" size={17} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ marginTop: 12, color: theme.colors.primary, fontWeight: '600' }}>
                                {isUploadingAvatar
                                    ? t('provider.personal.photo_uploading', 'Uploading Profile Photo...')
                                    : avatarUrl
                                        ? t('provider.personal.photo_change', 'Change Profile Photo')
                                        : t('provider.personal.photo_add', 'Add Profile Photo')}
                            </Text>
                        </View>
                    )}

                    <View style={{ gap: 16, marginTop: isKeyboardVisible ? 60 : 0 }}>
                        <Input
                            label={t('profile.full_name', 'Full Name')}
                            required
                            value={name}
                            onChangeText={setName}
                            placeholder={t('provider.personal.name_placeholder', 'John Doe')}
                        />
                        {accountType === 'fleet_member' ? (
                            <View>
                                <Input
                                    label={t('provider.personal.fleet.label', 'Fleet ID')}
                                    required
                                    value={fleetId}
                                    onChangeText={(text) => {
                                        setFleetId(text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                                        setLinkedFleetName('');
                                        setFleetIdError('');
                                    }}
                                    placeholder={t('provider.personal.fleet.placeholder', 'Enter the fleet ID from partner app')}
                                    autoCapitalize="characters"
                                    autoCorrect={false}
                                    autoComplete="off"
                                    spellCheck={false}
                                    maxLength={20}
                                />
                                <TouchableOpacity style={styles.fleetCheckButton} onPress={handleVerifyFleetId} disabled={isCheckingFleet}>
                                    {isCheckingFleet ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <>
                                            <Icon name="badge" size={18} color={theme.colors.primary} />
                                            <Text style={styles.fleetCheckText}>{t('provider.personal.fleet.check', 'Check Fleet ID')}</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                {linkedFleetName ? (
                                    <View style={styles.fleetStatusCard}>
                                        <Icon name="verified" size={18} color={theme.colors.success} />
                                        <Text style={styles.fleetStatusText}>{`${t('provider.personal.fleet.linked_to', 'Linked to')} ${linkedFleetName}`}</Text>
                                    </View>
                                ) : null}
                                {fleetIdError ? (
                                    <Text style={styles.fleetErrorText}>{fleetIdError}</Text>
                                ) : null}
                            </View>
                        ) : null}

                        <View>
                            <FieldLabel
                                text={t('provider.personal.dob', 'Date of Birth')}
                                required
                                style={{ marginBottom: 8, fontSize: 14 }}
                            />
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        value={day}
                                        onChangeText={handleDayChange}
                                        placeholder={t('provider.personal.dob_day', 'DD')}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        inputStyle={{ textAlign: 'center' }}
                                        onBlur={handleBlurDay}
                                    />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        value={month}
                                        onChangeText={handleMonthChange}
                                        placeholder={t('provider.personal.dob_month', 'MM')}
                                        keyboardType="number-pad"
                                        maxLength={2}
                                        inputStyle={{ textAlign: 'center' }}
                                        onBlur={handleBlurMonth}
                                    />
                                </View>
                                <View style={{ flex: 1.5 }}>
                                    <TouchableOpacity
                                        onPress={() => setShowYearPicker(true)}
                                        style={{
                                            borderWidth: 1,
                                            borderColor: theme.colors.border,
                                            borderRadius: theme.borderRadius.m,
                                            height: 56, // Match input height
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: theme.colors.surface
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, color: year ? theme.colors.text : theme.colors.textMuted }}>
                                            {year || t('provider.personal.dob_year', 'YYYY')}
                                        </Text>
                                        <Icon name="arrow-drop-down" size={24} color={theme.colors.textSecondary} style={{ position: 'absolute', right: 8 }} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Year Picker Modal */}
                    <Modal
                        visible={showYearPicker}
                        transparent={true}
                        animationType="slide"
                        onRequestClose={() => setShowYearPicker(false)}
                    >
                        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                            <View style={{ backgroundColor: theme.colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 400 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>{t('provider.personal.select_year', 'Select Year')}</Text>
                                    <TouchableOpacity onPress={() => setShowYearPicker(false)}>
                                        <Icon name="close" size={24} color={theme.colors.text} />
                                    </TouchableOpacity>
                                </View>
                                <FlatList
                                    data={years}
                                    keyExtractor={(item) => item}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity
                                            style={{ padding: 16, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.surfaceHighlight }}
                                            onPress={() => {
                                                setYear(item);
                                                setShowYearPicker(false);
                                            }}
                                        >
                                            <Text style={{ fontSize: 18, color: item === year ? theme.colors.primary : theme.colors.text }}>{item}</Text>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        </View>
                    </Modal>
                    <View style={{ height: 24 }} />
                </ScrollView>
                <View style={styles.footer}>
                    <Button
                        title={t('common.continue', 'Continue')}
                        onPress={handleContinue}
                        disabled={!name || !day || !month || !year || (accountType === 'fleet_member' && !fleetId) || isUploadingAvatar || isSavingDraft}
                        icon={<Icon name="arrow-forward" size={20} color="#fff" />}
                        style={{ backgroundColor: (!name || !day || !month || !year || (accountType === 'fleet_member' && !fleetId) || isUploadingAvatar || isSavingDraft) ? theme.colors.surfaceHighlight : theme.colors.primary }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
};

// 4. Service Details
export const RegistrationServiceScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { provider, saveProviderDraft } = useAuth();
    const routeServiceDetails = route?.params?.serviceDetails || {};
    const draftService = provider?.onboarding?.draft?.service;
    const initialLocation = routeServiceDetails.location || (draftService?.location ? {
        addressLine: draftService.location.addressLine,
        street: draftService.location.street,
        city: draftService.location.city,
        state: draftService.location.state,
        country: draftService.location.country,
        zipCode: draftService.location.zipCode,
        placeId: draftService.location.placeId,
        latitude: draftService.location.latitude,
        longitude: draftService.location.longitude,
        zoneId: draftService.location.zoneId,
        zoneName: draftService.location.zoneName,
    } : null);
    const [selectedCategories, setSelectedCategories] = useState<string[]>(routeServiceDetails.selectedCategoryValues || draftService?.selectedCategoryValues || []);
    const [experience, setExperience] = useState(routeServiceDetails.experience || draftService?.experience || '');
    const [addressQuery, setAddressQuery] = useState(routeServiceDetails.location?.addressLine || draftService?.location?.addressLine || '');
    const [selectedLocation, setSelectedLocation] = useState<RegistrationLocation | null>(initialLocation);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const [availableCategories, setAvailableCategories] = useState<ServiceCategoryItem[]>([]);
    const [isLoadingCategories, setIsLoadingCategories] = useState(true);
    const [categoryLoadError, setCategoryLoadError] = useState('');
    const [categoryLoadAttempt, setCategoryLoadAttempt] = useState(0);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone
        || ((provider?.user && typeof provider.user !== 'string') ? provider.user.phone || '' : '');
    const personal = route?.params?.personal || provider?.onboarding?.draft?.personal;

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    useEffect(() => {
        let isMounted = true;

        const loadCategories = async () => {
            setIsLoadingCategories(true);
            setCategoryLoadError('');

            try {
                const categoryRequest = serviceService.getCategories().then((result) => ({
                    source: 'categories' as const,
                    success: result.success,
                    error: result.error,
                    categories: Array.isArray(result.data)
                        ? result.data.filter((category) => category.value && Array.isArray(category.services) && category.services.length > 0)
                        : [],
                }));

                const servicesRequest = serviceService.getAll().then((result) => ({
                    source: 'services' as const,
                    success: result.success,
                    error: result.error,
                    categories: result.success && Array.isArray(result.data)
                        ? buildCategoriesFromServices(result.data)
                        : [],
                }));

                const firstResult = await Promise.race([categoryRequest, servicesRequest]);

                if (!isMounted) {
                    return;
                }

                if (firstResult.categories.length > 0) {
                    setAvailableCategories(firstResult.categories);
                    setIsLoadingCategories(false);
                    return;
                }

                if (firstResult.success) {
                    setAvailableCategories([]);
                    setCategoryLoadError('');
                    setIsLoadingCategories(false);
                    return;
                }

                const secondResult = await (
                    firstResult.source === 'categories'
                        ? servicesRequest
                        : categoryRequest
                );

                if (!isMounted) {
                    return;
                }

                if (secondResult.categories.length > 0) {
                    setAvailableCategories(secondResult.categories);
                    setIsLoadingCategories(false);
                    return;
                }

                setAvailableCategories([]);
                if (!firstResult.success && !secondResult.success) {
                    setCategoryLoadError(
                        firstResult.error
                        || secondResult.error
                        || t('provider.service.categories_error', 'Unable to load service categories right now.')
                    );
                } else {
                    setCategoryLoadError('');
                }
            } catch (error) {
                if (!isMounted) {
                    return;
                }

                setAvailableCategories([]);
                setCategoryLoadError(
                    error instanceof Error
                        ? error.message
                        : t('provider.service.categories_error', 'Unable to load service categories right now.')
                );
            } finally {
                if (isMounted) {
                    setIsLoadingCategories(false);
                }
            }
        };

        loadCategories();

        return () => {
            isMounted = false;
        };
    }, [categoryLoadAttempt, t]);

    const canContinue = !!selectedLocation?.addressLine && selectedCategories.length > 0 && !!experience;

    const handleNextStep = async () => {
        if (!canContinue) {
            return;
        }

        setIsSavingDraft(true);
        const draftResult = await saveProviderDraft({
            providerMode: accountType,
            onboarding: {
                currentStage: 'documents',
                isComplete: false,
                draft: {
                    service: {
                        selectedCategoryValues: selectedCategories,
                        experience,
                        location: selectedLocation || undefined,
                    },
                },
            },
        });
        setIsSavingDraft(false);

        if (!draftResult.success) {
            Alert.alert(
                t('provider.service.save_failed_title', 'Unable to Save'),
                draftResult.error || t('provider.service.save_failed_message', 'Could not save your onboarding progress right now.')
            );
            return;
        }

        navigation.navigate('RegistrationDocuments', {
            accountType,
            phone,
            personal,
            serviceDetails: {
                selectedCategoryValues: selectedCategories,
                availableCategories,
                experience,
                location: selectedLocation,
            },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.service.header', 'Professional Info')} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {!isKeyboardVisible && (
                        <View style={{ marginBottom: theme.spacing.l }}>
                            <Text style={styles.title}>
                                {t('provider.service.title.primary', 'Your')} <Text style={{ color: theme.colors.primary }}>{t('provider.service.title.accent', 'Expertise')}</Text>
                            </Text>
                            <Text style={styles.subtitle}>
                                {t('provider.service.subtitle', 'Enter your work address manually. We will review and confirm it during verification.')}
                            </Text>
                        </View>
                    )}

                    <Input
                        label={t('provider.service.address_label', 'Work Address')}
                        required
                        value={addressQuery}
                        onChangeText={(text) => {
                            setAddressQuery(text);
                            const trimmedText = text.trim();
                            setSelectedLocation(trimmedText ? {
                                addressLine: trimmedText,
                                street: trimmedText,
                            } : null);
                        }}
                        placeholder={t('provider.service.address_placeholder', 'Enter your full work address')}
                        autoCapitalize="words"
                        autoCorrect={false}
                        autoComplete="street-address"
                        spellCheck={false}
                    />

                    <View style={styles.infoBanner}>
                        <Icon name="info-outline" size={18} color={theme.colors.primary} />
                        <Text style={styles.infoBannerText}>
                            {t('provider.service.address_note', 'Address autosuggestions are turned off here. Enter the address you want LocalFix to review.')}
                        </Text>
                    </View>

                    <View style={{ gap: 16, marginTop: theme.spacing.m }}>
                        <Input
                            label={t('provider.service.experience_label', 'Experience (Years)')}
                            required
                            value={experience}
                            onChangeText={(text) => setExperience(text.replace(/[^0-9]/g, ''))}
                            placeholder={t('provider.service.experience_placeholder', 'e.g. 5')}
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                    </View>

                    <FieldLabel
                        text={t('provider.service.categories_label', 'Available Categories')}
                        required
                        style={{ marginTop: theme.spacing.l }}
                    />
                    {isLoadingCategories ? (
                        <View style={styles.inlineStatusRow}>
                            <ActivityIndicator size="small" color={theme.colors.primary} />
                            <Text style={styles.inlineStatusText}>{t('provider.service.categories_loading', 'Loading service categories...')}</Text>
                        </View>
                    ) : availableCategories.length > 0 ? (
                        <View style={styles.grid}>
                            {availableCategories.map((category) => {
                                const isSelected = selectedCategories.includes(category.value);
                                return (
                                    <TouchableOpacity
                                        key={category.value}
                                        style={[
                                            styles.categoryChip,
                                            isSelected && styles.categoryChipSelected,
                                        ]}
                                        onPress={() => {
                                            if (isSelected) {
                                                setSelectedCategories((current) => current.filter((value) => value !== category.value));
                                            } else {
                                                setSelectedCategories((current) => [...current, category.value]);
                                            }
                                        }}
                                    >
                                        <Text style={[
                                            styles.categoryText,
                                            isSelected && styles.categoryTextSelected,
                                        ]}>
                                            {category.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    ) : categoryLoadError ? (
                        <View>
                            <View style={styles.errorBanner}>
                                <Icon name="error-outline" size={18} color={theme.colors.error} />
                                <Text style={styles.errorBannerText}>{categoryLoadError}</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => setCategoryLoadAttempt((current) => current + 1)}
                                style={styles.retryAction}
                            >
                                <Text style={styles.retryActionText}>{t('common.retry', 'Retry')}</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.infoBanner}>
                            <Icon name="manage-search" size={18} color={theme.colors.primary} />
                            <Text style={styles.infoBannerText}>
                                {t('provider.service.categories_empty_admin', 'No active service categories are configured in admin yet. Add active services in the admin panel to show them here.')}
                            </Text>
                        </View>
                    )}

                    <View style={{ height: 24 }} />
                </ScrollView>
                <View style={styles.footer}>
                    <Button
                        title={t('provider.service.next_step', 'Next Step')}
                        onPress={handleNextStep}
                        disabled={!canContinue || isSavingDraft}
                        icon={<Icon name="build" size={20} color="#fff" />}
                        style={{ backgroundColor: (canContinue && !isSavingDraft) ? theme.colors.primary : theme.colors.surfaceHighlight }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// 5. Document Upload
export const RegistrationDocumentsScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { provider, saveProviderDraft } = useAuth();
    const initialDocuments = route?.params?.documents && typeof route.params.documents === 'object'
        ? route.params.documents as UploadedVerificationDocumentMap
        : mapVerificationDocumentsToUploadMap(provider?.verification?.documents || []);
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedVerificationDocumentMap>(initialDocuments);
    const [uploadingDocumentType, setUploadingDocumentType] = useState<VerificationDocumentType | null>(null);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || ((provider?.user && typeof provider.user !== 'string') ? provider.user.phone || '' : '');
    const personal = route?.params?.personal || provider?.onboarding?.draft?.personal;
    const serviceDetails = route?.params?.serviceDetails || provider?.onboarding?.draft?.service;
    const hasMandatoryIdDocument = Boolean(
        uploadedDocuments.aadhaar?.documentUrl
        || uploadedDocuments['driving-license']?.documentUrl
        || uploadedDocuments['passport-or-voter-id']?.documentUrl
    );

    const handleUploadDocument = async (documentType: VerificationDocumentType) => {
        const pickerResult = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.8,
            maxWidth: 1800,
            maxHeight: 1800,
        });

        if (pickerResult.didCancel) {
            return;
        }

        if (pickerResult.errorCode) {
            Alert.alert(
                t('provider.documents.upload_failed_title', 'Upload Failed'),
                pickerResult.errorMessage || t('provider.documents.upload_failed_open', 'Could not open your photo library.')
            );
            return;
        }

        const selectedAsset = pickerResult.assets?.[0];
        const uploadPayload = selectedAsset ? buildDocumentUploadPayload(selectedAsset, documentType) : null;

        if (!uploadPayload) {
            Alert.alert(
                t('provider.documents.upload_failed_title', 'Upload Failed'),
                t('provider.documents.upload_failed_prepare', 'Could not prepare the selected document.')
            );
            return;
        }

        setUploadingDocumentType(documentType);

        const uploadResult = await providerService.uploadVerificationDocument(documentType, uploadPayload);

        if (!uploadResult.success || !uploadResult.data?.documentUrl) {
            setUploadingDocumentType(null);
            Alert.alert(
                t('provider.documents.upload_failed_title', 'Upload Failed'),
                uploadResult.error || t('provider.documents.upload_failed_server', 'Could not upload the selected document.')
            );
            return;
        }

        setUploadedDocuments((current) => ({
            ...current,
            [documentType]: {
                type: documentType,
                documentUrl: uploadResult.data?.documentUrl,
                localUri: uploadPayload.uri,
                fileName: uploadResult.data?.originalName || uploadPayload.name,
                mimeType: uploadResult.data?.mimeType || uploadPayload.type,
            },
        }));
        setUploadingDocumentType(null);
    };

    const handleContinue = async () => {
        if (!hasMandatoryIdDocument || uploadingDocumentType) {
            return;
        }

        setIsSavingDraft(true);
        const draftResult = await saveProviderDraft({
            providerMode: accountType,
            onboarding: {
                currentStage: 'bank',
                isComplete: false,
            },
        });
        setIsSavingDraft(false);

        if (!draftResult.success) {
            Alert.alert(
                t('provider.documents.save_failed_title', 'Unable to Save'),
                draftResult.error || t('provider.documents.save_failed_message', 'Could not save your onboarding progress right now.')
            );
            return;
        }

        navigation.navigate('RegistrationBank', {
            accountType,
            phone,
            personal,
            serviceDetails,
            documents: uploadedDocuments,
        });
    };

    const UploadCard = ({
        title,
        documentType,
        optional = false,
    }: {
        title: string;
        documentType: VerificationDocumentType;
        optional?: boolean;
    }) => {
        const uploadedDocument = uploadedDocuments[documentType];
        const isUploaded = Boolean(uploadedDocument?.documentUrl);
        const isUploading = uploadingDocumentType === documentType;
        const statusText = isUploading
            ? t('provider.documents.uploading', 'Uploading...')
            : isUploaded
                ? uploadedDocument?.fileName || t('provider.documents.uploaded', 'Uploaded successfully')
                : t('provider.documents.tap_upload', 'Tap to upload document');

        return (
        <TouchableOpacity
            style={[
                styles.uploadCard,
                isUploaded && { borderColor: theme.colors.success, backgroundColor: theme.colors.surface },
                uploadingDocumentType && uploadingDocumentType !== documentType && { opacity: 0.55 },
            ]}
            onPress={() => handleUploadDocument(documentType)}
            disabled={Boolean(uploadingDocumentType)}
        >
            <View style={[styles.uploadIcon, isUploaded && { backgroundColor: theme.colors.surfaceHighlight }]}>
                {isUploading ? (
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                ) : (
                    <Icon name={isUploaded ? 'check-circle' : 'cloud-upload'} size={28} color={isUploaded ? theme.colors.success : theme.colors.primary} />
                )}
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.uploadTitle}>
                    {title}
                    {optional ? <Text style={styles.optionalText}> (Optional)</Text> : null}
                </Text>
                <Text style={styles.uploadStatus}>{statusText}</Text>
            </View>
            {!isUploading ? (
                <Icon name={isUploaded ? 'edit' : 'chevron-right'} size={22} color={theme.colors.textMuted} />
            ) : null}
        </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.documents.header', 'Verification')} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        {t('provider.documents.title.primary', 'Identity')} <Text style={{ color: theme.colors.primary }}>{t('provider.documents.title.accent', 'Proof')}</Text>
                    </Text>
                    <Text style={styles.subtitle}>
                        {t('provider.documents.subtitle', 'Upload any one mandatory ID proof. Extra documents help the review, but they are optional.')}
                    </Text>
                </View>

                <FieldLabel text={t('provider.documents.id_group_label', 'Any one ID proof')} required />
                <UploadCard title={t('provider.documents.aadhaar', 'Aadhaar Card')} documentType="aadhaar" />
                <UploadCard title={t('provider.documents.driving_license', 'Driving License')} documentType="driving-license" />
                <UploadCard title={t('provider.documents.passport_voter', 'Passport / Voter ID')} documentType="passport-or-voter-id" />
                <FieldLabel
                    text={t('provider.documents.optional_group_label', 'Optional supporting documents')}
                    optional
                    style={{ marginTop: theme.spacing.s }}
                />
                <UploadCard title={t('provider.documents.skill_certificate', 'Skill Certificate')} documentType="skill-certificate" optional />
                <UploadCard title={t('provider.documents.selfie_card', 'Take a Selfie')} documentType="selfie" optional />

                {hasMandatoryIdDocument && (
                    <View style={styles.verificationStatus}>
                        <Icon name="hourglass-empty" size={20} color={theme.colors.orange} />
                        <Text style={{ color: theme.colors.orange, marginLeft: 8, fontWeight: '600' }}>{t('provider.documents.review_note', 'At least one mandatory ID is added. Review will take 2-4 hours.')}</Text>
                    </View>
                )}
            </ScrollView>
            <View style={styles.footer}>
                <Button
                        title={t('provider.documents.almost_done', 'Almost Done')}
                        onPress={handleContinue}
                        disabled={!hasMandatoryIdDocument || Boolean(uploadingDocumentType) || isSavingDraft}
                        icon={<Icon name="check-circle" size={20} color="#fff" />}
                        style={{ backgroundColor: (!hasMandatoryIdDocument || Boolean(uploadingDocumentType) || isSavingDraft) ? theme.colors.surfaceHighlight : theme.colors.primary }}
                />
            </View>
        </SafeAreaView>
    );
};

// 6. Bank Details
export const RegistrationBankScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const { submitProviderProfile, isSubmitting, user, provider } = useAuth();
    const routeBank = route?.params?.bankDetails || {};
    const draftBank = provider?.onboarding?.draft?.bank;
    const [account, setAccount] = useState(routeBank.accountNumber || draftBank?.accountNumber || '');
    const [ifsc, setIfsc] = useState(routeBank.ifscCode || draftBank?.ifscCode || '');
    const [holder, setHolder] = useState(routeBank.accountHolderName || draftBank?.accountHolderName || '');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const phone = route?.params?.phone || user?.phone || '';
    const personal = route?.params?.personal || provider?.onboarding?.draft?.personal;
    const serviceDetails = route?.params?.serviceDetails || provider?.onboarding?.draft?.service;
    const documents = ((route?.params?.documents || mapVerificationDocumentsToUploadMap(provider?.verification?.documents || [])) as UploadedVerificationDocumentMap);
    const accountType = getAccountType(route);

    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener(
            'keyboardDidShow',
            () => {
                setKeyboardVisible(true);
            }
        );
        const keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            () => {
                setKeyboardVisible(false);
            }
        );

        return () => {
            keyboardDidHideListener.remove();
            keyboardDidShowListener.remove();
        };
    }, []);

    const handleComplete = async () => {
        const selectedLocation = serviceDetails?.location as RegistrationLocation | undefined;
        const availableCategories = serviceDetails?.availableCategories as ServiceCategoryItem[] | undefined;
        const serviceIds = buildServiceIdsFromCategories(
            serviceDetails?.selectedCategoryValues || [],
            availableCategories || []
        );

        if (serviceIds.length === 0) {
            Alert.alert(
                t('provider.bank.service_mapping_failed_title', 'Service Mapping Failed'),
                t('provider.bank.service_mapping_failed_message', 'No allowed services were found for the selected zone and categories.')
            );
            return;
        }

        const profileResult = await userService.updateProfile({
            name: personal?.name,
            phone,
            address: {
                street: selectedLocation?.street,
                formattedAddress: selectedLocation?.addressLine,
                city: selectedLocation?.city,
                state: selectedLocation?.state,
                country: selectedLocation?.country,
                zipCode: selectedLocation?.zipCode,
                placeId: selectedLocation?.placeId,
                zoneId: selectedLocation?.zoneId,
                zoneName: selectedLocation?.zoneName,
                coordinates: {
                    latitude: selectedLocation?.latitude,
                    longitude: selectedLocation?.longitude,
                },
            },
        });

        if (!profileResult.success) {
            Alert.alert(
                t('provider.bank.profile_update_failed_title', 'Profile Update Failed'),
                profileResult.error || t('provider.bank.profile_update_failed_message', 'Could not save your user profile.')
            );
            return;
        }

        const result = await submitProviderProfile({
            businessName: personal?.name || holder,
            providerMode: accountType,
            fleetId: accountType === 'fleet_member' ? personal?.fleetId : undefined,
            services: serviceIds,
            experience: {
                years: Number(serviceDetails?.experience || 0),
                description: `DOB ${personal?.day}/${personal?.month}/${personal?.year}`,
            },
            serviceArea: {
                cities: selectedLocation?.city ? [selectedLocation.city] : [],
                formattedAddress: selectedLocation?.addressLine,
                postalCode: selectedLocation?.zipCode,
                coordinates: {
                    latitude: selectedLocation?.latitude,
                    longitude: selectedLocation?.longitude,
                },
                zone: {
                    zoneId: selectedLocation?.zoneId,
                    name: selectedLocation?.zoneName,
                    city: selectedLocation?.city,
                    state: selectedLocation?.state,
                    country: selectedLocation?.country,
                },
                radius: 10,
                unit: 'km',
            },
            verification: {
                documents: [
                    documents?.aadhaar?.documentUrl ? { type: 'aadhaar', documentUrl: documents.aadhaar.documentUrl, status: 'pending' } : null,
                    documents?.['driving-license']?.documentUrl ? { type: 'driving-license', documentUrl: documents['driving-license'].documentUrl, status: 'pending' } : null,
                    documents?.['passport-or-voter-id']?.documentUrl ? { type: 'passport-or-voter-id', documentUrl: documents['passport-or-voter-id'].documentUrl, status: 'pending' } : null,
                    documents?.['skill-certificate']?.documentUrl ? { type: 'skill-certificate', documentUrl: documents['skill-certificate'].documentUrl, status: 'pending' } : null,
                    documents?.selfie?.documentUrl ? { type: 'selfie', documentUrl: documents.selfie.documentUrl, status: 'pending' } : null,
                ].filter(Boolean) as Array<{ type: string; documentUrl: string; status: 'pending' }>,
            },
            bankDetails: {
                accountHolderName: holder,
                accountNumber: account,
                ifscCode: ifsc,
            },
            onboarding: {
                currentStage: 'complete',
                isComplete: true,
                draft: {
                    personal: personal ? {
                        name: personal.name,
                        day: personal.day,
                        month: personal.month,
                        year: personal.year,
                        avatar: personal.avatar,
                        fleetId: personal.fleetId,
                        linkedFleetName: personal.linkedFleetName,
                    } : undefined,
                    service: serviceDetails ? {
                        selectedCategoryValues: serviceDetails.selectedCategoryValues,
                        experience: serviceDetails.experience,
                        location: serviceDetails.location,
                    } : undefined,
                    bank: {
                        accountHolderName: holder,
                        accountNumber: account,
                        ifscCode: ifsc,
                    },
                },
            },
        });

        if (!result.success) {
            Alert.alert(
                t('provider.bank.registration_failed_title', 'Registration Failed'),
                result.error || t('provider.bank.registration_failed_message', 'Unable to create provider profile.')
            );
            return;
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
        });
    };

    const completeRegistrationButton = (
        <Button
            title={isSubmitting ? t('provider.bank.submitting', 'Submitting...') : t('provider.bank.complete_registration', 'Complete Registration')}
            onPress={handleComplete}
            disabled={!holder || !account || !ifsc || isSubmitting}
            width="100%"
            variant="success"
            icon={<Icon name="check" size={20} color="#fff" />}
            style={{ backgroundColor: (!holder || !account || !ifsc) ? theme.colors.surfaceHighlight : theme.colors.success }}
        />
    );

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.bank.header', 'Payments')} />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView
                    contentContainerStyle={[styles.scrollContent, isKeyboardVisible && { paddingBottom: theme.spacing.l }]}
                    style={{ flex: 1 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {!isKeyboardVisible ? (
                        <View style={{ marginBottom: theme.spacing.l, marginTop: theme.spacing.xl }}>
                            <Text style={styles.title}>
                                {t('provider.bank.title.primary', 'Get')} <Text style={{ color: theme.colors.success }}>{t('provider.bank.title.accent', 'Paid')}</Text>
                            </Text>
                        </View>
                    ) : null}

                    <View style={{ gap: 16, marginTop: isKeyboardVisible ? theme.spacing.m : 0 }}>
                        <Input label={t('provider.bank.account_holder', 'Account Holder Name')} required value={holder} onChangeText={setHolder} placeholder={t('provider.bank.account_holder_placeholder', 'As per bank records')} />
                        <Input label={t('provider.bank.account_number', 'Account Number')} required value={account} onChangeText={setAccount} placeholder={t('provider.bank.account_number_placeholder', 'Enter account number')} keyboardType="number-pad" />
                        <Input label={t('provider.bank.ifsc', 'IFSC Code')} required value={ifsc} onChangeText={setIfsc} placeholder={t('provider.bank.ifsc_placeholder', 'Enter IFSC code')} />
                    </View>

                    <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceHighlight, padding: 12, borderRadius: 8 }]}>
                        <Icon name="lock" size={16} color={theme.colors.textMuted} />
                        <Text style={styles.infoText}>{t('provider.bank.security_note', 'Your bank details are encrypted and secure.')}</Text>
                    </View>

                    {isKeyboardVisible ? (
                        <View style={styles.keyboardActionWrap}>
                            {completeRegistrationButton}
                        </View>
                    ) : null}
                </ScrollView>
                {!isKeyboardVisible ? (
                    <View style={styles.footer}>
                        {completeRegistrationButton}
                    </View>
                ) : null}
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const PARTNER_SERVICE_MODELS = [
    { value: 'Driver Network', key: 'provider.partner.operations.model.driver_network' },
    { value: 'Service Agency', key: 'provider.partner.operations.model.service_agency' },
    { value: 'Mixed Team', key: 'provider.partner.operations.model.mixed_team' },
];
const PARTNER_CATEGORIES = [
    { value: 'Driver', key: 'provider.partner.operations.category.driver' },
    { value: 'Electrician', key: 'provider.partner.operations.category.electrician' },
    { value: 'Plumber', key: 'provider.partner.operations.category.plumber' },
    { value: 'AC Technician', key: 'provider.partner.operations.category.ac_technician' },
    { value: 'Mechanic', key: 'provider.partner.operations.category.mechanic' },
];
const PARTNER_TYPES = [
    { value: 'agency', key: 'provider.partner.company.type.agency' },
    { value: 'head_office', key: 'provider.partner.company.type.head_office' },
];

export const PartnerCompanyScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [city, setCity] = useState('');
    const [gstin, setGstin] = useState('');
    const [partnerType, setPartnerType] = useState<'agency' | 'head_office' | ''>('');
    const [fleetId, setFleetId] = useState('');

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.partner.company.header', 'Partner Business')} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        {t('provider.partner.company.title.primary', 'Set up your')} <Text style={{ color: theme.colors.success }}>{t('provider.partner.company.title.accent', 'Agency')}</Text>
                    </Text>
                    <Text style={styles.subtitle}>{t('provider.partner.company.subtitle', 'Tell us who will operate this partner account and where the business runs.')}</Text>
                </View>

                <View style={styles.partnerInfoBanner}>
                    <Icon name="apartment" size={20} color={theme.colors.success} />
                    <Text style={styles.partnerInfoText}>{t('provider.partner.company.banner', 'One partner account can manage multiple drivers or service professionals.')}</Text>
                </View>

                <FieldLabel text={t('provider.partner.company.type_label', 'Partner Type')} required />
                <View style={styles.grid}>
                    {PARTNER_TYPES.map(type => {
                        const isSelected = partnerType === type.value;
                        return (
                            <TouchableOpacity
                                key={type.value}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => setPartnerType(type.value as 'agency' | 'head_office')}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{t(type.key, type.value)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Input label={t('provider.partner.company.business_name', 'Business / Agency Name')} required value={businessName} onChangeText={setBusinessName} placeholder={t('provider.partner.company.business_name_placeholder', 'FastTrack Services')} />
                <Input label={t('provider.partner.company.owner_name', 'Owner / Manager Name')} required value={ownerName} onChangeText={setOwnerName} placeholder={t('provider.partner.company.owner_name_placeholder', 'Enter full name')} />
                <Input label={t('provider.partner.company.primary_city', 'Primary City')} required value={city} onChangeText={setCity} placeholder={t('provider.partner.company.primary_city_placeholder', 'Bengaluru')} />
                <Input
                    label={t('provider.partner.company.fleet_id', 'Existing Fleet ID')}
                    optional
                    value={fleetId}
                    onChangeText={(text) => setFleetId(text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder={t('provider.partner.company.fleet_id_placeholder', 'Enter if you already have one')}
                />
                <Input label={t('provider.partner.company.gstin', 'GSTIN / Business ID')} optional value={gstin} onChangeText={setGstin} placeholder={t('provider.partner.company.gstin_placeholder', 'Business registration number')} />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={t('common.continue', 'Continue')}
                    onPress={() => navigation.navigate('PartnerOperations', {
                        company: { businessName, ownerName, city, gstin, partnerType, fleetId },
                    })}
                    disabled={!businessName || !ownerName || !city || !partnerType}
                />
            </View>
        </SafeAreaView>
    );
};

export const PartnerOperationsScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [coverageArea, setCoverageArea] = useState('');
    const [fleetSize, setFleetSize] = useState('');
    const company = route?.params?.company;

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.partner.operations.header', 'Operations Setup')} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        {t('provider.partner.operations.title.primary', 'How does your')} <Text style={{ color: theme.colors.success }}>{t('provider.partner.operations.title.accent', 'team')}</Text> {t('provider.partner.operations.title.suffix', 'operate?')}
                    </Text>
                    <Text style={styles.subtitle}>{t('provider.partner.operations.subtitle', 'Choose your model and the kinds of workers you want to onboard under this partner account.')}</Text>
                </View>

                <FieldLabel text={t('provider.partner.operations.service_model', 'Service Model')} required />
                <View style={styles.grid}>
                    {PARTNER_SERVICE_MODELS.map(model => {
                        const isSelected = selectedModel === model.value;
                        return (
                            <TouchableOpacity
                                key={model.value}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => setSelectedModel(model.value)}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{t(model.key, model.value)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <FieldLabel text={t('provider.partner.operations.team_categories', 'Team Categories')} required />
                <View style={styles.grid}>
                    {PARTNER_CATEGORIES.map(category => {
                        const isSelected = selectedCategories.includes(category.value);
                        return (
                            <TouchableOpacity
                                key={category.value}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => {
                                    if (isSelected) {
                                        setSelectedCategories(prev => prev.filter(item => item !== category.value));
                                    } else {
                                        setSelectedCategories(prev => [...prev, category.value]);
                                    }
                                }}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{t(category.key, category.value)}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Input label={t('provider.partner.operations.coverage_area', 'Coverage Area')} required value={coverageArea} onChangeText={setCoverageArea} placeholder={t('provider.partner.operations.coverage_area_placeholder', 'City, zones, or pin codes')} />
                <Input
                    label={t('provider.partner.operations.team_size', 'Current Team Size')}
                    required
                    value={fleetSize}
                    onChangeText={(text) => setFleetSize(text.replace(/[^0-9]/g, ''))}
                    placeholder={t('provider.partner.operations.team_size_placeholder', 'Number of active drivers / technicians')}
                    keyboardType="number-pad"
                    maxLength={3}
                />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={t('common.continue', 'Continue')}
                    onPress={() => navigation.navigate('PartnerVerification', {
                        company,
                        operations: {
                            selectedModel,
                            selectedCategories,
                            coverageArea,
                            fleetSize,
                        },
                    })}
                    disabled={!selectedModel || selectedCategories.length === 0 || !coverageArea || !fleetSize}
                />
            </View>
        </SafeAreaView>
    );
};

export const PartnerVerificationScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const initialDocuments = route?.params?.verification && typeof route.params.verification === 'object'
        ? route.params.verification as UploadedVerificationDocumentMap
        : {};
    const [uploadedDocuments, setUploadedDocuments] = useState<UploadedVerificationDocumentMap>(initialDocuments);
    const [uploadingDocumentType, setUploadingDocumentType] = useState<VerificationDocumentType | null>(null);
    const company = route?.params?.company;
    const operations = route?.params?.operations;
    const hasRequiredDocuments = Boolean(
        uploadedDocuments['company-registration']?.documentUrl
        && uploadedDocuments['owner-id']?.documentUrl
        && uploadedDocuments['office-proof']?.documentUrl
    );

    const handleUploadDocument = async (documentType: 'company-registration' | 'owner-id' | 'office-proof') => {
        const pickerResult = await launchImageLibrary({
            mediaType: 'photo',
            selectionLimit: 1,
            quality: 0.8,
            maxWidth: 1800,
            maxHeight: 1800,
        });

        if (pickerResult.didCancel) {
            return;
        }

        if (pickerResult.errorCode) {
            Alert.alert(
                t('provider.partner.verification.upload_failed_title', 'Upload Failed'),
                pickerResult.errorMessage || t('provider.partner.verification.upload_failed_open', 'Could not open your photo library.')
            );
            return;
        }

        const selectedAsset = pickerResult.assets?.[0];
        const uploadPayload = selectedAsset ? buildDocumentUploadPayload(selectedAsset, documentType) : null;

        if (!uploadPayload) {
            Alert.alert(
                t('provider.partner.verification.upload_failed_title', 'Upload Failed'),
                t('provider.partner.verification.upload_failed_prepare', 'Could not prepare the selected document.')
            );
            return;
        }

        setUploadingDocumentType(documentType);

        const uploadResult = await providerService.uploadVerificationDocument(documentType, uploadPayload);

        if (!uploadResult.success || !uploadResult.data?.documentUrl) {
            setUploadingDocumentType(null);
            Alert.alert(
                t('provider.partner.verification.upload_failed_title', 'Upload Failed'),
                uploadResult.error || t('provider.partner.verification.upload_failed_server', 'Could not upload the selected document.')
            );
            return;
        }

        const uploadedData = uploadResult.data;

        setUploadedDocuments((current) => ({
            ...current,
            [documentType]: {
                type: documentType,
                documentUrl: uploadedData.documentUrl,
                localUri: uploadPayload.uri,
                fileName: uploadedData.originalName || uploadPayload.name,
                mimeType: uploadedData.mimeType || uploadPayload.type,
            },
        }));
        setUploadingDocumentType(null);
    };

    const uploadItems = [
        {
            title: t('provider.partner.verification.company_doc', 'Company Registration / GST'),
            type: 'company-registration' as const,
        },
        {
            title: t('provider.partner.verification.owner_id', 'Owner ID Proof'),
            type: 'owner-id' as const,
        },
        {
            title: t('provider.partner.verification.office_proof', 'Office Address Proof'),
            type: 'office-proof' as const,
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.partner.verification.header', 'Partner Verification')} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        {t('provider.partner.verification.title.primary', 'Verify your')} <Text style={{ color: theme.colors.success }}>{t('provider.partner.verification.title.accent', 'business')}</Text>
                    </Text>
                    <Text style={styles.subtitle}>{t('provider.partner.verification.subtitle', 'Upload the core documents required to activate partner mode and start adding your team.')}</Text>
                </View>

                <FieldLabel text={t('provider.partner.verification.required_docs', 'Required documents')} required />
                {uploadItems.map((item) => (
                    (() => {
                        const isUploaded = Boolean(uploadedDocuments[item.type]?.documentUrl);
                        const isUploading = uploadingDocumentType === item.type;

                        return (
                            <TouchableOpacity
                                key={item.title}
                                style={[
                                    styles.uploadCard,
                                    isUploaded ? { borderColor: theme.colors.success, backgroundColor: theme.colors.surface } : undefined,
                                    uploadingDocumentType && uploadingDocumentType !== item.type ? { opacity: 0.55 } : undefined,
                                ]}
                                onPress={() => handleUploadDocument(item.type)}
                                disabled={Boolean(uploadingDocumentType)}
                            >
                                <View style={[styles.uploadIcon, isUploaded ? { backgroundColor: '#dcfce7' } : undefined]}>
                                    {isUploading ? (
                                        <ActivityIndicator size="small" color={theme.colors.primary} />
                                    ) : (
                                        <Icon
                                            name={isUploaded ? 'check-circle' : 'description'}
                                            size={26}
                                            color={isUploaded ? theme.colors.success : theme.colors.primary}
                                        />
                                    )}
                                </View>
                                <View style={{ flex: 1, marginLeft: 16 }}>
                                    <Text style={styles.uploadTitle}>{item.title}</Text>
                                    <Text style={styles.uploadStatus}>
                                        {isUploading
                                            ? t('provider.partner.verification.uploading', 'Uploading...')
                                            : isUploaded
                                                ? uploadedDocuments[item.type]?.fileName || t('provider.partner.verification.uploaded', 'Uploaded successfully')
                                                : t('provider.partner.verification.tap_upload', 'Tap to upload document')}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })()
                ))}

                <View style={styles.verificationStatus}>
                    <Icon name="verified-user" size={20} color={theme.colors.success} />
                    <Text style={[styles.infoText, { color: theme.colors.success, marginLeft: 8 }]}>{t('provider.partner.verification.banner', 'Partner verification can be reviewed before team activation.')}</Text>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={t('common.continue', 'Continue')}
                    onPress={() => navigation.navigate('PartnerTeam', {
                        company,
                        operations,
                        verification: uploadedDocuments,
                    })}
                    disabled={!hasRequiredDocuments || Boolean(uploadingDocumentType)}
                />
            </View>
        </SafeAreaView>
    );
};

export const PartnerTeamScreen = ({ navigation, route }: any) => {
    const { t } = useTranslation();
    const [teamLeadName, setTeamLeadName] = useState('');
    const [supportPhone, setSupportPhone] = useState('');
    const [teamCapacity, setTeamCapacity] = useState('');
    const [notes, setNotes] = useState('');
    const { submitProviderProfile, isSubmitting } = useAuth();
    const company = route?.params?.company;
    const operations = route?.params?.operations;
    const verification = (route?.params?.verification || {}) as UploadedVerificationDocumentMap;

    const handleComplete = async () => {
        const profileResult = await userService.updateProfile({
            name: company?.ownerName,
            phone: supportPhone,
            address: {
                city: company?.city,
            },
        });

        if (!profileResult.success) {
            Alert.alert(
                t('provider.partner.team.profile_update_failed_title', 'Profile Update Failed'),
                profileResult.error || t('provider.partner.team.profile_update_failed_message', 'Could not save partner owner profile.')
            );
            return;
        }

        const serviceResolution = await resolveServiceIds(operations?.selectedCategories || []);
        if (!serviceResolution.success) {
            Alert.alert(
                t('provider.partner.team.service_mapping_failed_title', 'Service Mapping Failed'),
                serviceResolution.error || t('provider.partner.team.service_mapping_failed_message', 'Could not map partner services.')
            );
            return;
        }

        const result = await submitProviderProfile({
            businessName: company?.businessName,
            providerMode: 'partner',
            partnerType: company?.partnerType,
            fleetId: company?.fleetId || undefined,
            ownerName: company?.ownerName,
            supportPhone,
            teamSize: Number(teamCapacity || operations?.fleetSize || 0),
            services: serviceResolution.data,
            experience: {
                years: Number(operations?.fleetSize || 0),
                description: `${operations?.selectedModel || 'Partner'} | Lead: ${teamLeadName} | Capacity: ${teamCapacity} | ${notes}`,
            },
            serviceArea: {
                cities: operations?.coverageArea ? [operations.coverageArea] : company?.city ? [company.city] : [],
                radius: 25,
                unit: 'km',
            },
            verification: {
                documents: [
                    verification?.['company-registration']?.documentUrl ? { type: 'company-registration', documentUrl: verification['company-registration'].documentUrl, status: 'pending' } : null,
                    verification?.['owner-id']?.documentUrl ? { type: 'owner-id', documentUrl: verification['owner-id'].documentUrl, status: 'pending' } : null,
                    verification?.['office-proof']?.documentUrl ? { type: 'office-proof', documentUrl: verification['office-proof'].documentUrl, status: 'pending' } : null,
                ].filter(Boolean) as Array<{ type: string; documentUrl: string; status: 'pending' }>,
            },
        });

        if (!result.success) {
            Alert.alert(
                t('provider.partner.team.registration_failed_title', 'Partner Registration Failed'),
                result.error || t('provider.partner.team.registration_failed_message', 'Unable to create partner provider profile.')
            );
            return;
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title={t('provider.partner.team.header', 'Team Setup')} />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        {t('provider.partner.team.title.primary', 'Add your first')} <Text style={{ color: theme.colors.success }}>{t('provider.partner.team.title.accent', 'team details')}</Text>
                    </Text>
                    <Text style={styles.subtitle}>{t('provider.partner.team.subtitle', 'This sets up the partner account for allocating jobs to your drivers or technicians.')}</Text>
                </View>

                <Input label={t('provider.partner.team.operations_lead', 'Operations Lead')} required value={teamLeadName} onChangeText={setTeamLeadName} placeholder={t('provider.partner.team.operations_lead_placeholder', 'Team manager or dispatcher name')} />
                <Input
                    label={t('provider.partner.team.support_phone', 'Support Phone')}
                    required
                    value={supportPhone}
                    onChangeText={(text) => setSupportPhone(text.replace(/[^0-9]/g, ''))}
                    placeholder={t('provider.partner.team.support_phone_placeholder', 'Partner support number')}
                    keyboardType="phone-pad"
                    maxLength={10}
                />
                <Input
                    label={t('provider.partner.team.max_jobs', 'Max Concurrent Jobs')}
                    required
                    value={teamCapacity}
                    onChangeText={(text) => setTeamCapacity(text.replace(/[^0-9]/g, ''))}
                    placeholder={t('provider.partner.team.max_jobs_placeholder', 'How many jobs can your team handle at once?')}
                    keyboardType="number-pad"
                    maxLength={3}
                />
                <Input
                    label={t('provider.partner.team.notes', 'Notes for Admin Review')}
                    optional
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t('provider.partner.team.notes_placeholder', 'Any extra information about your team, fleet, or service model')}
                    multiline
                />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={isSubmitting ? t('provider.partner.team.submitting', 'Submitting...') : t('provider.partner.team.complete_registration', 'Complete Partner Registration')}
                    onPress={handleComplete}
                    disabled={!teamLeadName || supportPhone.length < 10 || !teamCapacity || isSubmitting}
                    variant="success"
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
    header: {
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
    },
    content: {
        padding: theme.spacing.xl,
    },
    compactContent: {
        paddingHorizontal: theme.spacing.l,
        paddingVertical: theme.spacing.l,
    },
    authScrollContent: {
        flexGrow: 1,
        paddingBottom: theme.spacing.m,
    },
    scrollContent: {
        padding: theme.spacing.xl,
    },
    langButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 1,
        borderColor: theme.colors.border,
    },
    langText: {
        color: theme.colors.text,
        marginHorizontal: 4,
        fontWeight: '600',
        fontSize: 13,
    },
    title: {
        fontSize: theme.typography.h1.fontSize,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: 4, // Tighter spacing
    },
    compactTitle: {
        fontSize: 32,
    },
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        marginTop: 8,
    },
    compactSubtitle: {
        marginBottom: theme.spacing.l,
        marginTop: 6,
    },
    heroContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.l,
    },
    compactHeroContainer: {
        marginBottom: theme.spacing.m,
    },
    heroImage: {
        width: 250,
        height: 260,
    },
    compactHeroImage: {
        width: 190,
        height: 190,
    },
    authIntro: {
        marginBottom: theme.spacing.xl,
    },
    compactAuthIntro: {
        marginBottom: theme.spacing.l,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    prefixContainer: {
        backgroundColor: theme.colors.surface,
        paddingHorizontal: theme.spacing.m,
        height: 56, // Match approximate input height
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: theme.borderRadius.m,
        borderWidth: 1.5, // slightly thicker
        borderColor: theme.colors.border,
        marginRight: theme.spacing.m,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    prefix: {
        fontSize: 16,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    helperText: {
        marginTop: theme.spacing.l,
        color: theme.colors.textMuted,
        fontSize: 14,
        paddingBottom: 20,
    },
    keyboardActionWrap: {
        marginTop: theme.spacing.xxl,
        marginBottom: theme.spacing.m,
    },
    compactHelperText: {
        marginTop: theme.spacing.m,
        paddingBottom: theme.spacing.s,
    },
    fleetCheckButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.s,
        borderRadius: theme.borderRadius.m,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        marginTop: -4,
        marginBottom: theme.spacing.s,
    },
    fleetCheckText: {
        color: theme.colors.primary,
        fontWeight: '700',
        marginLeft: theme.spacing.s,
    },
    fleetStatusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5',
        borderColor: '#a7f3d0',
        borderWidth: 1,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.s,
    },
    fleetStatusText: {
        color: '#047857',
        fontWeight: '600',
        marginLeft: theme.spacing.s,
        flex: 1,
    },
    fleetErrorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: -4,
        marginBottom: theme.spacing.s,
        fontWeight: '600',
    },
    suggestionList: {
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        borderRadius: theme.borderRadius.m,
        marginTop: -4,
        marginBottom: theme.spacing.m,
        overflow: 'hidden',
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingVertical: theme.spacing.m,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.border,
        gap: theme.spacing.s,
    },
    suggestionText: {
        flex: 1,
        color: theme.colors.text,
    },
    inlineStatusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
        marginTop: -4,
        marginBottom: theme.spacing.m,
    },
    inlineStatusText: {
        color: theme.colors.textSecondary,
        fontSize: 13,
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
        backgroundColor: theme.colors.surfaceHighlight,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    infoBannerText: {
        color: theme.colors.textSecondary,
        flex: 1,
    },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: theme.spacing.s,
        backgroundColor: 'rgba(220, 38, 38, 0.08)',
        borderColor: 'rgba(220, 38, 38, 0.18)',
        borderWidth: 1,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    errorBannerText: {
        color: theme.colors.error,
        flex: 1,
        fontWeight: '600',
    },
    retryAction: {
        alignSelf: 'flex-start',
        paddingHorizontal: theme.spacing.s,
        paddingVertical: 6,
        marginTop: -4,
        marginBottom: theme.spacing.m,
    },
    retryActionText: {
        color: theme.colors.primary,
        fontWeight: '700',
    },
    successBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: theme.spacing.s,
        backgroundColor: 'rgba(22, 163, 74, 0.10)',
        borderColor: 'rgba(22, 163, 74, 0.24)',
        borderWidth: 1,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.m,
    },
    successBannerTitle: {
        color: theme.colors.success,
        fontWeight: '700',
        marginBottom: 4,
    },
    successBannerText: {
        color: theme.colors.textSecondary,
    },
    footer: {
        padding: theme.spacing.xl,
        // borderTopWidth: 1,
        // borderTopColor: theme.colors.border,
        marginBottom: theme.spacing.s,
    },
    compactFooter: {
        paddingHorizontal: theme.spacing.l,
        paddingTop: theme.spacing.m,
        paddingBottom: theme.spacing.m,
    },
    resendButton: {
        alignItems: 'center',
        paddingVertical: theme.spacing.s,
        marginTop: theme.spacing.s,
    },
    resendButtonText: {
        color: theme.colors.orange,
        fontWeight: '700',
        fontSize: 14,
    },
    // Personal Styles
    avatarContainer: {
        alignItems: 'center',
        marginBottom: theme.spacing.xl,
    },
    avatarButton: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5,
        borderWidth: 4,
        borderColor: '#fff',
    },
    avatarInner: {
        width: 112,
        height: 112,
        borderRadius: 56,
        backgroundColor: 'rgba(99, 102, 241, 0.10)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    avatarLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(15, 23, 42, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: theme.colors.primary,
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#fff',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: theme.colors.surfaceHighlight,
        borderWidth: 2,
        borderColor: theme.colors.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        marginTop: 8,
        color: theme.colors.primary,
        fontSize: 12,
        fontWeight: '600'
    },
    // Service Styles
    label: {
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.m,
        fontWeight: '600',
    },
    requiredMark: {
        color: theme.colors.error,
        fontWeight: '700',
    },
    optionalText: {
        color: theme.colors.textMuted,
        fontWeight: '500',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: theme.spacing.l,
        marginHorizontal: -4,
    },
    categoryChip: {
        paddingHorizontal: theme.spacing.l,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: theme.colors.surface,
        borderWidth: 1,
        borderColor: theme.colors.border,
        margin: 4,
    },
    categoryChipSelected: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        shadowColor: theme.colors.primary,
        shadowOpacity: 0.3,
        elevation: 4,
    },
    categoryText: {
        color: theme.colors.textSecondary,
        fontWeight: '500',
    },
    categoryTextSelected: {
        color: '#fff',
        fontWeight: '700',
    },
    // Document Styles
    uploadCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.m,
        borderWidth: 1,
        borderColor: theme.colors.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        elevation: 1,
    },
    uploadIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: theme.colors.surfaceHighlight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    uploadTitle: {
        color: theme.colors.text,
        fontWeight: '600',
        marginBottom: 4,
    },
    uploadStatus: {
        color: theme.colors.textSecondary,
        fontSize: 12,
    },
    verificationStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(249, 115, 22, 0.1)', // Orange tint
        padding: theme.spacing.m,
        borderRadius: theme.borderRadius.m,
        marginTop: theme.spacing.m,
        borderWidth: 1,
        borderColor: 'rgba(249, 115, 22, 0.3)'
    },
    // Bank
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: theme.spacing.l,
    },
    infoText: {
        color: theme.colors.textMuted,
        fontSize: 12,
        marginLeft: 6
    },
    partnerInfoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        borderRadius: theme.borderRadius.m,
        padding: theme.spacing.m,
        marginBottom: theme.spacing.l,
    },
    partnerInfoText: {
        flex: 1,
        color: '#047857',
        marginLeft: theme.spacing.s,
        lineHeight: 20,
        fontWeight: '500',
    },
    partnerChipSelected: {
        backgroundColor: theme.colors.success,
        borderColor: theme.colors.success,
    }
});
