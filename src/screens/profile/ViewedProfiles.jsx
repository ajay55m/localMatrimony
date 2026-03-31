import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import { scale, moderateScale } from '../../utils/responsive';
import { decodeUTF8String } from '../../utils/utf8Helper';
import PageHeader from '../../components/PageHeader';
import Footer from '../../components/Footer';
import EmptyState from '../../components/EmptyState';
import { KEYS } from '../../utils/session';
import { getSelectedProfiles, submitSelectedProfile } from '../../services/profileService';
import SidebarMenu from '../../components/SidebarMenu';
import Skeleton from '../../components/Skeleton';
import { TRANSLATIONS } from '../../constants/translations';
import { clearSession } from '../../utils/session';
import { BASE_IMAGE_URL } from '../../config/apiConfig';

const BASE_IMG = BASE_IMAGE_URL;
const TAMIL_FEMALE = '\u0BAA\u0BC6\u0BA3\u0BCD';
const isFemaleGender = (g) => {
    if (!g) return false;
    const s = String(g).toLowerCase().trim();
    return s === 'female' || s === TAMIL_FEMALE || s === 'பெண்' || s === 'girl';
};

const resolveImageUrl = (item) => {
    try {
        const raw = item?.profile_image || item?.user_photo || item?.photo_data1 || null;
        if (!raw || typeof raw !== 'string') return null;
        if (raw.startsWith('http')) return raw;
        return BASE_IMG + raw.replace(/^\/+/, '');
    } catch (_) { return null; }
};

const safeStr = (val, fallback = '—') => {
    try {
        if (val === null || val === undefined) return fallback;
        const s = String(val).trim();
        return s === '' || s === 'null' || s === 'undefined' ? fallback : s;
    } catch (_) { return fallback; }
};

// ✅ Safe AsyncStorage — never throws, never returns null keys
const safeGet = async (key) => {
    try {
        if (!key || typeof key !== 'string') return null;
        return await AsyncStorage.getItem(key);
    } catch (_) { return null; }
};

const safeSet = async (key, value) => {
    try {
        if (!key || typeof key !== 'string') return;
        if (value === null || value === undefined) return;
        await AsyncStorage.setItem(key, String(value));
    } catch (_) { }
};

const ViewedProfiles = () => {
    const navigation = useNavigation();
    const netInfo = useNetInfo();
    const isOffline = netInfo.isConnected === false;

    const [profiles, setProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userGender, setUserGender] = useState('Male');
    const [viewedCount, setViewedCount] = useState(null);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') navigation.navigate('Main', { initialTab: 'HOME' });
        else if (tab === 'CONTACT') navigation.navigate('Contact');
        else if (tab === 'SEARCH') navigation.navigate('Search');
        else if (tab === 'PROFILE') navigation.navigate('Profiles');
    };

    const t = (key) => TRANSLATIONS['ta'][key] || key;

    useFocusEffect(useCallback(() => {
        loadProfiles();
    }, []));

    const loadProfiles = async () => {
        try {
            setIsLoading(true);

            // ── Safe session read — never throws ──────────────────────────
            let userData = null;
            try {
                const raw = await safeGet(KEYS.USER_DATA);
                if (raw) userData = JSON.parse(raw);
            } catch (_) { userData = null; }

            if (userData?.gender) setUserGender(userData.gender);
            setIsLoggedIn(!!userData);

            // ── Resolve numeric user ID safely ────────────────────────────
            let storedClientId = await safeGet(KEYS.TAMIL_CLIENT_ID);

            // Migrate old string ID (e.g. "HM8282") to numeric
            if (storedClientId && isNaN(storedClientId) && userData?.id) {
                storedClientId = String(userData.id);
                await safeSet(KEYS.TAMIL_CLIENT_ID, storedClientId);
            }

            const tamilId = safeStr(
                storedClientId ||
                userData?.tamil_client_id ||
                userData?.id ||
                userData?.client_id ||
                null,
                ''
            );

            if (!tamilId || tamilId === '—') {
                console.warn('[ViewedProfiles] No valid user ID');
                setIsLoading(false);
                return;
            }

            console.log('[ViewedProfiles] tamilId:', tamilId);

            // ── API call — use 'get_selected_profiles' as requested ─────────
            const result = await getSelectedProfiles(tamilId);

            console.log('[ViewedProfiles] API response:', result);

            if (result?.status && Array.isArray(result.data)) {
                // Filter: only show profiles that have been viewed
                const viewedOnly = result.data.filter(p => 
                    p.viewed === true || p.viewed === 'true' || p.viewed === '1' || p.viewed === 1
                );

                const sanitized = viewedOnly.map((p, idx) => {
                    const tid = p?.tamil_profile_id ?? p?.id ?? idx;
                    const pid = p?.profile_id ?? '';
                    return {
                        ...p,
                        tamil_profile_id: tid,
                        profile_id: typeof pid === 'string' ? pid : String(pid ?? ''),
                        id: tid,
                        name: safeStr(p?.name || p?.user_name, ''),
                        is_selected: true, // They are in 'get_selected_profiles'
                        viewed: true,
                        education: Array.isArray(p?.education) ? p.education : [p?.education].filter(Boolean),
                    };
                });

                // Use the API's reported viewed_count
                const finalCount = result.viewed_count !== undefined 
                    ? Number(result.viewed_count) 
                    : sanitized.length;

                setViewedCount(finalCount);
                setProfiles(sanitized);
            } else {
                setViewedCount(0);
                setProfiles([]);
            }

        } catch (err) {
            console.error('[ViewedProfiles] loadProfiles error:', err);
            setViewedCount(0);
            setProfiles([]);
        } finally {
            setIsLoading(false);
        }
    };

    const formatDate = (raw) => {
        if (!raw || raw === '') return '—';
        try {
            const d = new Date(raw);
            if (!isNaN(d.getTime())) {
                return d.toLocaleDateString('en-IN', {
                    day: '2-digit', month: 'short', year: 'numeric',
                });
            }
        } catch (_) { }
        return safeStr(raw);
    };

    const resolveForNavigation = (item) => ({
        ...item,
        id: item.tamil_profile_id,
        tamil_profile_id: item.tamil_profile_id,
        profile_id: item.profile_id,
        name: decodeUTF8String(item.name || '') || 'Unknown',
    });

    const handleCardPress = (item) => {
        try {
            const profile = resolveForNavigation(item);
            if (!profile.tamil_profile_id && !profile.profile_id) {
                Alert.alert('Error', 'Profile data is incomplete.');
                return;
            }
            navigation.navigate('ProfileDetails', { profile });
        } catch (e) {
            console.error('[ViewedProfiles] handleCardPress error:', e);
        }
    };

    const handleSelectProfile = async (item) => {
        try {
            const storedClientId = await safeGet(KEYS.TAMIL_CLIENT_ID);
            if (!storedClientId) {
                Alert.alert('Error', 'User ID not found. Please login again.');
                return;
            }

            const res = await submitSelectedProfile(storedClientId, item.tamil_profile_id);
            if (res?.status || res?.message === 'Profile already selected') {
                if (!item.is_selected) {
                    Alert.alert('Success', 'Profile shortlisted successfully!');
                }
                // Optimistically update the local state
                setProfiles(prev => prev.map(p =>
                    p.id === item.id ? { ...p, is_selected: true } : p
                ));
            } else {
                Alert.alert('Notice', res?.message || 'Could not shortlist profile.');
            }
        } catch (err) {
            console.error('[ViewedProfiles] handleSelectProfile error:', err);
            Alert.alert('Error', 'Something went wrong. Please try again.');
        }
    };

    const renderCard = ({ item, index }) => {
        const name = decodeUTF8String(item.name) || 'Unknown';
        const displayId = safeStr(item.profile_id || item.tamil_profile_id);
        const age = safeStr(item.age);
        const height = safeStr(item.height);
        const religion = safeStr(item.religion);
        const occupation = safeStr(item.occupation);
        const education = item.education.length > 0 ? safeStr(item.education[0]) : '—';
        const location = safeStr(item.location);
        const date = formatDate(item.viewed_at);
        const imageUrl = resolveImageUrl(item);
        const isFemale = isFemaleGender(item.gender);
        const defaultAvatar = isFemale
            ? require('../../assets/images/avatar_female.jpg')
            : require('../../assets/images/avatar_male.jpg');

        return (
            <TouchableOpacity
                activeOpacity={0.93}
                onPress={() => handleCardPress(item)}
                style={styles.cardWrapper}
            >
                <View style={styles.card}>
                    <LinearGradient
                        colors={['#ad0761', '#ef0d8d']}
                        style={styles.accentStripe}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                    <View style={styles.cardInner}>

                        {/* ID + Date */}
                        <View style={styles.topRow}>
                            <View style={styles.idPill}>
                                <Icon name="identifier" size={scale(11)} color="#1565C0" />
                                <Text style={styles.idText}>{displayId}</Text>
                            </View>
                            <View style={styles.datePill}>
                                <Icon name="calendar-check-outline" size={scale(11)} color="#ad0761" />
                                <Text style={styles.dateText}>{date}</Text>
                            </View>
                        </View>

                        {/* Body */}
                        <View style={styles.body}>
                            <View style={styles.avatarWrap}>
                                <Image
                                    source={imageUrl ? { uri: imageUrl } : defaultAvatar}
                                    style={styles.avatar}
                                    resizeMode="cover"
                                    onError={() => { }}
                                />
                                <View style={styles.visitedBadge}>
                                    <Icon name="eye-check" size={scale(9)} color="#FFF" />
                                </View>
                            </View>

                            <View style={styles.info}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                                    <View style={styles.nameRowBadges}>
                                        {item.age !== '' && (
                                            <View style={styles.agePill}>
                                                <Text style={styles.ageText}>{age}y</Text>
                                            </View>
                                        )}
                                        <TouchableOpacity
                                            activeOpacity={0.7}
                                            onPress={() => handleSelectProfile(item)}
                                            style={styles.heartBtn}
                                        >
                                            <Icon
                                                name={item.is_selected ? 'heart' : 'heart-outline'}
                                                size={scale(18)}
                                                color={item.is_selected ? '#ef0d8d' : '#9CA3AF'}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.detailsGrid}>
                                    <View style={styles.detailCol}>
                                        <DetailRow icon="human-male-height" text={height} />
                                        <DetailRow icon="school-outline" text={education} />
                                        <DetailRow icon="briefcase-outline" text={occupation} />
                                    </View>
                                    <View style={styles.detailCol}>
                                        <DetailRow icon="map-marker-outline" text={location} />
                                        <DetailRow icon="om" text={religion} />
                                        <DetailRow
                                            icon={item.photo_requested
                                                ? 'image-check'
                                                : 'image-off-outline'}
                                            text={item.photo_requested
                                                ? 'Photo Requested'
                                                : 'No Photo Request'}
                                        />
                                    </View>
                                </View>

                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.btnOutline}
                                        activeOpacity={0.8}
                                        onPress={() => handleCardPress(item)}
                                    >
                                        <Icon name="eye-outline" size={scale(13)} color="#ad0761" />
                                        <Text style={styles.btnOutlineText}>View Profile</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.btnFill}
                                        activeOpacity={0.8}
                                        onPress={() => {
                                            try {
                                                const navProfile = resolveForNavigation(item);
                                                navigation.navigate('ViewHoroscope', {
                                                    profile: navProfile,
                                                    targetProfileId: navProfile.tamil_profile_id || navProfile.id,
                                                    targetProfileStringId: navProfile.profile_id,
                                                });
                                            } catch (e) {
                                                console.error('[ViewedProfiles] horoscope nav:', e);
                                            }
                                        }}
                                    >
                                        <Icon name="star-crescent" size={scale(13)} color="#FFF" />
                                        <Text style={styles.btnFillText}>Horoscope</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            <PageHeader
                title={`Viewed Profiles (${viewedCount ?? '...'})`}
                onBack={() => navigation.goBack()}
                icon="eye"
                isOffline={isOffline}
                onMenuPress={() => setMenuVisible(true)}
            />

            {viewedCount != null && (
                <View style={styles.countBanner}>
                    <Icon name="eye-check-outline" size={scale(14)} color="#ad0761" />
                    <Text style={styles.countBannerText}>
                        You have viewed{' '}
                        <Text style={styles.countNum}>{viewedCount}</Text>
                        {' '}profile{viewedCount !== 1 ? 's' : ''} in full detail
                    </Text>
                </View>
            )}

            {isLoading ? (
                <Skeleton type="List" />
            ) : profiles.length === 0 ? (
                <EmptyState
                    icon="eye-off-outline"
                    title="No Viewed Profiles"
                    message="You haven't viewed any profiles in full detail yet."
                />
            ) : (
                <FlatList
                    data={profiles}
                    renderItem={renderCard}
                    keyExtractor={(item, index) =>
                        `vp-${String(item.tamil_profile_id)}-${index}`
                    }
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onRefresh={loadProfiles}
                    refreshing={isLoading}
                />
            )}
            <View style={styles.footerWrapper}>
                <Footer
                    activeTab={null}
                    setActiveTab={handleFooterNavigation}
                    t={t}
                    isOffline={isOffline}
                />
            </View>
            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={async () => {
                    await clearSession();
                    setIsLoggedIn(false);
                    setMenuVisible(false);
                    navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
                }}
                t={t}
                navigation={navigation}
            />
        </View>
    );
};

const DetailRow = ({ icon, text }) => (
    <View style={styles.detailRow}>
        <Icon name={icon} size={scale(12)} color="#9CA3AF" />
        <Text style={styles.detailText} numberOfLines={1}>{text || '—'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F6F0F8' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    list: { paddingHorizontal: scale(14), paddingTop: scale(6), paddingBottom: scale(20) },

    countBanner: {
        flexDirection: 'row', alignItems: 'center', gap: scale(7),
        marginHorizontal: scale(14), marginTop: scale(8), marginBottom: scale(4),
        paddingHorizontal: scale(12), paddingVertical: scale(8),
        backgroundColor: '#FFF0FA', borderRadius: scale(10),
        borderWidth: 1, borderColor: '#FFCCE8',
    },
    countBannerText: { fontSize: moderateScale(12), color: '#555' },
    countNum: { fontWeight: '800', color: '#ad0761' },

    cardWrapper: { marginBottom: scale(10) },
    card: {
        flexDirection: 'row', backgroundColor: '#FFFFFF',
        borderRadius: scale(14), overflow: 'hidden',
        borderWidth: 1, borderColor: '#F0E4F0',
        ...Platform.select({
            ios: { shadowColor: '#C2185B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
            android: { elevation: 3 },
        }),
    },
    accentStripe: { width: scale(4) },
    cardInner: { flex: 1, paddingHorizontal: scale(12), paddingVertical: scale(10) },

    topRow: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: scale(8),
    },
    idPill: {
        flexDirection: 'row', alignItems: 'center', gap: scale(3),
        backgroundColor: '#EEF2FF', paddingHorizontal: scale(7),
        paddingVertical: scale(3), borderRadius: scale(5),
    },
    idText: { fontSize: moderateScale(11), color: '#1565C0', fontWeight: '700' },
    datePill: {
        flexDirection: 'row', alignItems: 'center', gap: scale(4),
        backgroundColor: '#FDE8F5', paddingHorizontal: scale(7),
        paddingVertical: scale(3), borderRadius: scale(5),
    },
    dateText: { fontSize: moderateScale(11), color: '#ad0761', fontWeight: '600' },

    body: { flexDirection: 'row', gap: scale(10) },

    avatarWrap: {
        width: scale(62), height: scale(62),
        borderRadius: scale(31), position: 'relative', flexShrink: 0,
    },
    avatar: {
        width: scale(62), height: scale(62), borderRadius: scale(31),
        borderWidth: scale(2.5), borderColor: '#ef0d8d',
    },
    visitedBadge: {
        position: 'absolute', bottom: 0, right: 0,
        width: scale(18), height: scale(18), borderRadius: scale(9),
        backgroundColor: '#2E7D32',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: scale(1.5), borderColor: '#FFF',
    },

    info: { flex: 1 },
    nameRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(6),
    },
    nameRowBadges: {
        flexDirection: 'row', alignItems: 'center',
        gap: scale(6),
    },
    name: {
        fontSize: moderateScale(15), fontWeight: '800',
        color: '#1A0A1F', flexShrink: 1,
        fontFamily: 'NotoSansTamil-Bold', lineHeight: moderateScale(20),
    },
    agePill: {
        backgroundColor: '#FCE4EC', paddingHorizontal: scale(6),
        paddingVertical: scale(2), borderRadius: scale(4),
    },
    ageText: { fontSize: moderateScale(11), fontWeight: '700', color: '#C2185B' },
    heartBtn: {
        padding: scale(2),
    },

    detailsGrid: {
        flexDirection: 'row', gap: scale(6),
        backgroundColor: '#FAF5FB', borderRadius: scale(8),
        padding: scale(7), marginBottom: scale(8),
    },
    detailCol: { flex: 1, gap: scale(4) },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
    detailText: {
        fontSize: moderateScale(11), color: '#4B5563',
        fontWeight: '500', flex: 1, fontFamily: 'NotoSansTamil-Regular',
    },

    actionRow: { flexDirection: 'row', gap: scale(7) },
    btnOutline: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: scale(4), paddingVertical: scale(7),
        borderWidth: 1.5, borderColor: '#ad0761',
        borderRadius: scale(8), backgroundColor: '#FFF8FC',
    },
    btnOutlineText: { fontSize: moderateScale(11), color: '#ad0761', fontWeight: '700' },
    btnFill: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: scale(4), paddingVertical: scale(7),
        borderRadius: scale(8), backgroundColor: '#ad0761',
    },
    btnFillText: { fontSize: moderateScale(11), color: '#FFF', fontWeight: '700' },
    footerWrapper: {
        backgroundColor: '#FFF',
    },
});

export default ViewedProfiles;