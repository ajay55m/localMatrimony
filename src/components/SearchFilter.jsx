import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Modal,
    Dimensions,
    Alert,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, moderateScale } from '../utils/responsive';
import { ActivityIndicator } from 'react-native';
import { MARITAL_STATUSES } from '../constants/maritalStatuses';
import { DIRECTIONS } from '../constants/directions';
import { ENDPOINTS } from '../config/apiConfig';

const { height } = Dimensions.get('window');

const SEARCH_API_URL = ENDPOINTS.SEARCH_PROFILES;
const DROPDOWN_API_URL = ENDPOINTS.GET_DROPDOWNS;
const BOT_COOKIE = 'humans_21909=1';

const COLORS = {
    primary: '#ef5c0dff',
    primaryGradientStart: '#fe8229ff',
    primaryGradientEnd: '#d6450bff',
    ctaGradientStart: '#e5a135ff',
    ctaGradientEnd: '#8e5000ff',
    white: '#FFFFFF',
    textMain: '#1F2937',
    textSub: '#6B7280',
    gold: '#F59E0B',
};

// ─────────────────────────────────────────────────────────────
// Helper: returns true when a value is a real selection
// ─────────────────────────────────────────────────────────────
const isValidSelection = (value) =>
    value !== undefined &&
    value !== null &&
    String(value).trim() !== '' &&
    !String(value).startsWith('SELECT_');

// ─────────────────────────────────────────────────────────────
// Helper: validate & normalise age range
// ─────────────────────────────────────────────────────────────
const normaliseAgeRange = (from, to) => {
    let f = Math.max(18, Math.min(90, parseInt(from, 10) || 18));
    let t = Math.max(18, Math.min(90, parseInt(to, 10) || 90));
    if (f > t) [f, t] = [t, f];
    return { ageFrom: String(f), ageTo: String(t) };
};

// ─────────────────────────────────────────────────────────────
// Helper: normalise any API dropdown shape into {value, label}
// If API returns plain Tamil strings → value = label = string
// If API returns {id, name} objects → value = id, label = name
// ─────────────────────────────────────────────────────────────
const mapDropdownItems = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map(item => {
        if (typeof item === 'string') return { value: item, label: item };
        const value = item.value ?? item.name ?? item.id ?? String(item);
        const label = item.label ?? item.name ?? item.value ?? String(item);
        return { value: String(value), label: String(label) };
    });
};

// ─────────────────────────────────────────────────────────────
// Core search fetch — uses FormData to guarantee Tamil text
// is sent correctly (same pattern as working fetchDropdowns)
// ─────────────────────────────────────────────────────────────
const doSearchFetch = async (params) => {
    try {
        const body = new FormData();
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && String(v).trim() !== '') {
                body.append(k, String(v));
            }
        });

        const response = await fetch(SEARCH_API_URL, {
            method: 'POST',
            headers: { Cookie: BOT_COOKIE },
            body,
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        // Decode as UTF-8 to preserve Tamil characters
        const buffer = await response.arrayBuffer();
        let text;
        if (typeof TextDecoder !== 'undefined') {
            text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
        } else {
            // Manual fallback
            const bytes = new Uint8Array(buffer);
            let r = '';
            let i = 0;
            while (i < bytes.length) {
                const c = bytes[i++];
                if (c < 128) { r += String.fromCharCode(c); }
                else if (c >= 192 && c < 224) { r += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63)); }
                else if (c >= 224 && c < 240) { r += String.fromCharCode(((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)); }
                else { i += 3; }
            }
            text = r;
        }

        return JSON.parse(text);
    } catch (e) {
        console.error('doSearchFetch error:', e);
        return { status: false, message: String(e), data: [] };
    }
};

// =============================================================================
// DropdownSheet — self-contained with its own Modal open state
// =============================================================================
const DropdownSheet = ({ title, value, items = [], labels = {}, onSelect, loading = false, style }) => {
    const [open, setOpen] = useState(false);

    // Show label from map if found, otherwise show value as-is (handles Tamil default text)
    const displayLabel = isValidSelection(value)
        ? (labels[value] || value)
        : '-- தேர்வு --';

    return (
        <>
            <TouchableOpacity
                style={[styles.pickerBox, loading && { opacity: 0.6 }, style]}
                onPress={() => !loading && setOpen(true)}
                activeOpacity={0.75}
            >
                {loading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />}
                <Text
                    style={[styles.pickerText, !isValidSelection(value) && { color: '#9CA3AF' }]}
                    numberOfLines={1}
                >
                    {loading ? 'ஏற்றுகிறது...' : displayLabel}
                </Text>
                <Icon name="chevron-down" size={16} color={COLORS.textSub} />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={sheetStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View style={sheetStyles.sheet} onStartShouldSetResponder={() => true}>
                        <View style={sheetStyles.header}>
                            <Text style={sheetStyles.title}>{title}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Icon name="close" size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={sheetStyles.option}
                                onPress={() => { onSelect(''); setOpen(false); }}
                                activeOpacity={0.7}
                            >
                                <Text style={sheetStyles.optionText}>-- தேர்வு --</Text>
                            </TouchableOpacity>
                            {items.map((item, i) => {
                                const isSelected = item === value;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[sheetStyles.option, isSelected && sheetStyles.optionActive]}
                                        onPress={() => { onSelect(item); setOpen(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[sheetStyles.optionText, isSelected && sheetStyles.optionTextActive]} numberOfLines={2}>
                                            {labels[item] || item}
                                        </Text>
                                        {isSelected && <Icon name="check" size={16} color="#e5a135ff" />}
                                    </TouchableOpacity>
                                );
                            })}
                            <View style={{ height: 30 }} />
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </>
    );
};

const sheetStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: height * 0.6, paddingBottom: 16 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    title: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 12 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 13, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F9FAFB' },
    optionActive: { backgroundColor: '#FFF8E7' },
    optionText: { fontSize: 15, color: '#374151', flex: 1, marginRight: 8 },
    optionTextActive: { color: '#e5a135ff', fontWeight: '700' },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const SearchFilter = ({ onSearch, t, isLoggedIn = false }) => {
    const [searchMode, setSearchMode] = useState('normal');
    const [loading, setLoading] = useState(false);

    // ── Dropdown data from API ────────────────────────────────────────────────
    const [dropdowns, setDropdowns] = useState({
        castes: [], complexions: [], qualifications: [],
        occupations: [], rasis: [], religions: [], stars: [], districts: [],
    });
    const [ddLoading, setDdLoading] = useState(false);

    useEffect(() => { fetchDropdowns(); }, []);

    const fetchDropdowns = async () => {
        setDdLoading(true);
        try {
            const body = new FormData();
            body.append('action', 'get_dropdowns');
            const response = await fetch(DROPDOWN_API_URL, { method: 'POST', body });
            const res = await response.json();

            console.log('📋 Castes sample:', JSON.stringify((res?.data?.castes || []).slice(0, 3)));
            console.log('📋 Religions sample:', JSON.stringify((res?.data?.religions || []).slice(0, 3)));

            if (res.status && res.data) {
                setDropdowns({
                    castes: mapDropdownItems(res.data.castes),
                    complexions: mapDropdownItems(res.data.complexions),
                    qualifications: mapDropdownItems(res.data.qualifications),
                    occupations: mapDropdownItems(res.data.occupations),
                    rasis: mapDropdownItems(res.data.rasis),
                    religions: mapDropdownItems(res.data.religions),
                    stars: mapDropdownItems(res.data.stars),
                    districts: mapDropdownItems(res.data.districts),
                });
            }
        } catch (e) {
            console.error('fetchDropdowns error:', e);
        } finally {
            setDdLoading(false);
        }
    };

    // ── Normal Filters — caste defaults to நாடார் (matches DB stored text) ──
    const [filters, setFilters] = useState({
        lookingFor: '',
        ageFrom: '18',
        ageTo: '30',
        religion: '',
        caste: '1',
    });

    // ── Advanced Filters ──────────────────────────────────────────────────────
    const [advFilters, setAdvFilters] = useState({
        searchId: '',
        seeking: '',
        ageFrom: '18',
        ageTo: '30',
        district: '',
        religion: '',
        caste: '1',
        nativeDirection: '',
        qualification: '',
        work: '',
        raasi: '',
        star: '',
        color: '',
        jewel: '',
        maritalStatus: '',
    });

    const updateAdv = (key, val) => setAdvFilters(prev => ({ ...prev, [key]: val }));
    const updateNormal = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

    // ── Option lists ──────────────────────────────────────────────────────────
    const ageOptions = Array.from({ length: 73 }, (_, i) => String(i + 18));
    const genderOptions = ['', 'Female', 'Male'];
    const genderLabels = { '': 'All', Female: t('WOMAN'), Male: t('MAN') };

    const religionOptions = dropdowns.religions.map(r => r.value);
    const religionLabels = dropdowns.religions.reduce((a, r) => ({ ...a, [r.value]: r.label }), {});

    const casteOptions = dropdowns.castes.map(c => c.value);
    const casteLabels = dropdowns.castes.reduce((a, c) => ({ ...a, [c.value]: c.label }), {});

    const districtOptions = dropdowns.districts.map(d => d.value);
    const districtLabels = dropdowns.districts.reduce((a, d) => ({ ...a, [d.value]: d.label }), {});

    const qualOptions = dropdowns.qualifications.map(q => q.value);
    const qualLabels = dropdowns.qualifications.reduce((a, q) => ({ ...a, [q.value]: q.label }), {});

    const workOptions = dropdowns.occupations.map(o => o.value);
    const workLabels = dropdowns.occupations.reduce((a, o) => ({ ...a, [o.value]: o.label }), {});

    const rasiOptions = dropdowns.rasis.map(r => r.value);
    const rasiLabels = dropdowns.rasis.reduce((a, r) => ({ ...a, [r.value]: r.label }), {});

    const starOptions = dropdowns.stars.map(s => s.value);
    const starLabels = dropdowns.stars.reduce((a, s) => ({ ...a, [s.value]: s.label }), {});

    const colorOptions = dropdowns.complexions.map(c => c.value);
    const colorLabels = dropdowns.complexions.reduce((a, c) => ({ ...a, [c.value]: c.label }), {});

    const directionOptions = DIRECTIONS.map(d => d.value);
    const directionLabels = DIRECTIONS.reduce((a, d) => ({ ...a, [d.value]: d.label }), {});

    const maritalOptions = MARITAL_STATUSES.map(m => m.value);
    const maritalLabels = MARITAL_STATUSES.reduce((a, m) => ({ ...a, [m.value]: m.label }), {});

    const jewelOptions = [
        'Below 10 powns', 'Below 20 powns', 'Below 30 Powns', 'Below 40 Powns',
        'Below 50 Powns', 'Below 60 powns', 'Below 75 Powns', 'Below 80 powns',
        'Below 100 Powns', 'below 125 Powns', 'Below 150 Powns', 'Below 200 Pown', 'Above 200 Powns',
    ];

    const handleAgeToSelect = (val) => { const r = normaliseAgeRange(advFilters.ageFrom, val); setAdvFilters(p => ({ ...p, ...r })); };
    const handleAgeFromSelect = (val) => { const r = normaliseAgeRange(val, advFilters.ageTo); setAdvFilters(p => ({ ...p, ...r })); };

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: translate specific field values to match DB stored text (LIKE queries)
    // ─────────────────────────────────────────────────────────────────────────
    const resolveToText = (value, labelsMap) => {
        if (!isValidSelection(value)) return null;
        return labelsMap[value] || value;
    };

    // ─────────────────────────────────────────────────────────────────────────
    // handleSearch — builds payload and calls search API via FormData
    // ─────────────────────────────────────────────────────────────────────────
    const handleSearch = async () => {
        setLoading(true);
        try {
            const params = { limit: 50 };

            if (searchMode === 'normal') {
                const gl = resolveToText(filters.lookingFor, genderLabels);
                if (gl) params.gender = gl;
                
                const { ageFrom, ageTo } = normaliseAgeRange(filters.ageFrom, filters.ageTo);
                params.age_from = ageFrom;
                params.age_to = ageTo;

                const rl = resolveToText(filters.religion, religionLabels);
                if (rl) params.religion = rl;

                if (isValidSelection(filters.caste)) {
                    const label = casteLabels[filters.caste] || filters.caste;
                    params.caste = (filters.caste === '1' || label === 'Nadar' || label === 'நாடார்') ? 'நாடார்' : label;
                }

            } else {
                if (advFilters.searchId.trim()) params.profile_id = advFilters.searchId.trim();
                
                const gl = resolveToText(advFilters.seeking, genderLabels);
                if (gl) params.gender = gl;
                
                const { ageFrom, ageTo } = normaliseAgeRange(advFilters.ageFrom, advFilters.ageTo);
                params.age_from = ageFrom;
                params.age_to = ageTo;

                // ── ID-based values (Sends the ID/Value) ─────────────────────────
                if (isValidSelection(advFilters.religion)) params.religion = advFilters.religion;
                if (isValidSelection(advFilters.district)) params.district = advFilters.district;
                if (isValidSelection(advFilters.qualification)) params.education = advFilters.qualification;
                if (isValidSelection(advFilters.work)) params.occupation = advFilters.work;
                if (isValidSelection(advFilters.raasi)) params.raasi = advFilters.raasi;
                if (isValidSelection(advFilters.star)) params.star = advFilters.star;
                if (isValidSelection(advFilters.color)) params.complexion = advFilters.color;
                if (isValidSelection(advFilters.nativeDirection)) params.native_direction = advFilters.nativeDirection;

                // ── Text-based labels (Matches LIKE query) ───────────────────────
                if (isValidSelection(advFilters.caste)) {
                    const label = casteLabels[advFilters.caste] || advFilters.caste;
                    params.caste = (advFilters.caste === '1' || label === 'Nadar' || label === 'நாடார்') ? 'நாடார்' : label;
                }
                
                const rawMarital = resolveToText(advFilters.maritalStatus, maritalLabels);
                if (rawMarital) {
                    params.marital_status = rawMarital.split(' (')[0].trim();
                }
                
                if (isValidSelection(advFilters.jewel)) params.jewel = advFilters.jewel;
            }

            const result = await doSearchFetch(params);

            let profiles = Array.isArray(result.data) ? result.data : [];
            
            // Limit to top 50 as requested
            if (profiles.length > 50) {
                profiles = profiles.slice(0, 50);
            }

            // Sort by age
            profiles.sort((a, b) => (parseInt(a.age, 10) || 0) - (parseInt(b.age, 10) || 0));

            if (onSearch) {
                onSearch({
                    mode: searchMode,
                    filters: searchMode === 'normal' ? filters : advFilters,
                    results: profiles,
                    count: Math.min(profiles.length, 50),
                });
            }
        } catch (error) {
            console.error('Search Error:', error);
            if (onSearch) onSearch({ mode: searchMode, results: [], count: 0, error: true });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.searchWrapper}>
            {/* Top Navigation Bar */}
            {isLoggedIn && (
                <View style={styles.topNavBar}>
                    <View style={styles.navLeft}>
                        <TouchableOpacity
                            style={[styles.navTab, searchMode === 'normal' && styles.navTabActive]}
                            onPress={() => setSearchMode('normal')}
                        >
                            <Text style={[styles.navTabText, searchMode === 'normal' && styles.navTabTextActive]}>{t('NORMAL_SEARCH')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.navTab, searchMode === 'advanced' && styles.navTabActive]}
                            onPress={() => setSearchMode('advanced')}
                        >
                            <Text style={[styles.navTabText, searchMode === 'advanced' && styles.navTabTextActive]}>{t('ADVANCED_SEARCH')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {isLoggedIn && <View style={{ height: 1, backgroundColor: '#DDD', marginBottom: 15 }} />}

            <View>
                {searchMode === 'advanced' && (
                    <View style={styles.searchTitleRow}>
                        <Text style={styles.searchWidgetTitle}>{t('ADV_SEARCH_TITLE')}</Text>
                        <Text style={styles.searchWidgetSubtitle}>{t('ADV_SEARCH_SUBTITLE')}</Text>
                    </View>
                )}

                {/* ══════════ NORMAL SEARCH ══════════ */}
                {searchMode === 'normal' && (
                    <View>
                        <Text style={styles.sectionHeaderTitle}>தேடல் விவரங்கள்</Text>
                        <View style={styles.formGrid}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('SEEKING')}</Text>
                                <DropdownSheet
                                    title={t('SEEKING')}
                                    value={filters.lookingFor}
                                    items={genderOptions}
                                    labels={genderLabels}
                                    onSelect={v => updateNormal('lookingFor', v)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('AGE')} (இருந்து)</Text>
                                <DropdownSheet
                                    title={`${t('AGE')} (இருந்து)`}
                                    value={filters.ageFrom}
                                    items={ageOptions}
                                    onSelect={v => { const r = normaliseAgeRange(v, filters.ageTo); setFilters(p => ({ ...p, ...r })); }}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('AGE')} (வரை)</Text>
                                <DropdownSheet
                                    title={`${t('AGE')} (வரை)`}
                                    value={filters.ageTo}
                                    items={ageOptions}
                                    onSelect={v => { const r = normaliseAgeRange(filters.ageFrom, v); setFilters(p => ({ ...p, ...r })); }}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('RELIGION')}</Text>
                                <DropdownSheet
                                    title={t('RELIGION')}
                                    value={filters.religion}
                                    items={religionOptions}
                                    labels={religionLabels}
                                    loading={ddLoading}
                                    onSelect={v => updateNormal('religion', v)}
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('CASTE')}</Text>
                                <DropdownSheet
                                    title={t('CASTE')}
                                    value={filters.caste}
                                    items={casteOptions}
                                    labels={casteLabels}
                                    loading={ddLoading}
                                    onSelect={v => updateNormal('caste', v)}
                                />
                            </View>
                        </View>
                    </View>
                )}

                {/* ══════════ ADVANCED SEARCH ══════════ */}
                {searchMode === 'advanced' && (
                    <View>
                        <Text style={styles.sectionHeaderTitle}>General</Text>
                        <View style={styles.fullWidthInputGroup}>
                            <Text style={styles.label}>{t('SEARCH_BY_ID')}</Text>
                            <TextInput
                                style={styles.textInputBox}
                                placeholder=""
                                value={advFilters.searchId}
                                onChangeText={text => updateAdv('searchId', text)}
                            />
                        </View>
                        <View style={styles.fullWidthInputGroup}>
                            <Text style={styles.label}>{t('SEEKING')} <Text style={{ color: 'red' }}>*</Text></Text>
                            <DropdownSheet title={t('SEEKING')} value={advFilters.seeking} items={genderOptions} labels={genderLabels} onSelect={v => updateAdv('seeking', v)} />
                        </View>
                        <View style={styles.fullWidthInputGroup}>
                            <Text style={styles.label}>{t('AGE')} <Text style={{ color: 'red' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <DropdownSheet title={`${t('AGE')} (From)`} value={advFilters.ageFrom} items={ageOptions} onSelect={handleAgeFromSelect} style={{ flex: 1 }} />
                                <Text>-</Text>
                                <DropdownSheet title={`${t('AGE')} (To)`} value={advFilters.ageTo} items={ageOptions} onSelect={handleAgeToSelect} style={{ flex: 1 }} />
                                <Text style={{ color: '#666' }}>years</Text>
                            </View>
                        </View>
                        <View style={styles.formGrid}>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('MARITAL_STATUS')}</Text>
                                <DropdownSheet title={t('MARITAL_STATUS')} value={advFilters.maritalStatus} items={maritalOptions} labels={maritalLabels} onSelect={v => updateAdv('maritalStatus', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('DISTRICT')}</Text>
                                <DropdownSheet title={t('DISTRICT')} value={advFilters.district} items={districtOptions} labels={districtLabels} loading={ddLoading} onSelect={v => updateAdv('district', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('RELIGION')}</Text>
                                <DropdownSheet title={t('RELIGION')} value={advFilters.religion} items={religionOptions} labels={religionLabels} loading={ddLoading} onSelect={v => updateAdv('religion', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('CASTE')}</Text>
                                <DropdownSheet title={t('CASTE')} value={advFilters.caste} items={casteOptions} labels={casteLabels} loading={ddLoading} onSelect={v => updateAdv('caste', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('NATIVE_DIRECTION')}</Text>
                                <DropdownSheet title={t('NATIVE_DIRECTION')} value={advFilters.nativeDirection} items={directionOptions} labels={directionLabels} onSelect={v => updateAdv('nativeDirection', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('QUALIFICATION')}</Text>
                                <DropdownSheet title={t('QUALIFICATION')} value={advFilters.qualification} items={qualOptions} labels={qualLabels} loading={ddLoading} onSelect={v => updateAdv('qualification', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('WORK')}</Text>
                                <DropdownSheet title={t('WORK')} value={advFilters.work} items={workOptions} labels={workLabels} loading={ddLoading} onSelect={v => updateAdv('work', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('RAASI')}</Text>
                                <DropdownSheet title={t('RAASI')} value={advFilters.raasi} items={rasiOptions} labels={rasiLabels} loading={ddLoading} onSelect={v => { updateAdv('raasi', v); updateAdv('star', ''); }} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('STAR')}</Text>
                                <DropdownSheet title={t('STAR')} value={advFilters.star} items={starOptions} labels={starLabels} loading={ddLoading} onSelect={v => updateAdv('star', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('COLOR')}</Text>
                                <DropdownSheet title={t('COLOR')} value={advFilters.color} items={colorOptions} labels={colorLabels} loading={ddLoading} onSelect={v => updateAdv('color', v)} />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('JEWEL')}</Text>
                                <DropdownSheet title={t('JEWEL')} value={advFilters.jewel} items={jewelOptions} onSelect={v => updateAdv('jewel', v)} />
                            </View>
                        </View>
                    </View>
                )}

                <TouchableOpacity style={styles.searchBtn} activeOpacity={0.8} onPress={handleSearch}>
                    <LinearGradient colors={[COLORS.ctaGradientStart, COLORS.ctaGradientEnd]} style={styles.searchBtnGradient}>
                        {loading
                            ? <ActivityIndicator color={COLORS.white} size="small" />
                            : <Text style={styles.searchBtnText}>{searchMode === 'normal' ? t('SEARCH_BTN') : t('SUBMIT')}</Text>
                        }
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES — unchanged from original
// =============================================================================
const styles = StyleSheet.create({
    searchWrapper: {
        marginHorizontal: 0,
        backgroundColor: '#FDF1DE',
        borderRadius: scale(20),
        padding: scale(20),
        marginBottom: scale(30),
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
    },
    topNavBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 0 },
    navLeft: { flexDirection: 'row' },
    navTab: { backgroundColor: '#EAEAEA', paddingVertical: scale(8), paddingHorizontal: scale(15), marginRight: scale(5), borderTopLeftRadius: scale(5), borderTopRightRadius: scale(5) },
    navTabActive: { backgroundColor: '#DDD' },
    navTabText: { color: '#666', fontSize: moderateScale(12) },
    navTabTextActive: { color: '#333', fontWeight: 'bold' },
    searchTitleRow: { marginBottom: scale(20) },
    searchWidgetTitle: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#B71C1C' },
    searchWidgetSubtitle: { fontSize: moderateScale(14), color: COLORS.textMain, marginTop: scale(5), lineHeight: moderateScale(20) },
    formGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: scale(10) },
    inputGroup: { minWidth: '45%', flex: 1, marginBottom: scale(10) },
    label: { fontSize: moderateScale(14), fontWeight: 'bold', color: COLORS.textMain, marginBottom: scale(6) },
    pickerBox: { backgroundColor: COLORS.white, borderRadius: scale(10), padding: scale(10), flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#EFEFEF', minHeight: 45 },
    pickerText: { color: COLORS.textMain, fontSize: moderateScale(13), flex: 1, marginRight: 4 },
    fullWidthInputGroup: { width: '100%', marginBottom: scale(12) },
    textInputBox: { backgroundColor: COLORS.white, borderRadius: scale(10), padding: scale(12), borderWidth: 1, borderColor: '#EFEFEF', color: '#333', minHeight: 45 },
    sectionHeaderTitle: { fontSize: moderateScale(18), fontWeight: 'bold', color: '#333', marginBottom: scale(10), borderBottomWidth: 1, borderBottomColor: '#DDD', paddingBottom: scale(5), marginTop: scale(10) },
    searchBtn: { marginTop: scale(20), borderRadius: scale(25), overflow: 'hidden' },
    searchBtnGradient: { paddingVertical: scale(14), alignItems: 'center' },
    searchBtnText: { color: COLORS.white, fontWeight: 'bold', fontSize: moderateScale(16) },
});

export default SearchFilter;