import React, { useEffect } from 'react';
import { Text, TextInput, BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import NetworkStatus from './src/components/NetworkStatus';

const App = () => {
    useEffect(() => {
        // Prevent extreme font scaling that breaks the UI
        if (Text.defaultProps == null) Text.defaultProps = {};
        Text.defaultProps.maxFontSizeMultiplier = 1.2;

        if (TextInput.defaultProps == null) TextInput.defaultProps = {};
        TextInput.defaultProps.maxFontSizeMultiplier = 1.2;

        // Handle back button after logout
        const backHandler = BackHandler.addEventListener('hardwareBackPress', async () => {
            const justLoggedOut = await AsyncStorage.getItem('justLoggedOut');
            if (justLoggedOut === 'true') {
                await AsyncStorage.removeItem('justLoggedOut');
                BackHandler.exitApp();
                return true; // Prevent default back behavior
            }
            return false; // Allow default back behavior
        });

        return () => backHandler.remove();
    }, []);

    return (
        <SafeAreaProvider>
            <NetworkStatus />
            <AppNavigator />
        </SafeAreaProvider>
    );
};

export default App;
