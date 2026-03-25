import React, { useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Linking,
    Platform,
    Modal,
    TextInput,
    Alert,
    KeyboardAvoidingView,
    Dimensions,
    StatusBar,
    Image,
} from 'react-native';
import { getSession, clearSession, isLoggedIn as checkSession, KEYS } from '../../utils/session';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

// Footer Component
import Footer from '../../components/Footer';
import SidebarMenu from '../../components/SidebarMenu';
import Skeleton from '../../components/Skeleton';
import PageHeader from '../../components/PageHeader';

// Translations
import { TRANSLATIONS } from '../../constants/translations';

const { width } = Dimensions.get('window');

// ContactCard component moved outside to prevent hook issues
const ContactCard = ({ icon, label, value, onPress, actionIcon, actionColor }) => (
    <TouchableOpacity
        style={styles.contactCard}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.iconCircle}>
            <Icon name={icon} size={22} color="#ef0d8d" />
        </View>
        <View style={styles.contactTextContainer}>
            <Text style={styles.contactLabel}>{label}</Text>
            <Text style={styles.contactValue}>{value}</Text>
        </View>
        {actionIcon && (
            <View style={[styles.actionIcon, { backgroundColor: actionColor + '20' }]}>
                <Icon name={actionIcon} size={18} color={actionColor} />
            </View>
        )}
    </TouchableOpacity>
);

const ContactScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState({
        name: '',
        email: '',
        city: '',
        state: '',
        country: '',
        phone: '',
        requirement: '',
    });
    const [errors, setErrors] = useState({});

    // Login State
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [menuVisible, setMenuVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [userGender, setUserGender] = useState('Male');

    // Fixed Tamil Language
    const lang = 'ta';
    const t = (key) => TRANSLATIONS[lang][key] || key;

    useEffect(() => {
        checkLoginStatus();
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);
        return () => clearTimeout(timer);
    }, []);

    const checkLoginStatus = async () => {
        try {
            const loggedIn = await checkSession();
            setIsLoggedIn(loggedIn);
            if (loggedIn) {
                const ud = await getSession(KEYS.USER_DATA);
                setUserGender(ud?.gender || 'Male');
            }
        } catch (e) {
            console.error('Failed to load session', e);
        }
    };

    const handleFooterNavigation = (tab) => {
        if (tab === 'HOME') {
            navigation.navigate('Main', { initialTab: 'HOME' });
        } else if (tab === 'CONTACT') {
            // Already here
        } else if (tab === 'SEARCH') {
            navigation.navigate('Search');
        } else if (tab === 'PROFILE') {
            navigation.navigate('Profiles');
        }
    };

    const handleLogout = async () => {
        try {
            await clearSession();
            setIsLoggedIn(false);
            setMenuVisible(false); // Close menu
            navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
        } catch (e) {
            console.error('Logout error', e);
        }
    };

    const validateForm = () => {
        const newErrors = {};
        if (!form.name.trim()) newErrors.name = true;
        if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) newErrors.email = true;
        if (!form.phone.trim() || form.phone.length < 10) newErrors.phone = true;
        if (!form.requirement.trim()) newErrors.requirement = true;

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCall = useCallback((phoneNumber) => {
        Linking.openURL(`tel:${phoneNumber}`);
    }, []);

    const handleEmail = useCallback((email) => {
        Linking.openURL(`mailto:${email}`);
    }, []);

    const handleLocation = useCallback(() => {
        const address = '72, டூவிபுரம் மெயின் ரோடு, தூத்துக்குடி-628003';
        const url = Platform.select({
            ios: `maps:0,0?q=${encodeURIComponent(address)}`,
            android: `geo:0,0?q=${encodeURIComponent(address)}`,
        });
        Linking.openURL(url);
    }, []);

    const handleSubmit = () => {
        if (!validateForm()) {
            Alert.alert('தவறு', 'Fill the form correctly');
            return;
        }

        // Simulate API call
        setTimeout(() => {
            Alert.alert('வெற்றி', 'Submitted successfully');
            setShowForm(false);
            setForm({
                name: '',
                email: '',
                city: '',
                state: '',
                country: '',
                phone: '',
                requirement: '',
            });
            setErrors({});
        }, 500);
    };

    const updateField = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: false }));
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            {/* Header */}
            <PageHeader
                title={t('CONTACT_US')}
                onBack={() => navigation.navigate('Main', { initialTab: 'HOME' })}
                icon="phone-classic"
                rightComponent={
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {isLoggedIn && (
                            <TouchableOpacity onPress={() => navigation.navigate('Main', { initialTab: 'HOME' })}>
                                <Image
                                    source={userGender?.toLowerCase() === 'female' || userGender === 'பெண்' ? require('../../assets/images/avatar_female.jpg') : require('../../assets/images/avatar_male.jpg')}
                                    style={{ width: 35, height: 35, borderRadius: 17.5, borderWidth: 1.5, borderColor: '#fff' }}
                                />
                            </TouchableOpacity>
                        )}
                        <TouchableOpacity onPress={() => setMenuVisible(true)}>
                            <Icon name="menu" size={28} color="#ad0761" />
                        </TouchableOpacity>
                    </View>
                }
            />

            {isLoading ? (
                <Skeleton type="Contact" />
            ) : (
                <>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Office Header Card */}
                        <View style={styles.officeCard}>
                            <View style={styles.officeIconContainer}>
                                <Icon name="office-building" size={32} color="#ef0d8d" />
                            </View>
                            <Text style={styles.officeName}>
                                தூத்துக்குடி நாடார்கள் மகமை{'\n'}
                                <Text style={styles.subtitle}>திருமண தகவல் மையம்</Text>
                            </Text>
                        </View>

                        {/* Contact Details */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>தொடர்பு விவரங்கள்</Text>

                            <ContactCard
                                icon="map-marker"
                                label="முகவரி"
                                value="72, டூவிபுரம் மெயின் ரோடு, தூத்துக்குடி-628003"
                                onPress={handleLocation}
                                actionIcon="navigation-variant"
                                actionColor="#E74C3C"
                            />

                            <ContactCard
                                icon="phone"
                                label="தொலைபேசி"
                                value="0461 - 2320814"
                                onPress={() => handleCall('04612320814')}
                                actionIcon="phone-outgoing"
                                actionColor="#27AE60"
                            />

                            <ContactCard
                                icon="cellphone"
                                label="மொபைல்"
                                value="+91 9003990272"
                                onPress={() => handleCall('+919003990272')}
                                actionIcon="phone-outgoing"
                                actionColor="#27AE60"
                            />

                            <ContactCard
                                icon="email"
                                label="மின்னஞ்சல்"
                                value="nadarmahamai@gmail.com"
                                onPress={() => handleEmail('nadarmahamai@gmail.com')}
                                actionIcon="email-send"
                                actionColor="#3498DB"
                            />
                        </View>

                        {/* Working Hours */}
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>அலுவலக நேரம்</Text>
                            <View style={styles.hoursCard}>
                                <View style={styles.timeRow}>
                                    <View style={styles.timeDot} />
                                    <View>
                                        <Text style={styles.timeLabel}>காலை</Text>
                                        <Text style={styles.timeValue}>09:30 AM - 01:30 PM</Text>
                                    </View>
                                </View>
                                <View style={styles.divider} />
                                <View style={styles.timeRow}>
                                    <View style={styles.timeDot} />
                                    <View>
                                        <Text style={styles.timeLabel}>மாலை</Text>
                                        <Text style={styles.timeValue}>03:00 PM - 06:30 PM</Text>
                                    </View>
                                </View>
                                <View style={styles.badge}>
                                    <Icon name="calendar-remove" size={14} color="#FFF" />
                                    <Text style={styles.badgeText}>ஞாயிறு விடுமுறை</Text>
                                </View>
                            </View>
                        </View>

                        {/* Quick Actions */}
                        <View style={styles.actionContainer}>
                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#27AE60' }]}
                                onPress={() => handleCall('+919003990272')}
                            >
                                <Icon name="phone" size={20} color="#FFF" />
                                <Text style={styles.actionBtnText}>அழைக்க</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.actionBtn, { backgroundColor: '#3498DB' }]}
                                onPress={() => setShowForm(true)}
                            >
                                <Icon name="clipboard-text" size={20} color="#FFF" />
                                <Text style={styles.actionBtnText}>விசாரணை</Text>
                            </TouchableOpacity>
                        </View>
                    </ScrollView>
                </>
            )}

            {/* Footer */}
            <View style={styles.footerWrapper}>
                <Footer
                    activeTab="CONTACT"
                    setActiveTab={handleFooterNavigation}
                    t={t}
                />
            </View>

            {/* Sidebar Menu */}
            <SidebarMenu
                menuVisible={menuVisible}
                setMenuVisible={setMenuVisible}
                isLoggedIn={isLoggedIn}
                onLogout={handleLogout}
                t={t}
                navigation={navigation}
            />

            {/* Enquiry Form Modal */}
            <Modal
                visible={showForm}
                animationType="slide"
                transparent
                onRequestClose={() => setShowForm(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalContainer}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>விசாரணை படிவம்</Text>
                                <TouchableOpacity
                                    style={styles.closeBtn}
                                    onPress={() => setShowForm(false)}
                                >
                                    <Icon name="close" size={24} color="#666" />
                                </TouchableOpacity>
                            </View>

                            <ScrollView
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={styles.formContainer}
                            >
                                <Text style={styles.formSubtitle}>
                                    உங்கள் தேவைகளை பதிவு செய்ய கீழேயுள்ள படிவத்தை நிரப்பவும்
                                </Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>பெயர் *</Text>
                                    <TextInput
                                        style={[styles.input, errors.name && styles.inputError]}
                                        placeholder="உங்கள் பெயரை உள்ளிடவும்"
                                        value={form.name}
                                        onChangeText={(text) => updateField('name', text)}
                                    />
                                </View>

                                <View style={styles.inputRow}>
                                    <View style={styles.inputFlex}>
                                        <Text style={styles.inputLabel}>மொபைல் *</Text>
                                        <TextInput
                                            style={[styles.input, errors.phone && styles.inputError]}
                                            placeholder="9003990272"
                                            keyboardType="phone-pad"
                                            value={form.phone}
                                            onChangeText={(text) => updateField('phone', text)}
                                            maxLength={10}
                                        />
                                    </View>
                                    <View style={styles.inputFlex}>
                                        <Text style={styles.inputLabel}>மின்னஞ்சல் *</Text>
                                        <TextInput
                                            style={[styles.input, errors.email && styles.inputError]}
                                            placeholder="email@example.com"
                                            keyboardType="email-address"
                                            autoCapitalize="none"
                                            value={form.email}
                                            onChangeText={(text) => updateField('email', text)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputRow}>
                                    <View style={styles.inputFlex}>
                                        <Text style={styles.inputLabel}>நகரம்</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="தூத்துக்குடி"
                                            value={form.city}
                                            onChangeText={(text) => updateField('city', text)}
                                        />
                                    </View>
                                    <View style={styles.inputFlex}>
                                        <Text style={styles.inputLabel}>மாநிலம்</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="தமிழ்நாடு"
                                            value={form.state}
                                            onChangeText={(text) => updateField('state', text)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>நாடு</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="இந்தியா"
                                        value={form.country}
                                        onChangeText={(text) => updateField('country', text)}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>தேவைகள் *</Text>
                                    <TextInput
                                        style={[
                                            styles.input,
                                            styles.textArea,
                                            errors.requirement && styles.inputError
                                        ]}
                                        placeholder="உங்கள் தேவைகளை விரிவாக கூறவும்..."
                                        multiline
                                        numberOfLines={4}
                                        textAlignVertical="top"
                                        value={form.requirement}
                                        onChangeText={(text) => updateField('requirement', text)}
                                    />
                                </View>

                                <View style={styles.buttonGroup}>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={() => setShowForm(false)}
                                    >
                                        <Text style={styles.cancelButtonText}>ரத்து செய்</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.submitButton}
                                        onPress={handleSubmit}
                                    >
                                        <LinearGradient
                                            colors={['#ef0d8d', '#ad0761']}
                                            style={styles.gradientButton}
                                        >
                                            <Text style={styles.submitButtonText}>அனுப்பு</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF7ED', // Matched with Profile Screen
    },
    // New Header Styles
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Using space-between to pin left/right
        paddingHorizontal: 15,
        paddingBottom: 10,
        paddingTop: 10,
    },
    titleBadgeContainer: {
        // Removed flex/center to align left
    },
    titleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 25,
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 1,
        marginLeft: 8,
    },

    // Original Styles (preserved with minor tweaks if needed)
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    placeholder: {
        width: 40,
    },
    scrollView: {
        flex: 1,
    },
    officeCard: {
        backgroundColor: '#FFE4F3',
        margin: 16,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    officeIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#fbc9e5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    officeName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    section: {
        marginHorizontal: 16,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    contactCard: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    iconCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFE4F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    contactTextContainer: {
        flex: 1,
    },
    contactLabel: {
        fontSize: 12,
        color: '#6B7280',
        fontWeight: '600',
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    contactValue: {
        fontSize: 15,
        color: '#1F2937',
        fontWeight: '600',
        lineHeight: 22,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hoursCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef0d8d',
        marginRight: 16,
    },
    timeLabel: {
        fontSize: 13,
        color: '#6B7280',
        fontWeight: '500',
        marginBottom: 2,
    },
    timeValue: {
        fontSize: 15,
        fontWeight: '600',
        color: '#1F2937',
    },
    divider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 16,
        marginLeft: 26,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F59E0B',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginTop: 16,
        marginLeft: 26,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 6,
    },
    actionContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
        gap: 8,
    },
    actionBtnText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
    // Footer Wrapper
    footerWrapper: {
        marginBottom: 0,
    },
    // Modal Styles
    modalContainer: {
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1F2937',
    },
    closeBtn: {
        padding: 4,
    },
    formContainer: {
        padding: 20,
    },
    formSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    inputFlex: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1.5,
        borderColor: '#E5E7EB',
        borderRadius: 10,
        padding: 12,
        fontSize: 15,
        color: '#1F2937',
    },
    inputError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    textArea: {
        height: 100,
        paddingTop: 12,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    cancelButton: {
        flex: 1,
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F3F4F6',
        alignItems: 'center',
    },
    cancelButtonText: {
        color: '#4B5563',
        fontSize: 16,
        fontWeight: '600',
    },
    submitButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    gradientButton: {
        padding: 16,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '700',
    },
});

export default ContactScreen;