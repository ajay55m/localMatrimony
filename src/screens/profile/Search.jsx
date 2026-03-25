import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Platform,
    Animated,
    StatusBar,
    Image,
} from 'react-native';
import { getSession, clearSession, isLoggedIn as checkSession, KEYS } from '../../utils/session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { useNavigation } from '@react-navigation/native';

// Components
import Footer from '../../components/Footer';
import SidebarMenu from '../../components/SidebarMenu';
import SearchFilter from '../../components/SearchFilter';
import Skeleton from '../../components/Skeleton';
import PageHeader from '../../components/PageHeader';

// Translations
import { TRANSLATIONS } from '../../constants/translations';

const { width } = Dimensions.get('window');

const SearchScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();

    // Login State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userGender, setUserGender] = useState('Male');

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
                setUserGender(ud?.gender || 'Male');
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
            setMenuVisible(false); // Close menu
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const handleSearch = (searchData) => {
        console.log('Searching with:', searchData);
        navigation.navigate('Profiles', {
            searchResults: searchData.results,
            isSearch: true
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
                        {isLoggedIn && (
                            <TouchableOpacity onPress={() => navigation.navigate('Main', { initialTab: 'HOME' })}>
                                <Image
                                    source={userGender?.toLowerCase() === 'female' || userGender === 'பெண்' ? require('../../assets/images/avatar_female.jpg') : require('../../assets/images/avatar_male.jpg')}
                                    style={{ width: 35, height: 35, borderRadius: 17.5, borderWidth: 1.5, borderColor: '#fff' }}
                                />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setMenuVisible(true)}>
                            <Icon name="menu" size={28} color="#ad0761" />
                        </TouchableOpacity>
                    </View>
                }
            />

            {isLoading ? (
                <Skeleton type="Search" />
            ) : (
                <>
                    {/* Content */}
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={styles.contentContainer}>
                            <SearchFilter onSearch={handleSearch} t={t} isLoggedIn={isLoggedIn} />
                        </View>
                    </ScrollView>
                </>
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
        backgroundColor: '#FFF7ED', // Dashboard Background Color
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 15,
        paddingBottom: 10,
        paddingTop: 10,
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginLeft: 8,
    },
    titleBadgeContainer: {
        // Removed flex/center to align left
    },
    titleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 25,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
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
});

export default SearchScreen;
