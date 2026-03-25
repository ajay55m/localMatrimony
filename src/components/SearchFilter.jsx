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
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, moderateScale } from '../utils/responsive';
import { searchProfiles, getDropdowns } from '../services/profileService';
import { ActivityIndicator } from 'react-native';
import { MARITAL_STATUSES } from '../constants/maritalStatuses';

const { height } = Dimensions.get('window');

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
    value &&
    value.trim() !== '' &&
    !value.startsWith('SELECT_');

// ─────────────────────────────────────────────────────────────
// Helper: validate & normalise age range
// ─────────────────────────────────────────────────────────────
const normaliseAgeRange = (from, to) => {
    let f = Math.max(18, Math.min(90, parseInt(from, 10) || 18));
    let t = Math.max(18, Math.min(90, parseInt(to, 10) || 90));
    if (f > t) [f, t] = [t, f];
    return { ageFrom: String(f), ageTo: String(t) };
};

// =============================================================================
// DropdownSheet — self-contained dropdown with its own open state
// ✅ FIX: Modal lives inside this component so parent re-renders cannot close it
// =============================================================================
const DropdownSheet = ({ title, value, items = [], labels = {}, onSelect, loading = false, style }) => {
    const [open, setOpen] = useState(false);

    const displayLabel = value && !value.startsWith('SELECT_')
        ? (labels[value] || value)
        : '-- தேர்வு --';

    return (
        <>
            <TouchableOpacity
                style={[styles.pickerBox, loading && { opacity: 0.6 }, style]}
                onPress={() => !loading && setOpen(true)}
                activeOpacity={0.75}
            >
                {loading
                    ? <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 6 }} />
                    : null
                }
                <Text
                    style={[styles.pickerText, (!value || value.startsWith('SELECT_')) && { color: '#9CA3AF' }]}
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

    // ── API-powered dropdown state ────────────────────────────────────────────
    const [dropdowns, setDropdowns] = useState({
        castes: [], complexions: [], qualifications: [],
        occupations: [], rasis: [], religions: [], stars: [], districts: [],
    });
    const [ddLoading, setDdLoading] = useState(false);

    useEffect(() => {
        fetchDropdowns();
    }, []);

    const fetchDropdowns = async () => {
        setDdLoading(true);
        try {
            const res = await getDropdowns();
            if (res.status && res.data) {
                setDropdowns({
                    castes: res.data.castes || [],
                    complexions: res.data.complexions || [],
                    qualifications: res.data.qualifications || [],
                    occupations: res.data.occupations || [],
                    rasis: res.data.rasis || [],
                    religions: res.data.religions || [],
                    stars: res.data.stars || [],
                    districts: res.data.districts || [],
                });
            }
        } catch (e) {
            console.error('fetchDropdowns error in SearchFilter:', e);
        } finally {
            setDdLoading(false);
        }
    };

    // ── Normal Filters ──────────────────────────────────────────
    const [filters, setFilters] = useState({
        lookingFor: '', // Changed from 'Female' to empty for broader search
        ageFrom: '18',
        ageTo: '30', // Set back to 30 as requested
        religion: '',
        caste: '',
    });

    // ── Advanced Filters ────────────────────────────────────────
    const [advFilters, setAdvFilters] = useState({
        searchId: '',
        seeking: '', // Changed from 'Female' to empty for broader search
        ageFrom: '18',
        ageTo: '30', // Increased age range for more results
        district: '',
        religion: '',
        caste: '',
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

    const handleAgeToSelect = (val) => {
        const { ageFrom, ageTo } = normaliseAgeRange(advFilters.ageFrom, val);
        setAdvFilters(prev => ({ ...prev, ageFrom, ageTo }));
    };
    const handleAgeFromSelect = (val) => {
        const { ageFrom, ageTo } = normaliseAgeRange(val, advFilters.ageTo);
        setAdvFilters(prev => ({ ...prev, ageFrom, ageTo }));
    };

    // ─────────────────────────────────────────────────────────────
    // Build API payload & call backend
    // ─────────────────────────────────────────────────────────────
    const handleSearch = async () => {
        setLoading(true);
        try {
            const apiPayload = { limit: 50 };

            if (searchMode === 'normal') {
                // Only send gender if it's selected (not empty)
                if (isValidSelection(filters.lookingFor)) {
                    apiPayload.gender = filters.lookingFor;
                }
                const { ageFrom, ageTo } = normaliseAgeRange(filters.ageFrom, filters.ageTo);
                apiPayload.age_from = ageFrom;
                apiPayload.age_to = ageTo;
                if (isValidSelection(filters.religion)) apiPayload.religion = filters.religion;
                if (isValidSelection(filters.caste)) apiPayload.caste = filters.caste;
            } else {
                if (advFilters.searchId.trim()) apiPayload.profile_id = advFilters.searchId.trim();
                // Only send gender if it's selected (not empty)
                if (isValidSelection(advFilters.seeking)) {
                    apiPayload.gender = advFilters.seeking;
                }
                const { ageFrom, ageTo } = normaliseAgeRange(advFilters.ageFrom, advFilters.ageTo);
                apiPayload.age_from = ageFrom;
                apiPayload.age_to = ageTo;
                if (isValidSelection(advFilters.district)) apiPayload.district = advFilters.district;
                if (isValidSelection(advFilters.religion)) apiPayload.religion = advFilters.religion;
                if (isValidSelection(advFilters.caste)) apiPayload.caste = advFilters.caste;
                if (isValidSelection(advFilters.nativeDirection)) apiPayload.native_direction = advFilters.nativeDirection;
                if (isValidSelection(advFilters.qualification)) apiPayload.education = advFilters.qualification;
                if (isValidSelection(advFilters.work)) apiPayload.occupation = advFilters.work;
                if (isValidSelection(advFilters.raasi)) apiPayload.raasi = advFilters.raasi;
                if (isValidSelection(advFilters.star)) apiPayload.star = advFilters.star;
                if (isValidSelection(advFilters.color)) apiPayload.complexion = advFilters.color;
                if (isValidSelection(advFilters.jewel)) apiPayload.jewel = advFilters.jewel;
                if (isValidSelection(advFilters.maritalStatus)) apiPayload.marital_status = advFilters.maritalStatus;
            }

            console.log('Final API Payload:', apiPayload);
            const result = await searchProfiles(apiPayload);

            try {
                if (result.status && Array.isArray(result.data)) {
                    result.data.sort((a, b) => (parseInt(a.age, 10) || 0) - (parseInt(b.age, 10) || 0));
                }
            } catch (sortError) {
                console.warn('Sorting failed:', sortError);
            }

            if (onSearch) {
                onSearch({
                    mode: searchMode,
                    filters: searchMode === 'normal' ? filters : advFilters,
                    results: result.status ? result.data : [],
                    count: result.count || 0,
                });
            }
        } catch (error) {
            console.log('Search Error:', error);
            if (onSearch) onSearch({ mode: searchMode, results: [], count: 0, error: true });
        } finally {
            setLoading(false);
        }
    };

    // ── Option lists ────────────────────────────────────────────
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

    const directionOptions = ['North', 'South', 'East', 'West'];
    const directionLabels = { North: 'வடக்கு', South: 'தெற்கு', East: 'கிழக்கு', West: 'மேற்கு' };

    const maritalOptions = MARITAL_STATUSES.map(m => m.value);
    const maritalLabels = MARITAL_STATUSES.reduce((a, m) => ({ ...a, [m.value]: m.label }), {});

    const jewelOptions = [
        'Below 10 powns', 'Below 20 powns', 'Below 30 Powns', 'Below 40 Powns',
        'Below 50 Powns', 'Below 60 powns', 'Below 75 Powns', 'Below 80 powns',
        'Below 100 Powns', 'below 125 Powns', 'Below 150 Powns', 'Below 200 Pown', 'Above 200 Powns',
    ];

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
                {/* Title — advanced only */}
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
                                    onSelect={v => {
                                        const { ageFrom, ageTo } = normaliseAgeRange(v, filters.ageTo);
                                        setFilters(prev => ({ ...prev, ageFrom, ageTo }));
                                    }}
                                />
                            </View>

                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>{t('AGE')} (வரை)</Text>
                                <DropdownSheet
                                    title={`${t('AGE')} (வரை)`}
                                    value={filters.ageTo}
                                    items={ageOptions}
                                    onSelect={v => {
                                        const { ageFrom, ageTo } = normaliseAgeRange(filters.ageFrom, v);
                                        setFilters(prev => ({ ...prev, ageFrom, ageTo }));
                                    }}
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
                            <DropdownSheet
                                title={t('SEEKING')}
                                value={advFilters.seeking}
                                items={genderOptions}
                                labels={genderLabels}
                                onSelect={v => updateAdv('seeking', v)}
                            />
                        </View>

                        <View style={styles.fullWidthInputGroup}>
                            <Text style={styles.label}>{t('AGE')} <Text style={{ color: 'red' }}>*</Text></Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <DropdownSheet
                                    title={`${t('AGE')} (From)`}
                                    value={advFilters.ageFrom}
                                    items={ageOptions}
                                    onSelect={handleAgeFromSelect}
                                    style={{ flex: 1 }}
                                />
                                <Text>-</Text>
                                <DropdownSheet
                                    title={`${t('AGE')} (To)`}
                                    value={advFilters.ageTo}
                                    items={ageOptions}
                                    onSelect={handleAgeToSelect}
                                    style={{ flex: 1 }}
                                />
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
                    <LinearGradient
                        colors={[COLORS.ctaGradientStart, COLORS.ctaGradientEnd]}
                        style={styles.searchBtnGradient}
                    >
                        {loading ? (
                            <ActivityIndicator color={COLORS.white} size="small" />
                        ) : (
                            <Text style={styles.searchBtnText}>
                                {searchMode === 'normal' ? t('SEARCH_BTN') : t('SUBMIT')}
                            </Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );
};

// =============================================================================
// STYLES — identical to original
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
    topNavBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 0,
    },
    navLeft: {
        flexDirection: 'row',
    },
    navTab: {
        backgroundColor: '#EAEAEA',
        paddingVertical: scale(8),
        paddingHorizontal: scale(15),
        marginRight: scale(5),
        borderTopLeftRadius: scale(5),
        borderTopRightRadius: scale(5),
    },
    navTabActive: {
        backgroundColor: '#DDD',
    },
    navTabText: {
        color: '#666',
        fontSize: moderateScale(12),
    },
    navTabTextActive: {
        color: '#333',
        fontWeight: 'bold',
    },
    searchTitleRow: {
        marginBottom: scale(20),
    },
    searchWidgetTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
        color: '#B71C1C',
    },
    searchWidgetSubtitle: {
        fontSize: moderateScale(14),
        color: COLORS.textMain,
        marginTop: scale(5),
        lineHeight: moderateScale(20),
    },
    formGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: scale(10),
    },
    inputGroup: {
        minWidth: '45%',
        flex: 1,
        marginBottom: scale(10),
    },
    label: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        color: COLORS.textMain,
        marginBottom: scale(6),
    },
    pickerBox: {
        backgroundColor: COLORS.white,
        borderRadius: scale(10),
        padding: scale(10),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EFEFEF',
        minHeight: 45,
    },
    pickerText: {
        color: COLORS.textMain,
        fontSize: moderateScale(13),
        flex: 1,
        marginRight: 4,
    },
    fullWidthInputGroup: {
        width: '100%',
        marginBottom: scale(12),
    },
    textInputBox: {
        backgroundColor: COLORS.white,
        borderRadius: scale(10),
        padding: scale(12),
        borderWidth: 1,
        borderColor: '#EFEFEF',
        color: '#333',
        minHeight: 45,
    },
    sectionHeaderTitle: {
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        color: '#333',
        marginBottom: scale(10),
        borderBottomWidth: 1,
        borderBottomColor: '#DDD',
        paddingBottom: scale(5),
        marginTop: scale(10),
    },
    searchBtn: {
        marginTop: scale(20),
        borderRadius: scale(25),
        overflow: 'hidden',
    },
    searchBtnGradient: {
        paddingVertical: scale(14),
        alignItems: 'center',
    },
    searchBtnText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: moderateScale(16),
    },
});

export default SearchFilter;