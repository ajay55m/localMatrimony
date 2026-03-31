import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Platform,
    StatusBar,
} from 'react-native';
import { getSession, clearSession, isLoggedIn as checkSession, KEYS } from '../../utils/session';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { scale, moderateScale } from '../../utils/responsive';

// Components
import Footer from '../../components/Footer';
import SidebarMenu from '../../components/SidebarMenu';
import SearchFilter from '../../components/SearchFilter';
import Skeleton from '../../components/Skeleton';
import PageHeader from '../../components/PageHeader';

// Utils
import { isProfileLimitReached } from '../../utils/profileUtils';

// ── FIX: Import getSelectedProfiles to fetch actual selected count ─────────────
import { getSelectedProfiles } from '../../services/profileService';

// Translations
import { TRANSLATIONS } from '../../constants/translations';

const { width } = Dimensions.get('window');

const SearchScreen = () => {
    const navigation = useNavigation();

    // Login State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userGender, setUserGender] = useState('Male');
    const [userData, setUserData] = useState(null);
    const [isLimitReached, setIsLimitReached] = useState(false);

    // Fixed Tamil Language
    const lang = 'ta';
    const t = (key) => TRANSLATIONS[lang][key] || key;

    useEffect(() => {
        checkLoginStatus();
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const checkLoginStatus = async () => {
        try {
            const loggedIn = await checkSession();
            setIsLoggedIn(loggedIn);

            if (loggedIn) {
                const ud = await getSession(KEYS.USER_DATA);
                setUserData(ud);
                setUserGender(ud?.gender || 'Male');

                // ── Fetch actual selected count from API, compare against user_points ──
                const clientId = ud?.tamil_client_id || ud?.id;
                if (clientId) {
                    const countRes = await getSelectedProfiles(String(clientId));
                    const currentCount = Array.isArray(countRes?.data) ? countRes.data.length : 0;
                    setIsLimitReached(isProfileLimitReached(ud, currentCount));
                } else {
                    setIsLimitReached(isProfileLimitReached(ud, 0));
                }
            }
        } catch (e) {
            console.error('Failed to load session', e);
        }
    };

    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') {
            navigation.navigate('Main', { initialTab: 'HOME' });
        } else if (tab === 'CONTACT') {
            navigation.navigate('Contact');
        } else if (tab === 'SEARCH') {
            // Already here
        } else if (tab === 'PROFILE') {
            navigation.navigate('Profiles');
        }
    };

    const handleLogout = async () => {
        try {
            await clearSession();
            setIsLoggedIn(false);
            setMenuVisible(false);
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const handleSearch = (searchData) => {
        console.log('Searching with:', searchData);
        navigation.navigate('Profiles', {
            searchResults: searchData.results,
            isSearch: true,
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <PageHeader
                title={t('SEARCH')}
                onBack={() => navigation.navigate('Main', { initialTab: 'HOME' })}
                icon="account-search"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <TouchableOpacity onPress={() => setMenuVisible(true)}>
                            <Icon name="menu" size={28} color="#ad0761" />
                        </TouchableOpacity>
                    </View>
                }
            />

            {isLoading ? (
                <Skeleton type="Search" />
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {isLimitReached ? (
                        // ── Limit reached: hide search, show only selected profiles button ──
                        <View style={styles.limitContainer}>
                            <View style={styles.limitIconBox}>
                                <Icon name="alert-circle-outline" size={scale(48)} color="#ef0d8d" />
                            </View>
                            <Text style={styles.limitTitle}>
                                {t('LIMIT_TITLE') || 'Membership Limit Reached'}
                            </Text>
                            <Text style={styles.limitMessage}>
                                {t('LIMIT_MESSAGE') ||
                                    'You have reached your profile selection limit. You can only view your selected profiles now. Please contact the marriage bureau to upgrade your plan.'}
                            </Text>
                            <TouchableOpacity
                                style={styles.limitBtn}
                                onPress={() => navigation.navigate('SelectedProfiles')}
                            >
                                <LinearGradient
                                    colors={['#ef0d8d', '#ad0761']}
                                    style={styles.limitBtnGradient}
                                >
                                    <Text style={styles.limitBtnText}>
                                        {t('VIEW_SELECTED_PROFILES') || 'View Selected Profiles'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        // ── Normal: show search filter ────────────────────────────────────
                        <View style={styles.contentContainer}>
                            <SearchFilter
                                onSearch={handleSearch}
                                t={t}
                                isLoggedIn={isLoggedIn}
                            />
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.footerWrapper}>
                <Footer
                    activeTab="SEARCH"
                    setActiveTab={handleFooterNavigation}
                    t={t}
                />
            </View>

            {/* Sidebar Menu */}
            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                t={t}
                navigation={navigation}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF7ED',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 14,
        paddingTop: 5,
        paddingBottom: 20,
    },
    contentContainer: {
        flex: 1,
    },
    footerWrapper: {
        marginBottom: 0,
    },
    // ── Limit screen styles ───────────────────────────────────────────────────
    limitContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(20),
        marginTop: scale(50),
    },
    limitIconBox: {
        width: scale(100),
        height: scale(100),
        borderRadius: scale(50),
        backgroundColor: '#FFE4F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(20),
    },
    limitTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
        color: '#1A0A1F',
        marginBottom: scale(12),
        textAlign: 'center',
        fontFamily: 'NotoSansTamil-Bold',
    },
    limitMessage: {
        fontSize: moderateScale(14),
        color: '#6B7280',
        lineHeight: moderateScale(22),
        textAlign: 'center',
        marginBottom: scale(30),
        fontFamily: 'NotoSansTamil-Regular',
    },
    limitBtn: {
        width: '100%',
        borderRadius: scale(12),
        overflow: 'hidden',
    },
    limitBtnGradient: {
        paddingVertical: scale(15),
        alignItems: 'center',
    },
    limitBtnText: {
        color: 'white',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
});

export default SearchScreen;