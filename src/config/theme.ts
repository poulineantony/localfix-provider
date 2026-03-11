export const theme = {
    colors: {
        primary: '#6366f1', // Indigo-500: Vibrant
        primaryVariant: '#4338ca', // Indigo-700
        secondary: '#0ea5e9', // Sky-500: Neon blue accent
        background: '#ffffff', // White
        surface: '#ffffff', // White
        surfaceHighlight: '#f1f5f9', // Slate-100: Very light grey for inputs/cards
        text: '#0f172a', // Slate-900: Deep dark blue/black
        textSecondary: '#64748b', // Slate-500
        textMuted: '#94a3b8', // Slate-400
        success: '#10b981', // Emerald-500
        error: '#ef4444', // Red-500
        warning: '#f59e0b', // Amber-500
        info: '#3b82f6', // Blue-500
        border: '#e2e8f0', // Slate-200: Light border
        card: '#ffffff',
        glow: 'rgba(99, 102, 241, 0.2)', // More subtle glow for light mode
        orange: '#f97316', // Orange-500
        orangeGradientStart: '#fb923c', // Orange-400
        orangeGradientEnd: '#ea580c', // Orange-600
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
        h1: { fontSize: 36, fontWeight: '800', letterSpacing: -0.5 },
        h2: { fontSize: 28, fontWeight: '700', letterSpacing: -0.25 },
        h3: { fontSize: 22, fontWeight: '600' },
        body: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
        caption: { fontSize: 13, fontWeight: '400', color: '#94a3b8' },
        button: { fontSize: 16, fontWeight: '600', letterSpacing: 0.5 },
    },
    borderRadius: {
        s: 6,
        m: 12,
        l: 20,
        xl: 32,
        round: 9999,
    },
    shadows: {
        small: {
            shadowColor: "#64748b",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 2,
        },
        medium: {
            shadowColor: "#6366f1", // Hint of primary
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.20,
            shadowRadius: 10,
            elevation: 5,
        },
        large: {
            shadowColor: "#64748b",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 20,
            elevation: 10,
        }
    }
};
