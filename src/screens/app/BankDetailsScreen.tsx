import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

export const BankDetailsScreen = ({ navigation }: any) => {
    const { provider } = useAuth();
    const bd = provider?.bankDetails || {};

    const handleCopy = () => {
        if (bd.accountNumber) {
            Share.share({ message: bd.accountNumber }).catch(() => {});
        }
    };

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Bank Details</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                <View style={s.card}>
                    <View style={s.row}>
                        <Text style={s.label}>Account Number</Text>
                        <TextInput 
                            style={s.valueInput} 
                            value={bd.accountNumber || 'Not available'} 
                            editable={false} 
                            selectTextOnFocus 
                        />
                        {bd.accountNumber ? (
                            <TouchableOpacity onPress={handleCopy} style={s.copyBtn}>
                                <Icon name="content-copy" size={16} color={theme.colors.primary} />
                            </TouchableOpacity>
                        ) : null}
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={s.label}>IFSC Code</Text>
                        <TextInput 
                            style={s.valueInput} 
                            value={bd.ifscCode || 'Not available'} 
                            editable={false} 
                            selectTextOnFocus 
                        />
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={s.label}>Account Holder</Text>
                        <TextInput 
                            style={s.valueInput} 
                            value={bd.accountHolderName || 'Not available'} 
                            editable={false} 
                            selectTextOnFocus 
                        />
                    </View>
                    <View style={s.divider} />
                    <View style={s.row}>
                        <Text style={s.label}>Bank Name</Text>
                        <TextInput 
                            style={s.valueInput} 
                            value={bd.bankName || 'Not available'} 
                            editable={false} 
                            selectTextOnFocus 
                        />
                    </View>
                </View>
                
                <View style={s.helpCard}>
                    <Icon name="info-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={s.helpText}>
                        To update your bank details, please contact our support team. We currently do not allow direct modifications for security reasons.
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
    scroll: { padding: 16 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: theme.colors.border },
    row: { paddingVertical: 8, position: 'relative' },
    label: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 4 },
    valueInput: { fontSize: 16, fontWeight: '600', color: theme.colors.text, padding: 0, margin: 0 },
    copyBtn: { position: 'absolute', right: 0, top: 24, padding: 8 },
    divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: 8 },
    helpCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#EEF2FF', borderRadius: 10, padding: 14, marginTop: 16,
    },
    helpText: { marginLeft: 8, flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
