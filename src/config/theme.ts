export const theme = {
    colors: {
        primary: '#FC8019',        // Swiggy Orange
        primaryDark: '#E56B00',    // Darker orange
        primaryLight: '#FFF3E0',   // Light orange bg
        accent: '#7B61FF',         // Violet accent
        accentLight: '#EDE7FF',    // Light violet bg
        accentDark: '#5A3FD6',     // Dark violet
        background: '#FFFFFF',
        surface: '#FFFFFF',
        surfaceHighlight: '#F8F8F8',
        card: '#FFFFFF',
        text: '#1C1C1C',
        textSecondary: '#686B78',
        textMuted: '#93959F',
        success: '#60B246',        // Swiggy green
        error: '#E23744',          // Swiggy red
        warning: '#F5A623',
        info: '#3B82F6',
        border: '#E9E9EB',
        divider: '#F1F1F6',
        orange: '#FC8019',
        violet: '#7B61FF',
        glow: 'rgba(252, 128, 25, 0.15)',
    },
    spacing: {
        xs: 4,
        s: 8,
        m: 16,
        l: 24,
        xl: 32,
        xxl: 48,
    },
    typography: {
        h1: { fontSize: 28, fontWeight: '800' as const, letterSpacing: -0.5 },
        h2: { fontSize: 22, fontWeight: '700' as const },
        h3: { fontSize: 18, fontWeight: '600' as const },
        body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
        caption: { fontSize: 12, fontWeight: '400' as const, color: '#93959F' },
        button: { fontSize: 15, fontWeight: '700' as const, letterSpacing: 0.3 },
    },
    borderRadius: {
        s: 6,
        m: 12,
        l: 16,
        xl: 24,
        round: 9999,
    },
    shadows: {
        small: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 2,
            elevation: 2,
        },
        medium: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 8,
            elevation: 4,
        },
        large: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 16,
            elevation: 8,
        },
    },
};
