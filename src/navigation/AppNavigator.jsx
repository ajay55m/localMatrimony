import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './NavigationService';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Screens
import MainScreen from '../screens/MainScreen';
import ProfileScreen from '../screens/profile/Profile';
import ProfileDetails from '../screens/profile/ProfileDetails';
import ContactScreen from '../screens/profile/Contact';
import SearchScreen from '../screens/profile/Search';
import RegistrationScreen from '../screens/auth/RegisterScreen';
import ViewedProfiles from '../screens/profile/ViewedProfiles';
import SelectedProfiles from '../screens/profile/SelectedProfiles';
import ViewHoroscope from '../screens/profile/ViewHoroscope';
import ServerSlow from '../screens/ServerSlow';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    return (
        <NavigationContainer ref={navigationRef}>
            <Stack.Navigator screenOptions={{ headerShown: false, animation: 'none' }}>
                <Stack.Screen name="Main" component={MainScreen} />
                <Stack.Screen name="Profiles" component={ProfileScreen} />
                <Stack.Screen name="ProfileDetails" component={ProfileDetails} />
                <Stack.Screen name="Contact" component={ContactScreen} />
                <Stack.Screen name="Search" component={SearchScreen} />
                <Stack.Screen name="Register" component={RegistrationScreen} />
                <Stack.Screen name="ViewedProfiles" component={ViewedProfiles} />
                <Stack.Screen name="SelectedProfiles" component={SelectedProfiles} />
                <Stack.Screen name="ViewHoroscope" component={ViewHoroscope} />
                <Stack.Screen name="ServerSlow" component={ServerSlow} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
