import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Animated,
    FlatList,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import SearchFilter from '../components/SearchFilter';
import Skeleton from '../components/Skeleton';
import { scale, moderateScale, width } from '../utils/responsive';

// Width is now imported from responsive utils


// Premium Color Palette
const COLORS = {
    primary: '#ef0d8dff', // Vibrant Orange
    primaryGradientStart: '#fe29a5ff',
    primaryGradientEnd: '#d60bc2ff',
    ctaGradientStart: '#ff4eb2ff',
    ctaGradientEnd: '#c20078ff',
    white: '#FFFFFF',
    textMain: '#1F2937',
    textSub: '#6B7280',
    bg: '#FFF7ED',
    gold: '#F59E0B',
    danger: '#EF4444',
    border: '#E5E7EB',
};

// Enhanced Dummy Data (Mock Data remains hardcoded or can be fetched)
const PROFILES = [
    {
        id: '1', name: 'J.ஜெனிஹரிலா', age: '28', religion: 'கிறிஸ்தவர்', caste: 'நாடார்', job: 'தனியார்', verified: true, img: require('../assets/images/avatar_female.jpg'),
        profileId: 'CF7197', dob: '28-03-1996', height: '5 அடி - 3 அங்', fatherName: 'N.P.ஜெயகாந்தன்', motherName: 'J.S.பொன்மணி', place: 'வேப்பலோடை', education: 'B.Sc (CS)', income: '10,000'
    },
    {
        id: '2', name: 'T.பால சரஸ்வதி', age: '35', religion: 'இந்து', caste: 'நாடார்', job: 'வேலையில்லை', verified: true, img: require('../assets/images/avatar_female.jpg'),
        profileId: 'HF6310', dob: '03-11-1989', height: '5 அடி --', fatherName: 'P.தங்கதுரை', motherName: 'T.பஞ்சவர்ணம்', place: 'கொழுவை', education: 'B.Sc (Maths)', income: '-'
    },
    {
        id: '3', name: 'S.கார்த்திகேயன்', age: '28', religion: 'இந்து', caste: 'நாடார்', job: 'பொறியாளர்', verified: true, img: require('../assets/images/avatar_male.jpg'),
        profileId: 'NM1003', dob: '10-05-1995', height: '5 அடி - 9 அங்', fatherName: 'S.செல்வம்', motherName: 'S.கவிதா', place: 'மதுரை', education: 'B.E', income: '40,000'
    },
    {
        id: '4', name: 'M.பிரியா', age: '24', religion: 'இந்து', caste: 'நாடார்', job: 'ஆசிரியர்', verified: true, img: require('../assets/images/avatar_female.jpg'),
        profileId: 'NM1004', dob: '15-08-1999', height: '5 அடி - 4 அங்', fatherName: 'M.மணி', motherName: 'M.செல்வி', place: 'திருநெல்வேலி', education: 'M.Sc', income: '25,000'
    },
];

const HomeScreen = ({ activeTab, isLoggedIn, onLoginPress, t }) => {
    const navigation = useNavigation();
    const [searchViewMode, setSearchViewMode] = useState('input');
    const [displayedMatches, setDisplayedMatches] = useState(PROFILES);
    const [isLoading, setIsLoading] = useState(true);
    const flatListRef = React.useRef(null);

    const performSearch = (searchData) => {
        console.log('Searching with:', searchData);
        // Navigate directly to Profiles to show results
        navigation.navigate('Profiles', {
            searchResults: searchData.results,
            isSearch: true
        });
    };

    const handleBackToSearch = () => {
        setSearchViewMode('input');
    };

    React.useEffect(() => {
        // Simulate data loading
        const loadTimer = setTimeout(() => {
            setIsLoading(false);
        }, 2000);

        let scrollValue = 0;
        let scrolled = 0;
        const timer = setInterval(() => {
            if (flatListRef.current) {
                scrolled++;
                if (scrolled < PROFILES.length) {
                    scrollValue = scrollValue + 195;
                } else {
                    scrollValue = 0;
                    scrolled = 0;
                }
                flatListRef.current.scrollToOffset({ animated: true, offset: scrollValue });
            }
        }, 3000);

        return () => {
            clearInterval(timer);
            clearTimeout(loadTimer);
        };
    }, []);

    const handleShare = () => {
        Alert.alert(t('SUCCESS'), 'Sharing via WhatsApp...');
    };

    const renderHero = () => (
        <LinearGradient
            colors={['#FFE4F3', '#FFD1E8']}
            style={styles.heroContainer}
        >
            <View style={styles.heroTextContainer}>
                <Text style={styles.heroTitle}>{t('HERO_TITLE')}</Text>
                <Text style={styles.heroSubtitle}>
                    {t('HERO_SUBTITLE')}
                </Text>
            </View>
            <View style={styles.bannerContainer}>
                <View style={styles.imagePlaceholder}>
                    <Icon name="heart-outline" size={40} color="#fbc9e5" />
                    <Text style={styles.placeholderText}>முகப்புப் படத்தை ஏற்றுகிறது...</Text>
                </View>
                <Image
                    source={require('../assets/images/marriage.png')}
                    style={styles.bannerImage}
                    resizeMode="cover"
                />

                {/* Pink Theme Transformation Overlay */}


                {/* Glassmorphic Auth Tab - Redesigned */}
                <View style={styles.glassAuthTab}>
                    <Text style={styles.authTabTitle}>{t('FREE_REGISTER')}</Text>
                    <View style={styles.authBtnRow}>
                        <TouchableOpacity style={styles.authBtnWrapper} onPress={() => navigation.navigate('Register')}>
                            <LinearGradient
                                colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                                style={styles.authBtnGradient}
                            >
                                <Icon name="account-plus" size={18} color="white" style={{ marginRight: 8 }} />
                                <Text style={styles.authBtnText}>{t('REGISTER')}</Text>
                            </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.authBtnOutline, { borderColor: COLORS.primary }]}
                            onPress={onLoginPress}
                        >
                            <Icon name="login" size={18} color={COLORS.primary} style={{ marginRight: 8 }} />
                            <Text style={[styles.authBtnTextOutline, { color: COLORS.primary }]}>{t('LOGIN')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </LinearGradient>
    );

    const renderResultItem = (item) => (
        <View style={styles.resultCard} key={item.id}>
            {/* Locked Profile Image */}
            {/* Locked Profile Image - Updated Design */}
            <View style={styles.avatarOuterRing}>
                <View style={styles.avatarInner}>
                    <Image source={item.img} style={styles.profileImage} blurRadius={15} />
                    <View style={styles.glassOverlay}>
                        <View style={styles.lockIconContainer}>
                            <Icon name="lock" size={14} color={COLORS.primary} />
                        </View>
                        <Text style={styles.viewText}>{t('LOCKED_MSG')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.resultBody}>
                <Text style={styles.resName}>{item.name}</Text>
                <Text style={styles.resId}>ID - {item.profileId}</Text>
                <View style={styles.resDivider} />

                <View style={styles.resRow}>
                    <Text style={styles.resLabel}>Date of Birth :</Text>
                    <Text style={styles.resValue}>{item.dob}</Text>
                </View>
                <View style={styles.resRow}>
                    <Text style={styles.resLabel}>Height :</Text>
                    <Text style={styles.resValue}>{item.height}</Text>
                </View>
                <View style={styles.resRow}>
                    <Text style={styles.resLabel}>Religion-Caste :</Text>
                    <Text style={styles.resValue}>{item.religion} - {item.caste}</Text>
                </View>
                <View style={styles.resRow}>
                    <Text style={styles.resLabel}>Occupation:</Text>
                    <Text style={styles.resValue}>{item.job}</Text>
                </View>
            </View>

            <View style={styles.resultRight}>
                <View style={styles.actionRow}>
                    <Icon name="check-decagram" size={18} color="#2E7D32" />
                    <Text style={[styles.actionText, { color: '#777' }]}> {t('VERIFIED_PROFILE')}</Text>
                </View>
                <View style={styles.actionRow}>
                    <Icon name="cards-diamond" size={18} color="#FBC02D" />
                    <Text style={[styles.actionText, { color: '#333' }]}> {t('VIEW_HOROSCOPE')}</Text>
                </View>

                {/* Login Trigger on Press */}
                <TouchableOpacity style={{ marginTop: 10 }} onPress={onLoginPress}>
                    <Text style={{ color: '#008000', fontWeight: 'bold', fontSize: 13 }}>{t('SELECT_PROFILE')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 10 }} onPress={onLoginPress}>
                    <Text style={{ color: '#D32F2F', fontSize: 12 }}>{t('READ_MORE')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderQuickSearchSection = () => (
        <View style={{ marginTop: 10 }}>
            <SearchFilter
                onSearch={performSearch}
                t={t}
                isLoggedIn={isLoggedIn}
            />
        </View>
    );

    const renderProfileCard = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={onLoginPress}>
            <View style={styles.cardHeader}>
                {item.verified && (
                    <LinearGradient colors={['#4CAF50', '#2E7D32']} style={styles.verifiedBadge}>
                        <Icon name="check-decagram" size={10} color={COLORS.white} />
                        <Text style={styles.verifiedText}>{t('VERIFIED_PROFILE')}</Text>
                    </LinearGradient>
                )}
                <TouchableOpacity style={styles.favBtn}>
                    <Icon name="heart" size={16} color="#E91E63" />
                </TouchableOpacity>
            </View>

            <View style={styles.avatarOuterRing}>
                <View style={styles.avatarInner}>
                    <Image source={item.img} style={styles.profileImage} blurRadius={15} />
                    <View style={styles.glassOverlay}>
                        <View style={styles.lockIconContainer}>
                            <Icon name="lock" size={18} color={COLORS.primary} />
                        </View>
                        <Text style={styles.viewText}>{t('LOCKED_MSG')}</Text>
                    </View>
                </View>
            </View>

            <View style={styles.cardDetails}>
                <Text style={styles.profileName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.profileInfo}>{item.age} • {item.job}</Text>
                <Text style={styles.profileCaste}>{t(item.caste.toUpperCase()) || item.caste}</Text>
            </View>

            <TouchableOpacity style={styles.viewProfileBtn}>
                <LinearGradient
                    colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                    style={styles.btnGradient}
                >
                    <Text style={styles.viewProfileText}>{t('VIEW_PROFILE')}</Text>
                </LinearGradient>
            </TouchableOpacity>
        </TouchableOpacity>
    );

    const renderMatches = () => (
        <View style={styles.sectionContainer}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{t('MATCHES')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('Profiles')}>
                    <Text style={styles.seeAllText}>All</Text>
                </TouchableOpacity>
            </View>
            <FlatList
                ref={flatListRef}
                horizontal
                data={displayedMatches}
                renderItem={renderProfileCard}
                keyExtractor={item => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                ItemSeparatorComponent={() => <View style={{ width: 15 }} />}
                snapToInterval={195}
                decelerationRate="fast"
            />
        </View>
    );

    const renderWhyChooseUs = () => (
        <View style={styles.whyContainer}>
            <Text style={styles.whyTitle}>{t('WHY_CHOOSE_US')}</Text>
            <Text style={styles.whySubtitle}>
                {t('WHY_SUBTITLE')}
            </Text>

            <View style={styles.featuresGrid}>
                {[
                    { icon: 'check-decagram', label: t('VERIFIED_PROFILE') },
                    { icon: 'heart-flash', label: t('MATCHES') },
                    { icon: 'account-tie', label: t('EXPERT_GUIDANCE') },
                    { icon: 'account-group', label: t('TRUSTED_MILLIONS') },
                    { icon: 'shield-check', label: t('PRIVACY_PROTECTED') },
                    { icon: 'headset', label: t('SUPPORT_247') },
                ].map((item, index) => (
                    <View key={index} style={styles.featureItem}>
                        <View style={styles.featureIconBox}>
                            <Icon name={item.icon} size={24} color={COLORS.primary} />
                        </View>
                        <Text style={styles.featureLabel}>{item.label}</Text>
                    </View>
                ))}
            </View>
        </View>
    );

    const renderCallToAction = () => (
        <LinearGradient
            colors={[COLORS.ctaGradientStart, COLORS.ctaGradientEnd]}
            style={styles.ctaContainer}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
            <Text style={styles.ctaTitle}>{t('CTA_TITLE')}</Text>
            <Text style={styles.ctaText}>
                {t('CTA_TEXT')}
            </Text>

            <View style={styles.ctaButtons}>
                <TouchableOpacity style={styles.ctaBtnWhite} onPress={() => navigation.navigate('Register')}>
                    <Icon name="account-plus" size={20} color={COLORS.primary} />
                    <Text style={styles.ctaBtnTextPrimary}>{t('REGISTER')}</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.ctaBtnOutline} onPress={onLoginPress}>
                    <Icon name="login" size={20} color={COLORS.white} />
                    <Text style={styles.ctaBtnTextWhite}>{t('LOGIN')}</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    return (
        <View style={styles.mainContainer}>
            {isLoading ? (
                <Skeleton type="Dashboard" />
            ) : (
                <>
                    {activeTab === 'HOME' && (
                        <ScrollView
                            style={{ flex: 1 }}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 80 }}
                        >
                            {renderHero()}
                            {renderMatches()}
                            <View style={styles.dotsContainer}>
                                <View style={[styles.dot, styles.activeDot]} />
                                <View style={styles.dot} />
                                <View style={styles.dot} />
                            </View>

                            <View style={{ marginHorizontal: 20, marginBottom: 20 }}>
                                {renderQuickSearchSection()}
                            </View>

                            {renderWhyChooseUs()}
                            {renderCallToAction()}
                        </ScrollView>
                    )}

                    {/* SEARCH Block text removed, logic moved to SearchScreen */}

                    {activeTab === 'MATCHES' && (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
                        >
                            <Text style={{ ...styles.sectionTitle, textAlign: 'center', marginBottom: 20 }}>{t('MATCHES')}</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 }}>
                                {PROFILES.map((item) => (
                                    <View key={item.id}>
                                        {renderProfileCard({ item })}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    )}

                    {activeTab === 'CONTACT' && (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                            <Icon name="phone-classic" size={60} color={COLORS.primary} style={{ marginBottom: 20 }} />
                            <Text style={{ fontSize: 22, fontWeight: 'bold', color: '#800000', marginBottom: 10 }}>{t('CONTACT_US')}</Text>
                            <Text style={{ fontSize: 16, color: '#555', textAlign: 'center', lineHeight: 24 }}>
                                {t('CALL_US')}{"\n"}
                                <Text style={{ fontWeight: 'bold' }}>+91 98765 43210</Text>
                            </Text>
                        </View>
                    )}

                </>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    // Hero
    heroContainer: {
        backgroundColor: '#FFF0F7', // Brighter, cleaner pink
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 40,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        marginBottom: 20,
    },
    heroTextContainer: {
        paddingHorizontal: 20,
        marginBottom: 15,
        alignItems: 'center',
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: 'bold',
        color: '#ad0761',
        textAlign: 'center',
        marginBottom: 8,
    },
    heroSubtitle: {
        fontSize: 14,
        color: '#5D4037',
        textAlign: 'center',
        lineHeight: 22,
    },
    bannerContainer: {
        width: width - 30, // Slightly wider
        height: 450, // Much taller to show couple image + auth tab
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
        position: 'absolute',
        top: 0,
        left: 0,
    },
    imagePlaceholder: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFF7ED',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    placeholderText: {
        color: '#ad0761',
        fontSize: 12,
        fontWeight: '500',
    },
    bannerOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(239, 13, 141, 0.15)', // Soft pink tint
    },
    glassAuthTab: {
        position: 'absolute',
        bottom: 0,
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.92)', // More opaque
        paddingVertical: 20,
        paddingHorizontal: 20,
        flexDirection: 'column', // Stack vertical
        alignItems: 'center',
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.8)',
    },
    authTabTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary, // Deep Pink
        marginBottom: 15,
        textAlign: 'center',
    },
    authBtnRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        justifyContent: 'center',
        gap: 12,
    },
    authBtnWrapper: {
        minWidth: '45%',
        flexGrow: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
    },
    authBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
    },
    authBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    authBtnOutline: {
        minWidth: '45%',
        flexGrow: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderWidth: 2,
        borderRadius: 12,
        backgroundColor: 'transparent',
    },
    authBtnTextOutline: {
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Section Headers
    sectionContainer: {
        paddingVertical: 10,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        marginBottom: scale(15),
    },
    sectionTitle: {
        fontSize: moderateScale(20),
        fontWeight: 'bold',
        color: COLORS.textMain,
    },
    seeAllText: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 14,
    },
    viewAll: {
        color: COLORS.primary,
        fontWeight: '700',
        fontSize: moderateScale(14),
    },
    // Match Cards
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    horizontalList: {
        paddingLeft: scale(20),
        paddingBottom: scale(10),
    },
    matchCard: {
        width: width > 600 ? scale(180) : scale(160),
        backgroundColor: 'white',
        borderRadius: scale(20),
        padding: scale(15),
        marginRight: scale(15),
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
        height: 20,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        gap: 3,
    },
    verifiedText: {
        color: 'white',
        fontSize: 8,
        fontWeight: 'bold',
    },
    favBtn: {
        padding: 4,
    },
    avatarOuterRing: {
        width: scale(90),
        height: scale(90),
        borderRadius: scale(45),
        borderWidth: 2.5,
        borderColor: COLORS.gold,
        padding: scale(3),
        backgroundColor: 'white',
        alignSelf: 'center',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(10),
        elevation: 3,
    },
    avatarInner: {
        width: '100%',
        height: '100%',
        borderRadius: scale(45),
        overflow: 'hidden',
        position: 'relative',
    },
    profileImage: {
        width: '100%',
        height: '100%',
    },
    glassOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(255,255,255,0.2)', // Slight white tint
        justifyContent: 'center',
        alignItems: 'center',
    },
    lockIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    viewText: {
        color: '#000',
        fontSize: 11, // Slightly larger
        fontWeight: 'bold',
        textShadowColor: 'rgba(255,255,255,1)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 6, // Stronger glow for readability
        textAlign: 'center',
    },
    cardDetails: {
        alignItems: 'center',
        marginBottom: 12,
    },
    profileName: {
        fontSize: moderateScale(15),
        fontWeight: 'bold',
        color: COLORS.textMain,
        marginBottom: scale(2),
        textAlign: 'center',
    },
    profileInfo: {
        fontSize: moderateScale(11),
        color: COLORS.textSub,
        marginBottom: scale(2),
        textAlign: 'center',
    },
    profileCaste: {
        fontSize: 12,
        color: COLORS.primary,
        fontWeight: '600',
    },
    viewProfileBtn: {
        borderRadius: scale(15),
        overflow: 'hidden',
        marginTop: scale(5),
    },
    btnGradient: {
        paddingVertical: scale(8),
        alignItems: 'center',
    },
    viewProfileText: {
        color: 'white',
        fontSize: moderateScale(11),
        fontWeight: 'bold',
    },
    // Dots
    dotsContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginVertical: 10,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#DDD',
    },
    activeDot: {
        backgroundColor: COLORS.primary,
        width: 24,
    },
    // Why Choose Us
    whyContainer: {
        margin: scale(20),
        padding: scale(20),
        backgroundColor: 'white',
        borderRadius: scale(25),
        elevation: 5, // Stronger shadow for floating card look
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        borderWidth: 1,
        borderColor: '#f5f5f5',
    },
    whyTitle: {
        fontSize: moderateScale(22),
        fontWeight: 'bold',
        color: '#2d2d2d',
        textAlign: 'center',
        marginBottom: scale(10),
    },
    whySubtitle: {
        fontSize: 14,
        color: '#757575',
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 0,
    },
    featureItem: {
        width: width > 600 ? '23%' : '48%', // 4 columns on tablets, 2 on phones
        aspectRatio: 1, // distinct square/box look
        backgroundColor: '#FFF8F0', // Very light orange/cream
        padding: scale(10),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: '#FFE0B2', // Distinct border
        marginBottom: scale(15), // Explicit margin for spacing
    },
    featureIconBox: {
        width: scale(45),
        height: scale(45),
        backgroundColor: 'white',
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(8),
        elevation: 4,
        shadowColor: '#E65100',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
    },
    featureLabel: {
        fontSize: moderateScale(12),
        fontWeight: '700',
        color: '#424242',
        textAlign: 'center',
        lineHeight: 18,
    },
    // CTA
    ctaContainer: {
        margin: scale(20),
        padding: scale(25),
        borderRadius: scale(25),
        alignItems: 'center',
        elevation: 5,
        marginBottom: scale(30),
    },
    ctaTitle: {
        color: 'white',
        fontSize: moderateScale(22),
        fontWeight: 'bold',
        marginBottom: scale(10),
        textAlign: 'center',
    },
    ctaText: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: moderateScale(14),
        textAlign: 'center',
        lineHeight: moderateScale(22),
        marginBottom: scale(20),
    },
    ctaButtons: {
        flexDirection: 'row',
        gap: 15,
    },
    ctaBtnWhite: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    ctaBtnTextPrimary: {
        color: COLORS.primary,
        fontWeight: 'bold',
        fontSize: 15,
    },
    ctaBtnOutline: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'white',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        gap: 8,
    },
    ctaBtnTextWhite: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // Quick Search Perfect Design Styles
    quickSearchWrapper: {
        backgroundColor: '#FDF1DE', // Light peach/tan from image
        borderRadius: 15,
        padding: 15,
        borderWidth: 1,
        borderColor: '#E6CCB2',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    quickSearchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 2,
        borderBottomColor: '#D35400', // Darker orange divider
        paddingBottom: 5,
        marginBottom: 10,
    },
    heartIconContainer: {
        padding: 5,
    },
    quickSearchTab: {
        backgroundColor: '#D32F2F', // Red tab from image
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderTopLeftRadius: 10,
        borderTopRightRadius: 10,
        marginTop: -5,
    },
    quickSearchTabText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 18,
    },
    lookingForTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#006400', // Dark Green title
        textAlign: 'center',
        marginBottom: 20,
    },
    radioRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        marginBottom: 25,
    },
    radioItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    radioLabel: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    normalFieldGroup: {
        marginBottom: 20,
    },
    orangeLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D35400', // Orange labels from image
        marginBottom: 8,
    },
    whitePicker: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#CCC',
        paddingHorizontal: 15,
        paddingVertical: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderRadius: 5,
    },
    pickerText: {
        color: '#000',
        fontSize: 18,
    },
    findBtn: {
        marginTop: 15,
        borderRadius: 12,
        overflow: 'hidden',
        width: '70%',
        alignSelf: 'center',
        elevation: 3,
    },
    findBtnGradient: {
        paddingVertical: 15,
        alignItems: 'center',
    },
    findBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 24,
    },
});

export default HomeScreen;