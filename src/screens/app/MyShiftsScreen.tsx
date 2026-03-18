import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../config/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getDaysOfWeek = () => {
    const days = [];
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push({
            label: i === 0 ? 'Today' : dayNames[date.getDay()],
            date: date.getDate(),
            isSpecial: i === 3 || i === 4,
        });
    }
    return days;
};

const SHIFT_GROUPS = [
    {
        title: 'Morning Session',
        slots: [
            { time: '6:00 AM - 9:00 AM', surge: false },
            { time: '9:00 AM - 12:00 PM', surge: true },
        ],
    },
    {
        title: 'Mid-Day Session',
        slots: [
            { time: '12:00 PM - 3:00 PM', surge: false },
            { time: '3:00 PM - 5:00 PM', surge: false },
        ],
    },
    {
        title: 'Evening Session',
        slots: [
            { time: '5:00 PM - 7:00 PM', surge: true },
            { time: '7:00 PM - 9:00 PM', surge: false },
        ],
    },
    {
        title: 'Emergency Hours',
        slots: [
            { time: '9:00 PM - 12:00 AM', surge: true },
        ],
    },
];

export const MyShiftsScreen = () => {
    const days = getDaysOfWeek();
    const [selectedDay, setSelectedDay] = useState(0);
    const [checkedSlots, setCheckedSlots] = useState<Set<string>>(new Set());

    const toggleSlot = (slot: string) => {
        setCheckedSlots(prev => {
            const next = new Set(prev);
            if (next.has(slot)) {
                next.delete(slot);
            } else {
                next.add(slot);
            }
            return next;
        });
    };

    return (
        <SafeAreaView style={s.container}>
            {/* Header */}
            <View style={s.header}>
                <Text style={s.headerTitle}>My Shifts</Text>
                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity style={s.headerIcon}>
                        <Icon name="people" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                    <TouchableOpacity style={s.headerIcon}>
                        <Icon name="help-outline" size={22} color={theme.colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Day selector */}
            <View style={s.dayRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
                    {days.map((day, index) => (
                        <TouchableOpacity
                            key={index}
                            style={[s.dayItem, selectedDay === index && s.dayItemActive]}
                            onPress={() => setSelectedDay(index)}
                        >
                            {day.isSpecial && (
                                <View style={s.specialBadge}>
                                    <Text style={s.specialBadgeText}>Special</Text>
                                </View>
                            )}
                            <Text style={[s.dayLabel, selectedDay === index && s.dayLabelActive]}>{day.label}</Text>
                            <Text style={[s.dayDate, selectedDay === index && s.dayDateActive]}>{day.date}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Live offers banner */}
            <TouchableOpacity style={s.offersBanner}>
                <View style={s.offersIcon}>
                    <Icon name="currency-rupee" size={16} color={theme.colors.primary} />
                </View>
                <Text style={s.offersBannerText}>Know the LIVE offers for you</Text>
                <View style={s.offersArrow}>
                    <Icon name="chevron-right" size={20} color={theme.colors.primary} />
                </View>
            </TouchableOpacity>

            {/* Shift groups */}
            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
                {SHIFT_GROUPS.map((group, gi) => (
                    <View key={gi} style={s.shiftGroup}>
                        <View style={s.shiftGroupHeader}>
                            <Text style={s.shiftGroupTitle}>{group.title}</Text>
                        </View>
                        {group.slots.map((slot, si) => (
                            <TouchableOpacity
                                key={si}
                                style={s.shiftSlot}
                                onPress={() => toggleSlot(`${gi}-${si}`)}
                                activeOpacity={0.7}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    {slot.surge && (
                                        <View style={s.surgeBadgeRow}>
                                            <View style={s.surgeBadge}>
                                                <Icon name="currency-rupee" size={10} color="#fff" />
                                            </View>
                                            <Text style={s.surgeText}>HIGH</Text>
                                        </View>
                                    )}
                                    <Text style={s.slotTime}>{slot.time}</Text>
                                </View>
                                <View style={[s.checkbox, checkedSlots.has(`${gi}-${si}`) && s.checkboxChecked]}>
                                    {checkedSlots.has(`${gi}-${si}`) && (
                                        <Icon name="check" size={16} color="#fff" />
                                    )}
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                ))}
            </ScrollView>

            {/* Bottom Action */}
            <View style={s.bottomContainer}>
                <View style={s.summaryContainer}>
                    <Text style={s.summaryText}>
                        {checkedSlots.size === 0 ? 'No slots selected' : `${checkedSlots.size} slots selected for pre-booking`}
                    </Text>
                </View>
                <TouchableOpacity 
                    style={[s.saveButton, checkedSlots.size === 0 && s.saveButtonDisabled]}
                    disabled={checkedSlots.size === 0}
                    activeOpacity={0.8}
                >
                    <Text style={s.saveButtonText}>Mark as Available</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F8F8' },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, backgroundColor: '#fff' },
    headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
    headerIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#F1F1F6', justifyContent: 'center', alignItems: 'center', marginLeft: 8 },

    // Day selector
    dayRow: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
    dayItem: { alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, marginHorizontal: 4, borderRadius: 12 },
    dayItemActive: { borderBottomWidth: 2, borderBottomColor: theme.colors.primary },
    dayLabel: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
    dayLabelActive: { color: theme.colors.primary, fontWeight: '700' },
    dayDate: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
    dayDateActive: { color: theme.colors.primary },
    specialBadge: { backgroundColor: theme.colors.accent, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
    specialBadgeText: { color: '#fff', fontSize: 9, fontWeight: '700' },

    // Offers banner
    offersBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0F7F0', marginHorizontal: 16, marginTop: 12, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12 },
    offersIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
    offersBannerText: { flex: 1, marginLeft: 12, fontSize: 14, fontWeight: '600', color: theme.colors.text },
    offersArrow: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primaryLight, justifyContent: 'center', alignItems: 'center' },

    // Shift groups
    shiftGroup: { backgroundColor: '#fff', borderRadius: 12, marginBottom: 12, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.border },
    shiftGroupHeader: { backgroundColor: '#F1F1F6', paddingHorizontal: 16, paddingVertical: 12 },
    shiftGroupTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text },

    // Shift slot
    shiftSlot: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
    slotTime: { fontSize: 15, color: theme.colors.text, fontWeight: '500' },
    surgeBadgeRow: { flexDirection: 'row', alignItems: 'center', marginRight: 10 },
    surgeBadge: { width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.accent, justifyContent: 'center', alignItems: 'center' },
    surgeText: { fontSize: 11, fontWeight: '700', color: theme.colors.accent, marginLeft: 4 },

    // Checkbox
    checkbox: { width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: theme.colors.border, justifyContent: 'center', alignItems: 'center' },
    checkboxChecked: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },

    // Bottom Action
    bottomContainer: { padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: theme.colors.divider },
    summaryContainer: { alignItems: 'center', marginBottom: 12 },
    summaryText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
    saveButton: { backgroundColor: theme.colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    saveButtonDisabled: { backgroundColor: theme.colors.border },
    saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
