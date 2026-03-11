import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../config/theme';

interface HeaderProps {
    title?: string;
    onBack?: () => void;
}

export const Header = ({ title, onBack }: HeaderProps) => {
    return (
        <View style={styles.container}>
            {onBack && (
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <Icon name="arrow-back" size={24} color={theme.colors.text} />
                </TouchableOpacity>
            )}
            {title && <Text style={styles.title}>{title}</Text>}
            <View style={{ width: 40 }} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.m,
        paddingTop: theme.spacing.m,
        height: 60,
        backgroundColor: theme.colors.background,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        marginRight: theme.spacing.s,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: theme.colors.text,
        flex: 1,
    }
});
