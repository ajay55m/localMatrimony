import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Animated,
    StatusBar,
    Alert,
    Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetInfo } from '@react-native-community/netinfo';
import { getSession, isLoggedIn as checkSession, KEYS } from '../../utils/session';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { getLabel, EDUCATION_MAP, OCCUPATION_MAP, RELIGION_MAP, CASTE_MAP, LOCATION_MAP } from '../../utils/dataMappings';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { scale, moderateScale } from '../../utils/responsive';

// Components
import Footer from '../../components/Footer';
import SidebarMenu from '../../components/SidebarMenu';
import Skeleton from '../../components/Skeleton';
import PageHeader from '../../components/PageHeader';
import EmptyState from '../../components/EmptyState';
import { getUserProfiles, searchProfiles, submitSelectedProfile, getSelectedProfiles } from '../../services/profileService';

// Translations
import { TRANSLATIONS } from '../../constants/translations';

// FIX: Tamil female string as unicode escape -- avoids UTF-8 bundler crash
const TAMIL_FEMALE = '\u0BAA\u0BC6\u0BA3\u0BCD'; // 'பெண்'
const isFemaleGender = (g) => {
    if (!g) return false;
    const s = g.toLowerCase().trim();
    return s === 'female' || s === TAMIL_FEMALE;
};

const ProfileScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const scrollY = useRef(new Animated.Value(0)).current;

    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [profiles, setProfiles] = useState([]);
    const [userGender, setUserGender] = useState('Male');
    const [selectedProfiles, setSelectedProfiles] = useState(new Set());

    const lang = 'ta';
    const t = (key) => TRANSLATIONS[lang][key] || key;
    const route = useRoute();

    /* ── Read already-selected IDs from Backend ─────────────── */
    const fetchAlreadySelected = async () => {
        try {
            const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
            const storedClientId = await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID);
            const userData = userDataJson ? JSON.parse(userDataJson) : null;
            const myId = storedClientId || userData?.tamil_client_id || userData?.id || userData?.client_id || null;

            if (myId) {
                const result = await getSelectedProfiles(myId);
                if (result?.status && Array.isArray(result.data)) {
                    const ids = new Set();
                    result.data.forEach((p) => {
                        if (p.tamil_profile_id) ids.add(String(p.tamil_profile_id));
                        if (p.profile_id) ids.add(String(p.profile_id));
                        if (p.id) ids.add(String(p.id));
                    });
                    return ids;
                }
            }
        } catch (e) {
            console.error('[ProfileScreen] fetchAlreadySelected error:', e);
        }
        return new Set();
    };

    /* ── Select / deselect handler ───────────────────────────────── */
    const handleSelectProfile = async (profileObj) => {
        const profileId = String(profileObj.profile_id || profileObj.tamil_profile_id || profileObj.id || '');
        const tamilId = String(profileObj.tamil_profile_id || profileObj.id || '');
        const profileName = profileObj.name || 'Profile';

        if (selectedProfiles.has(profileId) || selectedProfiles.has(tamilId)) {
            Alert.alert(
                'Already Selected',
                `"${profileName}" was previously selected.\n\nView it in your Selected Profiles list.`,
                [
                    { text: 'View Selected', onPress: () => navigation.navigate('SelectedProfiles') },
                    { text: 'OK', style: 'cancel' },
                ]
            );
            return;
        }

        try {
            const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
            const storedClientId = await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID);
            const userData = userDataJson ? JSON.parse(userDataJson) : null;
            const myId = storedClientId || userData?.tamil_client_id || userData?.id || userData?.client_id || null;
            
            if (!myId) {
                Alert.alert('Error', 'User session not found.');
                return;
            }

            const result = await submitSelectedProfile(myId, String(tamilId || profileId), 'select_profile');

            if (result && result.status !== false) {
                setSelectedProfiles((prev) => {
                    const next = new Set(prev);
                    next.add(profileId);
                    if (tamilId) next.add(tamilId);
                    return next;
                });
                Alert.alert('Selected ✓', 'Profile added to your selected list.');
            } else {
                 if (result?.message === 'Profile already selected' || result?.message?.includes('already')) {
                     setSelectedProfiles((prev) => {
                        const next = new Set(prev);
                        next.add(profileId);
                        if (tamilId) next.add(tamilId);
                        return next;
                     });
                     Alert.alert('Already Selected', 'This profile is already in your selected list.');
                } else {
                     Alert.alert('Notice', result?.message || 'Action submitted to the backend.');
                     setSelectedProfiles((prev) => {
                        const next = new Set(prev);
                        next.add(profileId);
                        if (tamilId) next.add(tamilId);
                        return next;
                     });
                }
            }
        } catch (e) {
            console.error('[ProfileScreen] selectProfile error:', e);
            Alert.alert('Error', 'Could not select profile.');
        }
    };

    /* ── Fetch profiles ───────────────────────────────────────────── */
    const fetchProfiles = async (clientId) => {
        try {
            setIsLoading(true);
            const [profilesResult, selectedIds] = await Promise.all([
                getUserProfiles(clientId),
                fetchAlreadySelected(),
            ]);
            if (profilesResult.status && profilesResult.data) {
                setProfiles(profilesResult.data);
            }
            setSelectedProfiles(selectedIds);
        } catch (error) {
            console.error('[ProfileScreen] fetchProfiles error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const getClientId = async () => {
        const tamilClientId = await getSession(KEYS.TAMIL_CLIENT_ID);
        const data = await getSession(KEYS.USER_DATA);
        if (tamilClientId) return tamilClientId;
        if (data) {
            const user = typeof data === 'string' ? JSON.parse(data) : data;
            return user.tamil_client_id || user.client_id || user.profileid || null;
        }
        return null;
    };

    const checkLoginStatus = async () => {
        try {
            const loggedIn = await checkSession();
            setIsLoggedIn(loggedIn);
            if (loggedIn) {
                const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
                if (userDataJson) {
                    const ud = JSON.parse(userDataJson);
                    setUserGender(ud.gender || 'Male');
                }
            }
            return loggedIn;
        } catch (e) {
            console.error('[ProfileScreen] checkLoginStatus error:', e);
            return false;
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            const initialize = async () => {
                const loggedIn = await checkLoginStatus();
                const { searchResults, isSearch } = route.params || {};

                if (isSearch && searchResults) {
                    setProfiles(searchResults);
                    setIsLoading(false);
                    if (loggedIn) {
                        const clientId = await getClientId();
                        if (clientId) {
                            const selectedIds = await fetchAlreadySelected();
                            setSelectedProfiles(selectedIds);
                        }
                    }
                } else if (loggedIn) {
                    const clientId = await getClientId();
                    if (clientId) {
                        fetchProfiles(clientId);
                    } else {
                        setIsLoading(false);
                    }
                } else {
                    setIsLoading(false);
                }
            };
            initialize();
        }, [route.params])
    );

    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') navigation.navigate('Main', { initialTab: 'HOME' });
        else if (tab === 'CONTACT') navigation.navigate('Contact');
        else if (tab === 'SEARCH') navigation.navigate('Search');
    };

    const handleLogout = async () => {
        try {
            await clearSession();
            setIsLoggedIn(false);
            setMenuVisible(false);
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            console.error('[ProfileScreen] logout error:', e);
        }
    };

    /* ── Render card ──────────────────────────────────────────────── */
    const renderProfileCard = (profile, index) => {
        const cardProfileId = String(profile.profile_id || profile.id || '');
        const cardTamilId = String(profile.tamil_profile_id || profile.id || '');
        const isSelected = selectedProfiles.has(cardProfileId) || selectedProfiles.has(cardTamilId);

        const lastActiveText = profile.lastActive || 'Recent';
        const educationRaw = Array.isArray(profile.education) ? profile.education[0] : (profile.education || '');
        const educationLabel = getLabel(EDUCATION_MAP, educationRaw) || educationRaw || '-';
        const occupationRaw = profile.occupation || profile.profession || '';
        const occupationLabel = getLabel(OCCUPATION_MAP, occupationRaw) || occupationRaw || '-';
        const religionLabel = getLabel(RELIGION_MAP, profile.religion) || '-';
        const casteLabel = getLabel(CASTE_MAP, profile.caste) || profile.caste || 'Nadar';

        const district = getLabel(LOCATION_MAP, profile.district);
        const city = getLabel(LOCATION_MAP, profile.city);
        const locationParts = [city, district].filter((p) => p && p !== '0' && p !== '1' && p !== 'Unknown');
        const locationLabel =
            profile.location && profile.location !== 'Unknown'
                ? profile.location
                : locationParts.length > 0
                    ? locationParts.join(', ')
                    : 'Tamil Nadu';

        let heightLabel = '5ft 5in';
        if (profile.height) {
            heightLabel = !isNaN(profile.height) && parseInt(profile.height, 10) > 100
                ? `${profile.height} cm`
                : profile.height;
        }

        const profileIsFemale = isFemaleGender(profile.gender);

        return (
            <View key={`${cardProfileId}-${index}`} style={styles.cardWrapper}>
                {/* ── SELECTED STATE: Redesigned card with teal/emerald "shortlisted" ribbon style ── */}
                <View style={[
                    styles.profileCard,
                    isSelected && styles.profileCardSelected,
                ]}>

                    {/* Top accent stripe — teal-to-emerald when selected, soft pink otherwise */}
                    <LinearGradient
                        colors={isSelected
                            ? ['#0D9488', '#059669']   // teal → emerald
                            : ['#FFB6D9', '#FFD9F0']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.cardAccentStripe}
                    />

                    {/* ── SELECTED: Shortlisted banner ribbon ── */}
                    {isSelected && (
                        <View style={styles.selectedRibbon}>
                            <LinearGradient
                                colors={['#0D9488', '#059669']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.selectedRibbonGradient}
                            >
                                <Icon name="bookmark-check" size={scale(12)} color="#fff" />
                                <Text style={styles.selectedRibbonText}>SELECTED</Text>
                                <View style={styles.selectedRibbonDot} />
                                <Icon name="check-circle" size={scale(12)} color="#A7F3D0" />
                            </LinearGradient>
                        </View>
                    )}

                    {/* Tappable content area */}
                    <TouchableOpacity
                        activeOpacity={0.92}
                        onPress={async () => {
                            try {
                                const isAlreadyViewed = profile.viewed === true;

                                const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
                                if (userDataJson) {
                                    const ud = JSON.parse(userDataJson);
                                    const currentViews = parseInt(ud.viewed_profiles || '0', 10);
                                    if (ud.mem_plan === '0' && currentViews >= 50 && !isAlreadyViewed) {
                                        Alert.alert(
                                            'Membership Limit Reached',
                                            'On the Basic Plan, you can view up to 50 profile details. Please upgrade to a Premium Plan for unlimited access.',
                                            [
                                                { text: 'Upgrade Plan', onPress: () => navigation.navigate('Dashboard') },
                                                { text: 'OK', style: 'cancel' },
                                            ]
                                        );
                                        return;
                                    }
                                }
                                navigation.navigate('ProfileDetails', { profile });
                            } catch (e) {
                                console.error('[ProfileScreen] card onPress error:', e);
                                navigation.navigate('ProfileDetails', { profile });
                            }
                        }}
                    >
                        {/* Selected: subtle teal tint overlay */}
                        {isSelected && (
                            <View style={styles.selectedOverlay} pointerEvents="none" />
                        )}

                        {/* Header row */}
                        <View style={[styles.cardHeader, isSelected && styles.cardHeaderSelected]}>
                            <View style={styles.profileBadge}>
                                <Icon name="identifier" size={scale(13)} color="#1565C0" />
                                <Text style={styles.profileIdText}>{cardProfileId}</Text>
                            </View>
                            <View style={[styles.statusBadge, isSelected && styles.statusBadgeSelected]}>
                                <View style={[styles.statusDot, { backgroundColor: isSelected ? '#0D9488' : '#F57C00' }]} />
                                <Text style={[styles.statusText, isSelected && styles.statusTextSelected]}>
                                    {isSelected ? 'Selected' : lastActiveText}
                                </Text>
                            </View>
                        </View>

                        {/* Body */}
                        <View style={styles.cardBody}>

                            {/* Avatar column */}
                            <View style={styles.avatarColumn}>
                                <View style={[styles.avatarOuterRing, isSelected && styles.avatarOuterRingSelected]}>
                                    {/* Selected: teal ring glow layer */}
                                    {isSelected && (
                                        <View style={styles.avatarGlowRing} />
                                    )}
                                    <View style={styles.avatarInner}>
                                        {profile.profile_image ? (
                                            <Image
                                                source={{ uri: profile.profile_image }}
                                                style={styles.avatar}
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <Image
                                                source={
                                                    profileIsFemale
                                                        ? require('../../assets/images/avatar_female.jpg')
                                                        : require('../../assets/images/avatar_male.jpg')
                                                }
                                                style={styles.avatar}
                                                resizeMode="cover"
                                            />
                                        )}
                                    </View>
                                    {/* Selected: teal checkmark overlay (replaces pink) */}
                                    {isSelected && (
                                        <View style={styles.avatarCheckOverlay}>
                                            <View style={styles.avatarCheckCircle}>
                                                <Icon name="check-bold" size={scale(14)} color="#fff" />
                                            </View>
                                        </View>
                                    )}
                                </View>

                                {/* Badge below avatar */}
                                {isSelected ? (
                                    <View style={styles.selectedBadgeSmall}>
                                        <Icon name="bookmark-check" size={scale(10)} color="#0D9488" />
                                        <Text style={[styles.badgeLabelSmall, { color: '#0D9488' }]}>Saved</Text>
                                    </View>
                                ) : (
                                    <View style={styles.verifiedBadgeSmall}>
                                        <Icon name="check-circle" size={scale(10)} color="#2E7D32" />
                                        <Text style={styles.badgeLabelSmall}>Verified</Text>
                                    </View>
                                )}
                            </View>

                            {/* Info column */}
                            <View style={styles.infoContainer}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.name} numberOfLines={1}>
                                        {profile.name}
                                    </Text>
                                    <View style={[styles.ageBadge, isSelected && styles.ageBadgeSelected]}>
                                        <Text style={[styles.ageText, isSelected && styles.ageTextSelected]}>
                                            {profile.age} Yrs
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.detailsGrid, isSelected && styles.detailsGridSelected]}>
                                    <View style={styles.detailCol}>
                                        <View style={styles.detail}>
                                            <Icon name="human-male-height" size={scale(13)} color={isSelected ? '#0D9488' : '#9C27B0'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{heightLabel}</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Icon name="om" size={scale(13)} color={isSelected ? '#0D9488' : '#9C27B0'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{religionLabel}</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Icon name="account-group" size={scale(13)} color={isSelected ? '#0D9488' : '#9C27B0'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{casteLabel}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.detailCol}>
                                        <View style={styles.detail}>
                                            <Icon name="map-marker" size={scale(13)} color={isSelected ? '#059669' : '#E91E8C'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{locationLabel}</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Icon name="school" size={scale(13)} color={isSelected ? '#059669' : '#E91E8C'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{educationLabel}</Text>
                                        </View>
                                        <View style={styles.detail}>
                                            <Icon name="briefcase" size={scale(13)} color={isSelected ? '#059669' : '#E91E8C'} />
                                            <Text style={styles.detailText} numberOfLines={1}>{occupationLabel}</Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* Action row */}
                    <View style={[styles.actionDivider, isSelected && styles.actionDividerSelected]} />
                    <View style={[styles.actionRow, isSelected && styles.actionRowSelected]}>

                        {/* SELECT button */}
                        <TouchableOpacity
                            style={[
                                styles.actionBtn,
                                styles.actionBtnSelect,
                                isSelected && styles.actionBtnSelectActive,
                            ]}
                            onPress={() => handleSelectProfile(profile)}
                            activeOpacity={0.8}
                        >
                            {/* Redesigned checkbox: teal tick-shield when selected */}
                            <View style={[styles.selectCheckbox, isSelected && styles.selectCheckboxActive]}>
                                {isSelected && <Icon name="check-bold" size={scale(10)} color="#FFF" />}
                            </View>
                            <Text
                                style={[
                                    styles.actionBtnLabel,
                                    styles.actionBtnLabelSelect,
                                    isSelected && styles.actionBtnLabelSelectActive,
                                ]}
                                numberOfLines={1}
                            >
                                {isSelected ? 'Shortlisted' : 'Select Profile'}
                            </Text>
                            {isSelected && (
                                <Icon name="bookmark-check" size={scale(13)} color="#0D9488" />
                            )}
                        </TouchableOpacity>

                        {/* Vertical separator */}
                        <View style={[styles.actionVerticalSep, isSelected && styles.actionVerticalSepSelected]} />

                        {/* HOROSCOPE button — unchanged */}
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.actionBtnHoro]}
                            onPress={() =>
                                navigation.navigate('ViewHoroscope', {
                                    profile,
                                    targetProfileId: profile.tamil_profile_id || profile.id,
                                    targetProfileStringId: profile.profile_id,
                                })
                            }
                            activeOpacity={0.8}
                        >
                            <Icon name="star-crescent" size={scale(15)} color="#E65100" />
                            <Text style={[styles.actionBtnLabel, styles.actionBtnLabelHoro]} numberOfLines={1}>
                                Horoscope
                            </Text>
                        </TouchableOpacity>

                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <PageHeader
                title={t('MATCHES')}
                onBack={() => navigation.navigate('Main', { initialTab: 'HOME' })}
                icon="account-multiple"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                        {isLoggedIn && (
                            <TouchableOpacity
                                onPress={() => navigation.navigate('Main', { initialTab: 'HOME' })}
                            >
                                <Image
                                    source={
                                        isFemaleGender(userGender)
                                            ? require('../../assets/images/avatar_female.jpg')
                                            : require('../../assets/images/avatar_male.jpg')
                                    }
                                    style={styles.headerAvatar}
                                />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setMenuVisible(true)}>
                            <Icon name="menu" size={scale(28)} color="#ad0761" />
                        </TouchableOpacity>
                    </View>
                }
                isOffline={isOffline}
            />

            {isLoading ? (
                <Skeleton type="Profile" />
            ) : (
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Stats row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statsPill}>
                            <Icon name="account-multiple" size={scale(13)} color="#ad0761" />
                            <Text style={styles.statsText}>{profiles.length} Profiles</Text>
                        </View>
                        <TouchableOpacity style={styles.sortBtn}>
                            <Icon name="sort-variant" size={scale(14)} color="#ef0d8d" />
                            <Text style={styles.sortText}>Sort by Match</Text>
                            <Icon name="chevron-down" size={scale(14)} color="#ef0d8d" />
                        </TouchableOpacity>
                    </View>

                    {profiles.length > 0 ? (
                        profiles.map((profile, index) => renderProfileCard(profile, index))
                    ) : (
                        <EmptyState
                            icon="account-search-outline"
                            title="No Profiles Found"
                            message="We couldn't find any profiles matching your criteria."
                        />
                    )}

                    {profiles.length > 0 && (
                        <TouchableOpacity style={styles.loadMore}>
                            <Icon name="refresh" size={scale(16)} color="#ef0d8d" />
                            <Text style={styles.loadMoreText}>Load More Profiles</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            )}

            <View style={styles.footerWrapper}>
                <Footer
                    activeTab="PROFILE"
                    setActiveTab={handleFooterNavigation}
                    t={t}
                    isOffline={isOffline}
                />
            </View>

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

/* ─────────────────────────────────────────────────────────────────────────────
   STYLES
───────────────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F0F8' },
    scrollView: { flex: 1 },
    scrollContent: {
        paddingHorizontal: scale(14),
        paddingTop: scale(8),
        paddingBottom: scale(24),
    },
    footerWrapper: {},
    headerAvatar: {
        width: scale(35),
        height: scale(35),
        borderRadius: scale(17.5),
        borderWidth: scale(1.5),
        borderColor: '#ef0d8d',
    },

    /* Stats row */
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: scale(14),
    },
    statsPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        backgroundColor: '#FDE8F5',
        paddingHorizontal: scale(10),
        paddingVertical: scale(5),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: '#FFCCE8',
    },
    statsText: {
        fontSize: moderateScale(13),
        color: '#ad0761',
        fontWeight: '700',
    },
    sortBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        backgroundColor: '#FFF',
        paddingHorizontal: scale(10),
        paddingVertical: scale(5),
        borderRadius: scale(20),
        borderWidth: 1,
        borderColor: '#FFCCE8',
    },
    sortText: { fontSize: moderateScale(12), color: '#ef0d8d', fontWeight: '600' },

    /* Card */
    cardWrapper: { marginBottom: scale(14) },
    profileCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: scale(18),
        overflow: 'hidden',
        borderWidth: scale(1),
        borderColor: '#F0D0E8',
        ...Platform.select({
            ios: {
                shadowColor: '#C2185B',
                shadowOffset: { width: 0, height: scale(3) },
                shadowOpacity: 0.1,
                shadowRadius: scale(8),
            },
            android: { elevation: scale(4) },
        }),
    },

    /* ── REDESIGNED: Selected card — teal/emerald shortlisted style ── */
    profileCardSelected: {
        borderColor: '#0D9488',
        borderWidth: scale(1.8),
        backgroundColor: '#F0FAFA',
        ...Platform.select({
            ios: {
                shadowColor: '#0D9488',
                shadowOffset: { width: 0, height: scale(4) },
                shadowOpacity: 0.18,
                shadowRadius: scale(12),
            },
            android: { elevation: scale(7) },
        }),
    },

    cardAccentStripe: { height: scale(4), width: '100%' },

    /* Shortlisted ribbon banner — only visible when selected */
    selectedRibbon: {
        width: '100%',
    },
    selectedRibbonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: scale(5),
        gap: scale(6),
    },
    selectedRibbonText: {
        fontSize: moderateScale(10.5),
        fontWeight: '800',
        color: '#fff',
        letterSpacing: 1.4,
    },
    selectedRibbonDot: {
        width: scale(3),
        height: scale(3),
        borderRadius: scale(2),
        backgroundColor: 'rgba(255,255,255,0.6)',
    },

    /* Teal tint overlay for selected card body */
    selectedOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,148,136,0.04)',
        zIndex: 0,
    },

    /* Card header */
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(14),
        paddingTop: scale(10),
        paddingBottom: scale(6),
    },
    cardHeaderSelected: {
        // slight top padding adjustment for ribbon
        paddingTop: scale(8),
    },
    profileBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        backgroundColor: '#EEF2FF',
        paddingHorizontal: scale(8),
        paddingVertical: scale(3),
        borderRadius: scale(6),
    },
    profileIdText: {
        fontSize: moderateScale(12),
        color: '#1565C0',
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: scale(8),
        paddingVertical: scale(4),
        borderRadius: scale(12),
        gap: scale(5),
    },
    /* Selected: teal status badge */
    statusBadgeSelected: { backgroundColor: '#CCFBF1' },
    statusDot: { width: scale(6), height: scale(6), borderRadius: scale(3) },
    statusText: { fontSize: moderateScale(11), color: '#EF6C00', fontWeight: '700' },
    statusTextSelected: { color: '#0D9488' },

    /* Card body */
    cardBody: {
        flexDirection: 'row',
        paddingHorizontal: scale(14),
        paddingBottom: scale(14),
        paddingTop: scale(2),
        alignItems: 'flex-start',
    },

    /* Avatar column */
    avatarColumn: {
        alignItems: 'center',
        marginRight: scale(12),
        width: scale(84),
    },
    avatarOuterRing: {
        width: scale(76),
        height: scale(76),
        borderRadius: scale(38),
        borderWidth: scale(2.5),
        borderColor: '#FFC107',
        padding: scale(3),
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(7),
    },
    /* Selected: teal double-ring */
    avatarOuterRingSelected: {
        borderColor: '#0D9488',
        borderWidth: scale(3),
    },
    avatarGlowRing: {
        position: 'absolute',
        top: -scale(4),
        left: -scale(4),
        right: -scale(4),
        bottom: -scale(4),
        borderRadius: scale(44),
        borderWidth: scale(1.5),
        borderColor: 'rgba(13,148,136,0.25)',
        zIndex: 0,
    },
    avatarInner: {
        width: '100%',
        height: '100%',
        borderRadius: scale(34),
        overflow: 'hidden',
    },
    avatar: { width: '100%', height: '100%', borderRadius: scale(34) },
    /* Selected: teal semi-transparent overlay with check circle */
    avatarCheckOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(13,148,136,0.45)',
        borderRadius: scale(34),
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCheckCircle: {
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        backgroundColor: '#0D9488',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: scale(2),
        borderColor: '#fff',
    },

    verifiedBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E9',
        paddingHorizontal: scale(5),
        paddingVertical: scale(3),
        borderRadius: scale(4),
        gap: scale(3),
        width: scale(76),
        justifyContent: 'center',
    },
    /* Selected: teal saved badge */
    selectedBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#CCFBF1',
        paddingHorizontal: scale(5),
        paddingVertical: scale(3),
        borderRadius: scale(4),
        gap: scale(3),
        width: scale(76),
        justifyContent: 'center',
    },
    badgeLabelSmall: {
        fontSize: moderateScale(10),
        fontWeight: '600',
        color: '#333',
    },

    /* Info column */
    infoContainer: { flex: 1, paddingTop: scale(2) },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scale(10),
        gap: scale(8),
    },
    name: {
        fontSize: moderateScale(16),
        fontWeight: '800',
        color: '#1A0A0F',
        flexShrink: 1,
        lineHeight: moderateScale(22),
        fontFamily: 'NotoSansTamil-Bold',
    },
    ageBadge: {
        backgroundColor: '#FCE4EC',
        paddingHorizontal: scale(7),
        paddingVertical: scale(2),
        borderRadius: scale(6),
    },
    /* Selected: teal age badge */
    ageBadgeSelected: {
        backgroundColor: '#CCFBF1',
    },
    ageText: { fontSize: moderateScale(11), fontWeight: '700', color: '#C2185B' },
    ageTextSelected: { color: '#0D9488' },

    detailsGrid: {
        flexDirection: 'row',
        gap: scale(8),
        backgroundColor: '#FAF5FB',
        padding: scale(8),
        borderRadius: scale(10),
    },
    /* Selected: teal-tinted details grid */
    detailsGridSelected: {
        backgroundColor: '#F0FAFA',
    },
    detailCol: { flex: 1, gap: scale(6) },
    detail: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
    detailText: {
        fontSize: moderateScale(11.5),
        color: '#4B5563',
        fontWeight: '500',
        flex: 1,
        lineHeight: moderateScale(16),
        fontFamily: 'NotoSansTamil-Regular',
    },

    /* Action row */
    actionDivider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: '#F0D0E8',
        marginHorizontal: 0,
    },
    /* Selected: teal divider */
    actionDividerSelected: {
        backgroundColor: '#99F6E4',
        height: scale(1),
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    /* Selected: teal-tinted action row background */
    actionRowSelected: {
        backgroundColor: '#F0FAFA',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        paddingVertical: scale(12),
    },
    actionBtnSelect: {
        flex: 1,
        paddingHorizontal: scale(14),
        backgroundColor: '#FFF8FC',
    },
    /* Selected: teal select button background */
    actionBtnSelectActive: {
        backgroundColor: '#F0FAFA',
    },
    actionBtnHoro: {
        width: scale(118),
        paddingHorizontal: scale(8),
        backgroundColor: '#FFF8F0',
    },
    actionVerticalSep: {
        width: StyleSheet.hairlineWidth,
        backgroundColor: '#F0D0E8',
        alignSelf: 'stretch',
    },
    /* Selected: teal vertical separator */
    actionVerticalSepSelected: {
        backgroundColor: '#99F6E4',
        width: scale(1),
    },
    actionBtnLabel: {
        fontSize: moderateScale(13),
        fontWeight: '700',
        letterSpacing: 0.2,
    },
    actionBtnLabelSelect: {
        color: '#ad0761',
        flex: 1,
        textAlign: 'left',
    },
    /* Selected: teal label */
    actionBtnLabelSelectActive: { color: '#0D9488' },
    actionBtnLabelHoro: {
        color: '#E65100',
        textAlign: 'center',
    },

    /* Checkbox — teal when selected */
    selectCheckbox: {
        width: scale(17),
        height: scale(17),
        borderRadius: scale(4),
        borderWidth: scale(2),
        borderColor: '#c084a8',
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    selectCheckboxActive: {
        backgroundColor: '#0D9488',
        borderColor: '#0D9488',
    },

    /* Load more */
    loadMore: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFF',
        paddingVertical: scale(13),
        borderRadius: scale(24),
        marginTop: scale(4),
        marginBottom: scale(10),
        gap: scale(7),
        borderWidth: scale(1),
        borderColor: '#FFCCE8',
        ...Platform.select({
            ios: { shadowColor: '#ef0d8d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
            android: { elevation: 2 },
        }),
    },
    loadMoreText: { color: '#ad0761', fontSize: moderateScale(13), fontWeight: '700' },

    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        marginTop: scale(6),
        paddingHorizontal: scale(2),
    },
});

export default ProfileScreen;