import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions,
    StatusBar,
} from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getSession, KEYS } from '../../utils/session';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { ENDPOINTS } from '../../config/apiConfig';
import PageHeader from '../../components/PageHeader';
import Skeleton from '../../components/Skeleton';

const { width } = Dimensions.get('window');

const PLANET_FULL = {
    '1': 'சூரியன்',
    '2': 'சந்திரன்',
    '3': 'செவ்வாய்',
    '4': 'புதன்',
    '5': 'வியாழன்',
    '6': 'சுக்கிரன்',
    '7': 'சனி',
    '8': 'ராகு',
    '9': 'கேது',
    '10': 'குளிகை',
    '11': 'லக்னம்',
    '12': 'மாந்தி',
};

const C = {
    bg: '#F4F6FB',
    card: '#FFFFFF',
    accent: '#B71C1C',
    accentMid: '#D32F2F',
    accentLight: '#FFEBEE',
    gold: '#E65100',
    goldLight: '#FFF3E0',
    purple: '#4A148C',
    purpleLight: '#F3E5F5',
    text: '#1A1A2E',
    sub: '#4A4A6A',
    muted: '#9898B8',
    border: '#E4E6F0',
    gridLine: '#1A1A2E',
    gridBg: '#FAFBFF',
    gridCenter: '#EEF0FF',
};

const GRID_CELLS = [
    { key: '1', r: 0, c: 0 },
    { key: '2', r: 0, c: 1 },
    { key: '3', r: 0, c: 2 },
    { key: '4', r: 0, c: 3 },
    { key: '5', r: 1, c: 0 },
    { key: '6', r: 1, c: 3 },
    { key: '7', r: 2, c: 0 },
    { key: '8', r: 2, c: 3 },
    { key: '9', r: 3, c: 0 },
    { key: '10', r: 3, c: 1 },
    { key: '11', r: 3, c: 2 },
    { key: '12', r: 3, c: 3 },
];

function HoroGrid({ chart, centerLabel, accentColor }) {
    const cellSize = Math.floor((width - 32) / 4);
    const gridSize = cellSize * 4;

    const getPlanets = (key) =>
        (chart[String(key)] || []).map(n => PLANET_FULL[String(n)] || String(n));

    return (
        <View style={[styles.gridWrapper, { width: gridSize, height: gridSize }]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: C.gridBg }]} />
            {[1, 2, 3].map(i => (
                <View key={`v${i}`} style={[styles.gridVLine, { left: cellSize * i, height: gridSize }]} />
            ))}
            {[1, 2, 3].map(i => (
                <View key={`h${i}`} style={[styles.gridHLine, { top: cellSize * i, width: gridSize }]} />
            ))}
            <View style={[StyleSheet.absoluteFill, { borderWidth: 1.5, borderColor: C.gridLine + '50' }]} />
            <View
                style={[
                    styles.gridCenterBlock,
                    { left: cellSize, top: cellSize, width: cellSize * 2, height: cellSize * 2 },
                ]}
            >
                <Text style={[styles.gridCenterText, { color: accentColor || C.accent }]}>
                    {centerLabel}
                </Text>
            </View>
            {GRID_CELLS.map(({ key, r, c }) => (
                <View
                    key={key}
                    style={[
                        styles.gridCell,
                        { position: 'absolute', left: c * cellSize, top: r * cellSize, width: cellSize, height: cellSize },
                    ]}
                >
                    {getPlanets(key).map((planet, i) => (
                        <Text
                            key={i}
                            style={[styles.planetText, { color: accentColor || C.accent }]}
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            minimumFontScale={0.4}
                        >
                            {planet}
                        </Text>
                    ))}
                </View>
            ))}
        </View>
    );
}

const SectionHeader = ({ icon, title, color, style }) => (
    <View style={[styles.sectionHeader, style]}>
        <View style={[styles.sectionIconWrap, { backgroundColor: (color || C.accent) + '18' }]}>
            <Icon name={icon} size={16} color={color || C.accent} />
        </View>
        <Text style={[styles.sectionTitle, { color: color || C.accent }]}>{title}</Text>
    </View>
);

const InfoRow = ({ label, value, last }) => (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0, marginBottom: 0, paddingBottom: 0 }]}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={3}>{value || '—'}</Text>
    </View>
);

const JothiBadge = ({ icon, label, value, bg, textColor }) => (
    <View style={[styles.jothiBadge, { backgroundColor: bg }]}>
        <Icon name={icon} size={22} color={textColor} />
        <Text style={[styles.jothiBadgeValue, { color: textColor }]}>{value || '—'}</Text>
        <Text style={[styles.jothiBadgeLabel, { color: textColor + 'AA' }]}>{label}</Text>
    </View>
);

const DasaChip = ({ value, label }) => (
    <View style={styles.dasaChip}>
        <Text style={styles.dasaChipValue}>{value}</Text>
        <Text style={styles.dasaChipLabel}>{label}</Text>
    </View>
);

export default function ViewHoroscope() {
    const navigation = useNavigation();
    const route = useRoute();

    const [detailsExpanded, setDetailsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useFocusEffect(
        useCallback(() => {
            let active = true;

            (async () => {
                try {
                    setLoading(true);
                    setError(null);

                    // ── Step 1: Get logged-in user's client ID (for auth) ──
                    const user = await getSession(KEYS.USER_DATA);
                    if (!user) throw new Error('Not logged in');
                    const myClientId = user.tamil_client_id || user.id || user.m_id;

                    // ── Step 2: Get TARGET profile ID from route params ──
                    // This is whose horoscope we want to VIEW — NOT the logged-in user
                    const { profile, targetProfileId, targetProfileStringId } = route.params || {};

                    // Resolve target ID: prefer numeric tamil_profile_id, fallback to profile_id string
                    const targetId =
                        targetProfileId ||
                        profile?.tamil_profile_id ||
                        profile?.id ||
                        targetProfileStringId ||
                        profile?.profile_id ||
                        null;

                    if (!targetId) throw new Error('Target profile ID not provided');

                    // ── Step 3: Fetch THAT profile's horoscope ──
                    const fd = new FormData();
                    fd.append('tamil_client_id', String(myClientId));  // logged-in user (auth)
                    fd.append('profile_id', String(targetId));          // target profile (whose horoscope)

                    const res = await fetch(ENDPOINTS.VIEW_HOROSCOPE, { method: 'POST', body: fd });
                    const json = await res.json();

                    if (!json.status) throw new Error(json.message || 'Error fetching horoscope');
                    if (active) setData(json);
                } catch (e) {
                    if (active) setError(e.message);
                } finally {
                    if (active) setLoading(false);
                }
            })();

            return () => { active = false; };
        }, [route.params])  // ✅ re-fetch when params change (different profile)
    );

    if (loading) {
        return (
            <View style={styles.screen}>
                <PageHeader
                    title="View Horoscope"
                    onBack={() => navigation.goBack()}
                    icon="zodiac-leo"
                />
                <Skeleton type="Horoscope" />
            </View>
        );
    }

    if (error || !data) {
        return (
            <View style={styles.screen}>
                <PageHeader
                    title="View Horoscope"
                    onBack={() => navigation.goBack()}
                    icon="zodiac-leo"
                />
                <View style={styles.center}>
                    <Icon name="alert-circle-outline" size={52} color={C.accent} />
                    <Text style={styles.errorTitle}>தகவல் கிடைக்கவில்லை</Text>
                    <Text style={styles.errorSub}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={() => navigation.goBack()}>
                        <Text style={styles.retryText}>← திரும்பு</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const {
        profile,
        jothidam,
        horoscope_available,
        raasi_chart,
        amsam_chart,
        dasa,
        vagram,
        astangam,
    } = data;

    const dasaDirection = (dasa?.direction || []).map(n => PLANET_FULL[String(n)] || n).join(', ');
    const vagramList = (vagram || []).map(n => PLANET_FULL[String(n)] || n).join(', ');
    const astangamList = (astangam || []).map(n => PLANET_FULL[String(n)] || n).join(', ');

    return (
        <View style={styles.screen}>
            <PageHeader
                title="View Horoscope"
                onBack={() => navigation.goBack()}
                icon="zodiac-leo"
            />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* ─── Name Banner ─────────────────────────────────────────── */}
                <View style={styles.nameBanner}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.profileName}>{profile.user_name}</Text>
                        <Text style={styles.profileId}>{profile.profile_id}</Text>
                    </View>
                    <View style={[
                        styles.genderTag,
                        { backgroundColor: profile.gender === 'Female' ? '#FCE4EC' : '#E3F2FD' },
                    ]}>
                        <Icon
                            name={profile.gender === 'Female' ? 'gender-female' : 'gender-male'}
                            size={14}
                            color={profile.gender === 'Female' ? '#C2185B' : '#1565C0'}
                        />
                        <Text style={[
                            styles.genderText,
                            { color: profile.gender === 'Female' ? '#C2185B' : '#1565C0' },
                        ]}>
                            {profile.gender === 'Female' ? 'பெண்' : 'ஆண்'}  ·  {profile.age} வயது
                        </Text>
                    </View>
                </View>

                {/* ─── Personal Details (Collapsible) ──────────────────────── */}
                <View style={styles.card}>
                    <TouchableOpacity
                        style={styles.collapseHeader}
                        onPress={() => setDetailsExpanded(prev => !prev)}
                        activeOpacity={0.7}
                    >
                        <View style={styles.sectionHeader}>
                            <View style={[styles.sectionIconWrap, { backgroundColor: C.accent + '18' }]}>
                                <Icon name="account-details-outline" size={16} color={C.accent} />
                            </View>
                            <Text style={[styles.sectionTitle, { color: C.accent }]}>
                                தனிப்பட்ட விவரங்கள்
                            </Text>
                        </View>
                        <Icon
                            name={detailsExpanded ? 'chevron-up' : 'chevron-down'}
                            size={20}
                            color={C.muted}
                        />
                    </TouchableOpacity>

                    {detailsExpanded && (
                        <>
                            <InfoRow label="பெயர்" value={profile.user_name} />
                            <InfoRow label="மதம்" value={profile.religion} />
                            <InfoRow label="அப்பா பெயர்" value={profile.father_name} />
                            <InfoRow label="அம்மா பெயர்" value={profile.mother_name} />
                            <InfoRow label="நிறம்" value={profile.complexion} />
                            <InfoRow label="உயரம்" value={profile.height_label} />
                            <InfoRow label="பிறந்த தேதி" value={profile.dob} />
                            <InfoRow label="பிறந்த நேரம்" value={profile.birth_time} />
                            <InfoRow label="பிறந்த இடம்" value={profile.birth_place} />
                            <InfoRow label="பைரவீகளர்" value={profile.place} />
                            <InfoRow label="அண்ணன் / தம்பி" value={profile.brothers} />
                            <InfoRow label="அக்கா / தங்கை" value={profile.sisters} />
                            <InfoRow label="குலதெய்வம்" value={profile.gothra} />
                            <InfoRow label="படிப்பு" value={profile.education} />
                            <InfoRow label="பணியிடம்" value={profile.work_location} />
                            <InfoRow label="மாத வருமானம்" value={`₹ ${profile.income}`} />
                            <InfoRow label="சொத்து / சீதன விவரம்" value={profile.living_situation} />
                            <InfoRow label="எதிர்பார்ப்புகள்" value={profile.expectations} last />
                        </>
                    )}
                </View>

                {/* ─── Jothidam Badges ──────────────────────────────────────── */}
                <View style={styles.card}>
                    <SectionHeader icon="star-crescent" title="ஜோதிட விவரங்கள்" color={C.gold} />
                    <View style={styles.badgeRow}>
                        <JothiBadge
                            icon="moon-waning-crescent"
                            label="பிறந்த ராசி"
                            value={jothidam.raasi}
                            bg={C.accentLight}
                            textColor={C.accent}
                        />
                        <JothiBadge
                            icon="star-four-points-outline"
                            label="நட்சத்திரம்"
                            value={jothidam.natchathiram}
                            bg={C.goldLight}
                            textColor={C.gold}
                        />
                        <JothiBadge
                            icon="numeric-1-circle-outline"
                            label="பாதம்"
                            value={jothidam.pagam}
                            bg={C.purpleLight}
                            textColor={C.purple}
                        />
                    </View>
                </View>

                {/* ─── Horoscope Charts ─────────────────────────────────────── */}
                {horoscope_available && raasi_chart && amsam_chart ? (
                    <>
                        <View style={styles.card}>
                            <SectionHeader icon="grid" title="ராசி கட்டம்" color={C.accent} />
                            <View style={styles.gridOuter}>
                                <HoroGrid chart={raasi_chart} centerLabel="ராசி" accentColor={C.accent} />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <SectionHeader icon="grid-large" title="அம்சம் கட்டம்" color={C.purple} />
                            <View style={styles.gridOuter}>
                                <HoroGrid chart={amsam_chart} centerLabel="அம்சம்" accentColor={C.purple} />
                            </View>
                        </View>

                        <View style={styles.card}>
                            <SectionHeader
                                icon="clock-time-eight-outline"
                                title="திசை & கிரக நிலை"
                                color={C.sub}
                                style={{ marginBottom: 0 }}
                            />
                            <View style={styles.dasaBox}>
                                <Text style={styles.dasaBoxLabel}>ஜென்ம திசை இருப்பு</Text>
                                <View style={styles.dasaRow}>
                                    <DasaChip value={dasaDirection || '—'} label="திசை" />
                                    <DasaChip value={dasa.years_remaining} label="வருடம்" />
                                    <DasaChip value={dasa.months_remaining} label="மாதம்" />
                                    <DasaChip value={dasa.days_remaining} label="நாள்" />
                                </View>
                            </View>
                            <InfoRow label="வக்கிரம்" value={vagramList || 'இல்லை'} />
                            <InfoRow label="அஷ்டாங்கம்" value={astangamList || 'இல்லை'} last />
                        </View>
                    </>
                ) : (
                    <View style={styles.card}>
                        <View style={styles.noHoroBox}>
                            <Icon name="chart-box-outline" size={42} color={C.muted} />
                            <Text style={styles.noHoroText}>ஜாதகம் பதிவு செய்யப்படவில்லை</Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 36 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 10 },
    loadingText: { fontSize: 15, color: C.sub, fontFamily: 'NotoSansTamil-Regular' },
    errorTitle: { fontSize: 17, fontWeight: '700', color: C.text, fontFamily: 'NotoSansTamil-Bold' },
    errorSub: { fontSize: 13, color: C.muted, textAlign: 'center' },
    retryBtn: { marginTop: 10, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: C.accent, borderRadius: 10 },
    retryText: { color: '#fff', fontWeight: '600', fontSize: 15 },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
    nameBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    profileName: { fontSize: 18, fontWeight: '800', color: C.text, fontFamily: 'NotoSansTamil-Bold' },
    profileId: { fontSize: 12, color: C.muted, marginTop: 3, letterSpacing: 0.5 },
    genderTag: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, marginLeft: 10 },
    genderText: { fontSize: 12, fontWeight: '600', fontFamily: 'NotoSansTamil-Regular' },
    card: { backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 3 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 8 },
    sectionIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '700', fontFamily: 'NotoSansTamil-Bold' },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border, gap: 8 },
    infoLabel: { flex: 0.42, fontSize: 13, color: C.sub, fontFamily: 'NotoSansTamil-Regular' },
    infoValue: { flex: 0.58, fontSize: 13, color: C.text, fontWeight: '600', textAlign: 'right', fontFamily: 'NotoSansTamil-Regular' },
    badgeRow: { flexDirection: 'row', gap: 10 },
    jothiBadge: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center', gap: 6 },
    jothiBadgeValue: { fontSize: 13, fontWeight: '700', textAlign: 'center', fontFamily: 'NotoSansTamil-Bold' },
    jothiBadgeLabel: { fontSize: 10.5, textAlign: 'center', fontFamily: 'NotoSansTamil-Regular' },
    gridOuter: { alignItems: 'center', marginTop: 4 },
    gridWrapper: { position: 'relative', overflow: 'hidden' },
    gridVLine: { position: 'absolute', top: 0, width: 1, backgroundColor: C.gridLine, opacity: 0.2 },
    gridHLine: { position: 'absolute', left: 0, height: 1, backgroundColor: C.gridLine, opacity: 0.2 },
    gridCenterBlock: { position: 'absolute', backgroundColor: C.gridCenter, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.gridLine + '25' },
    gridCenterText: { fontSize: 22, fontWeight: '800', fontFamily: 'NotoSansTamil-Bold', opacity: 0.45 },
    gridCell: { padding: 5, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2 },
    planetText: { fontSize: 11, fontWeight: '600', fontFamily: 'NotoSansTamil-Bold', lineHeight: 14, textAlign: 'center' },
    dasaBox: { backgroundColor: C.accentLight, borderRadius: 12, padding: 14, marginBottom: 14, borderLeftWidth: 3, borderLeftColor: C.accent },
    dasaBoxLabel: { fontSize: 12.5, color: C.accent, fontWeight: '700', marginBottom: 10, fontFamily: 'NotoSansTamil-Bold' },
    dasaRow: { flexDirection: 'row', gap: 8 },
    dasaChip: { flex: 1, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 10, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
    dasaChipValue: { fontSize: 15, fontWeight: '800', color: C.accent, fontFamily: 'NotoSansTamil-Bold' },
    dasaChipLabel: { fontSize: 10, color: C.sub, marginTop: 2, fontFamily: 'NotoSansTamil-Regular' },
    noHoroBox: { alignItems: 'center', paddingVertical: 30, gap: 12 },
    noHoroText: { fontSize: 14, color: C.muted, fontFamily: 'NotoSansTamil-Regular' },
    collapseHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});