import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';
import { useAuth } from '../../context/AuthContext';

export const MyServicesScreen = ({ navigation }: any) => {
    const { provider } = useAuth();
    const services = provider?.services || [];

    return (
        <SafeAreaView style={s.container}>
            <View style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>My Services</Text>
                <TouchableOpacity style={s.backBtn} onPress={() => Alert.alert('Edit Services', 'Please contact support to add or edit your services as they require approval.')}>
                    <Icon name="edit" size={20} color={theme.colors.primary} />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
                {services.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <Icon name="build" size={52} color={theme.colors.textMuted} />
                        <Text style={s.emptyTitle}>No services added</Text>
                        <Text style={s.emptySubtitle}>You haven't listed any services yet.</Text>
                    </View>
                ) : (
                    <View style={s.card}>
                        {services.map((svc: any, i: number) => {
                            const name = typeof svc === 'string' ? svc : svc.name;
                            const cat = typeof svc === 'string' ? '' : svc.category;
                            return (
                                <View key={i} style={[s.svcRow, i === services.length - 1 && s.lastRow]}>
                                    <View style={s.svcIconCard}>
                                        <Icon name="home-repair-service" size={20} color={theme.colors.accent} />
                                    </View>
                                    <View style={s.svcMeta}>
                                        <Text style={s.svcName}>{name}</Text>
                                        {cat ? <Text style={s.svcCat}>{cat}</Text> : null}
                                    </View>
                                    <Icon name="check-circle" size={20} color={theme.colors.success} />
                                </View>
                            );
                        })}
                    </View>
                )}

                <View style={s.helpCard}>
                    <Icon name="info-outline" size={18} color={theme.colors.textSecondary} />
                    <Text style={s.helpText}>
                        To edit your services, tap the edit icon or contact our onboarding support. Service changes require admin verification.
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
    emptyWrap: { alignItems: 'center', paddingVertical: 48 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: theme.colors.text, marginTop: 14 },
    emptySubtitle: { fontSize: 14, color: theme.colors.textMuted, marginTop: 6, textAlign: 'center', lineHeight: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' },
    svcRow: { flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    lastRow: { borderBottomWidth: 0 },
    svcIconCard: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accent + '1A', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    svcMeta: { flex: 1 },
    svcName: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
    svcCat: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2, textTransform: 'capitalize' },
    helpCard: {
        flexDirection: 'row', alignItems: 'flex-start',
        backgroundColor: '#EEF2FF', borderRadius: 10, padding: 14, marginTop: 16,
    },
    helpText: { marginLeft: 8, flex: 1, fontSize: 13, color: theme.colors.textSecondary, lineHeight: 18 },
});
