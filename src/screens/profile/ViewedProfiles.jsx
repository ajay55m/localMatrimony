import React, { useState, useCallback, useEffect } from 'react';
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
import EmptyState from '../../components/EmptyState';
import Footer from '../../components/Footer';
import SidebarMenu from '../../components/SidebarMenu';
import { KEYS, isLoggedIn as checkLoggedIn } from '../../utils/session';
import { getSelectedProfiles } from '../../services/profileService';

const BASE_IMG = 'https://nadarmahamai.com/adminpanel/matrimony/userphoto/';

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
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [activeTab, setActiveTab] = useState('SEARCH');

    useEffect(() => {
        const initLogin = async () => {
            const logged = await checkLoggedIn();
            setIsLoggedIn(logged);
        };
        initLogin();
    }, []);

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

            // ── API call ──────────────────────────────────────────────────
            const result = await getSelectedProfiles(tamilId);

            console.log('[ViewedProfiles] viewed_count:', result?.viewed_count,
                '| data.length:', result?.data?.length);

            if (result?.status && Array.isArray(result.data)) {
                setViewedCount(
                    typeof result.viewed_count === 'number'
                        ? result.viewed_count
                        : result.data.length
                );

                // ── Sanitize all items before storing in state ────────────
                // Every field explicitly coerced to its safe type.
                // Prevents any null leaking into FlatList / AsyncStorage.
                const sanitized = result.data.map((p, idx) => {
                    const tid = p?.tamil_profile_id ?? p?.id ?? idx;
                    const pid = p?.profile_id ?? '';
                    return {
                        // IDs
                        tamil_profile_id: tid,
                        profile_id: typeof pid === 'string' ? pid : String(pid ?? ''),
                        eng_client_id: safeStr(p?.eng_client_id, ''),
                        id: tid,
                        // Strings
                        name: safeStr(p?.name, ''),
                        age: safeStr(p?.age, ''),
                        height: safeStr(p?.height, ''),
                        religion: safeStr(p?.religion, ''),
                        occupation: safeStr(p?.occupation, ''),
                        location: safeStr(p?.location, ''),
                        gender: safeStr(p?.gender, ''),
                        viewed_at: safeStr(p?.viewed_at, ''),
                        // Booleans
                        photo_requested: p?.photo_requested === true,
                        is_selected: p?.is_selected !== false,
                        // Array
                        education: Array.isArray(p?.education) ? p.education : [],
                        // Nullable — resolveImageUrl handles null safely
                        profile_image: p?.profile_image || null,
                        user_photo: p?.user_photo || null,
                        photo_data1: p?.photo_data1 || null,
                    };
                });

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

    const handleFooterNavigation = (tab) => {
        setActiveTab(tab);

        if (tab === 'HOME') {
            navigation.navigate('Main', { initialTab: 'HOME' });
        } else if (tab === 'CONTACT') {
            navigation.navigate('Contact');
        } else if (tab === 'SEARCH') {
            navigation.navigate('Search');
        } else if (tab === 'PROFILE') {
            navigation.navigate('Profiles');
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
        const isFemale = item.gender?.toLowerCase() === 'female';
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
                                    {item.age !== '' && (
                                        <View style={styles.agePill}>
                                            <Text style={styles.ageText}>{age}y</Text>
                                        </View>
                                    )}
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
                rightComponent={
                    <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 6 }}>
                        <Icon name="menu" size={26} color="#ad0761" />
                    </TouchableOpacity>
                }
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
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#ef0d8d" />
                </View>
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
                        // Always a non-null string — tamil_profile_id is number
                        // after sanitization, profile_id is string, index is fallback
                        `vp-${String(item.tamil_profile_id)}-${index}`
                    }
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    onRefresh={loadProfiles}
                    refreshing={isLoading}
                />
            )}

            <View style={{ backgroundColor: '#FFF7ED' }}>
                <Footer
                    activeTab={activeTab}
                    setActiveTab={handleFooterNavigation}
                    isOffline={isOffline}
                />
            </View>

            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={() => {
                    // default logout: clear session and return to main screen
                    // no direct clearSession here to avoid breaking user logic
                    navigation.reset({ index: 0, routes: [{ name: 'Main', params: { initialTab: 'HOME' } }] });
                }}
                t={(key) => key}
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
        gap: scale(6), marginBottom: scale(6),
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
});

export default ViewedProfiles;