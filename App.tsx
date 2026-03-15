import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RootNavigator } from './src/navigation';
import { theme } from './src/config/theme';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { TranslationProvider } from './src/context/TranslationContext';
import { notificationsService } from './src/services/notificationsService';

function NotificationBootstrap() {
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) {
      return;
    }

    notificationsService.registerCurrentDevice(user).catch((error) => {
      console.error('Failed to register provider device for notifications:', error);
    });
  }, [user]);

  return null;
}

export default function App() {
  return (
    <AuthProvider>
      <TranslationProvider>
        <SafeAreaProvider>
          <NotificationBootstrap />
          <StatusBar barStyle="dark-content" backgroundColor={theme.colors.background} />
          <RootNavigator />
        </SafeAreaProvider>
      </TranslationProvider>
    </AuthProvider>
  );
}
