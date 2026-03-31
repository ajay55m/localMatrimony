import React, { useState, useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    Alert,
    Modal,
    Platform,
    Share,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSession, KEYS } from '../utils/session';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Skeleton from '../components/Skeleton';
import { scale, moderateScale } from '../utils/responsive';
import { decodeUTF8String, logUTF8String } from '../utils/utf8Helper';
import { getProfile, getDashboardStats, getSelectedCount, getSelectedProfiles } from '../services/profileService';
import { BASE_IMAGE_URL, WRONG_IMAGE_URL } from '../config/apiConfig';

const { width, height } = Dimensions.get('window');

const COLORS = {
    primary: '#FF4081',
    primaryLight: '#FFE5EF',
    primaryDark: '#E91E63',
    background: '#FAFAFA',
    card: '#FFFFFF',
    textPrimary: '#2C3E50',
    textSecondary: '#7F8C8D',
    textTertiary: '#BDC3C7',
    success: '#00C853',
    warning: '#FFC107',
    danger: '#FF1744',
    info: '#2196F3',
    green: '#4CAF50',
    blue: '#42A5F5',
    border: '#FFB3D9',
    divider: '#ECEFF1',
};

// ─── Build a full URL from a raw filename or already-absolute URL ─────────────
// IMPORTANT: The correct image path is adminpanel/matrimony/userphoto/ (from web PHP).
// Old cached data may contain the wrong /uploads/ path — we rewrite it here.
const toFullUrl = (raw) => {
    if (!raw) return null;
    // Rewrite stale /uploads/ URLs — correct path is adminpanel/matrimony/userphoto/
    if (raw.startsWith(WRONG_IMAGE_URL)) {
        return BASE_IMAGE_URL + raw.slice(WRONG_IMAGE_URL.length);
    }
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${BASE_IMAGE_URL}${raw}`;
};

// ─── Extract photos array from the API data object ───────────────────────────
// Handles both the new `photos` array and the legacy photo_data1/2/3 fields.
const extractPhotos = (data) => {
    // data is profileResult.data (top-level)
    // Priority 1: top-level photos array
    if (data?.photos && Array.isArray(data.photos) && data.photos.length > 0) {
        return data.photos.map((p) => ({ ...p, url: toFullUrl(p.url || p.filename) }));
    }

    // Priority 2: photos inside tamil_profile or main_profile
    const liveProfile = data?.tamil_profile || data?.main_profile;
    if (liveProfile?.photos && Array.isArray(liveProfile.photos) && liveProfile.photos.length > 0) {
        return liveProfile.photos.map((p) => ({ ...p, url: toFullUrl(p.url || p.filename) }));
    }

    // Priority 3: build from raw photo fields
    const photos = [];
    const src = liveProfile || data;
    if (src?.user_photo) photos.push({ slot: 0, url: toFullUrl(src.user_photo), filename: src.user_photo });
    if (src?.photo_data1) photos.push({ slot: 1, url: toFullUrl(src.photo_data1), filename: src.photo_data1 });
    if (src?.photo_data2) photos.push({ slot: 2, url: toFullUrl(src.photo_data2), filename: src.photo_data2 });
    if (src?.photo_data3) photos.push({ slot: 3, url: toFullUrl(src.photo_data3), filename: src.photo_data3 });
    return photos.filter((p) => p.url);
};

// ─── Extract primary photo URL from the API data object ──────────────────────
const extractPrimaryPhoto = (data) => {
    // Priority 1: top-level primary_photo (already absolute URL)
    if (data?.primary_photo) return toFullUrl(data.primary_photo);

    const liveProfile = data?.tamil_profile || data?.main_profile;

    // Priority 2: profile_image on the live profile (already absolute in the sample)
    if (liveProfile?.profile_image) return toFullUrl(liveProfile.profile_image);

    // Priority 3: first photo from photos array
    const photos = extractPhotos(data);
    if (photos.length > 0) return photos[0].url;

    // Priority 4: raw user_photo / photo_data fields
    const src = liveProfile || data;
    if (src?.user_photo) return toFullUrl(src.user_photo);
    if (src?.photo_data1) return toFullUrl(src.photo_data1);
    if (src?.photo_data2) return toFullUrl(src.photo_data2);
    if (src?.photo_data3) return toFullUrl(src.photo_data3);

    return null;
};

// ─── Fetch image with bot-protection cookie → base64 data URI ────────────────
//
// WHY THIS EXISTS:
//   nadarmahamai.com uses Imunify360. Without Cookie: humans_21909=1 the server
//   returns 409 Conflict instead of the image, so React Native's plain <Image>
//   always shows blank/black.
//
// WHY NOT FileReader / btoa:
//   Both are browser APIs. React Native's JS engine (Hermes/JSC) does NOT have
//   them. We use arrayBuffer() → Uint8Array → manual base64 loop instead.
//
// WHY CHUNKED base64:
//   String concatenation on a 200-400 KB image in a single tight loop blocks
//   the JS thread long enough to cause ANR warnings on Android. We encode in
//   16 KB chunks via Array.from + join so GC can interleave.
// ─────────────────────────────────────────────────────────────────────────────
const BOT_COOKIE = 'humans_21909=1';
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const CHUNK_SIZE = 16384; // 16 KB per chunk — keeps JS thread responsive

const uint8ToBase64 = (bytes) => {
    // FIX: chunk size MUST be a multiple of 3 bytes.
    // If chunks don't align to 3-byte groups, base64 padding mid-stream
    // corrupts the image — causes pink/magenta color tint on the decoded image.
    // 16383 = 3 × 5461 (nearest multiple of 3 below 16384).
    const SAFE_CHUNK = 16383;
    const len = bytes.length;
    const chunks = [];
    for (let i = 0; i < len; i += SAFE_CHUNK) {
        const end = Math.min(i + SAFE_CHUNK, len);
        let piece = '';
        for (let j = i; j < end; j += 3) {
            const b0 = bytes[j];
            const b1 = j + 1 < len ? bytes[j + 1] : 0;
            const b2 = j + 2 < len ? bytes[j + 2] : 0;
            piece += B64_CHARS[b0 >> 2];
            piece += B64_CHARS[((b0 & 3) << 4) | (b1 >> 4)];
            piece += j + 1 < len ? B64_CHARS[((b1 & 15) << 2) | (b2 >> 6)] : '=';
            piece += j + 2 < len ? B64_CHARS[b2 & 63] : '=';
        }
        chunks.push(piece);
    }
    return chunks.join('');
};

// ─── Simple in-memory image cache — avoids re-fetching the same URL twice ────
// The avatar fetches the image on dashboard load. When the viewer opens for the
// same URL, it reuses the cached base64 instead of making a fresh network call.
const _imageCache = new Map();

const fetchImageWithCookie = async (url) => {
    if (!url) return null;

    // Return cached result immediately — avoids redundant network calls
    if (_imageCache.has(url)) {
        console.log('[ImageCookie] cache hit:', url);
        return _imageCache.get(url);
    }

    console.log('[ImageCookie] fetching:', url);
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Cookie': BOT_COOKIE,
                'Referer': 'https://nadarmahamai.com/',
                'Accept': 'image/*,*/*',
            },
        });

        console.log('[ImageCookie] status:', response.status, 'type:', response.headers.get('content-type'));

        if (!response.ok) {
            console.warn('[ImageCookie] bad status', response.status, 'for', url);
            return null;
        }

        const contentType = response.headers.get('content-type') || '';
        // If server returned HTML (bot block page) instead of an image, bail out
        if (contentType.includes('text/html')) {
            console.warn('[ImageCookie] server returned HTML instead of image — cookie may not be working');
            return null;
        }

        const buffer = await response.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        console.log('[ImageCookie] bytes received:', bytes.length);

        if (bytes.length === 0) return null;

        // Use Content-Type from response headers (reliable) with magic byte fallback
        let mime = 'image/jpeg';
        const ctHeader = (response.headers.get('content-type') || '').split(';')[0].trim();
        if (ctHeader.startsWith('image/')) {
            mime = ctHeader;
        } else {
            // Magic byte fallback
            if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
            else if (bytes[0] === 0x47 && bytes[1] === 0x49) mime = 'image/gif';
            else if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) mime = 'image/webp';
        }

        const b64 = uint8ToBase64(bytes);
        const uri = `data:${mime};base64,${b64}`;
        console.log('[ImageCookie] encoded OK, uri length:', uri.length, 'mime:', mime);
        // Store in cache so viewer and avatar share the same fetched data
        _imageCache.set(url, uri);
        return uri;

    } catch (e) {
        console.warn('[ImageCookie] fetch error:', e.message, 'url:', url);
        return null;
    }
};

// ─── ImageWithCookie component ────────────────────────────────────────────────
// Displays a remote image that requires the bot-protection cookie.
// Shows a pink ActivityIndicator while loading, fallback on failure.
const ImageWithCookie = React.memo(({ uri, style, resizeMode = 'cover', fallback, onError }) => {
    const [src, setSrc] = React.useState(() => _imageCache.get(uri) || null);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        if (!uri) { setFailed(true); return; }

        // If already cached, apply immediately without fetching
        const cached = _imageCache.get(uri);
        if (cached) { setSrc(cached); setFailed(false); return; }

        setSrc(null);
        setFailed(false);
        let cancelled = false;

        fetchImageWithCookie(uri)
            .then((b64) => {
                if (cancelled) return;
                if (b64) { setSrc(b64); setFailed(false); }
                else { setFailed(true); }
            })
            .catch(() => { if (!cancelled) setFailed(true); });

        return () => { cancelled = true; };
    }, [uri]);

    // Show fallback on failure
    if (failed) return fallback || null;

    // Show loading state — a dark box that occupies the same space as the real image
    if (!src) {
        return <View style={[style, { backgroundColor: '#1C1C1E' }]} />;
    }

    return (
        <Image
            source={{ uri: src }}
            style={style}
            resizeMode={resizeMode}
            onError={(e) => {
                console.warn('[ImageWithCookie] render error:', e.nativeEvent?.error);
                if (onError) onError(e);
                setFailed(true);
            }}
        />
    );
});


const Dashboard = ({ t }) => {
    const navigation = useNavigation();
    const [isLoading, setIsLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [dashboardSelectedProfiles, setDashboardSelectedProfiles] = useState([]);

    const [backendViewedCount, setBackendViewedCount] = useState(0);

    // ── Profile photos from API ───────────────────────────────────────────────
    const [profilePhotos, setProfilePhotos] = useState([]);
    const [primaryPhoto, setPrimaryPhoto] = useState(null);

    // ── Fullscreen photo viewer ───────────────────────────────────────────────
    const [photoVisible, setPhotoVisible] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);

    const openPhoto = (photo, index) => {
        let normalized = photo;
        if (typeof photo === 'string') {
            normalized = { url: toFullUrl(photo), filename: photo };
        } else if (photo && !photo.url) {
            const possibleUrl = photo.photo || photo.photo_url || photo.image || null;
            normalized = { ...photo, url: toFullUrl(possibleUrl) };
        } else if (photo?.url) {
            normalized = { ...photo, url: toFullUrl(photo.url) };
        }
        setSelectedPhoto(normalized);
        setSelectedIndex(index);
        setPhotoVisible(true);
    };

    // ── Resolve the best available first photo for tap-to-view ───────────────
    const getFirstPhoto = () => {
        if (profilePhotos.length > 0) return profilePhotos[0];
        if (primaryPhoto) return { url: primaryPhoto, filename: primaryPhoto, slot: 0 };
        if (userData?.photos?.length > 0) return userData.photos[0];
        if (userData?.profile_image) return { url: toFullUrl(userData.profile_image), slot: 0 };
        if (userData?.user_photo) return { url: toFullUrl(userData.user_photo), filename: userData.user_photo, slot: 0 };
        if (userData?.photo_data1) return { url: toFullUrl(userData.photo_data1), filename: userData.photo_data1, slot: 1 };
        if (userData?.photo_data2) return { url: toFullUrl(userData.photo_data2), filename: userData.photo_data2, slot: 2 };
        if (userData?.photo_data3) return { url: toFullUrl(userData.photo_data3), filename: userData.photo_data3, slot: 3 };
        return null;
    };

    // ── Fetch latest photos from backend then open viewer ────────────────────
    const fetchAndOpenPhotos = async () => {
        try {
            const idToFetch =
                await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID) ||
                userData?.tamil_client_id ||
                userData?.id ||
                userData?.client_id ||
                userData?.m_id;

            if (!idToFetch) {
                const first = getFirstPhoto();
                if (first) openPhoto(first, 0);
                else Alert.alert('No Profile Picture', 'You have not uploaded a picture yet.');
                return;
            }

            const profileResult = await getProfile(idToFetch);

            if (profileResult?.status && profileResult.data) {
                const freshPhotos = extractPhotos(profileResult.data);
                const freshPrimary = extractPrimaryPhoto(profileResult.data);

                if (freshPhotos.length > 0) setProfilePhotos(freshPhotos);
                if (freshPrimary) setPrimaryPhoto(freshPrimary);

                if (freshPhotos.length > 0) {
                    openPhoto(freshPhotos[0], 0);
                } else if (freshPrimary) {
                    openPhoto({ url: freshPrimary, slot: 0 }, 0);
                } else {
                    const first = getFirstPhoto();
                    if (first) openPhoto(first, 0);
                    else Alert.alert('No Profile Picture', 'You have not uploaded a picture yet.');
                }
            } else {
                const first = getFirstPhoto();
                if (first) openPhoto(first, 0);
                else Alert.alert('Network Issue', 'Could not fetch your latest photo.');
            }
        } catch (e) {
            console.error('fetchAndOpenPhotos error:', e);
            const first = getFirstPhoto();
            if (first) openPhoto(first, 0);
            else Alert.alert('No Profile Picture', 'You have not uploaded a picture yet.');
        }
    };

    const goNext = () => {
        if (!profilePhotos || profilePhotos.length === 0) return;
        const next = (selectedIndex + 1) % profilePhotos.length;
        setSelectedIndex(next);
        setSelectedPhoto(profilePhotos[next]);
    };

    const goPrev = () => {
        if (!profilePhotos || profilePhotos.length === 0) return;
        const prev = (selectedIndex - 1 + profilePhotos.length) % profilePhotos.length;
        setSelectedIndex(prev);
        setSelectedPhoto(profilePhotos[prev]);
    };

    const selectedProfileCount = Math.max(
        dashboardSelectedProfiles?.length || 0,
        parseInt(userData?.no_sel_profiles || '0', 10) || 0
    );

    useFocusEffect(
        useCallback(() => {
            const loadUserData = async () => {
                try {
                    // URL and ID Migrations removed per user request: "don't store in the file"
                    _imageCache.clear();

                    const parsedData = await getSession(KEYS.USER_DATA);
                    if (parsedData) {
                        const storedUsername = await getSession(KEYS.USERNAME);
                        if (storedUsername) {
                            parsedData.username = storedUsername;
                            if (!parsedData.user_name) parsedData.user_name = storedUsername;
                        }

                        logUTF8String('Storage user_name', parsedData.user_name);
                        setUserData(parsedData);

                        // ── Resolve tamil_client_id ────────────────────────────
                        const storedClientId = await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID);
                        const idToFetch =
                            storedClientId ||
                            parsedData.tamil_client_id ||
                            parsedData.id ||
                            parsedData.client_id ||
                            parsedData.m_id ||
                            null;

                        if (idToFetch) {
                            try {
                                // ── 1. Fetch full profile (includes photos) ────
                                const profileResult = await getProfile(idToFetch);
                                console.log('Profile API Response:', JSON.stringify(profileResult, null, 2));

                                let liveProfile = null;
                                if (profileResult?.status && profileResult?.data) {
                                    liveProfile =
                                        profileResult.data.tamil_profile ||
                                        profileResult.data.main_profile ||
                                        profileResult.data;

                                    // ── FIX: Use unified extractors ────────────
                                    const photos = extractPhotos(profileResult.data);
                                    const primary = extractPrimaryPhoto(profileResult.data);

                                    console.log('[Dashboard] Extracted photos:', photos);
                                    console.log('[Dashboard] Primary photo:', primary);

                                    setProfilePhotos(photos);
                                    if (primary) setPrimaryPhoto(primary);

                                    logUTF8String('API user_name', liveProfile?.user_name);
                                }

                                // ── 2. Fetch dashboard stats ───────────────────
                                let statsData = {};
                                try {
                                    const statsResult = await getDashboardStats(idToFetch);
                                    if (statsResult?.status && statsResult?.data) {
                                        statsData = statsResult.data;
                                    }
                                } catch (statsErr) {
                                    console.log('Failed to fetch dashboard stats:', statsErr);
                                }

                                // ── 3. Backend viewed count ────────────────────
                                let viewedCountFromBackend = 0;
                                try {
                                    const countResult = await getSelectedCount(idToFetch);
                                    if (typeof countResult?.viewed_count === 'number') {
                                        viewedCountFromBackend = countResult.viewed_count;
                                    } else if (countResult?.viewed_count != null) {
                                        viewedCountFromBackend = parseInt(countResult.viewed_count) || 0;
                                    }
                                } catch (countErr) {
                                    console.log('Failed to fetch backend viewed count:', countErr);
                                }
                                setBackendViewedCount(viewedCountFromBackend);

                                // ── 4. Backend selected profiles (shortlist) ─────
                                let localSelectedProfiles = [];
                                try {
                                    const backendSel = await getSelectedProfiles(idToFetch);
                                    if (backendSel?.status && Array.isArray(backendSel.data)) {
                                        localSelectedProfiles = backendSel.data;
                                    }
                                } catch (selErr) {
                                    console.log('Failed to fetch backend selected profiles:', selErr);
                                }

                                if (liveProfile) {
                                    const updatedData = {
                                        ...parsedData,
                                        ...liveProfile,
                                        ...statsData,
                                        viewed_profiles: String(viewedCountFromBackend),
                                        no_sel_profiles: String(localSelectedProfiles.length),
                                        user_name: liveProfile.user_name || parsedData.user_name,
                                        username: liveProfile.user_name || parsedData.username,
                                        name: liveProfile.user_name || parsedData.name,
                                    };

                                    logUTF8String('Final user_name', updatedData.user_name);
                                    setUserData(updatedData);
                                    setDashboardSelectedProfiles(localSelectedProfiles);
                                    // Intentionally not storing updatedData in AsyncStorage per user request.
                                } else {
                                    setDashboardSelectedProfiles(localSelectedProfiles);
                                    setUserData((prev) => ({
                                        ...parsedData,
                                        ...statsData,
                                        viewed_profiles: String(viewedCountFromBackend),
                                        no_sel_profiles: String(localSelectedProfiles.length),
                                    }));
                                }
                            } catch (fetchErr) {
                                console.log('Background profile fetch failed:', fetchErr);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Failed to load user data:', error);
                } finally {
                    setIsLoading(false);
                }
            };

            loadUserData();
        }, [])
    );

    const displayName = () => {
        const name = userData?.user_name || userData?.name || userData?.username || 'User';
        const decodedName = decodeUTF8String(name) || 'User';
        if (decodedName && decodedName.includes('?')) logUTF8String('Problematic name', decodedName);
        return decodedName;
    };

    // ── Viewed count display ──────────────────────────────────────────────────
    const viewedCount = backendViewedCount;
    const viewedLimit = userData?.mem_plan === '0' ? 50 : (userData?.views_limit ? parseInt(userData.views_limit) : null);
    const viewedDisplay = viewedLimit != null ? `${viewedCount}/${viewedLimit}` : String(viewedCount);
    const viewedRemaining = viewedLimit != null ? Math.max(0, viewedLimit - viewedCount) : null;
    const isLimitReached = viewedLimit != null && viewedCount >= viewedLimit;

    // ── FIX: Avatar source — primaryPhoto from API takes top priority ─────────
    // Order: primaryPhoto (from API) → profile_image (on userData) →
    //        user_photo → photo_data1 → gender-based default avatar
    const isFemale =
        userData?.gender?.toLowerCase() === 'female' ||
        userData?.gender === '\u0BAA\u0BC6\u0BA3\u0BCD' ||
        userData?.gender === 'பெண்';

    const getAvatarSource = () => {
        if (primaryPhoto) {
            console.log('[Dashboard] Avatar using primaryPhoto:', primaryPhoto);
            return { uri: primaryPhoto };
        }
        if (userData?.profile_image) {
            console.log('[Dashboard] Avatar using profile_image:', userData.profile_image);
            return { uri: toFullUrl(userData.profile_image) };
        }
        if (userData?.user_photo && userData.user_photo !== '') {
            console.log('[Dashboard] Avatar using user_photo:', userData.user_photo);
            return { uri: toFullUrl(userData.user_photo) };
        }
        if (userData?.photo_data1) {
            console.log('[Dashboard] Avatar using photo_data1:', userData.photo_data1);
            return { uri: toFullUrl(userData.photo_data1) };
        }
        console.log('[Dashboard] Avatar falling back to default gender avatar');
        return isFemale
            ? require('../assets/images/avatar_female.jpg')
            : require('../assets/images/avatar_male.jpg');
    };

    // ── Profile Sidebar ───────────────────────────────────────────────────────
    const renderProfileSidebar = () => (
        <View style={styles.sidebarCard}>
            <View style={styles.welcomeHeader}>
                <Text style={styles.welcomeLabel}>Welcome,</Text>
                <Text style={styles.sidebarWelcomeText}>{displayName()}</Text>
                <Text style={styles.profileId}>{userData?.client_id || '...'}</Text>
            </View>

            {/* ── Avatar — tapping opens fullscreen viewer ─────────────────── */}
            <TouchableOpacity
                style={styles.sidebarAvatar}
                onPress={fetchAndOpenPhotos}
                activeOpacity={0.85}
            >
                {/* FIX: ImageWithCookie handles Imunify360 bot-cookie requirement */}
                {(() => {
                    const src = getAvatarSource();
                    if (src?.uri) {
                        return (
                            <ImageWithCookie
                                uri={src.uri}
                                style={styles.sidebarAvatarImage}
                                resizeMode="cover"
                                fallback={
                                    <Image
                                        source={isFemale
                                            ? require('../assets/images/avatar_female.jpg')
                                            : require('../assets/images/avatar_male.jpg')}
                                        style={styles.sidebarAvatarImage}
                                        resizeMode="cover"
                                    />
                                }
                            />
                        );
                    }
                    return (
                        <Image
                            source={src}
                            style={styles.sidebarAvatarImage}
                            resizeMode="cover"
                        />
                    );
                })()}
                <View style={styles.uploadBadge}>
                    <Icon name="camera" size={16} color="#FFF" />
                </View>
            </TouchableOpacity>


            <View style={styles.sidebarLinks}>
                <TouchableOpacity
                    style={styles.sidebarLinkItem}
                    onPress={fetchAndOpenPhotos}
                >
                    <View style={[styles.linkIconBg, { backgroundColor: '#FFE5EF' }]}>
                        <Icon name="image-multiple" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sidebarLinkText}>{t('View Pictures')}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sidebarLinkItem}
                    onPress={() => navigation.navigate('SelectedProfiles')}
                >
                    <View style={[styles.linkIconBg, { backgroundColor: '#FFE5EF' }]}>
                        <Icon name="heart" size={18} color={COLORS.primary} />
                    </View>
                    <Text style={styles.sidebarLinkText}>
                        {t('Selected Profiles')} ({selectedProfileCount})
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sidebarLinkItem}
                    onPress={() => navigation.navigate('ViewHoroscope', {
                        profile: userData,
                        targetProfileId: userData?.tamil_client_id || userData?.id || userData?.client_id || userData?.m_id,
                        targetProfileStringId: userData?.profile_id || userData?.username || userData?.user_name,
                    })}
                >
                    <View style={[styles.linkIconBg, { backgroundColor: '#E3F2FD' }]}>
                        <Icon name="zodiac-leo" size={18} color={COLORS.blue} />
                    </View>
                    <Text style={styles.sidebarLinkText}>{t('View Your Horoscope')}</Text>
                </TouchableOpacity>

                <View style={styles.sidebarDivider} />

                <TouchableOpacity
                    style={styles.sidebarInfoItem}
                    onPress={() => navigation.navigate('ViewedProfiles')}
                >
                    <Icon name="eye-outline" size={16} color={COLORS.blue} />
                    <Text style={styles.sidebarInfoText}>{t('Total Views')}</Text>
                    <Text style={styles.sidebarInfoValueInline}>{viewedDisplay}</Text>
                </TouchableOpacity>

                <View style={styles.sidebarDivider} />

                <View style={styles.sidebarInfoItem}>
                    <Icon name="calendar-alert" size={16} color={COLORS.danger} />
                    <Text style={styles.sidebarInfoText}>{t('Membership Ends')}</Text>
                    <Text style={[styles.sidebarInfoValueInline, { color: COLORS.danger }]}>
                        {userData?.mem_end_date || '09-01-2027'}
                    </Text>
                </View>
            </View>
        </View>
    );

    // ── Profile Upload Alert ──────────────────────────────────────────────────
    const renderProfileAlert = () => (
        <View style={styles.alertBox}>
            <Icon name="camera-plus" size={22} color={COLORS.blue} />
            <Text style={styles.alertText}>
                {t('Upload your')} <Text style={styles.alertLink}>{t('profile picture')}</Text>{' '}
                {t('to attract more visitors to your profile.')}
            </Text>
        </View>
    );

    // ── Quick Info Stats ──────────────────────────────────────────────────────
    const renderQuickInfo = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Quick Info')}</Text>
            <View style={styles.statsGrid}>
                {[
                    {
                        value: viewedDisplay,
                        label: t('Total Views'),
                        gradient: ['#42A5F5', '#64B5F6'],
                        icon: 'eye',
                        nav: 'ViewedProfiles',
                    },
                    {
                        value: selectedProfileCount,
                        label: t('Selected Profiles'),
                        gradient: ['#4CAF50', '#66BB6A'],
                        icon: 'heart-multiple',
                        nav: 'SelectedProfiles',
                    },
                    {
                        value: userData?.user_points || '0',
                        label: t('Points'),
                        gradient: ['#FF4081', '#FF80AB'],
                        icon: 'star-circle',
                        nav: null,
                    },
                    {
                        value: userData?.profile_visitors || '0',
                        label: t('Profile Visitors'),
                        gradient: ['#FF7043', '#FF8A65'],
                        icon: 'account-eye',
                        nav: 'ViewedProfiles',
                    },
                ].map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        activeOpacity={0.8}
                        onPress={() => { if (item.nav) navigation.navigate(item.nav); }}
                    >
                        <LinearGradient
                            colors={item.gradient}
                            style={styles.statBox}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.statHeader}>
                                <Icon name={item.icon} size={24} color="#FFF" />
                                <Text style={styles.statBoxValue}>{item.value}</Text>
                            </View>
                            <Text style={styles.statBoxLabel}>{item.label}</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    // ── Selected Profiles horizontal list ─────────────────────────────────────
    const renderSelectedProfilesList = () => {
        if (!dashboardSelectedProfiles || dashboardSelectedProfiles.length === 0) return null;
        return (
            <View style={styles.section}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                    <Text style={styles.sectionTitle}>{t('Selected Profiles')}</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('SelectedProfiles')}>
                        <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>{t('View All')}</Text>
                    </TouchableOpacity>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                    {dashboardSelectedProfiles.slice(0, 5).map((profile, index) => {
                        let imageUrl = profile.profile_image || profile.user_photo || profile.photo_data1;
                        if (imageUrl && !imageUrl.startsWith('http')) {
                            imageUrl = `${BASE_IMAGE_URL}${imageUrl}`;
                        }
                        return (
                            <TouchableOpacity
                                key={index}
                                activeOpacity={0.8}
                                onPress={() => navigation.navigate('ProfileDetails', { profile })}
                                style={{
                                    width: scale(140), backgroundColor: '#FFF', borderRadius: 16,
                                    padding: 12, alignItems: 'center', shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1,
                                    shadowRadius: 4, elevation: 2, borderWidth: 1,
                                    borderColor: 'rgba(0,0,0,0.05)',
                                }}
                            >
                                <Image
                                    source={
                                        imageUrl ? { uri: imageUrl }
                                            : (profile.gender
                                                ? ((profile.gender.toLowerCase() === 'female' || profile.gender === 'பெண்')
                                                    ? require('../assets/images/avatar_female.jpg')
                                                    : require('../assets/images/avatar_male.jpg'))
                                                : ((userData?.gender?.toLowerCase() === 'female' || userData?.gender === 'பெண்')
                                                    ? require('../assets/images/avatar_male.jpg')
                                                    : require('../assets/images/avatar_female.jpg')))
                                    }
                                    style={{ width: scale(70), height: scale(70), borderRadius: scale(35), marginBottom: 8 }}
                                    resizeMode="cover"
                                />
                                <Text style={{ fontSize: moderateScale(14), fontWeight: 'bold', color: COLORS.textPrimary, textAlign: 'center' }} numberOfLines={1}>
                                    {profile.name || profile.user_name || 'Profile'}
                                </Text>
                                <Text style={{ fontSize: moderateScale(12), color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 }}>
                                    {profile.profile_id || profile.tamil_profile_id || profile.id}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>
        );
    };

    // ── Random Profiles (Premium Lock) ───────────────────────────────────────
    const renderRandomProfiles = () => (
        <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('Random Profiles')}</Text>
            <View style={styles.premiumLockBox}>
                <Icon name="lock-outline" size={32} color={COLORS.warning} />
                <Text style={styles.lockText}>
                    {t('Validate your email to upgrade to Premium Membership to message and communicate with others.')}
                </Text>
            </View>
        </View>
    );

    // ── Membership Info ───────────────────────────────────────────────────────
    const renderMembershipInfo = () => (
        <View style={styles.membershipSection}>
            <Text style={styles.membershipTitle}>{t('Membership Information')}</Text>
            <View style={styles.membershipCard}>
                <View style={styles.membershipRow}>
                    <Text style={styles.membershipLabel}>{t('Join Date:')}</Text>
                    <Text style={styles.membershipValue}>{userData?.reg_date || '0000-00-00'}</Text>
                </View>
                <View style={styles.membershipRow}>
                    <Text style={styles.membershipLabel}>{t('Active Membership plan:')}</Text>
                    <Text style={[styles.membershipValue, { color: COLORS.success }]}>
                        {userData?.mem_plan === '0' ? 'Free' : 'Premium'}
                    </Text>
                </View>
                <View style={styles.membershipRow}>
                    <Text style={styles.membershipLabel}>{t('Your Profile Viewers:')}</Text>
                    <Text style={styles.membershipValue}>{userData?.profile_visitors || '0'}</Text>
                </View>
                <TouchableOpacity
                    style={styles.membershipRow}
                    onPress={() => navigation.navigate('ViewedProfiles')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.membershipLabel}>{t('Profiles Viewed:')}</Text>
                    <Text style={[styles.membershipValue, { color: COLORS.blue }]}>{viewedDisplay}</Text>
                </TouchableOpacity>
                <View style={styles.membershipNote}>
                    <Text style={styles.membershipNoteText}>
                        {userData?.mem_plan === '0'
                            ? `${t('Your Can able to select only 50 members with this plan. ')}${viewedRemaining ?? 0}${t(' members remaining.')}`
                            : t('You have an active Premium plan with extended profile access.')}
                    </Text>
                </View>
                {isLimitReached && (
                    <TouchableOpacity
                        style={[styles.membershipNote, { backgroundColor: '#FFEBEE', marginTop: 10 }]}
                        onPress={() => Alert.alert(
                            t('Upgrade Plan'),
                            t('You have reached your limit. Please pay to access more profiles.')
                        )}
                    >
                        <Text style={[styles.membershipNoteText, { color: '#D32F2F', fontWeight: 'bold' }]}>
                            {t('Limit reached! Click here to upgrade and continue.')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    if (isLoading) return <Skeleton type="Dashboard" />;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.mainContent}>
                    <View style={styles.leftColumn}>
                        {renderProfileSidebar()}
                        {renderMembershipInfo()}
                    </View>
                    <View style={styles.rightColumn}>
                        {renderProfileAlert()}
                        {renderQuickInfo()}
                        {renderSelectedProfilesList()}
                        {renderRandomProfiles()}
                    </View>
                </View>
            </ScrollView>

            {/* ── Fullscreen photo viewer modal ─────────────────────────────── */}
            <Modal
                visible={photoVisible}
                transparent={false}
                animationType="fade"
                statusBarTranslucent={false}
                onRequestClose={() => setPhotoVisible(false)}
            >
                {/* FIX: Use flex:1 column layout so image fills remaining space below topBar.
                    Do NOT use justifyContent:'center' on the root — that causes Android black screen
                    because the image gets pushed outside the visible layout bounds. */}
                <View style={viewer.container}>
                    <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />

                    {/* Top bar — fixed height, always at top */}
                    <View style={viewer.topBar}>
                        <TouchableOpacity onPress={() => setPhotoVisible(false)} style={viewer.topBtn}>
                            <Icon name="arrow-left" size={26} color="#FFF" />
                        </TouchableOpacity>

                        <Text style={viewer.topTitle}>Profile picture</Text>

                        <TouchableOpacity
                            style={viewer.topBtn}
                            onPress={() => {
                                setPhotoVisible(false);
                                Alert.alert(
                                    'Update Profile Photo',
                                    'To update your profile photo, please visit nadarmahamai.com from a browser.',
                                    [{ text: 'OK' }]
                                );
                            }}
                        >
                            <Icon name="pencil" size={22} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={viewer.topBtn}
                            onPress={async () => {
                                try {
                                    if (selectedPhoto?.url) {
                                        await Share.share({
                                            message: 'Check out this profile picture: ' + selectedPhoto.url,
                                            url: selectedPhoto.url,
                                        });
                                    }
                                } catch (error) {
                                    console.error('Error sharing:', error.message);
                                }
                            }}
                        >
                            <Icon name="share-variant" size={22} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* FIX: Image area fills ALL remaining space below topBar using flex:1.
                        This is the key fix — never use fixed width/height equal to screen
                        dimensions inside a Modal on Android; use flex instead. */}
                    <View style={viewer.imageArea}>
                        {selectedPhoto?.url ? (
                            // FIX: Use ImageWithCookie — nadarmahamai.com is behind Imunify360
                            // bot protection. React Native's <Image> cannot send Cookie headers,
                            // so the server returns a 409/403 and the image appears blank/black.
                            // ImageWithCookie pre-fetches with the cookie and displays as base64.
                            <ImageWithCookie
                                key={selectedPhoto.url}
                                uri={selectedPhoto.url}
                                style={viewer.image}
                                resizeMode="contain"
                                fallback={
                                    <View style={viewer.noImageBox}>
                                        <Icon name="image-off-outline" size={64} color="rgba(255,255,255,0.4)" />
                                        <Text style={viewer.noImageText}>Could not load image</Text>
                                    </View>
                                }
                            />
                        ) : (
                            <View style={viewer.noImageBox}>
                                <Icon name="image-off-outline" size={64} color="rgba(255,255,255,0.4)" />
                                <Text style={viewer.noImageText}>No image available</Text>
                            </View>
                        )}

                        {/* Nav arrows — positioned absolute inside imageArea */}
                        {profilePhotos.length > 1 && (
                            <>
                                <TouchableOpacity style={[viewer.navBtn, viewer.navL]} onPress={goPrev}>
                                    <Icon name="chevron-left" size={34} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[viewer.navBtn, viewer.navR]} onPress={goNext}>
                                    <Icon name="chevron-right" size={34} color="#FFF" />
                                </TouchableOpacity>
                            </>
                        )}
                    </View>

                    {/* Dot indicators — fixed at bottom */}
                    {profilePhotos.length > 1 && (
                        <View style={viewer.dots}>
                            {profilePhotos.map((_, i) => (
                                <View
                                    key={i}
                                    style={[viewer.dot, i === selectedIndex && viewer.dotActive]}
                                />
                            ))}
                        </View>
                    )}
                </View>
            </Modal>
        </View>
    );
};

const TAMIL_FONT = 'NotoSansTamil-Regular';

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    scrollView: { flex: 1 },
    content: { paddingBottom: 30 },
    mainContent: { flexDirection: 'column', paddingHorizontal: 20, paddingTop: 20, gap: 20 },
    leftColumn: { width: '100%' },
    rightColumn: { width: '100%' },

    alertBox: { backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
    alertText: { flex: 1, fontSize: 14, color: COLORS.textPrimary, lineHeight: 20 },
    alertLink: { color: COLORS.blue, fontWeight: '600' },

    section: { marginBottom: 25 },
    sectionTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 15, fontFamily: TAMIL_FONT },

    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: { width: (width - 60) / 2, height: scale(95), borderRadius: 20, padding: 12, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
    statHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 6 },
    statBoxValue: { fontSize: moderateScale(26), fontWeight: 'bold', color: '#FFF' },
    statBoxLabel: { fontSize: moderateScale(11), color: '#FFF', fontWeight: '700', opacity: 0.95, textAlign: 'center' },

    premiumLockBox: { backgroundColor: '#FFF9C4', borderWidth: 1, borderColor: '#FFE082', borderRadius: 16, padding: 28, alignItems: 'center' },
    lockText: { fontSize: 14, color: COLORS.textPrimary, textAlign: 'center', marginTop: 12, lineHeight: 20 },

    // ── Sidebar ──
    sidebarCard: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    welcomeHeader: { marginBottom: 20, alignItems: 'center' },
    welcomeLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
    sidebarWelcomeText: { fontSize: moderateScale(18), fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 2, fontFamily: 'NotoSansTamil-Bold' },
    profileId: { fontSize: 13, color: COLORS.textTertiary, fontWeight: '500' },
    sidebarAvatar: { alignItems: 'center', marginBottom: 16, position: 'relative' },
    sidebarAvatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: COLORS.primaryLight },
    uploadBadge: { position: 'absolute', bottom: 0, right: '35%', backgroundColor: COLORS.primary, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.card },



    sidebarLinks: { gap: 4 },
    sidebarLinkItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 8, borderRadius: 12 },
    linkIconBg: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sidebarLinkText: { fontSize: 14, color: COLORS.textPrimary, fontWeight: '500', fontFamily: TAMIL_FONT },
    sidebarDivider: { height: 1, backgroundColor: COLORS.divider, marginVertical: 12 },
    sidebarInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
    sidebarInfoText: { flex: 1, fontSize: 13, color: COLORS.textSecondary, fontFamily: TAMIL_FONT },
    sidebarInfoValueInline: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginLeft: 'auto', fontFamily: TAMIL_FONT },

    // ── Membership ──
    membershipSection: { backgroundColor: COLORS.card, borderRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 3 },
    membershipTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: COLORS.textPrimary, marginBottom: 16, fontFamily: TAMIL_FONT },
    membershipCard: { gap: 0 },
    membershipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.divider },
    membershipLabel: { fontSize: moderateScale(14), color: COLORS.textSecondary, fontFamily: TAMIL_FONT },
    membershipValue: { fontSize: moderateScale(14), fontWeight: '600', color: COLORS.textPrimary, fontFamily: TAMIL_FONT },
    membershipNote: { backgroundColor: '#FFEBEE', borderRadius: 12, padding: 14, marginTop: 12, borderLeftWidth: 3, borderLeftColor: COLORS.danger },
    membershipNoteText: { fontSize: 12, color: COLORS.danger, lineHeight: 18 },

    // ── Header (kept for reference) ──
    header: { paddingTop: 50, paddingBottom: 25, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    headerContent: { paddingHorizontal: 20 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    headerText: { flex: 1 },
    greeting: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginBottom: 4 },
    headerName: { color: '#FFF', fontSize: 24, fontWeight: 'bold', fontFamily: 'NotoSansTamil-Bold' },
    notificationBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
    badge: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#FFEB3B' },
    profileSummary: { flexDirection: 'row', alignItems: 'center', gap: 20 },
    avatarRing: { position: 'relative' },
    headerAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 3, borderColor: '#FFF' },
    statusIndicator: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: COLORS.success, borderWidth: 2, borderColor: '#FFF' },
    headerStats: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 12 },
    statItem: { alignItems: 'center' },
    statNumber: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
    statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, textTransform: 'uppercase' },
    statDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.3)' },
});

const viewer = StyleSheet.create({
    // FIX: flex column layout — topBar (fixed), imageArea (flex:1), dots (fixed).
    // Root must NOT have justifyContent:'center'; that breaks Android image layout.
    container: {
        flex: 1,
        flexDirection: 'column',
        backgroundColor: '#000',
    },
    // FIX: topBar is NOT position:'absolute' anymore — it sits in normal flex flow
    // so imageArea starts exactly below it with no overlap or offset issues on Android.
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 50 : 16,
        paddingBottom: 14,
        paddingHorizontal: 4,
        backgroundColor: '#000',
        zIndex: 10,
    },
    topBtn: { padding: 10 },
    topTitle: { flex: 1, fontSize: moderateScale(18), color: '#FFF', fontWeight: '600', marginLeft: 4 },

    // FIX: imageArea fills all remaining height after topBar and dots (flex:1).
    imageArea: {
        flex: 1,
        position: 'relative',
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // FIX: image uses width:'100%' + flex:1 instead of fixed screen width/height.
    // Using fixed `width` and `height` equal to Dimensions inside a Modal causes
    // Android black screen because the Modal window bounds differ from screen bounds.
    image: {
        width: '100%',
        flex: 1,
        alignSelf: 'stretch',   // ensures Image fills imageArea height in RN flex layout
    },
    noImageBox: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    noImageText: {
        color: 'rgba(255,255,255,0.5)',
        marginTop: 12,
        fontSize: 14,
    },
    navBtn: {
        position: 'absolute',
        zIndex: 10,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderRadius: 30,
        padding: 8,
        top: '42%',
    },
    navL: { left: 10 },
    navR: { right: 10 },
    dots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 16,
        backgroundColor: '#000',
    },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
    dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
});

export default Dashboard;
