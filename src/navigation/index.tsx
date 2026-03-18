import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { ActivityIndicator, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../config/theme';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../context/TranslationContext';

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
import { ChatScreen } from '../screens/app/ChatScreen';
import { EarningsScreen, ProfileScreen } from '../screens/app/ProfileEarnings';
import { MyShiftsScreen } from '../screens/app/MyShiftsScreen';
import { BookingsScreen } from '../screens/app/BookingsScreen';
import { ReferScreen } from '../screens/app/ReferScreen';
import { LanguageScreen } from '../screens/app/LanguageScreen';
import { EditProfileScreen } from '../screens/app/EditProfileScreen';
import { DocumentsScreen } from '../screens/app/DocumentsScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// 1. Auth Navigator
const AuthNavigator = ({
    initialRouteName = 'Welcome',
    registrationParams = {},
}: {
    initialRouteName?: string;
    registrationParams?: { accountType?: 'individual' | 'fleet_member' };
}) => {
    return (
        <Stack.Navigator initialRouteName={initialRouteName} screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="ModeSelection" component={ModeSelectionScreen} />
            <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
            <Stack.Screen name="Requirements" component={RequirementsScreen} />
            <Stack.Screen name="RegistrationPhone" component={RegistrationPhoneScreen} initialParams={registrationParams} />
            <Stack.Screen name="RegistrationOTP" component={RegistrationOTPScreen} initialParams={registrationParams} />
            <Stack.Screen name="RegistrationPersonal" component={RegistrationPersonalScreen} initialParams={registrationParams} />
            <Stack.Screen name="RegistrationService" component={RegistrationServiceScreen} initialParams={registrationParams} />
            <Stack.Screen name="RegistrationDocuments" component={RegistrationDocumentsScreen} initialParams={registrationParams} />
            <Stack.Screen name="RegistrationBank" component={RegistrationBankScreen} initialParams={registrationParams} />
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
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    );
};

const BookingsStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="BookingsMain" component={BookingsScreen} />
            <Stack.Screen name="JobDetails" component={JobDetailsScreen} />
            <Stack.Screen name="JobInProgress" component={JobInProgressScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
        </Stack.Navigator>
    );
};

const MoreStack = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false, animationEnabled: false }}>
            <Stack.Screen name="MoreMain" component={ProfileScreen} />
            <Stack.Screen name="Refer" component={ReferScreen} />
            <Stack.Screen name="Language" component={LanguageScreen} />
            <Stack.Screen name="EditProfile" component={EditProfileScreen} />
            <Stack.Screen name="Documents" component={DocumentsScreen} />
        </Stack.Navigator>
    );
};

// 3. Main App Tabs — 5 tabs like Swiggy Partner
const AppTabs = () => {
    const { t } = useTranslation();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: '#fff',
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    height: 62,
                    paddingBottom: 8,
                    paddingTop: 6,
                },
                tabBarActiveTintColor: theme.colors.primary,
                tabBarInactiveTintColor: theme.colors.textMuted,
                tabBarLabelStyle: {
                    fontSize: 11,
                    fontWeight: '600',
                },
                tabBarIcon: ({ color, size, focused }) => {
                    let iconName = 'help';
                    if (route.name === 'Home') iconName = focused ? 'home' : 'home';
                    else if (route.name === 'Earnings') iconName = 'account-balance-wallet';
                    else if (route.name === 'Bookings') iconName = 'event-note';
                    else if (route.name === 'MyShifts') iconName = 'calendar-today';
                    else if (route.name === 'More') iconName = 'grid-view';

                    return <Icon name={iconName} size={24} color={color} />;
                },
            })}
        >
            <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
            <Tab.Screen name="Earnings" component={EarningsScreen} options={{ title: 'Earnings' }} />
            <Tab.Screen name="Bookings" component={BookingsStack} options={{ title: 'Bookings' }} />
            <Tab.Screen name="MyShifts" component={MyShiftsScreen} options={{ title: 'My Shifts' }} />
            <Tab.Screen name="More" component={MoreStack} options={{ title: 'More' }} />
        </Tab.Navigator>
    );
};

// 4. Root Navigator
export const RootNavigator = () => {
    const { isAuthenticated, isBootstrapping, needsOnboarding, onboardingRouteName, onboardingAccountType } = useAuth();

    if (isBootstrapping) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
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
                    <Stack.Screen name="Auth">
                        {() => (
                            <AuthNavigator
                                initialRouteName={needsOnboarding ? onboardingRouteName : 'Welcome'}
                                registrationParams={{ accountType: onboardingAccountType }}
                            />
                        )}
                    </Stack.Screen>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
