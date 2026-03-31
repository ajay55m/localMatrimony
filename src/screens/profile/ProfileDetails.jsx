import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image,
    TouchableOpacity, StatusBar, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { scale, moderateScale } from '../../utils/responsive';
import { decodeUTF8String } from '../../utils/utf8Helper';
import {
    getLabel, EDUCATION_MAP, OCCUPATION_MAP,
    RELIGION_MAP, CASTE_MAP, LOCATION_MAP,
} from '../../utils/dataMappings';
import { getProfile, getSelectedProfiles, submitSelectedProfile as selectProfile } from '../../services/profileService';
import PageHeader from '../../components/PageHeader';
import SidebarMenu from '../../components/SidebarMenu';
import LoginModal from '../../components/LoginModal';
import { TRANSLATIONS } from '../../constants/translations';
import { KEYS } from '../../utils/session';
import { clearSession } from '../../utils/session';
import { BASE_IMAGE_URL, WRONG_IMAGE_URL } from '../../config/apiConfig';

const toFullUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith(WRONG_IMAGE_URL)) return BASE_IMAGE_URL + raw.slice(WRONG_IMAGE_URL.length);
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${BASE_IMAGE_URL}${raw}`;
};

const extractPhotos = (data) => {
    if (data?.photos && Array.isArray(data.photos) && data.photos.length > 0)
        return data.photos.map((p) => ({ ...p, url: toFullUrl(p.url || p.filename) }));
    const liveProfile = data?.tamil_profile || data?.main_profile;
    if (liveProfile?.photos && Array.isArray(liveProfile.photos) && liveProfile.photos.length > 0)
        return liveProfile.photos.map((p) => ({ ...p, url: toFullUrl(p.url || p.filename) }));
    const photos = [];
    const src = liveProfile || data;
    if (src?.user_photo) photos.push({ slot: 0, url: toFullUrl(src.user_photo), filename: src.user_photo });
    if (src?.photo_data1) photos.push({ slot: 1, url: toFullUrl(src.photo_data1), filename: src.photo_data1 });
    if (src?.photo_data2) photos.push({ slot: 2, url: toFullUrl(src.photo_data2), filename: src.photo_data2 });
    if (src?.photo_data3) photos.push({ slot: 3, url: toFullUrl(src.photo_data3), filename: src.photo_data3 });
    return photos.filter((p) => p.url);
};

const extractPrimaryPhoto = (data) => {
    if (data?.primary_photo) return toFullUrl(data.primary_photo);
    const liveProfile = data?.tamil_profile || data?.main_profile;
    if (liveProfile?.profile_image) return toFullUrl(liveProfile.profile_image);
    const photos = extractPhotos(data);
    if (photos.length > 0) return photos[0].url;
    const src = liveProfile || data;
    if (src?.user_photo) return toFullUrl(src.user_photo);
    if (src?.photo_data1) return toFullUrl(src.photo_data1);
    if (src?.photo_data2) return toFullUrl(src.photo_data2);
    if (src?.photo_data3) return toFullUrl(src.photo_data3);
    return null;
};

// ── ImageWithCookie — Imunify360 bot-cookie fetch ─────────────────────────────
const BOT_COOKIE = 'humans_21909=1';
const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const _imgCache = new Map();

const uint8ToBase64 = (bytes) => {
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

const fetchImageWithCookie = async (url) => {
    if (!url) return null;
    if (_imgCache.has(url)) return _imgCache.get(url);
    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: { 'Cookie': BOT_COOKIE, 'Referer': 'https://nadarmahamai.com/', 'Accept': 'image/*,*/*' },
        });
        if (!res.ok) return null;
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('text/html')) return null;
        const buffer = await res.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes.length === 0) return null;
        let mime = 'image/jpeg';
        const ctClean = ct.split(';')[0].trim();
        if (ctClean.startsWith('image/')) mime = ctClean;
        else if (bytes[0] === 0x89 && bytes[1] === 0x50) mime = 'image/png';
        const uri = `data:${mime};base64,${uint8ToBase64(bytes)}`;
        _imgCache.set(url, uri);
        return uri;
    } catch (_) { return null; }
};

const ImageWithCookie = React.memo(({ uri, style, resizeMode = 'cover', fallback }) => {
    const [src, setSrc] = React.useState(() => _imgCache.get(uri) || null);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        if (!uri) { setFailed(true); return; }
        const cached = _imgCache.get(uri);
        if (cached) { setSrc(cached); return; }
        setSrc(null); setFailed(false);
        let cancelled = false;
        fetchImageWithCookie(uri)
            .then((b64) => { if (!cancelled) { if (b64) setSrc(b64); else setFailed(true); } })
            .catch(() => { if (!cancelled) setFailed(true); });
        return () => { cancelled = true; };
    }, [uri]);

    if (failed) return fallback || null;
    if (!src) return <View style={[style, { backgroundColor: '#E8E8E8', justifyContent: 'center', alignItems: 'center' }]}><ActivityIndicator color="#ef0d8d" /></View>;
    return <Image source={{ uri: src }} style={style} resizeMode={resizeMode} onError={() => setFailed(true)} />;
});

// ─────────────────────────────────────────────────────────────────────────────
const ProfileDetails = () => {
    const navigation = useNavigation();
    const route = useRoute();
    const { profile } = route.params || {};

    const [profileData, setProfileData] = useState(profile);
    const [isLoading, setIsLoading] = useState(true);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userGender, setUserGender] = useState('Male');
    const [isSelecting, setIsSelecting] = useState(false);
    const [selectedCount, setSelectedCount] = useState(null);
    const [loginVisible, setLoginVisible] = useState(false);

    // Photo viewer
    const [photoVisible, setPhotoVisible] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [profilePhotos, setProfilePhotos] = useState([]);

    // ── STRICT GATE: isSelected controls ALL sensitive content visibility ──
    // Starts false unless backend explicitly confirms is_selected === true
    // isCheckingSelect = true means API check is in progress → show locked state
    const [isSelected, setIsSelected] = useState(
        profile?.is_selected === true  // only true if backend explicitly set it
    );
    const [isCheckingSelect, setIsCheckingSelect] = useState(
        profile?.is_selected !== true  // always check unless backend already confirmed
    );

    const numericProfileId = profile?.tamil_profile_id || profile?.id || null;
    const stringProfileId = profile?.profile_id || null;
    const profileId = numericProfileId || stringProfileId;

    const viewRecorded = useRef(false);

    // ── Session ────────────────────────────────────────────────────────────
    useEffect(() => {
        (async () => {
            try {
                const session = await AsyncStorage.getItem(KEYS.USER_SESSION);
                const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
                setIsLoggedIn(!!session);
                if (userDataJson) {
                    const ud = JSON.parse(userDataJson);
                    setUserGender(ud.gender || 'Male');
                }
            } catch (_) { }
        })();
    }, []);

    // ── Selection identification — runs once on mount ──────────────────────
    useEffect(() => {
        if (!profileId) { setIsCheckingSelect(false); return; }

        if (profile?.is_selected === true) {
            // Layer 1: backend already confirmed — fetch count silently
            setIsSelected(true);
            setIsCheckingSelect(false);
            fetchSelectedCount();
            return;
        }

        // Layer 2 + 3: must verify before showing any sensitive content
        checkIfSelected();
    }, [profileId]);

    const resolveMyId = async () => {
        const userDataJson = await AsyncStorage.getItem(KEYS.USER_DATA);
        const storedClientId = await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID);
        const userData = userDataJson ? JSON.parse(userDataJson) : null;
        let myId = storedClientId || userData?.tamil_client_id || userData?.id || userData?.client_id || null;
        if (myId && isNaN(myId) && userData?.id) {
            myId = String(userData.id);
            await AsyncStorage.setItem(KEYS.TAMIL_CLIENT_ID, myId);
        }
        return { myId, userData };
    };

    const fetchSelectedCount = async () => {
        try {
            const { myId } = await resolveMyId();
            if (!myId) return;
            const result = await getSelectedProfiles(String(myId));
            if (result?.status && typeof result.viewed_count === 'number') {
                setSelectedCount(result.viewed_count);
            }
        } catch (_) { }
    };

    const checkIfSelected = async () => {
        try {
            setIsCheckingSelect(true);

            const { myId } = await resolveMyId();
            if (!myId) { setIsCheckingSelect(false); return; }

            // Layer 2: AsyncStorage (fast, no network)
            try {
                const stored = await AsyncStorage.getItem(KEYS.SELECTED_PROFILES_LIST);
                if (stored) {
                    const list = JSON.parse(stored);
                    const found = list.some(
                        (p) =>
                            String(p.tamil_profile_id || '') === String(numericProfileId || '') ||
                            String(p.profile_id || '') === String(stringProfileId || '')
                    );
                    if (found) {
                        setIsSelected(true);
                        setIsCheckingSelect(false);
                        fetchSelectedCount();
                        return;
                    }
                }
            } catch (_) { }

            // Layer 3: API — authoritative source
            const result = await getSelectedProfiles(String(myId));

            if (result?.status && Array.isArray(result.data)) {
                const found = result.data.some(
                    (p) => Number(p.tamil_profile_id) === Number(numericProfileId)
                );

                // ✅ STRICT: setIsSelected only based on API result — nothing else
                setIsSelected(found);

                if (typeof result.viewed_count === 'number') {
                    setSelectedCount(result.viewed_count);
                }

                // Sync to AsyncStorage if confirmed selected
                if (found) {
                    try {
                        const stored = await AsyncStorage.getItem(KEYS.SELECTED_PROFILES_LIST);
                        const list = stored ? JSON.parse(stored) : [];
                        const alreadyIn = list.some(
                            (p) => String(p.tamil_profile_id || '') === String(numericProfileId || '')
                        );
                        if (!alreadyIn) {
                            list.push({
                                ...profile,
                                tamil_profile_id: numericProfileId,
                                profile_id: stringProfileId,
                                selectedAt: new Date().toISOString(),
                            });
                            await AsyncStorage.setItem(KEYS.SELECTED_PROFILES_LIST, JSON.stringify(list));
                        }
                    } catch (_) { }
                }
            } else {
                // API failed or returned no data → default to NOT selected
                setIsSelected(false);
            }
        } catch (err) {
            console.error('[ProfileDetails] checkIfSelected error:', err);
            setIsSelected(false);
        } finally {
            setIsCheckingSelect(false);
        }
    };

    // ── Fetch full profile from API ────────────────────────────────────────
    // NOTE: We always fetch the full profile for non-sensitive fields (name, age,
    // religion, etc.). Sensitive fields (photo, phone, place) are gated by isSelected.
    useEffect(() => {
        if (!profileId) { setIsLoading(false); return; }
        (async () => {
            try {
                const result = await getProfile(numericProfileId || profileId);
                if (result?.status && result?.data) {
                    const fullData =
                        result.data.tamil_profile ||
                        result.data.main_profile ||
                        result.data;
                    setProfileData((prev) => ({
                        ...prev,
                        ...fullData,
                        tamil_profile_id: numericProfileId || fullData.id || prev?.tamil_profile_id,
                        profile_id: stringProfileId || fullData.profile_id || prev?.profile_id,
                        id: numericProfileId || fullData.id || prev?.id,
                    }));
                    // Only update isSelected if API explicitly says true
                    // Never set false from here — let checkIfSelected handle that
                    if (fullData?.is_selected === true) setIsSelected(true);
                }
            } catch (err) {
                console.error('[ProfileDetails] fetchFullDetails error:', err);
            } finally {
                setIsLoading(false);
            }
        })();
    }, [profileId]);

    // ── Record view — limit only for unselected profiles ──────────────────
    useEffect(() => {
        if (!profileId) return;
        if (viewRecorded.current === String(profileId)) return;
        (async () => {
            try {
                const { myId, userData } = await resolveMyId();
                if (!myId) return;
                // Only count toward limit if NOT selected
                const alreadySelected = isSelected || profile?.is_selected === true;
                if (userData?.mem_plan === '0' && !alreadySelected) {
                    const currentViews = parseInt(userData.viewed_profiles || '0');
                    if (currentViews >= 50) {
                        Alert.alert(
                            'Membership Limit',
                            'You have reached the 50-profile view limit. Please upgrade to continue.',
                            [
                                { text: 'Upgrade', onPress: () => navigation.navigate('Dashboard') },
                                { text: 'OK', onPress: () => navigation.goBack() },
                            ]
                        );
                        return;
                    }
                }
                viewRecorded.current = String(profileId);
                if (!alreadySelected && userData) {
                    userData.viewed_profiles = String(parseInt(userData.viewed_profiles || '0') + 1);
                    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
                }
            } catch (_) { }
        })();
    }, [profileId]);

    // ── Photo viewer ───────────────────────────────────────────────────────
    useEffect(() => {
        if (profileData) setProfilePhotos(extractPhotos(profileData));
    }, [profileData]);

    const openPhoto = (photo, index) => {
        let normalized = photo;
        if (typeof photo === 'string') {
            normalized = { url: toFullUrl(photo), filename: photo };
        } else if (photo && !photo.url) {
            normalized = { ...photo, url: toFullUrl(photo.photo || photo.photo_url || photo.image || null) };
        } else if (photo?.url) {
            normalized = { ...photo, url: toFullUrl(photo.url) };
        }
        setSelectedPhoto(normalized);
        setSelectedIndex(index);
        setPhotoVisible(true);
    };

    // ✅ STRICT: Only allow photo viewer if selected AND check is complete
    const handleAvatarPress = () => {
        if (isCheckingSelect) {
            Alert.alert('Please wait', 'Verifying profile status...');
            return;
        }
        if (!isSelected) {
            Alert.alert('Locked', 'Select this profile to view photos and contact details.');
            return;
        }
        const safeData = profileData || {};
        const photos = profilePhotos.length > 0 ? profilePhotos : extractPhotos(safeData);
        if (photos.length > 0) {
            openPhoto(photos[0], 0);
        } else {
            const primary = extractPrimaryPhoto(safeData);
            if (primary) openPhoto({ url: primary, slot: 0 }, 0);
            else Alert.alert('No Photo', 'This profile has no photos available.');
        }
    };

    const goNext = () => {
        if (!profilePhotos || profilePhotos.length === 0) return;
        const next = (selectedIndex + 1) % profilePhotos.length;
        setSelectedIndex(next); setSelectedPhoto(profilePhotos[next]);
    };
    const goPrev = () => {
        if (!profilePhotos || profilePhotos.length === 0) return;
        const prev = (selectedIndex - 1 + profilePhotos.length) % profilePhotos.length;
        setSelectedIndex(prev); setSelectedPhoto(profilePhotos[prev]);
    };

    // ── Resolve the best available first photo for tap-to-view ───────────────
    const getFirstPhoto = () => {
        if (profilePhotos.length > 0) return profilePhotos[0];
        const ud = profileData; // fallback to current view if needed
        if (ud?.photos?.length > 0) return ud.photos[0];
        if (ud?.profile_image) return { url: toFullUrl(ud.profile_image), slot: 0 };
        if (ud?.user_photo) return { url: toFullUrl(ud.user_photo), filename: ud.user_photo, slot: 0 };
        if (ud?.photo_data1) return { url: toFullUrl(ud.photo_data1), filename: ud.photo_data1, slot: 1 };
        return null;
    };

    // ── Fetch latest photos from backend then open viewer ────────────────────
    const fetchAndOpenPhotos = async () => {
        try {
            const { myId } = await resolveMyId();
            if (!myId) {
                const first = getFirstPhoto();
                if (first) openPhoto(first, 0);
                else Alert.alert('Check Session', 'Please login again.');
                return;
            }

            const profileResult = await getProfile(myId);
            if (profileResult?.status && profileResult.data) {
                const freshPhotos = extractPhotos(profileResult.data);
                const freshPrimary = extractPrimaryPhoto(profileResult.data);

                if (freshPhotos.length > 0) {
                    setProfilePhotos(freshPhotos);
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
        }
    };

    const getAvatarSource = () => {
        // This is for the LOGGED IN USER in the header
        // Since ProfileDetails is about a DIFFERENT profile, we should try to
        // get the logged in user's data from storage for the header avatar.
        // For now, if we don't have a separate user profile image, we use default.
        return isUserFemale
            ? require('../../assets/images/avatar_female.jpg')
            : require('../../assets/images/avatar_male.jpg');
    };

    const handleLogout = async () => {
        try {
            await clearSession();
            setIsLoggedIn(false); setMenuVisible(false);
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (_) { }
    };

    // ── Select Profile ─────────────────────────────────────────────────────
    const handleSelectProfile = async () => {
        try {
            setIsSelecting(true);
            const { myId, userData } = await resolveMyId();
            if (!myId) {
                setLoginVisible(true);
                return;
            }

            const targetId = String(numericProfileId || profileId);
            const apiResult = await selectProfile(myId, targetId);

            if (apiResult?.message === 'Membership expired') {
                Alert.alert('Membership Expired', 'Please renew your membership.',
                    [{ text: 'OK', onPress: () => navigation.goBack() }]);
                return;
            }

            if (apiResult?.status || apiResult?.message === 'Profile already selected') {
                setIsSelected(true);
                const newCount = typeof apiResult?.selected_count === 'number'
                    ? apiResult.selected_count : (selectedCount ?? 0) + 1;
                setSelectedCount(newCount);

                // Sync AsyncStorage
                try {
                    const stored = await AsyncStorage.getItem(KEYS.SELECTED_PROFILES_LIST);
                    const list = stored ? JSON.parse(stored) : [];
                    const exists = list.some(
                        (p) => String(p.tamil_profile_id || '') === String(numericProfileId || '')
                    );
                    if (!exists) {
                        list.push({ ...profileData, tamil_profile_id: numericProfileId, profile_id: stringProfileId, selectedAt: new Date().toISOString() });
                        await AsyncStorage.setItem(KEYS.SELECTED_PROFILES_LIST, JSON.stringify(list));
                    }
                } catch (_) { }

                if (userData) {
                    userData.no_sel_profiles = String(parseInt(userData.no_sel_profiles || '0') + 1);
                    await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(userData));
                }

                Alert.alert('Profile Selected', 'Contact details are now unlocked.', [{ text: 'OK' }]);
            } else {
                Alert.alert('Error', apiResult?.message || 'Could not select profile.');
            }
        } catch (_) {
            Alert.alert('Error', 'Something went wrong. Please try again.');
        } finally {
            setIsSelecting(false);
        }
    };

    // ── Guard ──────────────────────────────────────────────────────────────
    if (!profileId) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-circle-outline" size={48} color="#ccc" />
                <Text style={styles.errorText}>Profile not found.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.errorLink}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Derived display values ─────────────────────────────────────────────
    const data = profileData || {};
    const name = decodeUTF8String(data.user_name || data.name || data.profile_name) || 'Unknown';
    const age = data.age || '-';

    let heightLabel = '-';
    if (data.height) {
        heightLabel = !isNaN(data.height) && parseInt(data.height) > 100 ? `${data.height} cm` : data.height;
    } else if (data.height_feet && data.height_inches) {
        heightLabel = `${data.height_feet}ft ${data.height_inches}in`;
    }

    const districtName = getLabel(LOCATION_MAP, data.district);
    const cityName = getLabel(LOCATION_MAP, data.city);
    const locationStr =
        data.location && data.location !== 'Unknown'
            ? data.location
            : [cityName, districtName].filter((p) => p && p !== '0' && p !== 'Unknown').join(', ') || '-';

    const religion = getLabel(RELIGION_MAP, data.religion) || data.religion || '-';
    const casteLabel = getLabel(CASTE_MAP, data.caste) || data.caste || '-';
    const religionCaste = `${religion} - ${casteLabel}`;

    const eduRaw = Array.isArray(data.education) ? data.education[0] : data.education;
    const education = getLabel(EDUCATION_MAP, eduRaw) || eduRaw || data.padippu || '-';
    const occRaw = data.occupation || data.profession;
    const occupation = getLabel(OCCUPATION_MAP, occRaw) || occRaw || '-';

    // ✅ STRICT: Phone list only built when selected — no leaking
    const phoneList = isSelected
        ? [data.phone, data.mobile, data.contact_no, data.phone_no, data.phone_no2]
            .filter((p) => !!p && String(p).trim() !== '')
            .join(' / ')
        : null;

    // ✅ STRICT: imageUrl only resolved when selected
    const imageUrl = isSelected
        ? (extractPrimaryPhoto(data) || toFullUrl(data.user_photo) || toFullUrl(data.photo_data1))
        : null;

    const isFemale = data.gender?.toLowerCase() === 'female' || data.gender === '\u0BAA\u0BC6\u0BA3\u0BCD' || data.gender === 'girl' || data.gender === 'பெண்';
    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') navigation.navigate('Main', { initialTab: 'HOME' });
        else if (tab === 'CONTACT') navigation.navigate('Contact');
        else if (tab === 'SEARCH') navigation.navigate('Search');
        else if (tab === 'PROFILE') navigation.navigate('Profiles');
    };

    const t = (key) => TRANSLATIONS['ta'][key] || key;

    const isUserFemale = userGender?.toLowerCase() === 'female' || userGender === 'பெண்';
    const defaultAvatarSource = isFemale
        ? require('../../assets/images/avatar_female.jpg')
        : require('../../assets/images/avatar_male.jpg');

    // ── Sub-components ─────────────────────────────────────────────────────
    const DetailRow = ({ label, value, icon, index = 0 }) => (
        <View style={[styles.detailRow, index % 2 !== 0 && styles.detailRowOdd]}>
            <View style={styles.labelContainer}>
                {icon && <Icon name={icon} size={15} color="#ef0d8d" style={{ marginRight: 6 }} />}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <View style={styles.valueContainer}>
                <Text style={styles.detailSeparator}>:</Text>
                <Text style={styles.detailValue}>
                    {value && value !== '' && value !== '0' ? value : '-'}
                </Text>
            </View>
        </View>
    );

    const SectionHeader = ({ title, icon }) => (
        <View style={styles.sectionHeader}>
            <LinearGradient colors={['#ef0d8d', '#ad0761']} style={styles.sectionIconBox}>
                <Icon name={icon} size={16} color="#FFF" />
            </LinearGradient>
            <Text style={styles.sectionTitle}>{title}</Text>
        </View>
    );

    // 🔒 Locked field — shown for sensitive fields when NOT selected
    const LockedField = ({ label, icon, index = 0 }) => (
        <View style={[styles.detailRow, index % 2 !== 0 && styles.detailRowOdd]}>
            <View style={styles.labelContainer}>
                {icon && <Icon name={icon} size={15} color="#ef0d8d" style={{ marginRight: 6 }} />}
                <Text style={styles.detailLabel}>{label}</Text>
            </View>
            <View style={styles.valueContainer}>
                <Text style={styles.detailSeparator}>:</Text>
                <View style={styles.lockedBadge}>
                    <Icon name="lock-outline" size={12} color="#ad0761" />
                    <Text style={styles.lockedText}>Select profile to view</Text>
                </View>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

            <PageHeader
                title="Profile Details"
                onBack={() => navigation.goBack()}
                icon="account-details"
                onMenuPress={() => setMenuVisible(true)}
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {(isLoading || isCheckingSelect) && <ActivityIndicator color="#ef0d8d" size="small" />}
                        <TouchableOpacity onPress={() => setMenuVisible(true)}>
                            <Icon name="menu" size={28} color="#ad0761" />
                        </TouchableOpacity>
                    </View>
                }
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ── Summary card ─────────────────────────────────────── */}
                <View style={styles.summaryCard}>
                    <LinearGradient
                        colors={['#ef0d8d', '#ad0761']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={styles.cardTopStripe}
                    />
                    <View style={styles.summaryInner}>

                        {/* ── Avatar — tap to view fullscreen if selected ── */}
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            activeOpacity={0.8}
                            onPress={handleAvatarPress}
                        >
                            <LinearGradient
                                colors={
                                    isCheckingSelect ? ['#ddd', '#ccc', '#bbb'] :
                                        isSelected ? ['#ef0d8d', '#FFC107', '#ad0761'] :
                                            ['#ccc', '#aaa', '#999']
                                }
                                style={styles.avatarGradientRing}
                            >
                                <View style={styles.avatarInnerBorder}>
                                    {/*
                                     * ✅ STRICT GATE:
                                     * isSelected === true  AND  isCheckingSelect === false  AND imageUrl exists
                                     * → show real photo via ImageWithCookie
                                     * ANY other condition → show gender default avatar
                                     * This means: during check, after check fails, or no image = always default
                                     */}
                                    {isSelected && !isCheckingSelect && imageUrl ? (
                                        <ImageWithCookie
                                            uri={imageUrl}
                                            style={styles.avatar}
                                            resizeMode="cover"
                                            fallback={<Image source={defaultAvatarSource} style={styles.avatar} />}
                                        />
                                    ) : (
                                        <Image source={defaultAvatarSource} style={styles.avatar} />
                                    )}
                                </View>
                            </LinearGradient>

                            {/* Overlay: spinner while checking, lock when not selected */}
                            {isCheckingSelect && (
                                <View style={styles.avatarLockOverlay}>
                                    <ActivityIndicator size="small" color="#FFF" />
                                </View>
                            )}
                            {!isCheckingSelect && !isSelected && (
                                <View style={styles.avatarLockOverlay}>
                                    <Icon name="lock" size={16} color="#FFF" />
                                </View>
                            )}

                            {/* Badge */}
                            <View style={[
                                styles.verifiedBadge,
                                isSelected && !isCheckingSelect && styles.verifiedBadgeSelected,
                            ]}>
                                {isCheckingSelect ? (
                                    <ActivityIndicator size={10} color="#888" />
                                ) : isSelected ? (
                                    <Icon name="heart" size={11} color="#ad0761" />
                                ) : (
                                    <Icon name="check-decagram" size={11} color="#4CAF50" />
                                )}
                                <Text style={[
                                    styles.verifiedText,
                                    isSelected && !isCheckingSelect && styles.verifiedTextSelected,
                                ]}>
                                    {isCheckingSelect ? ' Checking' : isSelected ? ' Selected' : ' Verified'}
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* ── Info (non-sensitive) ── */}
                        <View style={styles.summaryInfo}>
                            <Text style={styles.nameText}>{name}</Text>
                            <View style={styles.idBadge}>
                                <Icon name="identifier" size={11} color="#ad0761" />
                                <Text style={styles.idText}>{stringProfileId || profileId}</Text>
                            </View>
                            <LinearGradient colors={['#FFF0FA', '#FFE4F5']} style={styles.highlightBadge}>
                                <Text style={styles.highlightText}>{age} Yrs  •  {heightLabel}</Text>
                            </LinearGradient>
                            {selectedCount != null && (
                                <MiniRow icon="heart-multiple-outline" text={`You have selected ${selectedCount} profiles`} />
                            )}
                            <MiniRow icon="school" text={education} />
                            <MiniRow icon="briefcase" text={occupation} />
                            <MiniRow icon="map-marker" text={locationStr} />
                        </View>
                    </View>

                    {/* ── Status banners ── */}
                    {!isCheckingSelect && isSelected && (
                        <View style={styles.selectedBanner}>
                            <LinearGradient
                                colors={['#0D9488', '#059669']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.selectedBannerGradient}
                            >
                                <Icon name="heart" size={14} color="#FFF" />
                                <Text style={styles.selectedBannerText}>
                                    Profile Selected — Contact details unlocked
                                </Text>
                                <Icon name="lock-open-outline" size={14} color="#A7F3D0" />
                            </LinearGradient>
                        </View>
                    )}
                    {!isCheckingSelect && !isSelected && (
                        <View style={styles.lockedBanner}>
                            <Icon name="lock-outline" size={13} color="#ad0761" />
                            <Text style={styles.lockedBannerText}>
                                Select this profile to unlock photo, phone & place
                            </Text>
                        </View>
                    )}
                    {isCheckingSelect && (
                        <View style={styles.checkingBanner}>
                            <ActivityIndicator size="small" color="#ad0761" />
                            <Text style={styles.checkingBannerText}>Verifying selection status...</Text>
                        </View>
                    )}
                </View>

                {/* ── Detail sections ──────────────────────────────────── */}
                <View style={styles.sectionsWrapper}>

                    {/* NON-SENSITIVE — always visible */}
                    <View style={styles.sectionCard}>
                        <SectionHeader title="Basic Details" icon="account-details" />
                        <DetailRow index={0} label="Date of Birth" value={data.dob || data.date_of_birth} icon="calendar" />
                        <DetailRow index={1} label="Height" value={heightLabel} icon="human-male-height" />
                        <DetailRow index={2} label="Complexion" value={data.complexion || data.color} icon="palette" />
                        <DetailRow index={3} label="Mother Tongue" value={data.mother_tongue || 'Tamil'} icon="translate" />
                        <DetailRow index={4} label="Place of Birth" value={data.birth_place || data.native_place} icon="map" />
                    </View>

                    <View style={styles.sectionCard}>
                        <SectionHeader title="Religious Information" icon="om" />
                        <DetailRow index={0} label="Religion & Caste" value={religionCaste} icon="khanda" />
                        <DetailRow index={1} label="Gothra" value={data.gothra_self} icon="home-heart" />
                        <DetailRow index={2} label="Star (Zodiac)" value={data.zodiacsign} icon="star-face" />
                        <DetailRow index={3} label="Raasi" value={data.raasi} icon="moon-waning-crescent" />
                    </View>

                    <View style={styles.sectionCard}>
                        <SectionHeader title="Professional Information" icon="briefcase" />
                        <DetailRow index={0} label="Education" value={education} icon="school" />
                        <DetailRow index={1} label="Degree Details" value={data.padippu || data.education_details} icon="certificate" />
                        <DetailRow index={2} label="Occupation" value={occupation} icon="briefcase-outline" />
                        <DetailRow index={3} label="Monthly Income" value={data.income || data.monthly_income} icon="cash" />
                        <DetailRow index={4} label="Work Place" value={data.work_place} icon="map-marker-radius" />
                        <DetailRow index={5} label="Work Location" value={data.work_location} icon="office-building" />
                    </View>

                    <View style={styles.sectionCard}>
                        <SectionHeader title="Family Details" icon="home-group" />
                        <DetailRow
                            index={0} label="Father Name" icon="human-male"
                            value={data.father_name
                                ? `${data.father_name}${data.father_occupation ? ` (${data.father_occupation})` : ''}`
                                : '-'}
                        />
                        <DetailRow
                            index={1} label="Mother Name" icon="human-female"
                            value={data.mother_name
                                ? `${data.mother_name}${data.mother_occupation ? ` (${data.mother_occupation})` : ''}`
                                : '-'}
                        />
                        <DetailRow index={2} label="Brothers" value={data.numofbrothers} icon="account-multiple" />
                        <DetailRow index={3} label="Sisters" value={data.numofsisters} icon="account-multiple" />
                        <DetailRow index={4} label="Living Situation" value={data.livingsituation} icon="home" />
                    </View>

                    {/*
                     * ✅ STRICT SENSITIVE SECTION — Contact Details
                     * THREE possible states, each fully exclusive:
                     *
                     * 1. isCheckingSelect === true  → always show locked (API not done yet)
                     * 2. isSelected === false        → always show locked (not selected)
                     * 3. isSelected === true  AND  isCheckingSelect === false → show real data
                     *
                     * No other condition can show real contact data.
                     */}
                    <View style={styles.sectionCard}>
                        <SectionHeader title="Contact Details" icon="map-marker-radius" />
                        {isCheckingSelect || !isSelected ? (
                            // 🔒 LOCKED — checking in progress OR not selected
                            <>
                                <LockedField label="Place" icon="map-marker" index={0} />
                                <LockedField label="Phone" icon="phone" index={1} />
                            </>
                        ) : (
                            // ✅ UNLOCKED — isSelected===true AND isCheckingSelect===false
                            <>
                                <DetailRow
                                    index={0} label="Place"
                                    value={data.place || data.gplace || locationStr}
                                    icon="map-marker"
                                />
                                {phoneList ? (
                                    <DetailRow index={1} label="Phone" value={phoneList} icon="phone" />
                                ) : (
                                    <DetailRow index={1} label="Phone" value="-" icon="phone" />
                                )}
                            </>
                        )}
                    </View>

                    <View style={styles.sectionCard}>
                        <SectionHeader title="Partner Expectations" icon="message-text" />
                        <Text style={styles.notesText}>
                            {data.interests || data.expectation || 'No specific expectations mentioned.'}
                        </Text>
                        {data.dowry_gold && (
                            <View style={styles.propertyBlock}>
                                <Text style={styles.subSectionTitle}>Dowry / Gold:</Text>
                                <Text style={styles.notesText}>{data.dowry_gold}</Text>
                            </View>
                        )}
                    </View>
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* ── Bottom action bar ──────────────────────────────────────── */}
            <View style={styles.bottomBarWrapper}>
                <View style={styles.bottomBar}>
                    <TouchableOpacity
                        style={styles.actionBtnSecondary}
                        onPress={() =>
                            navigation.navigate('ViewHoroscope', {
                                profile: data,
                                targetProfileId: data.tamil_profile_id || data.id || numericProfileId,
                                targetProfileStringId: data.profile_id || stringProfileId,
                            })
                        }
                    >
                        <Icon name="star-crescent" size={18} color="#ef0d8d" />
                        <Text style={styles.actionTextSecondary}>Horoscope</Text>
                    </TouchableOpacity>

                    {isCheckingSelect ? (
                        // Checking state
                        <View style={styles.actionBtnChecking}>
                            <ActivityIndicator size="small" color="#ad0761" />
                            <Text style={styles.actionTextChecking}>Verifying...</Text>
                        </View>

                    ) : isSelected ? (
                        // ✅ Selected — green, non-pressable
                        <TouchableOpacity style={styles.actionBtnSelected} disabled={true}>
                            <LinearGradient
                                colors={['#0D9488', '#059669']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.actionBtnPrimaryInner}
                            >
                                <Icon name="heart" size={18} color="#FFF" />
                                <Text style={styles.actionTextPrimary}>Profile Selected</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                    ) : (
                        // Not selected — pink button
                        <TouchableOpacity
                            style={styles.actionBtnPrimary}
                            onPress={handleSelectProfile}
                            disabled={isSelecting}
                        >
                            <LinearGradient
                                colors={['#ef0d8d', '#ad0761']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.actionBtnPrimaryInner}
                            >
                                {isSelecting
                                    ? <ActivityIndicator size="small" color="#FFF" />
                                    : <Icon name="heart-plus" size={18} color="#FFF" />
                                }
                                <Text style={styles.actionTextPrimary}>
                                    {isSelecting ? 'Selecting...' : 'Select Profile'}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                t={t}
                navigation={navigation}
            />

            {/* ── Fullscreen photo viewer ─────────────────────────────────── */}
            <Modal
                visible={photoVisible}
                transparent={false}
                animationType="fade"
                statusBarTranslucent={false}
                onRequestClose={() => setPhotoVisible(false)}
            >
                <View style={viewer.container}>
                    <StatusBar barStyle="light-content" backgroundColor="#000" translucent={false} />
                    <View style={viewer.topBar}>
                        <TouchableOpacity onPress={() => setPhotoVisible(false)} style={viewer.topBtn}>
                            <Icon name="arrow-left" size={26} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={viewer.topTitle}>{name}'s photo</Text>
                    </View>
                    <View style={viewer.imageArea}>
                        {selectedPhoto?.url ? (
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
                    {profilePhotos.length > 1 && (
                        <View style={viewer.dots}>
                            {profilePhotos.map((_, i) => (
                                <View key={i} style={[viewer.dot, i === selectedIndex && viewer.dotActive]} />
                            ))}
                        </View>
                    )}
                </View>
            </Modal>

            <LoginModal
                visible={loginVisible}
                onClose={() => setLoginVisible(false)}
                onLoginSuccess={() => {
                    setLoginVisible(false);
                    setIsLoggedIn(true);
                    checkIfSelected();
                }}
                t={t}
            />
        </View>
    );
};

const MiniRow = ({ icon, text }) => (
    <View style={styles.miniInfoRow}>
        <Icon name={icon} size={13} color="#ef0d8d" />
        <Text style={styles.miniInfoText} numberOfLines={1}>{text}</Text>
    </View>
);

const viewer = StyleSheet.create({
    container: { flex: 1, flexDirection: 'column', backgroundColor: '#000' },
    topBar: { flexDirection: 'row', alignItems: 'center', paddingTop: Platform.OS === 'ios' ? 50 : 16, paddingBottom: 14, paddingHorizontal: 4, backgroundColor: '#000', zIndex: 10 },
    topBtn: { padding: 10 },
    topTitle: { flex: 1, fontSize: moderateScale(18), color: '#FFF', fontWeight: '600', marginLeft: 4 },
    imageArea: { flex: 1, position: 'relative', backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
    image: { width: '100%', flex: 1, alignSelf: 'stretch' },
    noImageBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    noImageText: { color: 'rgba(255,255,255,0.5)', marginTop: 12, fontSize: 14 },
    navBtn: { position: 'absolute', zIndex: 10, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 30, padding: 8, top: '42%' },
    navL: { left: 10 },
    navR: { right: 10 },
    dots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingVertical: 16, backgroundColor: '#000' },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
    dotActive: { width: 20, height: 6, borderRadius: 3, backgroundColor: '#FFF' },
});

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    scrollView: { flex: 1 },
    scrollContent: { paddingHorizontal: moderateScale(15), paddingBottom: 20, paddingTop: 4 },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    errorText: { fontSize: 16, color: '#999' },
    errorLink: { color: '#ef0d8d', fontWeight: '700', fontSize: 15 },
    avatarSmall: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: '#ef0d8d' },
    uploadBadgeSmall: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#ad0761', width: 14, height: 14, borderRadius: 7, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFF' },

    summaryCard: { backgroundColor: '#FFF', borderRadius: 18, marginBottom: 18, marginTop: 6, overflow: 'hidden', elevation: 5, shadowColor: '#ef0d8d', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.12, shadowRadius: 6 },
    cardTopStripe: { height: 4, width: '100%' },
    summaryInner: { flexDirection: 'row', alignItems: 'flex-start', padding: 16 },
    avatarContainer: { marginRight: 14, alignItems: 'center' },
    avatarGradientRing: { width: 88, height: 88, borderRadius: 44, justifyContent: 'center', alignItems: 'center', padding: 3 },
    avatarInnerBorder: { width: '100%', height: '100%', borderRadius: 41, overflow: 'hidden', backgroundColor: '#FFF', padding: 2 },
    avatar: { width: '100%', height: '100%', borderRadius: 39 },
    avatarLockOverlay: { position: 'absolute', top: 0, left: 0, width: 88, height: 88, borderRadius: 44, backgroundColor: 'rgba(0,0,0,0.38)', justifyContent: 'center', alignItems: 'center' },

    verifiedBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
    verifiedBadgeSelected: { backgroundColor: '#FFF0FA' },
    verifiedText: { fontSize: 10, color: '#2E7D32', fontWeight: '700' },
    verifiedTextSelected: { color: '#ad0761' },

    summaryInfo: { flex: 1 },
    nameText: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 5, fontFamily: 'NotoSansTamil-Bold' },
    idBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF0FA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, alignSelf: 'flex-start', marginBottom: 8, borderWidth: 1, borderColor: '#FFCCE8' },
    idText: { fontSize: 11, color: '#ad0761', fontWeight: '700' },
    highlightBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 9 },
    highlightText: { color: '#ef0d8d', fontWeight: '700', fontSize: 12, letterSpacing: 0.3 },
    miniInfoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 },
    miniInfoText: { fontSize: 12.5, color: '#555', fontFamily: 'NotoSansTamil-Regular', flex: 1 },

    selectedBanner: { marginHorizontal: 12, marginBottom: 12, borderRadius: 10, overflow: 'hidden' },
    selectedBannerGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8 },
    selectedBannerText: { fontSize: 12, fontWeight: '700', color: '#FFF', flex: 1 },

    lockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 7, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#FFF0FA', borderRadius: 10, borderWidth: 1, borderColor: '#FFCCE8' },
    lockedBannerText: { fontSize: 12, color: '#ad0761', fontWeight: '600', flex: 1 },
    checkingBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginBottom: 12, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#F5F5F5', borderRadius: 10 },
    checkingBannerText: { fontSize: 12, color: '#666', fontWeight: '500' },

    lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFF0FA', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: '#FFCCE8' },
    lockedText: { fontSize: 11, color: '#ad0761', fontWeight: '600' },

    sectionsWrapper: { gap: 14 },
    sectionCard: { backgroundColor: '#FFF', borderRadius: 16, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#FFF0FA', paddingBottom: 10 },
    sectionIconBox: { width: 32, height: 32, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 11 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.2 },
    detailRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 2, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 6 },
    detailRowOdd: { backgroundColor: '#FFF8FC' },
    labelContainer: { flexDirection: 'row', alignItems: 'center', width: '42%', paddingRight: 5 },
    detailLabel: { fontSize: 12.5, color: '#777', flexShrink: 1 },
    valueContainer: { flex: 1, flexDirection: 'row' },
    detailSeparator: { color: '#ef0d8d', marginRight: 8, fontWeight: 'bold' },
    detailValue: { flex: 1, fontSize: 13.5, color: '#222', fontWeight: '500', fontFamily: 'NotoSansTamil-Regular', lineHeight: 20 },
    notesText: { fontSize: 13.5, color: '#444', lineHeight: 22, fontFamily: 'NotoSansTamil-Regular' },
    propertyBlock: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#FFF0FA' },
    subSectionTitle: { fontSize: 13, fontWeight: '700', color: '#ad0761', marginBottom: 6 },

    bottomBarWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    bottomBar: { backgroundColor: '#FFF', flexDirection: 'row', padding: 14, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: '#FFCCE8', elevation: 12, shadowColor: '#ef0d8d', shadowOffset: { width: 0, height: -3 }, shadowOpacity: 0.1, shadowRadius: 6, gap: 12 },
    actionBtnSecondary: { flex: 1, borderWidth: 1.5, borderColor: '#ef0d8d', borderRadius: 28, paddingVertical: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, backgroundColor: '#FFF8FC' },
    actionBtnPrimary: { flex: 1.6, borderRadius: 28, elevation: 4, overflow: 'hidden', shadowColor: '#ef0d8d', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 5 },
    actionBtnSelected: { flex: 1.6, borderRadius: 28, elevation: 4, overflow: 'hidden', shadowColor: '#0D9488', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.35, shadowRadius: 5 },
    actionBtnChecking: { flex: 1.6, borderRadius: 28, borderWidth: 1.5, borderColor: '#FFCCE8', backgroundColor: '#FFF8FC', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 8 },
    actionBtnPrimaryInner: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 6 },
    actionTextSecondary: { color: '#ef0d8d', fontWeight: '700', fontSize: 14 },
    actionTextPrimary: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    actionTextChecking: { color: '#ad0761', fontWeight: '700', fontSize: 14 },
});

export default ProfileDetails;