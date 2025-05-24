import { useColorScheme } from 'react-native';

const light = {
    primary: '#007aff',
    success: '#34c759',
    error: '#ff3b30',
    gray: '#888',
    muted: '#cccccc',             // 👉 hinzugefügt
    background: '#f9f9f9',
    card: '#ffffff',
    border: '#e5e5e5',
    text: '#222222',
    placeholder: '#aaa'
};

const dark = {
    primary: '#0a84ff',
    success: '#30d158',
    error: '#ff453a',
    gray: '#aaa',
    muted: '#444444',             // 👉 hinzugefügt (dunklere Variante für Dark Mode)
    background: '#000000',
    card: '#1c1c1e',
    border: '#333333',
    text: '#f2f2f2',
    placeholder: '#666'
};

const fonts = {
    regular: 'System',
    semibold: 'System',
    bold: 'System',
};

const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

const radius = {
    sm: 6,
    md: 12,
    lg: 20,
};

// 👇 Hook für dynamisches Theme basierend auf dem System-Modus
export const useTheme = () => {
    const mode = useColorScheme();
    return {
        colors: mode === 'dark' ? dark : light,
        fonts,
        spacing,
        radius,
        mode,
    };
};