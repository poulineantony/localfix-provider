import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { theme } from './src/config/theme';
import { AuthProvider } from './src/context/AuthContext';

export default function App() {
  return (
    <AuthProvider>
      <SafeAreaProvider>
        <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
        <RootNavigator />
      </SafeAreaProvider>
    </AuthProvider>
  );
}
