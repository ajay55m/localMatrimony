import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Image,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Modal,
    Pressable,
    ImageBackground,
} from 'react-native';
import { getSession, KEYS } from '../utils/session';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, moderateScale, width, height } from '../utils/responsive';
import { useNavigation } from '@react-navigation/native';
import { calculateCompleteness } from '../utils/profileUtils';

// width/height imported from responsive utils


const COLORS = {
    sidemenuHeader: '#ef0d8d',
    sidemenuBody: '#FFF7ED',   // Light Cream to match Home Screen
    primaryRed: '#ad0761',     // Deep Pink for icons/text
    white: '#FFFFFF',
    textMain: '#1F2937',
};

const SidebarMenu = ({ menuVisible, setMenuVisible, isLoggedIn, onLogout, t }) => {
    const navigation = useNavigation();
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const loadUserData = async () => {
            if (isLoggedIn) {
                try {
                    const ud = await getSession(KEYS.USER_DATA);
                    if (ud) setUserData(ud);
                } catch (error) {
                    console.error('Failed to load user data in Sidebar', error);
                }
            }
        };

        loadUserData();
    }, [isLoggedIn, menuVisible]);

    return (
        <Modal
            visible={menuVisible}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setMenuVisible(false)}
        >
            <Pressable style={styles.modalOverlay} onPress={() => setMenuVisible(false)}>
                <Pressable style={styles.sidemenuContainer} onPress={() => { }}>
                    {/* Header */}
                    <ImageBackground
                        source={require('../assets/images/bg-saffron.jpg.jpeg')}
                        style={styles.sidemenuHeader}
                        resizeMode="cover"
                    >
                        <View>
                            <Image
                                source={require('../assets/images/nadar-mahamai5.png')}
                                style={styles.sidemenuLogo}
                                resizeMode="contain"
                            />
                        </View>
                        {/* Close Button inside Header */}
                        <TouchableOpacity
                            style={styles.closeBtn}
                            onPress={() => setMenuVisible(false)}
                        >
                            <Icon name="close" size={24} color={COLORS.white} />
                        </TouchableOpacity>
                    </ImageBackground>

                    {/* Body */}
                    <View style={[styles.sidemenuBody, { backgroundColor: COLORS.sidemenuBody }]}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={{ marginTop: 10 }}>
                                {isLoggedIn && (
                                    <TouchableOpacity 
                                        style={styles.profileSummary}
                                        onPress={() => {
                                            setMenuVisible(false);
                                            navigation.navigate('Main', { initialTab: 'HOME' });
                                        }}
                                    >
                                        <Image
                                            source={userData?.gender?.toLowerCase() === 'female' || userData?.gender === 'பெண்' ? require('../assets/images/avatar_female.jpg') : require('../assets/images/avatar_male.jpg')}
                                            style={styles.profileAvatar}
                                        />
                                        <View>
                                            <Text style={styles.profileName}>{userData?.username || 'User'}</Text>
                                            <View style={styles.percentageContainer}>
                                                <Text style={styles.percentageText}>
                                                    {t('PROFILE')} {calculateCompleteness(userData)}% {t('COMPLETE') || 'Complete'}
                                                </Text>
                                                <View style={styles.percentageBar}>
                                                    <View 
                                                        style={[
                                                            styles.percentageFill, 
                                                            { width: `${calculateCompleteness(userData)}%` }
                                                        ]} 
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    </TouchableOpacity>
                                )}

                                {[
                                    { label: t('DASHBOARD') || 'Dashboard', icon: 'view-dashboard-outline', id: 'dashboard', show: isLoggedIn },
                                    { label: t('SEARCH') || 'Search Profiles', icon: 'account-search-outline', id: 'search', show: isLoggedIn },
                                    { label: t('Viewed Profiles') || 'Viewed Profiles', icon: 'eye-outline', id: 'viewed_profiles', show: isLoggedIn },
                                    { label: t('Selected Profiles') || 'Selected Profiles', icon: 'heart-outline', id: 'selected_profiles', show: isLoggedIn },
                                    { label: t('LOGOUT'), icon: 'logout', id: 'logout', show: isLoggedIn, action: onLogout },
                                ].filter(item => item.show).map((item, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            if (item.action) {
                                                item.action();
                                                setMenuVisible(false);
                                            } else if (item.id === 'dashboard' && navigation) {
                                                setMenuVisible(false);
                                                navigation.navigate('Main', { initialTab: 'HOME' });
                                            } else if (item.id === 'search' && navigation) {
                                                setMenuVisible(false);
                                                navigation.navigate('Search');
                                            } else if (item.id === 'viewed_profiles' && navigation) {
                                                setMenuVisible(false);
                                                navigation.navigate('ViewedProfiles');
                                            } else if (item.id === 'selected_profiles' && navigation) {
                                                setMenuVisible(false);
                                                navigation.navigate('SelectedProfiles');
                                            } else if (item.id === 'profile' && navigation) {
                                                setMenuVisible(false);
                                                navigation.navigate('Main', { initialTab: 'PROFILE' });
                                            } else {
                                                setMenuVisible(false);
                                                // Fallback for screens not implemented yet (Messages, Preferences)
                                            }
                                        }}
                                    >
                                        <View style={styles.menuItemContent}>
                                            <Icon name={item.icon} size={24} color={COLORS.primaryRed} style={{ marginRight: 15 }} />
                                            <Text style={styles.menuItemText}>{item.label}</Text>
                                        </View>
                                        {item.badge && (
                                            <View style={styles.menuBadge}>
                                                <Text style={styles.menuBadgeText}>{item.badge}</Text>
                                            </View>
                                        )}
                                        {item.badgeCount && (
                                            <View style={styles.menuBadgeCount}>
                                                <Text style={styles.menuBadgeCountText}>{item.badgeCount}</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        {/* Contact Section - Always Visible at Bottom */}
                        <View style={styles.contactSection}>
                            <View style={styles.contactDetails}>
                                <View style={styles.contactRow}>
                                    <Icon name="phone" size={16} color={COLORS.primaryRed} style={{ marginRight: 8 }} />
                                    <Text style={styles.contactText}>0461 - 2320814</Text>
                                </View>
                                <View style={styles.contactRow}>
                                    <Icon name="cellphone" size={16} color={COLORS.primaryRed} style={{ marginRight: 8 }} />
                                    <Text style={styles.contactText}>+91 9003990272</Text>
                                </View>
                                <View style={styles.contactRow}>
                                    <Icon name="email" size={16} color={COLORS.primaryRed} style={{ marginRight: 8 }} />
                                    <Text style={styles.contactText}>nadarmahamai@gmail.com</Text>
                                </View>
                                <View style={styles.contactRow}>
                                    <Icon name="clock-outline" size={16} color={COLORS.primaryRed} style={{ marginRight: 8 }} />
                                    <View>
                                        <Text style={styles.contactText}>09:30AM - 01:30PM</Text>
                                        <Text style={styles.contactText}>03:00PM - 06:30PM</Text>
                                    </View>
                                </View>
                                <Text style={[styles.contactText, { marginTop: 10, color: '#D35400', fontWeight: 'bold' }]}>
                                    Sunday Holiday
                                </Text>
                            </View>
                        </View>
                    </View>
                </Pressable>
            </Pressable >
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sidemenuContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: width > 600 ? scale(300) : width * 0.75,
        height: '100%',
        backgroundColor: '#FFF7ED',
        borderTopLeftRadius: scale(30),
        borderBottomLeftRadius: scale(30),
        overflow: 'hidden',
    },
    sidemenuHeader: {
        backgroundColor: COLORS.sidemenuHeader,
        padding: scale(10),
        paddingTop: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sidebarProfile: {
        marginTop: scale(15),
        flexDirection: 'row',
        alignItems: 'center',
    },
    sidebarAvatar: {
        width: scale(45),
        height: scale(45),
        borderRadius: scale(22.5),
        borderWidth: scale(2),
        borderColor: '#FFF',
        marginRight: scale(10),
    },
    sidebarUserName: {
        color: '#FFF',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    sidemenuLogo: {
        width: scale(240),
        height: scale(60),
        marginBottom: scale(5),
    },
    closeBtn: {
        marginTop: scale(10),
    },
    sidemenuBody: {
        flex: 1,
        paddingVertical: scale(10),
        paddingHorizontal: scale(5),
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: scale(10),
        paddingVertical: scale(12),
        paddingHorizontal: scale(20),
    },
    menuItemContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuItemText: {
        color: '#1F2937',
        fontSize: moderateScale(16),
        fontWeight: '500',
    },
    menuBadge: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: scale(12),
        paddingHorizontal: scale(8),
        paddingVertical: scale(2),
    },
    menuBadgeText: {
        color: '#FFF',
        fontSize: moderateScale(10),
        fontWeight: 'bold',
    },
    menuBadgeCount: {
        backgroundColor: '#FF3D00',
        borderRadius: scale(10),
        width: scale(20),
        height: scale(20),
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuBadgeCountText: {
        color: '#FFF',
        fontSize: moderateScale(10),
        fontWeight: 'bold',
    },
    contactSection: {
        backgroundColor: 'rgba(211, 84, 0, 0.05)',
        padding: scale(15),
        marginHorizontal: scale(10),
        borderRadius: scale(10),
        marginBottom: scale(20),
        borderTopWidth: 1,
        borderTopColor: 'rgba(211, 84, 0, 0.1)',
        marginTop: scale(10),
    },
    contactDetails: {
        gap: scale(5),
    },
    contactText: {
        color: '#4B5563',
        fontSize: moderateScale(12),
        lineHeight: moderateScale(18),
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scale(5),
    },
    profileSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(20),
        paddingVertical: scale(15),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        marginBottom: scale(10),
    },
    profileAvatar: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        borderWidth: scale(2),
        borderColor: '#ef0d8d',
        marginRight: scale(15),
    },
    profileName: {
        color: '#1F2937',
        fontSize: moderateScale(16),
        fontWeight: 'bold',
    },
    percentageContainer: {
        marginTop: scale(4),
    },
    percentageText: {
        color: '#ef0d8d',
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginBottom: scale(2),
    },
    percentageBar: {
        width: scale(120),
        height: scale(6),
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: scale(3),
        overflow: 'hidden',
    },
    percentageFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
    },
});

export default SidebarMenu;
