import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, KeyboardAvoidingView, Platform, Keyboard, Modal, FlatList, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

import LottieView from 'lottie-react-native';
import { theme } from '../../config/theme';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Header } from '../../components/Header'; // We'll create this later or inline it
import { useAuth } from '../../context/AuthContext';
import { providerService } from '../../services/providerService';
import { userService } from '../../services/userService';
import { serviceService } from '../../services/serviceService';

type RegistrationAccountType = 'individual' | 'fleet_member';

const getAccountType = (route: any): RegistrationAccountType => {
    return route?.params?.accountType === 'fleet_member' ? 'fleet_member' : 'individual';
};

const CATEGORY_TO_SERVICE_MAP: Record<string, string> = {
    Electrician: 'electrical',
    Plumber: 'plumbing',
    'AC Technician': 'ac-repair',
    Mechanic: 'appliance-repair',
    Carpenter: 'carpentry',
    Painter: 'painting',
    Driver: 'other',
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

    const mappedCategories = categories.map(category => CATEGORY_TO_SERVICE_MAP[category] || category.toLowerCase());
    const serviceIds = servicesResult.data
        .filter(service => mappedCategories.includes(service.category))
        .map(service => service._id);

    if (serviceIds.length === 0) {
        return {
            success: false,
            error: 'No matching backend services found for the selected categories',
            data: [] as string[],
        };
    }

    return {
        success: true,
        data: serviceIds,
    };
};

// 1. Phone Login
export const RegistrationPhoneScreen = ({ navigation, route }: any) => {
    const [phone, setPhone] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
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
            Alert.alert('OTP Failed', result.error || 'Unable to send OTP right now.');
            return;
        }

        navigation.navigate('RegistrationOTP', {
            accountType,
            phone,
            debugOtp: result.otp,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <Text style={styles.pageNumber}>Page 4</Text>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={styles.content}>
                        {!isKeyboardVisible && (
                            <View style={{ alignItems: 'center', marginBottom: theme.spacing.l }}>
                                <Image
                                    source={require('../../assets/login_hero.png')}
                                    style={{ width: 250, height: 260 }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: theme.spacing.xl }}>
                            <Text style={styles.title}>Earn more with</Text>
                            <Text style={[styles.title, { color: theme.colors.primary }]}>Local Fix Pro</Text>
                            <Text style={styles.subtitle}>
                                {accountType === 'fleet_member'
                                    ? 'Enter the number linked to your fleet membership.'
                                    : 'Enter your phone number to login or register.'}
                            </Text>
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.prefixContainer}>
                                <Text style={styles.prefix}>🇮🇳 +91</Text>
                            </View>
                            <Input
                                value={phone}
                                onChangeText={handlePhoneChange}
                                placeholder="Phone number"
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


                        <Text style={[styles.helperText, { paddingBottom: 20 }]}>
                            We will send a 4-digit OTP to verify your number.
                        </Text>
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <Button
                        title={isSubmitting ? 'Sending...' : 'Send OTP'}
                        onPress={handleSendOtp}
                        disabled={phone.length < 10 || isSubmitting}
                        icon={<Icon name="arrow-forward" size={20} color="#fff" />}
                        style={{ backgroundColor: phone.length < 10 ? theme.colors.surfaceHighlight : theme.colors.primary }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// 2. OTP Verification
export const RegistrationOTPScreen = ({ navigation, route }: any) => {
    const [otp, setOtp] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || '';
    const { verifyOtp, isSubmitting } = useAuth();

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

    const handleVerifyOtp = async () => {
        const result = await verifyOtp(phone, otp);

        if (!result.success) {
            Alert.alert('Verification Failed', result.error || 'Invalid OTP');
            return;
        }

        navigation.navigate('RegistrationPersonal', {
            accountType,
            phone,
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <Text style={styles.pageNumber}>Page 5</Text>
            </View>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ flex: 1 }} keyboardShouldPersistTaps="handled">
                    <View style={styles.content}>
                        {!isKeyboardVisible && (
                            <View style={{ alignItems: 'center', marginBottom: theme.spacing.l }}>
                                <Image
                                    source={require('../../assets/otp_hero.png')}
                                    style={{ width: 200, height: 200 }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        <View style={{ marginBottom: theme.spacing.xl, alignItems: 'center', marginTop: isKeyboardVisible ? 150 : 0 }}>
                            <Text style={[styles.title, { textAlign: 'center' }]}>
                                Verify <Text style={{ color: theme.colors.primary }}>Identity</Text>
                            </Text>
                            <Text style={[styles.subtitle, { textAlign: 'center', maxWidth: 300 }]}>Enter the 4-digit code sent to your number.</Text>
                            {route?.params?.debugOtp ? (
                                <View style={styles.testOtpBox}>
                                    <Text style={styles.testOtpLabel}>Test OTP</Text>
                                    <Text style={styles.testOtpValue}>{route.params.debugOtp}</Text>
                                </View>
                            ) : null}
                        </View>

                        <Input
                            value={otp}
                            onChangeText={setOtp}
                            placeholder="0 0 0 0 0 0"
                            keyboardType="number-pad"
                            maxLength={4}
                            inputStyle={{
                                textAlign: 'center',
                                letterSpacing: 12,
                                fontSize: 24,
                                fontWeight: 'bold',
                                height: 64
                            }}
                        />
                    </View>
                </ScrollView>
                <View style={styles.footer}>
                    <Button
                        title={isSubmitting ? 'Verifying...' : 'Verify Securely'}
                        onPress={handleVerifyOtp}
                        disabled={otp.length < 4 || isSubmitting}
                        icon={<Icon name="shield" size={20} color="#fff" />}
                        style={{ backgroundColor: otp.length < 4 ? theme.colors.surfaceHighlight : theme.colors.primary }}
                    />
                    <TouchableOpacity style={styles.resendButton}>
                        <Text style={styles.resendButtonText}>Resend Code</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>

        </SafeAreaView>
    );
};

// 3. Personal Details
export const RegistrationPersonalScreen = ({ navigation, route }: any) => {
    const [name, setName] = useState('');
    const [day, setDay] = useState('');
    const [month, setMonth] = useState('');
    const [year, setYear] = useState('');
    const [fleetId, setFleetId] = useState('');
    const [linkedFleetName, setLinkedFleetName] = useState('');
    const [fleetIdError, setFleetIdError] = useState('');
    const [isCheckingFleet, setIsCheckingFleet] = useState(false);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || '';

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

    const handleVerifyFleetId = async () => {
        if (accountType !== 'fleet_member') {
            return true;
        }

        if (!fleetId) {
            setFleetIdError('Enter the fleet ID shared by your agency or head office.');
            setLinkedFleetName('');
            return false;
        }

        setIsCheckingFleet(true);
        setFleetIdError('');

        const result = await providerService.findFleetById(fleetId);
        setIsCheckingFleet(false);

        if (!result.success) {
            setFleetIdError(result.error || 'Unable to verify this fleet ID right now.');
            setLinkedFleetName('');
            return false;
        }

        if (!result.data) {
            setFleetIdError('Fleet ID not found. Check with your agency or head office.');
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

        navigation.navigate('RegistrationService', {
            accountType,
            phone,
            personal: { name, day, month, year, fleetId, linkedFleetName },
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={{ position: 'absolute', top: 16, left: 16, zIndex: 10 }}>
                <Text style={styles.pageNumber}>Page 6</Text>
            </View>
            <Header onBack={() => navigation.goBack()} title="Profile Setup" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={{ marginBottom: theme.spacing.l }}>
                        <Text style={styles.title}>
                            Who are <Text style={{ color: theme.colors.primary }}>You?</Text>
                        </Text>
                    </View>

                    {!isKeyboardVisible && (
                        <View style={styles.avatarContainer}>
                            <TouchableOpacity style={{
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
                                borderColor: '#fff'
                            }}>
                                <View style={{
                                    width: 112,
                                    height: 112,
                                    borderRadius: 56,
                                    backgroundColor: 'rgba(99, 102, 241, 0.10)',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    overflow: 'hidden'
                                }}>
                                    <Icon name="account-circle" size={72} color={theme.colors.primary} />
                                </View>
                                <View style={{
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
                                    borderColor: '#fff'
                                }}>
                                    <Icon name="add-a-photo" size={17} color="#fff" />
                                </View>
                            </TouchableOpacity>
                            <Text style={{ marginTop: 12, color: theme.colors.primary, fontWeight: '600' }}>
                                Add Profile Photo
                            </Text>
                        </View>
                    )}

                    <View style={{ gap: 16, marginTop: isKeyboardVisible ? 60 : 0 }}>
                        <Input label="Full Name" value={name} onChangeText={setName} placeholder="John Doe" />
                        {accountType === 'fleet_member' ? (
                            <View>
                                <Input
                                    label="Fleet ID"
                                    value={fleetId}
                                    onChangeText={(text) => {
                                        setFleetId(text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''));
                                        setLinkedFleetName('');
                                        setFleetIdError('');
                                    }}
                                    placeholder="Enter the fleet ID from partner app"
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
                                            <Text style={styles.fleetCheckText}>Check Fleet ID</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                                {linkedFleetName ? (
                                    <View style={styles.fleetStatusCard}>
                                        <Icon name="verified" size={18} color={theme.colors.success} />
                                        <Text style={styles.fleetStatusText}>Linked to {linkedFleetName}</Text>
                                    </View>
                                ) : null}
                                {fleetIdError ? (
                                    <Text style={styles.fleetErrorText}>{fleetIdError}</Text>
                                ) : null}
                            </View>
                        ) : null}

                        <View>
                            <Text style={{ color: theme.colors.textSecondary, marginBottom: 8, fontWeight: '600', fontSize: 14 }}>Date of Birth</Text>
                            <View style={{ flexDirection: 'row', gap: 12 }}>
                                <View style={{ flex: 1 }}>
                                    <Input
                                        value={day}
                                        onChangeText={handleDayChange}
                                        placeholder="DD"
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
                                        placeholder="MM"
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
                                            {year || 'YYYY'}
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
                                    <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.colors.text }}>Select Year</Text>
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
                        title="Continue"
                        onPress={handleContinue}
                        disabled={!name || !day || !month || !year || (accountType === 'fleet_member' && !fleetId)}
                        icon={<Icon name="arrow-forward" size={20} color="#fff" />}
                        style={{ backgroundColor: (!name || !day || !month || !year || (accountType === 'fleet_member' && !fleetId)) ? theme.colors.surfaceHighlight : theme.colors.primary }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView >
    );
};

// 4. Service Details
const SERVICE_CATEGORIES = ['Electrician', 'Plumber', 'AC Technician', 'Mechanic', 'Carpenter', 'Painter'];

export const RegistrationServiceScreen = ({ navigation, route }: any) => {
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [experience, setExperience] = useState('');
    const [area, setArea] = useState('');
    const [isKeyboardVisible, setKeyboardVisible] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || '';
    const personal = route?.params?.personal;

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

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Professional Info" />
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    {!isKeyboardVisible && (
                        <>
                            <View style={{ marginBottom: theme.spacing.l }}>
                                <Text style={styles.title}>
                                    Your <Text style={{ color: theme.colors.primary }}>Expertise</Text>
                                </Text>
                            </View>

                            <Text style={styles.label}>Select Category</Text>
                            <View style={styles.grid}>
                                {SERVICE_CATEGORIES.map(cat => {
                                    const isSelected = selectedCategories.includes(cat);
                                    return (
                                        <TouchableOpacity
                                            key={cat}
                                            style={[
                                                styles.categoryChip,
                                                isSelected && styles.categoryChipSelected
                                            ]}
                                            onPress={() => {
                                                if (isSelected) {
                                                    setSelectedCategories(prev => prev.filter(c => c !== cat));
                                                } else {
                                                    setSelectedCategories(prev => [...prev, cat]);
                                                }
                                            }}
                                        >
                                            <Text style={[
                                                styles.categoryText,
                                                isSelected && styles.categoryTextSelected
                                            ]}>{cat}</Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    <View style={{ gap: 16, marginTop: isKeyboardVisible ? 160 : 0 }}>
                        <Input
                            label="Experience (Years)"
                            value={experience}
                            onChangeText={(text) => setExperience(text.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 5"
                            keyboardType="number-pad"
                            maxLength={2}
                        />
                        <Input
                            label="Working Area (Pin Code)"
                            value={area}
                            onChangeText={(text) => setArea(text.replace(/[^0-9]/g, ''))}
                            placeholder="e.g. 560001"
                            keyboardType="number-pad"
                            maxLength={6}
                        />
                    </View>
                    {/* Add extra padding at bottom to ensure scrolling past keyboard */}
                    <View style={{ height: 24 }} />
                </ScrollView>
                <View style={styles.footer}>
                    <Button
                        title="Next Step"
                        onPress={() => navigation.navigate('RegistrationDocuments', {
                            accountType,
                            phone,
                            personal,
                            serviceDetails: { selectedCategories, experience, area },
                        })}
                        disabled={selectedCategories.length === 0 || !experience || !area}
                        icon={<Icon name="build" size={20} color="#fff" />}
                        style={{ backgroundColor: (selectedCategories.length === 0 || !experience || !area) ? theme.colors.surfaceHighlight : theme.colors.primary }}
                    />
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

// 5. Document Upload
export const RegistrationDocumentsScreen = ({ navigation, route }: any) => {
    const [idUploaded, setIdUploaded] = useState(false);
    const [selfieUploaded, setSelfieUploaded] = useState(false);
    const accountType = getAccountType(route);
    const phone = route?.params?.phone || '';
    const personal = route?.params?.personal;
    const serviceDetails = route?.params?.serviceDetails;

    const handleTakeSelfie = () => {
        // In a real app, use launchCamera({ includeBase64: true, mediaType: 'photo' }, ...)
        // This ensures direct camera access only, no gallery.
        // For now, we simulate the capture.
        Alert.alert(
            "Take Selfie",
            "Opening Camera for direct selfie...",
            [
                { text: "Capture", onPress: () => setSelfieUploaded(!selfieUploaded) },
                { text: "Cancel", style: "cancel" }
            ]
        );
    };

    const UploadCard = ({ title, uploaded, onPress }: any) => (
        <TouchableOpacity
            style={[
                styles.uploadCard,
                uploaded && { borderColor: theme.colors.success, backgroundColor: theme.colors.surface }
            ]}
            onPress={onPress}
        >
            <View style={[styles.uploadIcon, uploaded && { backgroundColor: theme.colors.surfaceHighlight }]}>
                <Icon name={uploaded ? "check-circle" : "cloud-upload"} size={28} color={uploaded ? theme.colors.success : theme.colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 16 }}>
                <Text style={styles.uploadTitle}>{title}</Text>
                <Text style={styles.uploadStatus}>{uploaded ? 'Verified' : 'Tap to upload document'}</Text>
            </View>
            {!uploaded && <Icon name="chevron-right" size={24} color={theme.colors.textMuted} />}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Verification" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        Identity <Text style={{ color: theme.colors.primary }}>Proof</Text>
                    </Text>
                </View>

                <UploadCard title="ID Proof (Aadhaar/DL)" uploaded={idUploaded} onPress={() => setIdUploaded(!idUploaded)} />
                <UploadCard title="Skill Certificate (Optional)" uploaded={false} onPress={() => { }} />
                <UploadCard title="Take a Selfie" uploaded={selfieUploaded} onPress={handleTakeSelfie} />

                {idUploaded && (
                    <View style={styles.verificationStatus}>
                        <Icon name="hourglass-empty" size={20} color={theme.colors.orange} />
                        <Text style={{ color: theme.colors.orange, marginLeft: 8, fontWeight: '600' }}>Verification will take 2-4 hours</Text>
                    </View>
                )}
            </ScrollView>
            <View style={styles.footer}>
                    <Button
                        title="Almost Done"
                        onPress={() => navigation.navigate('RegistrationBank', {
                            accountType,
                            phone,
                            personal,
                            serviceDetails,
                            documents: { idUploaded, selfieUploaded },
                        })}
                        disabled={!idUploaded || !selfieUploaded}
                        icon={<Icon name="check-circle" size={20} color="#fff" />}
                        style={{ backgroundColor: (!idUploaded || !selfieUploaded) ? theme.colors.surfaceHighlight : theme.colors.primary }}
                />
            </View>
        </SafeAreaView>
    );
};

// 6. Bank Details
export const RegistrationBankScreen = ({ navigation, route }: any) => {
    const [account, setAccount] = useState('');
    const [ifsc, setIfsc] = useState('');
    const [holder, setHolder] = useState('');
    const { submitProviderProfile, isSubmitting, user } = useAuth();
    const phone = route?.params?.phone || user?.phone || '';
    const personal = route?.params?.personal;
    const serviceDetails = route?.params?.serviceDetails;
    const documents = route?.params?.documents;
    const accountType = getAccountType(route);

    const handleComplete = async () => {
        const profileResult = await userService.updateProfile({
            name: personal?.name,
            phone,
            address: {
                city: serviceDetails?.area,
            },
        });

        if (!profileResult.success) {
            Alert.alert('Profile Update Failed', profileResult.error || 'Could not save your user profile.');
            return;
        }

        const serviceResolution = await resolveServiceIds(serviceDetails?.selectedCategories || []);
        if (!serviceResolution.success) {
            Alert.alert('Service Mapping Failed', serviceResolution.error || 'Could not map your services.');
            return;
        }

        const result = await submitProviderProfile({
            businessName: personal?.name || holder,
            providerMode: accountType,
            fleetId: accountType === 'fleet_member' ? personal?.fleetId : undefined,
            services: serviceResolution.data,
            experience: {
                years: Number(serviceDetails?.experience || 0),
                description: `DOB ${personal?.day}/${personal?.month}/${personal?.year}`,
            },
            serviceArea: {
                cities: serviceDetails?.area ? [serviceDetails.area] : [],
                radius: 10,
                unit: 'km',
            },
            verification: {
                documents: [
                    { type: 'id-proof', documentUrl: documents?.idUploaded ? 'captured' : '', status: 'pending' },
                    { type: 'selfie', documentUrl: documents?.selfieUploaded ? 'captured' : '', status: 'pending' },
                ],
            },
            bankDetails: {
                accountHolderName: holder,
                accountNumber: account,
                ifscCode: ifsc,
            },
        });

        if (!result.success) {
            Alert.alert('Registration Failed', result.error || 'Unable to create provider profile.');
            return;
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Payments" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l, marginTop: theme.spacing.xl }}>
                    <Text style={styles.title}>
                        Get <Text style={{ color: theme.colors.success }}>Paid</Text>
                    </Text>
                </View>

                <View style={{ gap: 16 }}>
                    <Input label="Account Holder Name" value={holder} onChangeText={setHolder} placeholder="As per bank records" />
                    <Input label="Account Number" value={account} onChangeText={setAccount} placeholder="Enter account number" keyboardType="number-pad" />
                    <Input label="IFSC Code" value={ifsc} onChangeText={setIfsc} placeholder="Enter IFSC code" />
                </View>

                <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceHighlight, padding: 12, borderRadius: 8 }]}>
                    <Icon name="lock" size={16} color={theme.colors.textMuted} />
                    <Text style={styles.infoText}>Your bank details are encrypted and secure.</Text>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={isSubmitting ? 'Submitting...' : 'Complete Registration'}
                    onPress={handleComplete}
                    disabled={!account || !ifsc || isSubmitting}
                    width="100%"
                    variant="success"
                    icon={<Icon name="check" size={20} color="#fff" />}
                    style={{ backgroundColor: (!account || !ifsc) ? theme.colors.surfaceHighlight : theme.colors.success }}
                />
            </View>
        </SafeAreaView>
    );
};

const PARTNER_SERVICE_MODELS = ['Driver Network', 'Service Agency', 'Mixed Team'];
const PARTNER_CATEGORIES = ['Driver', 'Electrician', 'Plumber', 'AC Technician', 'Mechanic'];
const PARTNER_TYPES = [
    { value: 'agency', label: 'Agency' },
    { value: 'head_office', label: 'Head Office' },
];

export const PartnerCompanyScreen = ({ navigation }: any) => {
    const [businessName, setBusinessName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [city, setCity] = useState('');
    const [gstin, setGstin] = useState('');
    const [partnerType, setPartnerType] = useState<'agency' | 'head_office' | ''>('');
    const [fleetId, setFleetId] = useState('');

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Partner Business" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        Set up your <Text style={{ color: theme.colors.success }}>Agency</Text>
                    </Text>
                    <Text style={styles.subtitle}>Tell us who will operate this partner account and where the business runs.</Text>
                </View>

                <View style={styles.partnerInfoBanner}>
                    <Icon name="apartment" size={20} color={theme.colors.success} />
                    <Text style={styles.partnerInfoText}>One partner account can manage multiple drivers or service professionals.</Text>
                </View>

                <Text style={styles.label}>Partner Type</Text>
                <View style={styles.grid}>
                    {PARTNER_TYPES.map(type => {
                        const isSelected = partnerType === type.value;
                        return (
                            <TouchableOpacity
                                key={type.value}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => setPartnerType(type.value as 'agency' | 'head_office')}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{type.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Input label="Business / Agency Name" value={businessName} onChangeText={setBusinessName} placeholder="FastTrack Services" />
                <Input label="Owner / Manager Name" value={ownerName} onChangeText={setOwnerName} placeholder="Enter full name" />
                <Input label="Primary City" value={city} onChangeText={setCity} placeholder="Bengaluru" />
                <Input
                    label="Existing Fleet ID (Optional)"
                    value={fleetId}
                    onChangeText={(text) => setFleetId(text.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                    placeholder="Enter if you already have one"
                />
                <Input label="GSTIN / Business ID (Optional)" value={gstin} onChangeText={setGstin} placeholder="Business registration number" />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title="Continue"
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
    const [selectedModel, setSelectedModel] = useState('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [coverageArea, setCoverageArea] = useState('');
    const [fleetSize, setFleetSize] = useState('');
    const company = route?.params?.company;

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Operations Setup" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        How does your <Text style={{ color: theme.colors.success }}>team</Text> operate?
                    </Text>
                    <Text style={styles.subtitle}>Choose your model and the kinds of workers you want to onboard under this partner account.</Text>
                </View>

                <Text style={styles.label}>Service Model</Text>
                <View style={styles.grid}>
                    {PARTNER_SERVICE_MODELS.map(model => {
                        const isSelected = selectedModel === model;
                        return (
                            <TouchableOpacity
                                key={model}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => setSelectedModel(model)}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{model}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={styles.label}>Team Categories</Text>
                <View style={styles.grid}>
                    {PARTNER_CATEGORIES.map(category => {
                        const isSelected = selectedCategories.includes(category);
                        return (
                            <TouchableOpacity
                                key={category}
                                style={[styles.categoryChip, isSelected && styles.partnerChipSelected]}
                                onPress={() => {
                                    if (isSelected) {
                                        setSelectedCategories(prev => prev.filter(item => item !== category));
                                    } else {
                                        setSelectedCategories(prev => [...prev, category]);
                                    }
                                }}
                            >
                                <Text style={[styles.categoryText, isSelected && styles.categoryTextSelected]}>{category}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Input label="Coverage Area" value={coverageArea} onChangeText={setCoverageArea} placeholder="City, zones, or pin codes" />
                <Input
                    label="Current Team Size"
                    value={fleetSize}
                    onChangeText={(text) => setFleetSize(text.replace(/[^0-9]/g, ''))}
                    placeholder="Number of active drivers / technicians"
                    keyboardType="number-pad"
                    maxLength={3}
                />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title="Continue"
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
    const [companyDocUploaded, setCompanyDocUploaded] = useState(false);
    const [ownerIdUploaded, setOwnerIdUploaded] = useState(false);
    const [officeProofUploaded, setOfficeProofUploaded] = useState(false);
    const company = route?.params?.company;
    const operations = route?.params?.operations;

    const uploadItems = [
        {
            title: 'Company Registration / GST',
            uploaded: companyDocUploaded,
            onPress: () => setCompanyDocUploaded(!companyDocUploaded)
        },
        {
            title: 'Owner ID Proof',
            uploaded: ownerIdUploaded,
            onPress: () => setOwnerIdUploaded(!ownerIdUploaded)
        },
        {
            title: 'Office Address Proof',
            uploaded: officeProofUploaded,
            onPress: () => setOfficeProofUploaded(!officeProofUploaded)
        }
    ];

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Partner Verification" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        Verify your <Text style={{ color: theme.colors.success }}>business</Text>
                    </Text>
                    <Text style={styles.subtitle}>Upload the core documents required to activate partner mode and start adding your team.</Text>
                </View>

                {uploadItems.map((item) => (
                    <TouchableOpacity
                        key={item.title}
                        style={[
                            styles.uploadCard,
                            item.uploaded && { borderColor: theme.colors.success, backgroundColor: theme.colors.surface }
                        ]}
                        onPress={item.onPress}
                    >
                        <View style={[styles.uploadIcon, item.uploaded && { backgroundColor: '#dcfce7' }]}>
                            <Icon name={item.uploaded ? 'check-circle' : 'description'} size={26} color={item.uploaded ? theme.colors.success : theme.colors.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 16 }}>
                            <Text style={styles.uploadTitle}>{item.title}</Text>
                            <Text style={styles.uploadStatus}>{item.uploaded ? 'Uploaded successfully' : 'Tap to upload document'}</Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <View style={styles.verificationStatus}>
                    <Icon name="verified-user" size={20} color={theme.colors.success} />
                    <Text style={[styles.infoText, { color: theme.colors.success, marginLeft: 8 }]}>Partner verification can be reviewed before team activation.</Text>
                </View>
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title="Continue"
                    onPress={() => navigation.navigate('PartnerTeam', {
                        company,
                        operations,
                        verification: {
                            companyDocUploaded,
                            ownerIdUploaded,
                            officeProofUploaded,
                        },
                    })}
                    disabled={!companyDocUploaded || !ownerIdUploaded || !officeProofUploaded}
                />
            </View>
        </SafeAreaView>
    );
};

export const PartnerTeamScreen = ({ navigation, route }: any) => {
    const [teamLeadName, setTeamLeadName] = useState('');
    const [supportPhone, setSupportPhone] = useState('');
    const [teamCapacity, setTeamCapacity] = useState('');
    const [notes, setNotes] = useState('');
    const { submitProviderProfile, isSubmitting } = useAuth();
    const company = route?.params?.company;
    const operations = route?.params?.operations;
    const verification = route?.params?.verification;

    const handleComplete = async () => {
        const profileResult = await userService.updateProfile({
            name: company?.ownerName,
            phone: supportPhone,
            address: {
                city: company?.city,
            },
        });

        if (!profileResult.success) {
            Alert.alert('Profile Update Failed', profileResult.error || 'Could not save partner owner profile.');
            return;
        }

        const serviceResolution = await resolveServiceIds(operations?.selectedCategories || []);
        if (!serviceResolution.success) {
            Alert.alert('Service Mapping Failed', serviceResolution.error || 'Could not map partner services.');
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
                    { type: 'company-registration', documentUrl: verification?.companyDocUploaded ? company?.gstin || 'uploaded' : '', status: 'pending' },
                    { type: 'owner-id', documentUrl: verification?.ownerIdUploaded ? 'uploaded' : '', status: 'pending' },
                    { type: 'office-proof', documentUrl: verification?.officeProofUploaded ? 'uploaded' : '', status: 'pending' },
                ],
            },
        });

        if (!result.success) {
            Alert.alert('Partner Registration Failed', result.error || 'Unable to create partner provider profile.');
            return;
        }

        navigation.reset({
            index: 0,
            routes: [{ name: 'MainApp' }],
        });
    };

    return (
        <SafeAreaView style={styles.container}>
            <Header onBack={() => navigation.goBack()} title="Team Setup" />
            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={{ marginBottom: theme.spacing.l }}>
                    <Text style={styles.title}>
                        Add your first <Text style={{ color: theme.colors.success }}>team details</Text>
                    </Text>
                    <Text style={styles.subtitle}>This sets up the partner account for allocating jobs to your drivers or technicians.</Text>
                </View>

                <Input label="Operations Lead" value={teamLeadName} onChangeText={setTeamLeadName} placeholder="Team manager or dispatcher name" />
                <Input
                    label="Support Phone"
                    value={supportPhone}
                    onChangeText={(text) => setSupportPhone(text.replace(/[^0-9]/g, ''))}
                    placeholder="Partner support number"
                    keyboardType="phone-pad"
                    maxLength={10}
                />
                <Input
                    label="Max Concurrent Jobs"
                    value={teamCapacity}
                    onChangeText={(text) => setTeamCapacity(text.replace(/[^0-9]/g, ''))}
                    placeholder="How many jobs can your team handle at once?"
                    keyboardType="number-pad"
                    maxLength={3}
                />
                <Input
                    label="Notes for Admin Review"
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Any extra information about your team, fleet, or service model"
                    multiline
                />
            </ScrollView>
            <View style={styles.footer}>
                <Button
                    title={isSubmitting ? 'Submitting...' : 'Complete Partner Registration'}
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
        flex: 1,
        padding: theme.spacing.xl,
    },
    scrollContent: {
        padding: theme.spacing.xl,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
    },
    pageNumber: {
        fontSize: 12,
        fontWeight: 'bold',
        color: theme.colors.error, // Red for visibility
        backgroundColor: 'rgba(255,0,0,0.1)',
        padding: 4,
        borderRadius: 4,
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
    subtitle: {
        fontSize: 16,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xl,
        marginTop: 8,
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
    testOtpBox: {
        marginTop: theme.spacing.m,
        backgroundColor: 'rgba(99, 102, 241, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(99, 102, 241, 0.25)',
        borderRadius: theme.borderRadius.m,
        paddingVertical: theme.spacing.s,
        paddingHorizontal: theme.spacing.l,
        alignItems: 'center',
    },
    testOtpLabel: {
        color: theme.colors.textSecondary,
        fontSize: 12,
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    testOtpValue: {
        color: theme.colors.primary,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 6,
    },
    footer: {
        padding: theme.spacing.xl,
        // borderTopWidth: 1,
        // borderTopColor: theme.colors.border,
        marginBottom: theme.spacing.s,
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
