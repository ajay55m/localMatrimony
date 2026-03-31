import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, Image, TouchableOpacity,
    Platform, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNetInfo } from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { scale, moderateScale } from '../../utils/responsive';
import PageHeader from '../../components/PageHeader';
import Skeleton from '../../components/Skeleton';
import EmptyState from '../../components/EmptyState';
import { KEYS, getSession, clearSession } from '../../utils/session';
import { getSelectedProfiles } from '../../services/profileService';
import SidebarMenu from '../../components/SidebarMenu';
import Footer from '../../components/Footer';
import { TRANSLATIONS } from '../../constants/translations';
import { BASE_IMAGE_URL } from '../../config/apiConfig';
 
const TAMIL_FEMALE = '\u0BAA\u0BC6\u0BA3\u0BCD';
const isFemaleGender = (g) => {
    if (!g) return false;
    const s = String(g).toLowerCase().trim();
    return s === 'female' || s === TAMIL_FEMALE || s === 'பெண்' || s === 'girl';
};

const SelectedProfiles = () => {
    const navigation = useNavigation();
    const { isConnected } = useNetInfo();
    const isOffline = isConnected === false;

    const [profiles, setProfiles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [userGender, setUserGender] = useState('Male');
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') navigation.navigate('Main', { initialTab: 'HOME' });
        else if (tab === 'CONTACT') navigation.navigate('Contact');
        else if (tab === 'SEARCH') navigation.navigate('Search');
        else if (tab === 'PROFILE') navigation.navigate('Profiles');
    };

    const t = (key) => TRANSLATIONS['ta'][key] || key;

    // ── Load from backend API ─────────────────────────────────────────────
    const loadFromBackend = useCallback(async () => {
        try {
            setIsLoading(true);

            const userData = await getSession(KEYS.USER_DATA);
            setIsLoggedIn(!!userData);
            if (userData?.gender) setUserGender(userData.gender);

            let storedClientId = await AsyncStorage.getItem(KEYS.TAMIL_CLIENT_ID);
            if (storedClientId && isNaN(storedClientId) && userData?.id) {
                storedClientId = String(userData.id);
                await AsyncStorage.setItem(KEYS.TAMIL_CLIENT_ID, storedClientId);
            }

            const tamilId =
                storedClientId ||
                userData?.tamil_client_id ||
                userData?.id ||
                userData?.client_id ||
                userData?.profileid ||
                null;

            if (!tamilId) { setIsLoading(false); return; }

            // Fetch selected profiles from backend
            const result = await getSelectedProfiles(String(tamilId));

            if (result?.status && Array.isArray(result.data)) {
                // Same logic as ViewedProfiles: filter for viewed ones
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
                        name: p?.name || p?.user_name || 'Unknown',
                        is_selected: true,
                        viewed: true,
                        education: Array.isArray(p?.education) ? p.education : [p?.education].filter(Boolean),
                    };
                });

                setProfiles(sanitized);
            } else {
                setProfiles([]);
            }
        } catch (error) {
            console.error('[SelectedProfiles] load error:', error);
        } finally {
            setIsLoading(false);
        }
    }, [isOffline]);

    useFocusEffect(useCallback(() => { loadFromBackend(); }, [loadFromBackend]));



    const resolveAvatar = (item) => {
        const isFemale = isFemaleGender(item.gender);
        return isFemale
            ? require('../../assets/images/avatar_female.jpg')
            : require('../../assets/images/avatar_male.jpg');
    };

    const renderCard = ({ item }) => {
        const name = item.name || item.user_name || 'Unknown';
        const profileId = item.profile_id || item.tamil_profile_id || item.id || '—';
        const age = item.age || '-';
        const height = item.height || (item.height_feet ? `${item.height_feet}ft ${item.height_inches}in` : '-');
        const religion = item.religion_name || item.religion || '-';
        const location = item.location && item.location !== 'Unknown'
            ? item.location : item.city || item.district || 'Tamil Nadu';
        const education = Array.isArray(item.education) ? item.education[0] : (item.education || '-');
        const occupation = item.occupation_name || item.occupation || 'Not Specified';

        let imageUrl = item.profile_image || null;
        if (imageUrl && !imageUrl.startsWith('http')) {
            imageUrl = `${BASE_IMAGE_URL}${imageUrl}`;
        }

        // Use viewed_at or created_at from backend
        const selectedDate = item.viewed_at || item.created_at
            ? new Date(item.viewed_at || item.created_at).toLocaleDateString('en-IN', {
                day: '2-digit', month: 'short', year: 'numeric',
            })
            : '—';

        return (
            <View style={styles.cardWrapper}>
                <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => navigation.navigate('ProfileDetails', { profile: item })}
                >
                    <View style={styles.card}>
                        <View style={styles.cardAccent} />
                        <View style={styles.cardHeader}>
                            <Text style={styles.profileIdText}>{profileId}</Text>
                            <View style={styles.dateBadge}>
                                <Icon name="calendar-check" size={scale(11)} color="#ad0761" />
                                <Text style={styles.dateText}>{selectedDate}</Text>
                            </View>
                        </View>
                        <View style={styles.cardBody}>
                            <View style={styles.avatarCol}>
                                <View style={styles.avatarRing}>
                                    {imageUrl ? (
                                        <Image source={{ uri: imageUrl }} style={styles.avatar} resizeMode="cover" />
                                    ) : (
                                        <Image source={resolveAvatar(item)} style={styles.avatar} resizeMode="cover" />
                                    )}
                                    <View style={styles.heartOverlay}>
                                        <Icon name="heart" size={scale(13)} color="#ef0d8d" />
                                    </View>
                                </View>
                                <View style={styles.selectedBadge}>
                                    <Icon name="check-circle" size={scale(10)} color="#ef0d8d" />
                                    <Text style={styles.selectedBadgeText}>Selected</Text>
                                </View>
                            </View>
                            <View style={styles.infoCol}>
                                <View style={styles.nameRow}>
                                    <Text style={styles.name} numberOfLines={1}>{name}</Text>
                                    <View style={styles.ageBadge}>
                                        <Text style={styles.ageText}>{age} Yrs</Text>
                                    </View>
                                </View>
                                <View style={styles.grid}>
                                    <View style={styles.gridCol}>
                                        <DetailItem icon="human-male-height" text={height} />
                                        <DetailItem icon="om" text={religion} />
                                        <DetailItem icon="map-marker" text={location} />
                                    </View>
                                    <View style={styles.gridCol}>
                                        <DetailItem icon="school" text={education} />
                                        <DetailItem icon="briefcase" text={occupation} />
                                    </View>
                                </View>
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        style={styles.viewBtn}
                                        onPress={() => navigation.navigate('ProfileDetails', { profile: item })}
                                        activeOpacity={0.8}
                                    >
                                        <Icon name="eye-outline" size={scale(14)} color="#ef0d8d" />
                                        <Text style={styles.viewBtnText}>View Details</Text>
                                    </TouchableOpacity>

                                </View>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    };

    const profileCountTotal = parseInt(profiles.length || 0, 10);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
            <PageHeader
                title={`Selected Profiles (${profileCountTotal})`}
                onBack={() => navigation.goBack()}
                icon="heart"
                isOffline={isOffline}
                onMenuPress={() => setMenuVisible(true)}
            />
            {isLoading ? (
                <Skeleton type="List" />
            ) : profiles.length === 0 ? (
                <EmptyState
                    icon="heart-outline"
                    title="No Profiles Selected"
                    message="Select profiles using the Select Profile button to see them here."
                />
            ) : (
                <FlatList
                    data={profiles}
                    renderItem={renderCard}
                    keyExtractor={(item, idx) =>
                        String(item.tamil_profile_id || item.profile_id || item.id || idx)
                    }
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onRefresh={loadFromBackend}
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

const DetailItem = ({ icon, text }) => (
    <View style={styles.detail}>
        <Icon name={icon} size={scale(13)} color="#9E9E9E" />
        <Text style={styles.detailText} numberOfLines={1}>{text || '-'}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FFF7ED' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    listContent: { padding: scale(14), paddingTop: scale(6), paddingBottom: scale(24) },
    cardWrapper: { marginBottom: scale(14) },
    card: { backgroundColor: '#FFF', borderRadius: scale(16), overflow: 'hidden', borderWidth: scale(1), borderColor: 'rgba(239,13,141,0.15)', ...Platform.select({ ios: { shadowColor: '#ef0d8d', shadowOffset: { width: 0, height: scale(3) }, shadowOpacity: 0.1, shadowRadius: scale(8) }, android: { elevation: scale(4) } }) },
    cardAccent: { height: scale(3), backgroundColor: '#ef0d8d', width: '100%' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(14), paddingVertical: scale(8) },
    profileIdText: { fontSize: moderateScale(13), color: '#1565C0', fontWeight: '700', letterSpacing: 0.2 },
    dateBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), backgroundColor: '#FFF0FA', paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(10) },
    dateText: { fontSize: moderateScale(10), color: '#ad0761', fontWeight: '600' },
    cardBody: { flexDirection: 'row', paddingHorizontal: scale(14), paddingBottom: scale(14), paddingTop: scale(2) },
    avatarCol: { alignItems: 'center', marginRight: scale(14) },
    avatarRing: { width: scale(78), height: scale(78), borderRadius: scale(39), borderWidth: scale(2.5), borderColor: '#ef0d8d', backgroundColor: '#FFF', overflow: 'hidden', marginBottom: scale(6) },
    avatar: { width: '100%', height: '100%' },
    heartOverlay: { position: 'absolute', bottom: scale(4), right: scale(4), width: scale(20), height: scale(20), borderRadius: scale(10), backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 2 },
    selectedBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(3), backgroundColor: '#FFF0FA', paddingHorizontal: scale(7), paddingVertical: scale(3), borderRadius: scale(6) },
    selectedBadgeText: { fontSize: moderateScale(10), color: '#ef0d8d', fontWeight: '700' },
    infoCol: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(10) },
    name: { fontSize: moderateScale(16), fontWeight: '700', color: '#111', flex: 1, fontFamily: 'NotoSansTamil-Bold' },
    ageBadge: { backgroundColor: '#FCE4EC', paddingHorizontal: scale(7), paddingVertical: scale(2), borderRadius: scale(4) },
    ageText: { fontSize: moderateScale(11), fontWeight: '700', color: '#EC407A' },
    grid: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: scale(10), padding: scale(9), gap: scale(8), marginBottom: scale(10) },
    gridCol: { flex: 1, gap: scale(6) },
    detail: { flexDirection: 'row', alignItems: 'center', gap: scale(5) },
    detailText: { fontSize: moderateScale(11.5), color: '#4B5563', fontWeight: '500', flex: 1, fontFamily: 'NotoSansTamil-Regular' },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
    viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(5), backgroundColor: '#FFF0FA', borderWidth: scale(1.5), borderColor: '#ef0d8d', borderRadius: scale(10), paddingVertical: scale(8) },
    viewBtnText: { fontSize: moderateScale(12), color: '#ef0d8d', fontWeight: '700' },
    footerWrapper: {
        backgroundColor: '#FFF',
    },
});

export default SelectedProfiles;