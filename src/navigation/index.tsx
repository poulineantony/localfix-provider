import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';

// Auth Screens
import { WelcomeScreen, ModeSelectionScreen, HowItWorksScreen, RequirementsScreen } from '../screens/auth/OnboardingScreens';
import {
    RegistrationPhoneScreen,
    RegistrationOTPScreen,
    RegistrationPersonalScreen,
    RegistrationServiceScreen,
    RegistrationDocumentsScreen,
    RegistrationBankScreen
} from '../screens/auth/RegistrationScreens';

// App Screens
import { HomeScreen, JobDetailsScreen, JobInProgressScreen, PaymentScreen } from '../screens/app/JobStack';
import { EarningsScreen, ProfileScreen } from '../screens/app/ProfileEarnings';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 1. Auth Navigator
const AuthNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
            <Stack.Screen name="Requirements" component={RequirementsScreen} />
            <Stack.Screen name="RegistrationPhone" component={RegistrationPhoneScreen} />
            <Stack.Screen name="RegistrationOTP" component={RegistrationOTPScreen} />
            <Stack.Screen name="RegistrationPersonal" component={RegistrationPersonalScreen} />
            <Stack.Screen name="RegistrationService" component={RegistrationServiceScreen} />
            <Stack.Screen name="RegistrationDocuments" component={RegistrationDocumentsScreen} />
            <Stack.Screen name="RegistrationBank" component={RegistrationBankScreen} />
        </Stack.Navigator>
    );
};

// 2. Home Stack (For Jobs flow)
const HomeStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="HomeMain" component={HomeScreen} />
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
            <Stack.Screen name="JobInProgress" component={JobInProgressScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
        </Stack.Navigator>
    );
};

// 3. Main App Tabs
const AppTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.colors.background,
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    height: 60,
                    paddingBottom: 8,
                    paddingTop: 8,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textSecondary,
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                    marginTop: 4,
                },
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName = 'help';
                    if (route.name === 'Home') iconName = 'home';
                    else if (route.name === 'Jobs') iconName = 'list-alt'; // Not implemented separate list yet, reusing Home logic or separate
                    else if (route.name === 'Earnings') iconName = 'account-balance-wallet';
                    else if (route.name === 'Profile') iconName = 'person';

                    return <Icon name={iconName} size={28} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
            {/* For now, Jobs tab can just be a filtered view of Home, but let's mock it or hide if redundant. User asked for it though. */}
            {/* We can reuse HomeStack for Jobs tab too if needed, or create a simple list screen */}
            <Tab.Screen name="Jobs" component={HomeStack} options={{ title: 'My Jobs' }} listeners={({ navigation }) => ({
                tabPress: (e) => {
                    // Optional: Reset stack or pass params
                },
            })} />
            <Tab.Screen name="Earnings" component={EarningsScreen} />
            <Tab.Screen name="Profile" component={ProfileScreen} />
        </Tab.Navigator>
    );
};

// 4. Root Navigator
export const RootNavigator = () => {
    const { isAuthenticated, isBootstrapping } = useAuth();

    if (isBootstrapping) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
                <ActivityIndicator size="large" color={theme.colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
                {isAuthenticated ? (
                    <Stack.Screen name="MainApp" component={AppTabs} />
                ) : (
                    <Stack.Screen name="Auth" component={AuthNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
