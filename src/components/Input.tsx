import React, { useState, useRef } from 'react';
import { View, Text, TextInput, StyleSheet, Animated } from 'react-native';
import { theme } from '../config/theme';

interface InputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'number-pad' | 'email-address' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    autoCorrect?: boolean;
    autoComplete?: 'off' | 'name' | 'email' | 'username' | 'password' | 'tel';
    spellCheck?: boolean;
    error?: string;
    multiline?: boolean;
    style?: any;
    inputStyle?: any;
    maxLength?: number;
    onBlur?: () => void;
}

export const Input = ({
    label,
    value,
    onChangeText,
    placeholder,
    secureTextEntry,
    keyboardType = 'default',
    autoCapitalize = 'sentences',
    autoCorrect = false,
    autoComplete,
    spellCheck = false,
    error,
    multiline = false,
    style,
    inputStyle,
    maxLength,
    onBlur
}: InputProps) => {
    const [isFocused, setIsFocused] = useState(false);
    const focusAnim = useRef(new Animated.Value(0)).current;

    const handleFocus = () => {
        setIsFocused(true);
        Animated.timing(focusAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const handleBlur = () => {
        setIsFocused(false);
        if (onBlur) {
            onBlur();
        }
        Animated.timing(focusAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
        }).start();
    };

    const borderColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.border, theme.colors.primary]
    });

    const backgroundColor = focusAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [theme.colors.surface, theme.colors.surfaceHighlight]
    });

    return (
        <View style={[styles.container, style]}>
            {label && <Text style={[styles.label, isFocused && { color: theme.colors.primary }]}>{label}</Text>}
            <Animated.View style={[
                styles.inputWrapper,
                {
                    borderColor: error ? theme.colors.error : borderColor,
                    backgroundColor: backgroundColor,
                    borderWidth: isFocused ? 1.5 : 1,
                    shadowColor: theme.colors.primary,
                    shadowOpacity: isFocused ? 0.3 : 0,
                    shadowRadius: 8,
                    elevation: isFocused ? 4 : 0,
                },
                multiline && styles.multilineWrapper
            ]}>
                <TextInput
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={theme.colors.textMuted}
                    secureTextEntry={secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    autoCorrect={autoCorrect}
                    autoComplete={autoComplete}
                    spellCheck={spellCheck}
                    multiline={multiline}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    style={[
                        styles.input,
                        multiline && styles.multiline,
                        inputStyle
                    ]}
                    maxLength={maxLength}
                />
            </Animated.View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: theme.spacing.m,
    },
    label: {
        color: theme.colors.textSecondary,
        fontSize: 14,
        marginBottom: theme.spacing.s,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    inputWrapper: {
        borderRadius: theme.borderRadius.m,
        overflow: 'hidden', // Ensures background color doesn't bleed
    },
    input: {
        padding: theme.spacing.m,
        color: theme.colors.text,
        fontSize: 16,
        paddingVertical: 14, // Slightly taller for modernity
        width: '100%',
    },
    multilineWrapper: {
        minHeight: 120,
    },
    multiline: {
        textAlignVertical: 'top',
        height: '100%',
    },
    errorText: {
        color: theme.colors.error,
        fontSize: 12,
        marginTop: 6,
        marginLeft: 2,
        fontWeight: '500'
    }
});
