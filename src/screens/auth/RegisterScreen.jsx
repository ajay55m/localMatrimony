import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions,
    Modal,
    Animated,
    Image,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import PageHeader from '../../components/PageHeader';
import { MARITAL_STATUSES } from '../../constants/maritalStatuses';
import { DIRECTIONS } from '../../constants/directions';
import { launchImageLibrary } from 'react-native-image-picker';
import { ENDPOINTS } from '../../config/apiConfig';

const { width, height } = Dimensions.get('window');

const isSmall = width < 360;
const H_PAD = isSmall ? 14 : 20;
const BASE_RADIUS = 14;
const INPUT_HEIGHT = isSmall ? 50 : 56;
const FONT_LABEL = isSmall ? 11 : 13;
const FONT_INPUT = isSmall ? 14 : 16;

const API_BASE = ENDPOINTS.REGISTER;

// 500 KB limit — must match PHP $IMAGE_LIMIT_BYTES = 512000
// All images saved to: /adminpanel/matrimony/userphoto/
const MAX_IMAGE_BYTES = 512000;

// ─── DOB / Time picker data ───────────────────────────────────────────────────
const DAYS = Array.from({ length: 31 }, (_, i) => ({ label: String(i + 1).padStart(2, '0'), value: String(i + 1).padStart(2, '0') }));
const MONTHS = [
    { label: '01 - ஜனவரி', value: '01' }, { label: '02 - பிப்ரவரி', value: '02' },
    { label: '03 - மார்ச்', value: '03' }, { label: '04 - ஏப்ரல்', value: '04' },
    { label: '05 - மே', value: '05' }, { label: '06 - ஜூன்', value: '06' },
    { label: '07 - ஜூலை', value: '07' }, { label: '08 - ஆகஸ்ட்', value: '08' },
    { label: '09 - செப்டம்பர்', value: '09' }, { label: '10 - அக்டோபர்', value: '10' },
    { label: '11 - நவம்பர்', value: '11' }, { label: '12 - டிசம்பர்', value: '12' },
];
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 60 }, (_, i) => { const y = currentYear - 18 - i; return { label: String(y), value: String(y) }; });
const HOURS = Array.from({ length: 12 }, (_, i) => ({ label: String(i + 1).padStart(2, '00'), value: String(i + 1).padStart(2, '00') }));
const MINUTES = Array.from({ length: 60 }, (_, i) => ({ label: String(i).padStart(2, '0'), value: String(i).padStart(2, '0') }));
const AM_PM = [{ label: 'AM', value: 'AM' }, { label: 'PM', value: 'PM' }];

// ─── Fixed Pagam values ───────────────────────────────────────────────────────
const PAGAM_ITEMS = [
    { label: '*', value: '*' },
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
];

// =============================================================================
// DOB Modal
// =============================================================================
const DobPicker = ({ visible, day, month, year, onChangeDay, onChangeMonth, onChangeYear, onConfirm, onCancel }) => (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
        <View style={mStyles.overlay}>
            <View style={mStyles.sheet}>
                <View style={mStyles.header}>
                    <TouchableOpacity onPress={onCancel} style={mStyles.headerBtn}><Text style={mStyles.cancelText}>ரத்து</Text></TouchableOpacity>
                    <Text style={mStyles.title}>பிறந்த தேதி</Text>
                    <TouchableOpacity onPress={onConfirm} style={mStyles.headerBtn}><Text style={mStyles.confirmText}>சரி ✓</Text></TouchableOpacity>
                </View>
                <View style={mStyles.row}>
                    <View style={mStyles.col}>
                        <Text style={mStyles.colLabel}>நாள்</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeDay('')}><Text style={[mStyles.scrollItemText, !day && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {DAYS.map(d => <TouchableOpacity key={d.value} style={mStyles.scrollItem} onPress={() => onChangeDay(d.value)}><Text style={[mStyles.scrollItemText, day === d.value && mStyles.scrollItemActive]}>{d.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                    <View style={[mStyles.col, { flex: 1.7 }]}>
                        <Text style={mStyles.colLabel}>மாதம்</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeMonth('')}><Text style={[mStyles.scrollItemText, !month && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {MONTHS.map(m => <TouchableOpacity key={m.value} style={mStyles.scrollItem} onPress={() => onChangeMonth(m.value)}><Text style={[mStyles.scrollItemText, month === m.value && mStyles.scrollItemActive]}>{m.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                    <View style={mStyles.col}>
                        <Text style={mStyles.colLabel}>ஆண்டு</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeYear('')}><Text style={[mStyles.scrollItemText, !year && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {YEARS.map(y => <TouchableOpacity key={y.value} style={mStyles.scrollItem} onPress={() => onChangeYear(y.value)}><Text style={[mStyles.scrollItemText, year === y.value && mStyles.scrollItemActive]}>{y.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </View>
    </Modal>
);

// =============================================================================
// Time Modal
// =============================================================================
const TimePicker = ({ visible, hour, minute, ampm, onChangeHour, onChangeMinute, onChangeAmpm, onConfirm, onCancel }) => (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onCancel}>
        <View style={mStyles.overlay}>
            <View style={mStyles.sheet}>
                <View style={mStyles.header}>
                    <TouchableOpacity onPress={onCancel} style={mStyles.headerBtn}><Text style={mStyles.cancelText}>ரத்து</Text></TouchableOpacity>
                    <Text style={mStyles.title}>பிறந்த நேரம்</Text>
                    <TouchableOpacity onPress={onConfirm} style={mStyles.headerBtn}><Text style={mStyles.confirmText}>சரி ✓</Text></TouchableOpacity>
                </View>
                <View style={mStyles.row}>
                    <View style={mStyles.col}>
                        <Text style={mStyles.colLabel}>மணி</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeHour('')}><Text style={[mStyles.scrollItemText, !hour && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {HOURS.map(h => <TouchableOpacity key={h.value} style={mStyles.scrollItem} onPress={() => onChangeHour(h.value)}><Text style={[mStyles.scrollItemText, hour === h.value && mStyles.scrollItemActive]}>{h.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                    <View style={mStyles.col}>
                        <Text style={mStyles.colLabel}>நிமிடம்</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeMinute('')}><Text style={[mStyles.scrollItemText, !minute && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {MINUTES.map(m => <TouchableOpacity key={m.value} style={mStyles.scrollItem} onPress={() => onChangeMinute(m.value)}><Text style={[mStyles.scrollItemText, minute === m.value && mStyles.scrollItemActive]}>{m.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                    <View style={mStyles.col}>
                        <Text style={mStyles.colLabel}>AM/PM</Text>
                        <ScrollView style={{ height: 180 }} showsVerticalScrollIndicator={false}>
                            <TouchableOpacity style={mStyles.scrollItem} onPress={() => onChangeAmpm('')}><Text style={[mStyles.scrollItemText, !ampm && mStyles.scrollItemActive]}>--</Text></TouchableOpacity>
                            {AM_PM.map(a => <TouchableOpacity key={a.value} style={mStyles.scrollItem} onPress={() => onChangeAmpm(a.value)}><Text style={[mStyles.scrollItemText, ampm === a.value && mStyles.scrollItemActive]}>{a.label}</Text></TouchableOpacity>)}
                        </ScrollView>
                    </View>
                </View>
            </View>
        </View>
    </Modal>
);

const mStyles = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 36 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    headerBtn: { paddingHorizontal: 8, paddingVertical: 4, minWidth: 60 },
    title: { fontSize: 17, fontWeight: '700', color: '#1F2937' },
    cancelText: { fontSize: 15, color: '#6B7280', fontWeight: '600' },
    confirmText: { fontSize: 15, color: '#EC4899', fontWeight: '700', textAlign: 'right' },
    row: { flexDirection: 'row', paddingHorizontal: 8 },
    col: { flex: 1 },
    colLabel: { textAlign: 'center', fontSize: 11, fontWeight: '700', color: '#9CA3AF', marginTop: 14, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5 },
    scrollItem: { paddingVertical: 10, alignItems: 'center' },
    scrollItemText: { fontSize: 14, color: '#374151' },
    scrollItemActive: { color: '#EC4899', fontWeight: '700' },
});

// =============================================================================
// ModernInput
// =============================================================================
const ModernInput = ({
    label, value, onChangeText, placeholder,
    keyboardType = 'default', multiline = false,
    icon, secureTextEntry = false,
    rightIcon = null, onRightIconPress = null,
    editable = true, onPress = null,
}) => {
    const inner = (
        <View style={[
            styles.inputWrapperModern,
            multiline && styles.textAreaWrapperModern,
            !editable && styles.inputDisabled,
        ]}>
            {icon && <Icon name={icon} size={isSmall ? 16 : 20} color="#EC4899" style={styles.inputIconModern} />}
            <TextInput
                style={[styles.textInputModern, multiline && styles.textAreaModern, rightIcon && styles.inputWithRightIcon]}
                placeholder={placeholder}
                value={value}
                onChangeText={onChangeText}
                keyboardType={keyboardType}
                multiline={multiline}
                placeholderTextColor="#9CA3AF"
                secureTextEntry={secureTextEntry}
                editable={editable && !onPress}
                pointerEvents={onPress ? 'none' : 'auto'}
            />
            {rightIcon && (
                <TouchableOpacity onPress={onRightIconPress || onPress} style={styles.rightIconContainer}>
                    <Icon name={rightIcon} size={isSmall ? 16 : 18} color="#6B7280" />
                </TouchableOpacity>
            )}
        </View>
    );
    return (
        <View style={styles.inputContainerModern}>
            <Text style={styles.inputLabelModern}>{label}</Text>
            {onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.85}>{inner}</TouchableOpacity> : inner}
        </View>
    );
};

// =============================================================================
// ModernSelect
// =============================================================================
const ModernSelect = ({ label, value, icon, items = [], onChange = () => { }, loading = false }) => {
    const [open, setOpen] = useState(false);
    const strValue = (value === null || value === undefined) ? '' : String(value);
    const selectedLabel = items.find(it => String(it.value) === strValue)?.label || 'தேர்வு செய்யவும்';
    const isPlaceholder = !strValue;

    return (
        <View style={styles.inputContainerModern}>
            <Text style={styles.inputLabelModern}>{label}</Text>
            <TouchableOpacity
                style={[styles.selectTrigger, loading && { opacity: 0.6 }]}
                onPress={() => !loading && setOpen(true)}
                activeOpacity={0.75}
            >
                {icon && <Icon name={icon} size={isSmall ? 16 : 20} color="#EC4899" style={styles.inputIconModern} />}
                {loading ? (
                    <>
                        <ActivityIndicator size="small" color="#EC4899" style={{ marginRight: 8 }} />
                        <Text style={[styles.selectTriggerText, styles.selectPlaceholder]}>ஏற்றுகிறது...</Text>
                    </>
                ) : (
                    <Text style={[styles.selectTriggerText, isPlaceholder && styles.selectPlaceholder]} numberOfLines={1}>
                        {selectedLabel}
                    </Text>
                )}
                <Icon name="chevron-down" size={18} color="#6B7280" />
            </TouchableOpacity>

            <Modal visible={open} transparent animationType="fade" statusBarTranslucent onRequestClose={() => setOpen(false)}>
                <TouchableOpacity style={selectStyles.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
                    <View style={selectStyles.sheet} onStartShouldSetResponder={() => true}>
                        <View style={selectStyles.sheetHeader}>
                            <Text style={selectStyles.sheetTitle}>{label}</Text>
                            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                <Icon name="close" size={22} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                        <ScrollView style={selectStyles.list} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                            <TouchableOpacity
                                style={[selectStyles.option, !strValue && selectStyles.optionActive]}
                                onPress={() => { onChange(''); setOpen(false); }}
                                activeOpacity={0.7}
                            >
                                <Text style={[selectStyles.optionText, !strValue && selectStyles.optionTextActive]}>தேர்வு செய்யவும்</Text>
                                {!strValue && <Icon name="check" size={16} color="#EC4899" />}
                            </TouchableOpacity>
                            {items.map((item, i) => {
                                const isSelected = String(item.value) === strValue;
                                return (
                                    <TouchableOpacity
                                        key={i}
                                        style={[selectStyles.option, isSelected && selectStyles.optionActive]}
                                        onPress={() => { onChange(item.value); setOpen(false); }}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[selectStyles.optionText, isSelected && selectStyles.optionTextActive]} numberOfLines={2}>
                                            {item.label}
                                        </Text>
                                        {isSelected && <Icon name="check" size={16} color="#EC4899" />}
                                    </TouchableOpacity>
                                );
                            })}
                            <View style={{ height: 24 }} />
                        </ScrollView>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const selectStyles = StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: height * 0.65, paddingBottom: 8 },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    sheetTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', flex: 1, marginRight: 12 },
    list: { paddingHorizontal: 12 },
    option: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 12, marginVertical: 2, borderRadius: 12 },
    optionActive: { backgroundColor: '#FDF2F8' },
    optionText: { fontSize: isSmall ? 14 : 15, color: '#374151', flex: 1, marginRight: 8 },
    optionTextActive: { color: '#EC4899', fontWeight: '700' },
});

// =============================================================================
// PhotoCard
// =============================================================================
const PhotoCard = ({ label, uri, onPick, onRemove }) => (
    <View style={styles.photoCard}>
        {uri ? (
            <>
                <Image source={{ uri }} style={styles.photoPreview} resizeMode="cover" />
                <TouchableOpacity style={styles.photoRemoveBtn} onPress={onRemove}>
                    <Icon name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
            </>
        ) : (
            <TouchableOpacity style={styles.photoPlaceholder} onPress={onPick} activeOpacity={0.75}>
                <Icon name="camera-plus-outline" size={isSmall ? 28 : 34} color="#EC4899" />
                <Text style={styles.photoLabel}>{label}</Text>
            </TouchableOpacity>
        )}
    </View>
);

// =============================================================================
// Counter
// =============================================================================
const Counter = ({ label, value, onChange }) => (
    <View style={styles.sibItem}>
        <Text style={styles.sibLabel}>{label}</Text>
        <View style={styles.counterRow}>
            <TouchableOpacity style={styles.counterBtn} onPress={() => onChange(Math.max(0, parseInt(value || 0) - 1).toString())}>
                <Icon name="minus" size={13} color="#EC4899" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{value}</Text>
            <TouchableOpacity style={styles.counterBtn} onPress={() => onChange((parseInt(value || 0) + 1).toString())}>
                <Icon name="plus" size={13} color="#EC4899" />
            </TouchableOpacity>
        </View>
    </View>
);

// =============================================================================
// MAIN COMPONENT
// =============================================================================
const RegistrationScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();

    const [currentStep, setCurrentStep] = useState(0);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [loading, setLoading] = useState(false);

    // Profile photos (3 slots)
    const [photos, setPhotos] = useState([null, null, null]);

    // Horoscope image — saved as horoscope_image_{tamilId}_{timestamp}_{rand}.jpg
    // Path: /adminpanel/matrimony/userphoto/
    const [horoscopePhoto, setHoroscopePhoto] = useState(null);

    const [dropdowns, setDropdowns] = useState({
        castes: [], complexions: [], qualifications: [],
        occupations: [], rasis: [], religions: [], stars: [], districts: [],
    });
    const [dropdownsLoading, setDropdownsLoading] = useState(false);
    const [dropdownsError, setDropdownsError] = useState(false);

    const [showDobPicker, setShowDobPicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [dobDay, setDobDay] = useState('');
    const [dobMonth, setDobMonth] = useState('');
    const [dobYear, setDobYear] = useState('');
    const [timeHour, setTimeHour] = useState('');
    const [timeMinute, setTimeMinute] = useState('');
    const [timeAmpm, setTimeAmpm] = useState('');

    const otpInputs = useRef([]);
    const slideAnim = useRef(new Animated.Value(height)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const [formData, setFormData] = useState({
        maritalStatus: '0', marriageReason: '', hasChildren: '0', childrenDetails: '',
        name: '', gender: 'Male', motherTongue: 'தமிழ்',
        fatherName: '', motherName: '',
        phone1: '', phone2: '',
        dob: '', birthTime: '', birthPlace: '', nativePlace: '',
        district: '', state: '', city: '',
        religion: '', caste: '', rasi: '', star: '', pagam: '', direction: '',
        gothram: '', familyDeity: '',
        complexion: '', heightFt: '', heightIn: '',
        qualification: '', occupation: '', workPlace: '', income: '', aboutSelf: '',
        brothers: '0', marriedBrothers: '0',
        sisters: '0', marriedSisters: '0',
        expectations: '', email: '',
    });

    useEffect(() => { fetchDropdowns(); }, []);

    const fetchDropdowns = async () => {
        setDropdownsLoading(true);
        setDropdownsError(false);
        try {
            const body = new FormData();
            body.append('action', 'get_dropdowns');
            const res = await fetch(API_BASE, { method: 'POST', body });
            const data = await res.json();
            if (data.status && data.data) {
                setDropdowns({
                    castes: data.data.castes || [],
                    complexions: data.data.complexions || [],
                    qualifications: data.data.qualifications || [],
                    occupations: data.data.occupations || [],
                    rasis: data.data.rasis || [],
                    religions: data.data.religions || [],
                    stars: data.data.stars || [],
                    districts: data.data.districts || [],
                });
            } else {
                setDropdownsError(true);
            }
        } catch (e) {
            console.error('fetchDropdowns error:', e);
            setDropdownsError(true);
        } finally {
            setDropdownsLoading(false);
        }
    };

    useEffect(() => {
        if (currentStep >= 1 && currentStep <= 3) {
            slideAnim.setValue(height);
            fadeAnim.setValue(0);
            Animated.spring(slideAnim, { toValue: 0, friction: 8, tension: 40, useNativeDriver: true }).start();
            Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        } else {
            fadeAnim.setValue(1);
        }
    }, [currentStep]);

    const updateField = (f, v) => setFormData(prev => ({ ...prev, [f]: v }));

    const confirmDob = () => {
        if (dobDay && dobMonth && dobYear) updateField('dob', `${dobDay}-${dobMonth}-${dobYear}`);
        setShowDobPicker(false);
    };
    const confirmTime = () => {
        if (timeHour && timeMinute && timeAmpm) updateField('birthTime', `${timeHour}:${timeMinute} ${timeAmpm}`);
        setShowTimePicker(false);
    };

    const broUnmarried = Math.max(0, parseInt(formData.brothers || 0) - parseInt(formData.marriedBrothers || 0));
    const sisUnmarried = Math.max(0, parseInt(formData.sisters || 0) - parseInt(formData.marriedSisters || 0));

    // ── 500 KB size-checked image picker ─────────────────────────────────────
    // isHoroscope=true  → stores asset in horoscopePhoto state
    // isHoroscope=false → stores asset in photos[index] state
    const pickPhotoWithSizeCheck = (index, isHoroscope = false) => {
        launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, (r) => {
            if (r.didCancel || r.errorCode || !r.assets?.[0]) return;
            const asset = r.assets[0];

            // Client-side 500 KB guard — mirrors PHP pre-check
            if (asset.fileSize && asset.fileSize > MAX_IMAGE_BYTES) {
                Alert.alert(
                    'கோப்பு அளவு அதிகம்',
                    `படத்தின் அளவு 500KB ஐ விட அதிகமாக உள்ளது (${Math.round(asset.fileSize / 1024)}KB).\nசிறிய படத்தை தேர்வு செய்யவும்.`
                );
                return;
            }

            if (isHoroscope) {
                setHoroscopePhoto(asset);
            } else {
                const p = [...photos];
                p[index] = asset;
                setPhotos(p);
            }
        });
    };

    const removePhoto = (i) => { const p = [...photos]; p[i] = null; setPhotos(p); };

    // ── Validation ────────────────────────────────────────────────────────────
    const validateStep1 = () => {
        const req = [
            'name', 'phone1', 'dob', 'fatherName', 'motherName',
            'birthPlace', 'nativePlace', 'state', 'district',
            'religion', 'rasi', 'star',
        ];
        const labels = {
            name: 'பெயர்', phone1: 'கைபேசி எண்', dob: 'பிறந்த தேதி', 
            fatherName: 'தந்தை பெயர்', motherName: 'தாய் பெயர்',
            birthPlace: 'பிறந்த இடம்', nativePlace: 'சொந்த ஊர்', 
            state: 'மாநிலம்', district: 'மாவட்டம்',
            religion: 'மதம்', rasi: 'ராசி', star: 'நட்சத்திரம்'
        };
        const missing = [];
        for (const f of req) {
            if (!formData[f]) missing.push(labels[f]);
        }
        if (formData.star && !formData.pagam) missing.push('பாகம்');

        if (missing.length > 0) {
            Alert.alert('பிழை', `பின்வரும் கட்டாய புலங்களை நிரப்பவும்:\n\n• ${missing.join('\n• ')}`);
            return false;
        }
        if (formData.phone1.length < 10) { Alert.alert('பிழை', 'சரியான கைபேசி எண்ணை உள்ளிடவும்'); return false; }
        return true;
    };

    const validateStep2 = () => {
        const req = ['complexion', 'heightFt', 'qualification', 'occupation', 'income', 'email'];
        const labels = {
            complexion: 'நிறம்', heightFt: 'உயரம்', qualification: 'கல்வியறிவு',
            occupation: 'வேலை', income: 'வருமானம்', email: 'மின்னஞ்சல்'
        };
        const missing = [];
        for (const f of req) {
            if (!formData[f] && formData[f] !== 0) missing.push(labels[f]);
        }
        if (String(formData.maritalStatus) === '3' && !formData.marriageReason) {
            missing.push('காரணம்');
        }

        if (missing.length > 0) {
            Alert.alert('பிழை', `பின்வரும் கட்டாய புலங்களை நிரப்பவும்:\n\n• ${missing.join('\n• ')}`);
            return false;
        }
        if (!formData.email.includes('@')) { Alert.alert('பிழை', 'சரியான மின்னஞ்சல் முகவரியை உள்ளிடவும்'); return false; }
        return true;
    };

    // ── OTP ───────────────────────────────────────────────────────────────────
    const sendOtp = async () => {
        setLoading(true);
        try {
            const body = new FormData();
            body.append('action', 'send_otp');
            body.append('email', formData.email);
            const res = await fetch(API_BASE, { method: 'POST', body });
            const data = await res.json();
            if (data.status === 'success') {
                setShowOtpInput(true);
                setTimeout(() => otpInputs.current[0]?.focus(), 400);
                Alert.alert('OTP அனுப்பப்பட்டது', `${formData.email} க்கு OTP அனுப்பப்பட்டது`);
            } else {
                Alert.alert('பிழை', data.message || 'OTP அனுப்ப முடியவில்லை');
            }
        } catch {
            Alert.alert('பிழை', 'சர்வர் தொடர்பு கொள்ள முடியவில்லை');
        } finally {
            setLoading(false);
        }
    };

    const verifyOtp = async () => {
        const entered = otp.join('');
        if (entered.length < 6) { Alert.alert('பிழை', '6 இலக்க OTP குறியீட்டை உள்ளிடவும்'); return; }
        setLoading(true);
        try {
            const body = new FormData();
            body.append('action', 'verify_otp');
            body.append('email', formData.email);
            body.append('otp', entered);
            const res = await fetch(API_BASE, { method: 'POST', body });
            const data = await res.json();
            if (data.status === 'valid') { setCurrentStep(3); setShowOtpInput(false); }
            else Alert.alert('பிழை', data.message || 'தவறான OTP. மீண்டும் முயற்சிக்கவும்.');
        } catch {
            Alert.alert('பிழை', 'சர்வர் தொடர்பு கொள்ள முடியவில்லை');
        } finally {
            setLoading(false);
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const submitRegistration = async () => {
        if (!photos[0]) { Alert.alert('பிழை', 'குறைந்தது ஒரு புகைப்படம் சேர்க்கவும்'); return; }
        setLoading(true);
        try {
            const body = new FormData();
            body.append('action', 'register');
            body.append('is_app', '1');
            Object.entries(formData).forEach(([k, v]) => body.append(k, v?.toString() ?? ''));
            body.append('num_bro_unmarried', String(broUnmarried));
            body.append('num_sis_unmarried', String(sisUnmarried));

            // Profile photos → /adminpanel/matrimony/userphoto/photo_data{n}_{id}_{ts}.jpg
            photos.forEach((ph, idx) => {
                if (ph) body.append(`photo_data${idx + 1}`, {
                    uri: ph.uri,
                    type: ph.type || 'image/jpeg',
                    name: ph.fileName || `photo_${idx + 1}.jpg`,
                });
            });

            // Horoscope → /adminpanel/matrimony/userphoto/horoscope_image_{id}_{ts}_{rand}.jpg
            if (horoscopePhoto) {
                body.append('horoscope_image', {
                    uri: horoscopePhoto.uri,
                    type: horoscopePhoto.type || 'image/jpeg',
                    name: horoscopePhoto.fileName || 'horoscope.jpg',
                });
            }

            const res = await fetch(API_BASE, { method: 'POST', body });
            const data = await res.json();

            if (data.status) {
                // Show any non-fatal file warnings returned from server
                if (data.file_warnings?.length) {
                    Alert.alert('கோப்பு எச்சரிக்கை', data.file_warnings.join('\n'));
                }
                setCurrentStep(4);
            } else {
                Alert.alert('பதிவு தோல்வி', data.message || 'மீண்டும் முயற்சிக்கவும்');
            }
        } catch (e) {
            console.error(e);
            Alert.alert('பிழை', 'சர்வர் தொடர்பு கொள்ள முடியவில்லை. மீண்டும் முயற்சிக்கவும்.');
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === 1) { if (validateStep1()) setCurrentStep(2); }
        else if (currentStep === 2) { if (!showOtpInput) { if (validateStep2()) await sendOtp(); } else await verifyOtp(); }
        else if (currentStep === 3) await submitRegistration();
    };

    const handleBack = () => {
        if (currentStep === 2 && showOtpInput) { setShowOtpInput(false); setOtp(['', '', '', '', '', '']); }
        else if (currentStep > 1) setCurrentStep(p => p - 1);
        else if (currentStep === 1) setCurrentStep(0);
        else navigation.goBack();
    };

    const handleOtpChange = (i, v) => {
        if (v.length > 1) return;
        const n = [...otp]; n[i] = v; setOtp(n);
        if (v && i < 5) otpInputs.current[i + 1]?.focus();
        if (!v && i > 0) otpInputs.current[i - 1]?.focus();
    };

    // ── Step indicator ────────────────────────────────────────────────────────
    const renderStepIndicator = () => {
        const cur = currentStep === 1 ? 1 : currentStep === 2 ? 2 : 3;
        const labels = ['அடிப்படை', 'வேலை', 'புகைப்படம்'];
        return (
            <View style={styles.stepIndicatorContainer}>
                <View style={styles.stepIndicatorRow}>
                    {[1, 2, 3].map((step, i) => (
                        <React.Fragment key={step}>
                            <View style={[styles.stepCircle, cur >= step && styles.stepCircleActive]}>
                                {cur > step
                                    ? <Icon name="check" size={14} color="#FFF" />
                                    : <Text style={[styles.stepNumber, cur >= step && styles.stepNumberActive]}>{step}</Text>
                                }
                            </View>
                            {i < 2 && <View style={[styles.stepConnector, cur > step && styles.stepConnectorActive]} />}
                        </React.Fragment>
                    ))}
                </View>
                <View style={styles.stepLabelRow}>
                    {labels.map((l, i) => <Text key={i} style={[styles.stepLabel, cur >= i + 1 && styles.stepLabelActive]}>{l}</Text>)}
                </View>
            </View>
        );
    };

    const renderDropdownBanner = () => {
        if (dropdownsLoading) return (
            <View style={styles.dropdownBanner}>
                <ActivityIndicator size="small" color="#EC4899" />
                <Text style={styles.dropdownBannerText}>விவரங்கள் ஏற்றுகிறது...</Text>
            </View>
        );
        if (dropdownsError) return (
            <View style={[styles.dropdownBanner, styles.dropdownBannerError]}>
                <Icon name="alert-circle-outline" size={16} color="#DC2626" />
                <Text style={[styles.dropdownBannerText, { color: '#DC2626' }]}>விவரங்கள் ஏற்றல் தோல்வி — </Text>
                <TouchableOpacity onPress={fetchDropdowns}>
                    <Text style={styles.retryText}>மீண்டும் முயற்சி</Text>
                </TouchableOpacity>
            </View>
        );
        return null;
    };

    // =========================================================================
    // TERMS SCREEN
    // =========================================================================
    const renderTerms = () => (
        <View style={styles.termsContainer}>
            <LinearGradient colors={['#E0F2FE', '#FFFFFF']} style={styles.termsHeaderModern}>
                <Text style={styles.termsTitleModern}>விதிமுறைகள் மற்றும் நிபந்தனைகள்</Text>
            </LinearGradient>
            <ScrollView style={styles.termsContent} showsVerticalScrollIndicator={false}>
                <View style={styles.termsCardModern}>
                    {[
                        'தூத்துக்குடி நாடார்கள் மகமை திருமண தகவல் நிலையம் சேவை செய்யும் நோக்கில் ஆரம்பிக்கப்பட்டுள்ளது. இது வணிக நோக்கத்திற்காக அல்ல.',
                        'இங்கு எடுக்கும் தகவல்களை தவறான முறையில் பயன்படுத்தக் கூடாது.',
                        'புரோக்கர்கள் பதிவு செய்ய கூடாது.',
                        'திருமணம் உறுதியானால் உடனே அலுவலக முகவரிக்கு தெரியப்படுத்தவும்.',
                        'அரசால் அங்கீகரிக்கப்பட்ட போட்டோ அடையாள சான்றிதழ் (Aadhar Card, Voter ID, Postcard Size Photo – Normal / Maxi).',
                        'Original ஜாதகம் புக் முழுவதும் வேண்டும் (பிறந்த நேரம் உட்பட).',
                        'கல்வி சான்றிதழ்கள் (Conversation / Provisional) இரண்டும் சமர்ப்பிக்க வேண்டும்.',
                        'மாற்றுச்சான்றிதழ் (TC Original). Community இல்லையெனில் Community Certificate / 10th / 12th Marksheet Xerox சேர்க்க வேண்டும்.',
                        'அனைத்து ஆவணங்களையும் அலுவலக மின்னஞ்சல் முகவரிக்கு அனுப்ப வேண்டும்.',
                        'மேற்கண்டவற்றில் ஏதேனும் ஒன்று இல்லையெனில் பதிவு ஏற்றுக்கொள்ளப்படாது.',
                        'அதிகபட்சமாக 50 ஜாதகம் எடுத்துக்கொள்ளலாம்.',
                        'பதிவு கட்டணம் ரூ.1000/- (ஆயிரம் ரூபாய்).',
                        'பதிவு கட்டணம் (UPI) மூலம் அனுப்ப வேண்டும்.',
                        'பதிவுக்குப் பின் ஊர் மற்றும் போன் நம்பர் வழங்கப்படும்.',
                    ].map((item, index) => (
                        <View key={index} style={styles.termItemModern}>
                            <View style={styles.termBulletModern}><Text style={styles.termNumberModern}>{index + 1}</Text></View>
                            <Text style={styles.termTextModern}>{item}</Text>
                        </View>
                    ))}
                </View>
            </ScrollView>
            <View style={styles.termsButtonContainer}>
                <TouchableOpacity style={styles.rejectBtnModern} onPress={() => navigation.goBack()}>
                    <Text style={styles.rejectTextModern}>நிராகரி</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptBtnModern} onPress={() => setCurrentStep(1)}>
                    <LinearGradient colors={['#EC4899', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.acceptGradientModern}>
                        <Text style={styles.acceptTextModern}>ஏற்கிறேன்</Text>
                        <Icon name="arrow-right" size={20} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </View>
    );

    // =========================================================================
    // FORM SHEET (Steps 1–3)
    // =========================================================================
    const renderFormSheet = () => (
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: slideAnim }], opacity: fadeAnim }]}>
            <View style={styles.sheetHeader}>
                <View style={styles.sheetHandle} />
                {renderStepIndicator()}
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">

                {/* ══════════ STEP 1: Basic ══════════ */}
                {currentStep === 1 && (
                    <View style={styles.formSection}>
                        <Text style={styles.sectionTitle}>அடிப்படை விவரங்கள்</Text>
                        <Text style={styles.sectionSubtitle}>உங்கள் அடிப்படை தகவல்களை பதிவு செய்யவும்</Text>
                        {renderDropdownBanner()}

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="முழு பெயர் *" value={formData.name} onChangeText={t => updateField('name', t)} placeholder="பெயர்" icon="account" />
                            </View>
                            <View style={styles.formCol}>
                                <ModernSelect label="பாலினம் *" value={formData.gender} icon="gender-male-female"
                                    items={[{ label: 'ஆண் (Male)', value: 'Male' }, { label: 'பெண் (Female)', value: 'Female' }]}
                                    onChange={v => updateField('gender', v)} />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="கைபேசி 1 *" value={formData.phone1} onChangeText={t => updateField('phone1', t)} placeholder="9876543210" keyboardType="phone-pad" icon="phone" />
                            </View>
                            <View style={styles.formCol}>
                                <ModernInput label="கைபேசி 2" value={formData.phone2} onChangeText={t => updateField('phone2', t)} placeholder="9876543210" keyboardType="phone-pad" icon="phone" />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="பிறந்த தேதி *" value={formData.dob} placeholder="DD-MM-YYYY" icon="calendar" editable={false}
                                    onPress={() => setShowDobPicker(true)} rightIcon="chevron-down" onRightIconPress={() => setShowDobPicker(true)} />
                            </View>
                            <View style={styles.formCol}>
                                <ModernInput label="பிறந்த நேரம்" value={formData.birthTime} placeholder="HH:MM" icon="clock-outline" editable={false}
                                    onPress={() => setShowTimePicker(true)} rightIcon="chevron-down" onRightIconPress={() => setShowTimePicker(true)} />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="தந்தை பெயர் *" value={formData.fatherName} onChangeText={t => updateField('fatherName', t)} placeholder="தந்தை பெயர்" icon="account-tie" />
                            </View>
                            <View style={styles.formCol}>
                                <ModernInput label="தாய் பெயர் *" value={formData.motherName} onChangeText={t => updateField('motherName', t)} placeholder="தாய் பெயர்" icon="account-heart" />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="பிறந்த இடம் *" value={formData.birthPlace} onChangeText={t => updateField('birthPlace', t)} placeholder="பிறந்த இடம்" icon="map-marker" />
                            </View>
                            <View style={styles.formCol}>
                                <ModernInput label="பூர்வீக ஊர் *" value={formData.nativePlace} onChangeText={t => updateField('nativePlace', t)} placeholder="சொந்த ஊர்" icon="home-map-marker" />
                            </View>
                        </View>

                        <ModernInput label="மாநிலம் *" value={formData.state} onChangeText={t => updateField('state', t)} placeholder="மாநிலம்" icon="map" />

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernSelect label="மாவட்டம் *" value={formData.district} icon="map-marker-radius"
                                    items={dropdowns.districts} loading={dropdownsLoading}
                                    onChange={v => updateField('district', v)} />
                            </View>
                            <View style={styles.formCol}>
                                <ModernInput label="நகரம்" value={formData.city} icon="city" onChangeText={t => updateField('city', t)} placeholder="நகரம்" />
                            </View>
                        </View>

                        <ModernSelect label="மதம் *" value={formData.religion} icon="church"
                            items={dropdowns.religions} loading={dropdownsLoading}
                            onChange={v => updateField('religion', v)} />

                        <ModernSelect label="சாதி *" value={formData.caste} icon="account-group"
                            items={dropdowns.castes} loading={dropdownsLoading}
                            onChange={v => updateField('caste', v)} />

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernSelect label="ராசி *" value={formData.rasi} icon="moon-full"
                                    items={dropdowns.rasis} loading={dropdownsLoading}
                                    onChange={v => { updateField('rasi', v); updateField('star', ''); updateField('pagam', ''); }} />
                            </View>
                            <View style={styles.formCol}>
                                <ModernSelect label="நட்சத்திரம் *" value={formData.star} icon="star"
                                    items={dropdowns.stars} loading={dropdownsLoading}
                                    onChange={v => { updateField('star', v); updateField('pagam', ''); }} />
                            </View>
                        </View>

                        {/* Pagam — shown with fixed values once a star is selected */}
                        {!!formData.star && (
                            <ModernSelect label="பாகம் *" value={formData.pagam} icon="numeric"
                                items={PAGAM_ITEMS} onChange={v => updateField('pagam', v)} />
                        )}

                        <ModernSelect label="பூர்வீக திசை" value={formData.direction} icon="compass"
                            items={DIRECTIONS || []} onChange={v => updateField('direction', v)} />

                        <View style={styles.formRow}>
                            <View style={styles.formCol}>
                                <ModernInput label="குலதெய்வம்" value={formData.familyDeity} onChangeText={t => updateField('familyDeity', t)} icon="temple-hindu" placeholder="குலதெய்வம்" />
                            </View>
                        </View>
                    </View>
                )}

                {/* ══════════ STEP 2: Work + OTP ══════════ */}
                {currentStep === 2 && (
                    <View style={styles.formSection}>
                        {!showOtpInput ? (
                            <>
                                <Text style={styles.sectionTitle}>வேலை & குடும்பம்</Text>
                                <Text style={styles.sectionSubtitle}>தொழில் மற்றும் குடும்ப விவரங்கள்</Text>
                                {renderDropdownBanner()}

                                <View style={styles.formRow}>
                                    <View style={styles.formCol}>
                                        <ModernSelect label="நிறம் *" value={formData.complexion} icon="palette"
                                            items={dropdowns.complexions} loading={dropdownsLoading}
                                            onChange={v => updateField('complexion', v)} />
                                    </View>
                                    <View style={styles.formCol}>
                                        <View style={styles.inputContainerModern}>
                                            <Text style={styles.inputLabelModern}>உயரம் *</Text>
                                            <View style={styles.heightContainerModern}>
                                                <TextInput style={styles.heightInputModern} placeholder="அடி" value={formData.heightFt} onChangeText={t => updateField('heightFt', t)} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                                                <Text style={styles.heightSlash}>|</Text>
                                                <TextInput style={styles.heightInputModern} placeholder="அங்" value={formData.heightIn} onChangeText={t => updateField('heightIn', t)} keyboardType="numeric" placeholderTextColor="#9CA3AF" />
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.formRow}>
                                    <View style={styles.formCol}>
                                        <ModernSelect label="கல்வி *" value={formData.qualification} icon="school"
                                            items={dropdowns.qualifications} loading={dropdownsLoading}
                                            onChange={v => updateField('qualification', v)} />
                                    </View>
                                    <View style={styles.formCol}>
                                        <ModernSelect label="பணி *" value={formData.occupation} icon="briefcase"
                                            items={dropdowns.occupations} loading={dropdownsLoading}
                                            onChange={v => updateField('occupation', v)} />
                                    </View>
                                </View>

                                <ModernInput label="மாத வருமானம் *" value={formData.income} onChangeText={t => updateField('income', t)} placeholder="₹ ரூபாயில்" keyboardType="numeric" icon="currency-inr" />

                                <ModernSelect label="திருமண நிலை *" value={formData.maritalStatus} icon="ring"
                                    items={MARITAL_STATUSES}
                                    onChange={v => {
                                        updateField('maritalStatus', v);
                                        if (String(v) === '0') {
                                            updateField('marriageReason', '');
                                            updateField('hasChildren', '0');
                                            updateField('childrenDetails', '');
                                        }
                                    }} />

                                {parseInt(formData.maritalStatus || 0) > 0 && (
                                    <View style={styles.marriedCard}>
                                        <Text style={styles.marriedTitle}>முந்தைய திருமண விவரங்கள்</Text>
                                        {String(formData.maritalStatus) === '3' && (
                                            <ModernInput label="காரணம்" value={formData.marriageReason} onChangeText={t => updateField('marriageReason', t)} placeholder="காரணம் குறிப்பிடவும்" multiline icon="text" />
                                        )}
                                        <ModernSelect label="குழந்தைகள்" value={formData.hasChildren} icon="baby-face-outline"
                                            items={[
                                                { label: 'இல்லை', value: '0' }, { label: '1', value: '1' },
                                                { label: '2', value: '2' }, { label: '3', value: '3' },
                                                { label: '4', value: '4' }, { label: '5+', value: '5' },
                                            ]}
                                            onChange={v => { updateField('hasChildren', v); if (String(v) === '0') updateField('childrenDetails', ''); }} />
                                        {parseInt(formData.hasChildren || 0) > 0 && (
                                            <ModernInput label="குழந்தைகள் விவரம்" value={formData.childrenDetails} onChangeText={t => updateField('childrenDetails', t)} placeholder="எ.கா: 1 ஆண் – 5 வயது" multiline icon="note-text" />
                                        )}
                                    </View>
                                )}

                                <View style={styles.siblingsSheetCard}>
                                    <Text style={styles.siblingsTitleSheet}>உடன்பிறப்புகள்</Text>
                                    <View style={styles.sibHeaderRow}>
                                        <Text style={[styles.sibHeader, { flex: 1 }]}> </Text>
                                        <Text style={[styles.sibHeader, { flex: 1, textAlign: 'center' }]}>அண்ணன்/தம்பி</Text>
                                        <Text style={[styles.sibHeader, { flex: 1, textAlign: 'center' }]}>அக்கா/தங்கை</Text>
                                    </View>
                                    <View style={styles.sibGridRow}>
                                        <Text style={styles.sibRowLabel}>மொத்தம்</Text>
                                        <Counter value={formData.brothers} label="" onChange={v => { updateField('brothers', v); const t = parseInt(v || 0), m = parseInt(formData.marriedBrothers || 0); if (m > t) updateField('marriedBrothers', v); }} />
                                        <View style={styles.sibVDivider} />
                                        <Counter value={formData.sisters} label="" onChange={v => { updateField('sisters', v); const t = parseInt(v || 0), m = parseInt(formData.marriedSisters || 0); if (m > t) updateField('marriedSisters', v); }} />
                                    </View>
                                    <View style={styles.sibHDivider} />
                                    <View style={styles.sibGridRow}>
                                        <Text style={styles.sibRowLabel}>திருமணம்</Text>
                                        <Counter value={formData.marriedBrothers} label="" onChange={v => { if (parseInt(v) > parseInt(formData.brothers || 0)) return; updateField('marriedBrothers', v); }} />
                                        <View style={styles.sibVDivider} />
                                        <Counter value={formData.marriedSisters} label="" onChange={v => { if (parseInt(v) > parseInt(formData.sisters || 0)) return; updateField('marriedSisters', v); }} />
                                    </View>
                                    <View style={styles.sibHDivider} />
                                    <View style={styles.sibUnmarriedRow}>
                                        <Icon name="information-outline" size={13} color="#6366F1" />
                                        <Text style={styles.sibUnmarriedText}>
                                            திருமணமாகாதவர்கள்: {broUnmarried} அண்ணன்/தம்பி · {sisUnmarried} அக்கா/தங்கை
                                        </Text>
                                    </View>
                                </View>

                                <ModernInput label="எதிர்பார்ப்புகள்" value={formData.expectations} onChangeText={t => updateField('expectations', t)} placeholder="வரண் எதிர்பார்ப்புகள்" multiline icon="heart-outline" />
                                <ModernInput label="மின்னஞ்சல் *" value={formData.email} onChangeText={t => updateField('email', t)} placeholder="email@example.com" keyboardType="email-address" icon="email" />
                            </>
                        ) : (
                            <View style={styles.otpSection}>
                                <View style={styles.otpIconContainer}><Icon name="shield-check" size={52} color="#EC4899" /></View>
                                <Text style={styles.otpTitleModern}>OTP உறுதிப்படுத்தல்</Text>
                                <Text style={styles.otpSubtitle}>{formData.email} க்கு அனுப்பப்பட்ட{'\n'}6 இலக்க குறியீட்டை உள்ளிடவும்</Text>
                                <View style={styles.otpRowModern}>
                                    {[0, 1, 2, 3, 4, 5].map(i => (
                                        <TextInput key={i} ref={r => (otpInputs.current[i] = r)} style={styles.otpBoxModern}
                                            maxLength={1} keyboardType="number-pad" value={otp[i]}
                                            onChangeText={t => handleOtpChange(i, t)} />
                                    ))}
                                </View>
                                <TouchableOpacity style={styles.resendButton} onPress={() => { setOtp(['', '', '', '', '', '']); sendOtp(); }}>
                                    <Text style={styles.resendText}>குறியீட்டை மீண்டும் அனுப்பு</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* ══════════ STEP 3: Photos + Horoscope ══════════ */}
                {currentStep === 3 && (
                    <View style={styles.formSection}>
                        <View style={styles.passwordHeader}>
                            <View style={styles.passwordIconContainer}>
                                <Icon name="camera-account" size={42} color="#EC4899" />
                            </View>
                            <Text style={styles.sectionTitle}>புகைப்படம் சேர்க்கவும்</Text>
                            <Text style={styles.sectionSubtitle}>3 புகைப்படங்கள் வரை · முதல் புகைப்படம் கட்டாயம் *</Text>
                        </View>

                        {/* Profile photos */}
                        <View style={styles.photoGrid}>
                            {[0, 1, 2].map(i => (
                                <PhotoCard
                                    key={i}
                                    label={`புகைப்படம் ${i + 1}${i === 0 ? ' *' : ''}`}
                                    uri={photos[i]?.uri ?? null}
                                    onPick={() => pickPhotoWithSizeCheck(i, false)}
                                    onRemove={() => removePhoto(i)}
                                />
                            ))}
                        </View>

                        {/* Photo info box — 500KB limit */}
                        <View style={styles.photoInfoBox}>
                            <Icon name="information-outline" size={15} color="#3B82F6" />
                            <Text style={styles.photoInfoText}>
                                JPG / PNG · அதிகபட்சம் 500KB · முதல் புகைப்படம் சுயவிவரத்தில் காட்டப்படும்
                            </Text>
                        </View>

                        {/* ── Horoscope image ────────────────────────────────── */}
                        {/* Saved to: /adminpanel/matrimony/userphoto/horoscope_image_{id}_{ts}_{rand}.jpg */}
                        <View style={styles.horoscopeSection}>
                            <View style={styles.horoscopeLabelRow}>
                                <Icon name="book-open-variant" size={17} color="#7C3AED" />
                                <Text style={styles.horoscopeSectionTitle}>ஜாதக படம் (விரும்பினால்)</Text>
                            </View>
                            <Text style={styles.horoscopeSectionSubtitle}>
                                ஜாதக புத்தகத்தின் புகைப்படம் · அதிகபட்சம் 500KB · JPG / PNG
                            </Text>

                            {horoscopePhoto ? (
                                <View style={styles.horoscopePreviewContainer}>
                                    <Image
                                        source={{ uri: horoscopePhoto.uri }}
                                        style={styles.horoscopePreview}
                                        resizeMode="contain"
                                    />
                                    <TouchableOpacity
                                        style={styles.horoscopeRemoveBtn}
                                        onPress={() => setHoroscopePhoto(null)}
                                    >
                                        <Icon name="close-circle" size={26} color="#EF4444" />
                                    </TouchableOpacity>
                                    <View style={styles.horoscopeFileMeta}>
                                        <Icon name="check-circle" size={13} color="#10B981" />
                                        <Text style={styles.horoscopeFileMetaText}>
                                            {horoscopePhoto.fileName || 'horoscope.jpg'}
                                            {horoscopePhoto.fileSize ? `  ·  ${Math.round(horoscopePhoto.fileSize / 1024)}KB` : ''}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <TouchableOpacity
                                    style={styles.horoscopePicker}
                                    onPress={() => pickPhotoWithSizeCheck(0, true)}
                                    activeOpacity={0.75}
                                >
                                    <Icon name="upload" size={28} color="#7C3AED" />
                                    <Text style={styles.horoscopePickerText}>ஜாதக படம் தேர்வு செய்யவும்</Text>
                                    <Text style={styles.horoscopePickerSub}>அதிகபட்சம் 500KB · JPG / PNG</Text>
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Auto-password note */}
                        <View style={styles.autoPassBox}>
                            <Icon name="lock-check-outline" size={17} color="#10B981" />
                            <Text style={styles.autoPassText}>
                                கடவுச்சொல் தானாக உருவாக்கப்பட்டு உங்கள் மின்னஞ்சலுக்கு அனுப்பப்படும்
                            </Text>
                        </View>
                    </View>
                )}

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* Footer */}
            <View style={[styles.sheetFooter, { paddingBottom: Math.max(insets.bottom, 14) + 4 }]}>
                {currentStep > 1 && (
                    <TouchableOpacity style={styles.backBtnSheet} onPress={handleBack}>
                        <Icon name="arrow-left" size={20} color="#6B7280" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.nextBtnSheet, loading && { opacity: 0.7 }]} onPress={handleNext} disabled={loading}>
                    <LinearGradient colors={['#EC4899', '#BE185D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.nextGradientSheet}>
                        {loading ? <ActivityIndicator color="#FFF" /> : (
                            <>
                                <Text style={styles.nextTextSheet}>
                                    {currentStep === 3 ? 'பதிவு செய்' : currentStep === 2 && showOtpInput ? 'சரிபார்' : currentStep === 2 ? 'OTP அனுப்பு' : 'தொடர்ந்து செல்'}
                                </Text>
                                <Icon name={currentStep === 3 ? 'check-circle' : showOtpInput ? 'shield-check' : 'arrow-right'} size={20} color="#FFF" />
                            </>
                        )}
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    // =========================================================================
    // SUCCESS SCREEN
    // =========================================================================
    const renderSuccess = () => (
        <View style={styles.successContainerModern}>
            <Animated.View style={[styles.successCardModern, { opacity: fadeAnim }]}>
                <Icon name="check-circle" size={68} color="#10B981" style={{ marginBottom: 18 }} />
                <Text style={styles.successTitleModern}>பதிவு முடிந்தது!</Text>
                <Text style={styles.successDescModern}>
                    உங்கள் விவரங்கள் சேமிக்கப்பட்டன.{'\n'}
                    கடவுச்சொல் உங்கள் மின்னஞ்சலுக்கு அனுப்பப்பட்டது.{'\n'}
                    நிர்வாகி சரிபார்த்த பிறகு தகவல் அனுப்பப்படும்.
                </Text>
                <View style={styles.summaryBoxModern}>
                    {[
                        { icon: 'account', text: formData.name },
                        { icon: 'phone', text: formData.phone1 },
                        { icon: 'email', text: formData.email },
                        { icon: 'lock-check', text: 'கடவுச்சொல் மின்னஞ்சலில் அனுப்பப்பட்டது', color: '#10B981' },
                    ].map((item, i) => (
                        <View key={i} style={styles.summaryItemModern}>
                            <Icon name={item.icon} size={17} color={item.color || '#EC4899'} />
                            <Text style={[styles.summaryTextModern, item.color && { color: item.color }]}>{item.text}</Text>
                        </View>
                    ))}
                </View>
                <TouchableOpacity style={styles.doneBtnModern} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main', params: { initialTab: 'HOME' } }] })}>
                    <LinearGradient colors={['#10B981', '#059669']} style={styles.doneGradientModern}>
                        <Text style={styles.doneTextModern}>முடிக்க</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );

    // =========================================================================
    // RENDER
    // =========================================================================
    return (
        <View style={styles.containerModern}>
            <PageHeader
                title={currentStep === 4 ? 'பதிவு முடிந்தது' : 'Registration'}
                onBack={currentStep === 4 ? null : handleBack}
                backIcon={currentStep === 0 ? 'close' : 'arrow-left'}
            />
            <View style={styles.contentArea}>
                {currentStep === 0 && renderTerms()}
                {(currentStep === 1 || currentStep === 2 || currentStep === 3) && renderFormSheet()}
                {currentStep === 4 && renderSuccess()}
            </View>

            <DobPicker
                visible={showDobPicker} day={dobDay} month={dobMonth} year={dobYear}
                onChangeDay={setDobDay} onChangeMonth={setDobMonth} onChangeYear={setDobYear}
                onConfirm={confirmDob} onCancel={() => setShowDobPicker(false)}
            />
            <TimePicker
                visible={showTimePicker} hour={timeHour} minute={timeMinute} ampm={timeAmpm}
                onChangeHour={setTimeHour} onChangeMinute={setTimeMinute} onChangeAmpm={setTimeAmpm}
                onConfirm={confirmTime} onCancel={() => setShowTimePicker(false)}
            />
        </View>
    );
};

// =============================================================================
// STYLES
// =============================================================================
const styles = StyleSheet.create({
    containerModern: { flex: 1, backgroundColor: '#F0F9FF' },
    contentArea: { flex: 1, overflow: 'hidden' },

    // Terms
    termsContainer: { flex: 1 },
    termsHeaderModern: { paddingVertical: 10, alignItems: 'center', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
    termsTitleModern: { fontSize: isSmall ? 18 : 22, fontWeight: '800', color: '#1F2937', textAlign: 'center', paddingHorizontal: 12 },
    termsContent: { flex: 1, marginTop: 16, paddingHorizontal: H_PAD },
    termsCardModern: { backgroundColor: '#FFF', borderRadius: 20, padding: isSmall ? 16 : 22, elevation: 3 },
    termItemModern: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
    termBulletModern: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginRight: 10, marginTop: 2, flexShrink: 0 },
    termNumberModern: { color: '#EC4899', fontSize: 11, fontWeight: '800' },
    termTextModern: { flex: 1, fontSize: isSmall ? 13 : 14, color: '#4B5563', lineHeight: 21 },
    termsButtonContainer: { flexDirection: 'row', padding: H_PAD, gap: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E5E7EB' },
    rejectBtnModern: { flex: 1, paddingVertical: 14, borderRadius: BASE_RADIUS, backgroundColor: '#F3F4F6', alignItems: 'center' },
    rejectTextModern: { color: '#6B7280', fontSize: isSmall ? 14 : 16, fontWeight: '700' },
    acceptBtnModern: { flex: 2, borderRadius: BASE_RADIUS, overflow: 'hidden', elevation: 3 },
    acceptGradientModern: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 8 },
    acceptTextModern: { color: '#FFF', fontSize: isSmall ? 14 : 16, fontWeight: '700' },

    bottomSheet: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, elevation: 8 },
    sheetHeader: { alignItems: 'center', paddingTop: 14, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
    sheetHandle: { width: 36, height: 4, backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 14 },
    sheetContent: { paddingHorizontal: H_PAD, paddingTop: 8 },

    // Step indicator
    stepIndicatorContainer: { width: '100%', paddingHorizontal: isSmall ? 20 : 32 },
    stepIndicatorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    stepCircle: { width: isSmall ? 30 : 36, height: isSmall ? 30 : 36, borderRadius: 18, backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' },
    stepCircleActive: { backgroundColor: '#EC4899' },
    stepNumber: { fontSize: isSmall ? 12 : 14, fontWeight: '700', color: '#9CA3AF' },
    stepNumberActive: { color: '#FFF' },
    stepConnector: { flex: 1, height: 2, backgroundColor: '#E5E7EB', marginHorizontal: 6 },
    stepConnectorActive: { backgroundColor: '#EC4899' },
    stepLabelRow: { flexDirection: 'row' },
    stepLabel: { fontSize: isSmall ? 10 : 12, color: '#9CA3AF', fontWeight: '600', flex: 1, textAlign: 'center' },
    stepLabelActive: { color: '#EC4899' },

    // Form layout
    formSection: { marginTop: 8 },
    sectionTitle: { fontSize: isSmall ? 20 : 24, fontWeight: '800', color: '#1F2937', marginBottom: 4, textAlign: 'center' },
    sectionSubtitle: { fontSize: isSmall ? 12 : 14, color: '#6B7280', marginBottom: 20, textAlign: 'center', lineHeight: 20 },
    formRow: { flexDirection: 'row', gap: isSmall ? 8 : 12 },
    formCol: { flex: 1, minWidth: 0 },

    // Inputs
    inputContainerModern: { marginBottom: isSmall ? 12 : 16 },
    inputLabelModern: { fontSize: FONT_LABEL, fontWeight: '600', color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 },
    inputWrapperModern: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: BASE_RADIUS, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: isSmall ? 10 : 14, height: INPUT_HEIGHT },
    inputDisabled: { backgroundColor: '#F3F4F6' },
    textAreaWrapperModern: { height: 96, alignItems: 'flex-start', paddingTop: 10 },
    inputIconModern: { marginRight: isSmall ? 8 : 10 },
    textInputModern: { flex: 1, fontSize: FONT_INPUT, color: '#1F2937', fontWeight: '500' },
    textAreaModern: { height: 72, textAlignVertical: 'top' },
    inputWithRightIcon: { paddingRight: 36 },
    rightIconContainer: { position: 'absolute', right: 12, height: INPUT_HEIGHT, justifyContent: 'center' },
    selectTrigger: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: BASE_RADIUS, borderWidth: 1.5, borderColor: '#E5E7EB', paddingHorizontal: isSmall ? 10 : 14, height: INPUT_HEIGHT, gap: isSmall ? 8 : 10 },
    selectTriggerText: { flex: 1, fontSize: FONT_INPUT, color: '#1F2937', fontWeight: '500' },
    selectPlaceholder: { color: '#9CA3AF', fontWeight: '400' },

    // Height
    heightContainerModern: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: BASE_RADIUS, borderWidth: 1.5, borderColor: '#E5E7EB', height: INPUT_HEIGHT, paddingHorizontal: 8 },
    heightInputModern: { flex: 1, textAlign: 'center', fontSize: FONT_INPUT, fontWeight: '600', color: '#1F2937' },
    heightSlash: { color: '#D1D5DB', fontSize: 18, marginHorizontal: 4 },

    // Siblings
    siblingsSheetCard: { backgroundColor: '#F9FAFB', borderRadius: 18, padding: isSmall ? 12 : 16, marginBottom: 16, borderWidth: 1.5, borderColor: '#E5E7EB' },
    siblingsTitleSheet: { fontSize: isSmall ? 13 : 15, fontWeight: '700', color: '#374151', marginBottom: 12 },
    sibHeaderRow: { flexDirection: 'row', marginBottom: 8, alignItems: 'center' },
    sibHeader: { fontSize: isSmall ? 10 : 12, fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: 0.3 },
    sibGridRow: { flexDirection: 'row', alignItems: 'center' },
    sibRowLabel: { width: isSmall ? 68 : 80, fontSize: isSmall ? 11 : 12, color: '#374151', fontWeight: '600' },
    sibVDivider: { width: 1, height: 40, backgroundColor: '#E5E7EB', marginHorizontal: isSmall ? 6 : 10 },
    sibHDivider: { height: 1, backgroundColor: '#E5E7EB', marginVertical: 10 },
    sibItem: { flex: 1, alignItems: 'center' },
    sibLabel: { fontSize: isSmall ? 11 : 12, color: '#6B7280', marginBottom: 8, textAlign: 'center' },
    counterRow: { flexDirection: 'row', alignItems: 'center', gap: isSmall ? 8 : 12 },
    counterBtn: { width: isSmall ? 28 : 32, height: isSmall ? 28 : 32, borderRadius: 9, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center' },
    counterValue: { fontSize: isSmall ? 16 : 18, fontWeight: '700', color: '#1F2937', minWidth: 22, textAlign: 'center' },
    sibUnmarriedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EEF2FF', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginTop: 4 },
    sibUnmarriedText: { flex: 1, fontSize: isSmall ? 11 : 12, color: '#4F46E5', lineHeight: 17 },

    // OTP
    otpSection: { alignItems: 'center', paddingVertical: 20 },
    otpIconContainer: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
    otpTitleModern: { fontSize: isSmall ? 20 : 24, fontWeight: '800', color: '#1F2937', marginBottom: 8, textAlign: 'center' },
    otpSubtitle: { fontSize: isSmall ? 12 : 14, color: '#6B7280', marginBottom: 28, textAlign: 'center', paddingHorizontal: 12, lineHeight: 21 },
    otpRowModern: { flexDirection: 'row', justifyContent: 'center', gap: isSmall ? 5 : 8, marginBottom: 20 },
    otpBoxModern: { width: isSmall ? 40 : 46, height: isSmall ? 52 : 58, borderRadius: 12, backgroundColor: '#F9FAFB', borderWidth: 2, borderColor: '#E5E7EB', textAlign: 'center', fontSize: isSmall ? 18 : 22, fontWeight: '700', color: '#1F2937', elevation: 2 },
    resendButton: { marginTop: 6 },
    resendText: { color: '#EC4899', fontSize: isSmall ? 13 : 14, fontWeight: '600' },

    // Photos
    passwordHeader: { alignItems: 'center', marginBottom: 22 },
    passwordIconContainer: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#EDE9FE', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    photoGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: isSmall ? 8 : 12 },
    photoCard: { flex: 1, aspectRatio: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F3F4F6', borderWidth: 1.5, borderColor: '#E5E7EB' },
    photoPreview: { width: '100%', height: '100%' },
    photoRemoveBtn: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FFF', borderRadius: 12 },
    photoPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6, padding: 6 },
    photoLabel: { fontSize: isSmall ? 9 : 11, color: '#6B7280', textAlign: 'center', fontWeight: '600' },
    photoInfoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#EFF6FF', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#BFDBFE' },
    photoInfoText: { flex: 1, fontSize: isSmall ? 11 : 12, color: '#1D4ED8', lineHeight: 18 },
    autoPassBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#BBF7D0' },
    autoPassText: { flex: 1, fontSize: isSmall ? 11 : 13, color: '#166534', lineHeight: 19, fontWeight: '500' },

    // ── Horoscope image ────────────────────────────────────────────────────────
    // Server save path: /adminpanel/matrimony/userphoto/horoscope_image_{tamilId}_{ts}_{rand}.jpg
    horoscopeSection: {
        backgroundColor: '#F5F3FF',
        borderRadius: 16,
        padding: isSmall ? 14 : 18,
        marginBottom: 14,
        borderWidth: 1.5,
        borderColor: '#DDD6FE',
    },
    horoscopeLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    horoscopeSectionTitle: {
        fontSize: isSmall ? 13 : 15,
        fontWeight: '700',
        color: '#5B21B6',
    },
    horoscopeSectionSubtitle: {
        fontSize: isSmall ? 11 : 12,
        color: '#7C3AED',
        marginBottom: 12,
        lineHeight: 18,
    },
    horoscopePicker: {
        borderWidth: 2,
        borderColor: '#C4B5FD',
        borderStyle: 'dashed',
        borderRadius: 14,
        paddingVertical: isSmall ? 22 : 28,
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#EDE9FE',
    },
    horoscopePickerText: {
        fontSize: isSmall ? 13 : 15,
        fontWeight: '700',
        color: '#6D28D9',
    },
    horoscopePickerSub: {
        fontSize: isSmall ? 10 : 12,
        color: '#8B5CF6',
        fontWeight: '500',
    },
    horoscopePreviewContainer: {
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#C4B5FD',
    },
    horoscopePreview: {
        width: '100%',
        height: isSmall ? 160 : 200,
        borderRadius: 12,
    },
    horoscopeRemoveBtn: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: '#FFF',
        borderRadius: 13,
    },
    horoscopeFileMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 10,
        backgroundColor: '#F0FDF4',
    },
    horoscopeFileMetaText: {
        fontSize: 11,
        color: '#166534',
        fontWeight: '600',
        flex: 1,
    },

    // Footer
    sheetFooter: { flexDirection: 'row', paddingHorizontal: H_PAD, paddingTop: 14, gap: 10, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#F3F4F6' },
    backBtnSheet: { width: 54, height: 54, borderRadius: BASE_RADIUS, backgroundColor: '#F3F4F6', justifyContent: 'center', alignItems: 'center' },
    nextBtnSheet: { flex: 1, borderRadius: BASE_RADIUS, overflow: 'hidden', elevation: 3 },
    nextGradientSheet: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 54, gap: 8 },
    nextTextSheet: { color: '#FFF', fontSize: isSmall ? 15 : 17, fontWeight: '700' },

    // Success
    successContainerModern: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: H_PAD },
    successCardModern: { backgroundColor: '#FFF', borderRadius: 28, padding: isSmall ? 28 : 36, alignItems: 'center', width: '100%', elevation: 8 },
    successTitleModern: { fontSize: isSmall ? 22 : 26, fontWeight: '800', color: '#1F2937', marginBottom: 12 },
    successDescModern: { fontSize: isSmall ? 13 : 15, color: '#6B7280', textAlign: 'center', lineHeight: 23, marginBottom: 20 },
    summaryBoxModern: { backgroundColor: '#F9FAFB', borderRadius: 14, padding: 18, width: '100%', marginBottom: 20, gap: 12 },
    summaryItemModern: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryTextModern: { fontSize: isSmall ? 13 : 15, color: '#1F2937', fontWeight: '600', flex: 1 },
    doneBtnModern: { width: '100%', borderRadius: BASE_RADIUS, overflow: 'hidden' },
    doneGradientModern: { paddingVertical: 16, alignItems: 'center' },
    doneTextModern: { color: '#FFF', fontSize: isSmall ? 16 : 18, fontWeight: '700' },

    // Married
    marriedCard: { backgroundColor: '#FFF5F7', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FBCFE8' },
    marriedTitle: { fontSize: isSmall ? 13 : 15, fontWeight: '700', marginBottom: 12, color: '#BE185D' },

    // Dropdown banner
    dropdownBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F0F9FF', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: '#BAE6FD' },
    dropdownBannerError: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
    dropdownBannerText: { fontSize: 12, color: '#0369A1', fontWeight: '600' },
    retryText: { fontSize: 12, color: '#DC2626', fontWeight: '700', textDecorationLine: 'underline' },
});

export default RegistrationScreen;