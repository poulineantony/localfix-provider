import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';

export const ReferScreen = () => {
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [city, setCity] = useState('Pondicherry');

    const handleRefer = () => {
        if (!phone || phone.length < 10) {
            Alert.alert('Invalid', 'Please enter a valid phone number');
            return;
        }
        if (!name.trim()) {
            Alert.alert('Invalid', 'Please enter contact name');
            return;
        }
        Alert.alert('Referral Sent!', `Referral for ${name} has been submitted successfully.`);
        setPhone('');
        setName('');
    };

    return (
        <SafeAreaView style={s.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Green gradient hero */}
                <View style={s.hero}>
                    {/* Floating avatars */}
                    <View style={s.avatarRow}>
                        <View style={[s.floatingAvatar, { backgroundColor: '#FFD54F' }]}>
                            <Icon name="person" size={20} color="#F57F17" />
                        </View>
                        <View style={[s.floatingAvatar, { backgroundColor: '#81C784', marginLeft: -8 }]}>
                            <Icon name="person" size={20} color="#2E7D32" />
                        </View>
                        <View style={[s.floatingAvatar, { backgroundColor: '#4FC3F7', marginLeft: -8 }]}>
                            <Icon name="person" size={20} color="#0277BD" />
                        </View>
                    </View>
                    <Text style={s.heroLabel}>Earn upto</Text>
                    <Text style={s.heroAmount}>Rs 8,000</Text>
                    <Text style={s.heroSubtext}>For every referral</Text>
                </View>

                {/* Refer Form */}
                <View style={s.formSection}>
                    <Text style={s.formDividerText}>REFER YOUR FRIEND</Text>

                    <View style={s.formCard}>
                        {/* Phone input */}
                        <View style={s.inputRow}>
                            <TextInput
                                style={s.input}
                                placeholder="Contact number"
                                placeholderTextColor={theme.colors.textMuted}
                                value={phone}
                                onChangeText={setPhone}
                                keyboardType="phone-pad"
                                maxLength={10}
                            />
                            <TouchableOpacity style={s.contactsBtn}>
                                <Icon name="contacts" size={22} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        {/* Name input */}
                        <View style={s.inputWrap}>
                            <TextInput
                                style={s.input}
                                placeholder="Contact name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={name}
                                onChangeText={setName}
                            />
                        </View>

                        {/* City input */}
                        <View style={s.inputRow}>
                            <TextInput
                                style={s.input}
                                placeholder="Friend's city name"
                                placeholderTextColor={theme.colors.textMuted}
                                value={city}
                                onChangeText={setCity}
                            />
                            <TouchableOpacity style={s.locationBtn}>
                                <Icon name="near-me" size={20} color={theme.colors.primary} />
                            </TouchableOpacity>
                        </View>

                        {/* Refer button */}
                        <TouchableOpacity style={s.referBtn} onPress={handleRefer}>
                            <Text style={s.referBtnText}>Refer Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Your Referrals */}
                <View style={s.referralsSection}>
                    <Text style={s.formDividerText}>YOUR REFERRALS</Text>

                    <View style={s.emptyReferrals}>
                        <Text style={s.emptyReferralsTitle}>No referrals to show</Text>
                        <Text style={s.emptyReferralsSubtitle}>Refer in 3 simple steps</Text>

                        <View style={s.stepsContainer}>
                            {/* Step 1 */}
                            <View style={s.stepRow}>
                                <View style={s.stepCircle}>
                                    <Text style={s.stepNumber}>1</Text>
                                </View>
                                <Text style={s.stepText}>Enter your friend's details</Text>
                            </View>
                            <View style={s.stepLine} />

                            {/* Step 2 */}
                            <View style={s.stepRow}>
                                <View style={s.stepCircle}>
                                    <Text style={s.stepNumber}>2</Text>
                                </View>
                                <Text style={s.stepText}>Complete the Target</Text>
                            </View>
                            <View style={s.stepLine} />

                            {/* Step 3 */}
                            <View style={s.stepRow}>
                                <View style={s.stepCircle}>
                                    <Text style={s.stepNumber}>3</Text>
                                </View>
                                <Text style={s.stepText}>Enjoy the bonus</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={s.referEarnBtn}>
                            <Text style={s.referEarnBtnText}>Refer & Earn now</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },

    // Hero
    hero: { backgroundColor: '#2E7D32', paddingVertical: 36, paddingHorizontal: 24, alignItems: 'center' },
    avatarRow: { flexDirection: 'row', marginBottom: 16 },
    floatingAvatar: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
    heroLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '500' },
    heroAmount: { color: '#fff', fontSize: 40, fontWeight: '800', marginVertical: 4 },
    heroSubtext: { color: 'rgba(255,255,255,0.85)', fontSize: 16, fontWeight: '500' },

    // Form
    formSection: { paddingHorizontal: 16, marginTop: 20 },
    formDividerText: { fontSize: 12, fontWeight: '700', color: theme.colors.textMuted, letterSpacing: 1.5, textAlign: 'center', marginBottom: 16 },
    formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: theme.colors.border },

    inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
    inputWrap: { borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, marginBottom: 14, overflow: 'hidden' },
    input: { flex: 1, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: theme.colors.text },
    contactsBtn: { width: 48, height: 48, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
    locationBtn: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },

    referBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 4 },
    referBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

    // Referrals
    referralsSection: { paddingHorizontal: 16, marginTop: 24, paddingBottom: 32 },
    emptyReferrals: { backgroundColor: '#fff', borderRadius: 16, padding: 24, borderWidth: 1, borderColor: theme.colors.border },
    emptyReferralsTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
    emptyReferralsSubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 4, marginBottom: 20 },

    // Steps
    stepsContainer: { marginBottom: 20, paddingLeft: 8 },
    stepRow: { flexDirection: 'row', alignItems: 'center' },
    stepCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.accentLight, justifyContent: 'center', alignItems: 'center' },
    stepNumber: { color: theme.colors.accent, fontSize: 16, fontWeight: '700' },
    stepText: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginLeft: 14 },
    stepLine: { width: 2, height: 24, backgroundColor: theme.colors.accentLight, marginLeft: 17 },

    referEarnBtn: { backgroundColor: theme.colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
    referEarnBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
