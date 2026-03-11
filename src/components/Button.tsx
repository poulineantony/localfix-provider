import React, { useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { theme } from '../config/theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'success';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    disabled?: boolean;
    style?: any;
    icon?: React.ReactNode;
    width?: number | string;
}

export const Button = ({
    title,
    onPress,
    variant = 'primary',
    size = 'medium',
    loading = false,
    disabled = false,
    style,
    icon,
    width
}: ButtonProps) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
        Animated.spring(scaleAnim, {
            toValue: 0.96,
            useNativeDriver: true,
        }).start();
    };

    const handlePressOut = () => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
        }).start();
    };

    const getBaseStyles = () => {
        if (variant === 'primary') {
            return disabled ? [styles.primary, styles.disabled] : [styles.primary, theme.shadows.medium];
        }
        if (variant === 'secondary') return styles.secondary;
        if (variant === 'success') {
            return disabled ? [styles.success, styles.disabled] : [styles.success, theme.shadows.small];
        }
        if (variant === 'outline') return styles.outline;
        return styles.ghost;
    };

    const getHeight = () => {
        switch (size) {
            case 'small': return 40;
            case 'large': return 60;
            default: return 52;
        }
    };

    return (
        <Animated.View style={[styles.wrapper, { transform: [{ scale: scaleAnim }] }, style, width ? { width } : {}]}>
            <TouchableOpacity
                style={[
                    styles.container,
                    getBaseStyles(),
                    { height: getHeight() }
                ]}
                onPress={onPress}
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                disabled={disabled || loading}
                activeOpacity={1} // Handled by animation
            >
                {loading ? (
                    <ActivityIndicator color={variant === 'outline' ? theme.colors.primary : '#fff'} />
                ) : (
                    <>
                        {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
                        <Text style={[
                            styles.text,
                            variant === 'outline' ? styles.textOutline : (disabled ? { color: theme.colors.textMuted } : styles.textPrimary),
                            size === 'small' && { fontSize: 13 }
                        ]}>
                            {title}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        borderRadius: theme.borderRadius.l,
    },
    container: {
        borderRadius: theme.borderRadius.l,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        paddingHorizontal: theme.spacing.l,
        borderWidth: 0,
        overflow: 'hidden',
    },
    primary: {
        backgroundColor: theme.colors.primary,
        borderWidth: 0,
    },
    secondary: {
        backgroundColor: theme.colors.secondary,
        borderWidth: 0,
    },
    success: {
        backgroundColor: theme.colors.success,
        borderWidth: 0,
    },
    outline: {
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: theme.colors.primary,
    },
    ghost: {
        backgroundColor: 'transparent',
        borderWidth: 0,
    },
    disabled: {
        backgroundColor: theme.colors.surfaceHighlight,
        opacity: 0.8,
        borderColor: 'transparent',
    },
    text: {
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    textPrimary: {
        color: '#ffffff',
    },
    textOutline: {
        color: theme.colors.primary,
    }
});
