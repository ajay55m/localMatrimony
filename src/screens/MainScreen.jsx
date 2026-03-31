import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    Modal,
    Text,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

// Components
import Header from '../components/Header';
import Footer from '../components/Footer';
import SidebarMenu from '../components/SidebarMenu';
import HomeScreen from './HomeScreen';
import Dashboard from './Dashboard';
import LoginModal from '../components/LoginModal';

import { TRANSLATIONS } from '../constants/translations';
import { loginUser } from '../services/authService';
import { getProfile } from '../services/profileService';
import { setSession, clearSession, isLoggedIn as checkSession } from '../utils/session';

const { width } = Dimensions.get('window');

function MainScreen({ route }) {
    const navigation = useNavigation();
    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;

    // Global App State
    const [isLoggedIn, setIsLoggedIn] = useState(null); // null = loading

    // Initialize tab from params or default to HOME
    const initialTab = route?.params?.initialTab || 'HOME';
    const [activeTab, setActiveTab] = useState(initialTab);

    const [menuVisible, setMenuVisible] = useState(false);
    const [lang, setLang] = useState('ta'); // 'en' or 'ta'

    // Update activeTab when route params change (e.g. navigation from other screens)
    const checkLoginStatus = async () => {
        try {
            const loggedIn = await checkSession();
            setIsLoggedIn(loggedIn);
        } catch (e) {
            console.error('Failed to load session', e);
            setIsLoggedIn(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (route.params?.initialTab) {
                if (route.params.initialTab === 'PROFILE') {
                    navigation.navigate('Profiles');
                    // Reset to HOME so if they come back they see Home
                    setActiveTab('HOME');
                } else {
                    setActiveTab(route.params.initialTab);
                }
                // Clear params to avoid sticking to this tab on subsequent re-renders
                navigation.setParams({ initialTab: undefined });
            }
            checkLoginStatus();
        }, [route.params])
    );

    // Translation Helper
    const t = (key) => TRANSLATIONS[lang][key] || key;

    // Login Modal State
    const [loginVisible, setLoginVisible] = useState(false);
    const [profileId, setProfileId] = useState('');
    const [password, setPassword] = useState('');


    const handleLoginSuccess = async (userData) => {
        try {
            await setSession(userData);
            setIsLoggedIn(true);
            setLoginVisible(false);
        } catch (e) {
            console.error('Failed to save session', e);
        }
    };

    const handleLogout = async () => {
        try {
            await clearSession();
            setIsLoggedIn(false);
            setActiveTab('HOME'); // Reset to Home on logout
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            console.error('Failed to clear session', e);
        }
    };

    const handleLogoutConfirm = () => {
        Alert.alert(
            t('LOGOUT_CONFIRM_TITLE'),
            t('LOGOUT_CONFIRM_BODY'),
            [
                { text: t('NO'), style: 'cancel' },
                {
                    text: t('YES'), onPress: handleLogout, style: 'destructive'
                },
            ]
        );
    };

    const handleForgotPassword = () => {
        Alert.alert(
            t('FORGOT_PASSWORD_TITLE') || 'Forgot Password',
            t('FORGOT_PASSWORD_MSG') || 'Please contact administrator to reset your password.',
            [{ text: t('OK') || 'OK' }]
        );
    };

    const submitLogin = async () => {
        if (!profileId || !password) {
            Alert.alert('Required Fields', 'Please enter both your Profile ID and Password to continue.');
            return;
        }

        try {
            const result = await loginUser(profileId, password);
            if (result.status && result.data) {
                const clientId = result.data.tamil_client_id || result.data.id || result.data.m_id;
                let sessionDataToStore = result.data;
                
                // Get ALL details from backend and store in session immediately
                if (clientId) {
                    try {
                        const fullProfileRes = await getProfile(clientId);
                        if (fullProfileRes?.status && fullProfileRes?.data) {
                            const liveData = fullProfileRes.data.tamil_profile || fullProfileRes.data.main_profile || fullProfileRes.data;
                            if (liveData) {
                                sessionDataToStore = { ...result.data, ...liveData };
                            }
                        }
                    } catch (fetchErr) {
                        console.error('Failed to fetch full profile during login', fetchErr);
                    }
                }
                
                handleLoginSuccess(sessionDataToStore);
            } else {
                const errorStr = (result.message || '').toLowerCase();
                let professionalAuthAlert = result.message || 'Login failed. Please check your credentials and try again.';
                
                if (errorStr.includes('password') || errorStr.includes('wrong pass')) {
                    professionalAuthAlert = 'The password entered is incorrect. Please verify your password and try again.';
                } else if (errorStr.includes('profile') || errorStr.includes('invalid') || errorStr.includes('not found')) {
                    professionalAuthAlert = 'The Profile ID you entered could not be found. Please check your ID and try again.';
                }

                Alert.alert(
                    'Login Unsuccessful',
                    professionalAuthAlert,
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            console.error('Login error:', error);
            Alert.alert(
                'Connection Error', 
                'We are unable to connect to the server at this time. Please check your internet connection or try again later.',
                [{ text: 'Dismiss' }]
            );
        }
    };

    // Main Content Controller Logic
    const renderContent = () => {
        // 1. Dashboard Logic: Only if Logged In AND Tab is Home
        if (activeTab === 'HOME' && isLoggedIn) {
            return <Dashboard t={t} />;
        }

        // 2. Landing/Guest Logic or other Tabs
        return (
            <HomeScreen
                activeTab={activeTab}
                isLoggedIn={isLoggedIn}
                onLoginPress={() => setLoginVisible(true)}
                t={t}
            />
        );
    };

    const renderLoginModal = () => (
        <LoginModal
            visible={loginVisible}
            onClose={() => setLoginVisible(false)}
            onLoginSuccess={handleLoginSuccess}
            t={t}
        />
    );

    if (isLoggedIn === null) {
        return (
            <View style={{ flex: 1, backgroundColor: '#FFF7ED' }} />
        );
    }

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* 1. Header Control */}
            <Header
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                isOffline={isOffline}
            />

            {/* 2. Main Content Control */}
            <View style={styles.contentContainer}>
                {renderContent()}
            </View>

            {/* 3. Footer Control */}
            <View style={styles.footerContainer}>
                <Footer
                    activeTab={activeTab}
                    t={t}
                    isOffline={isOffline}
                    setActiveTab={(tab) => {
                        // 1. Home is always accessible
                        if (tab === 'HOME') {
                            setActiveTab(tab);
                            return;
                        }

                        // 2. Profiles is now also directly accessible (Redirection as requested)
                        if (tab === 'PROFILE') {
                            navigation.navigate('Profiles');
                            return;
                        }

                        // 3. Strict Login Wall for everything else
                        if (!isLoggedIn) {
                            setLoginVisible(true);
                            return;
                        }

                        // 4. Navigation for Logged-In Users
                        if (tab === 'CONTACT') {
                            navigation.navigate('Contact');
                        } else if (tab === 'SEARCH') {
                            navigation.navigate('Search');
                        }
                    }}
                />
            </View>

            {/* 4. Overlays/Modals */}
            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogoutConfirm}
                t={t}
            />

            {renderLoginModal()}

        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: '#FFF7ED',
    },
    contentContainer: {
        flex: 1,
    },
    footerContainer: {
        // Footer styles
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginModalContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    closeModalBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ef0d8d',
        textAlign: 'center',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    modalInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
    },
    fullWidthBtn: {
        marginTop: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    btnGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginExtraActions: {
        marginTop: 20,
        alignItems: 'center',
        gap: 15,
    },
    forgotBtn: {
        alignItems: 'center',
    },
    forgotText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    registerLinkBtn: {
        marginTop: 5,
    },
    registerLinkText: {
        color: '#666',
        fontSize: 14,
    },
    registerLinkSpan: {
        color: '#ef0d8d',
        fontWeight: 'bold',
    },
});

export default MainScreen;
