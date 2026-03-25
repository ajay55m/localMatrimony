import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, moderateScale, width } from '../utils/responsive';

// width is now imported from responsive utils


import LinearGradient from 'react-native-linear-gradient';

const COLORS = {
    white: '#FFFFFF',
    activeWhite: '#FFFFFF', // Changed to white for better contrast on pink
    inactiveText: '#fbc9e5',
    activeGold: '#FFD700',
    gradient: ['#ef0d8d', '#ad0761']
};

const Footer = ({ activeTab, setActiveTab, t, isOffline = false }) => {
    const insets = useSafeAreaInsets();

    // Safety padding for bottom notch/heading
    const bottomPadding = insets.bottom > 0 ? insets.bottom : 5; // Reduced from 10

    const navItems = [
        { id: 'HOME', labelKey: 'HOME', icon: 'home-variant', activeIcon: 'home-variant' },
        { id: 'SEARCH', labelKey: 'SEARCH', icon: 'account-search-outline', activeIcon: 'account-search' },
        { id: 'CONTACT', labelKey: 'CONTACT', icon: 'phone-classic', activeIcon: 'phone-classic' },
        { id: 'PROFILE', labelKey: 'PROFILE', icon: 'account-circle-outline', activeIcon: 'account-circle' },
    ];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={isOffline ? ['#FFFFFF', '#FFFFFF'] : COLORS.gradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                style={[
                    styles.bottomNav, 
                    { paddingBottom: bottomPadding },
                    isOffline && { borderTopColor: '#000000', borderTopWidth: 1, borderLeftColor: '#000000', borderRightColor: '#000000', borderLeftWidth: 1, borderRightWidth: 1 }
                ]}
            >
                {navItems.map((item, index) => {
                    const isActive = activeTab === item.id;
                    return (
                        <TouchableOpacity
                            key={index}
                            style={[styles.navItem, isActive && styles.navItemActive]}
                            onPress={() => setActiveTab(item.id)}
                            activeOpacity={0.7}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <View style={styles.iconContainer}>
                                <Icon
                                    name={isActive ? item.activeIcon : item.icon}
                                    size={24} // Reduced from 28
                                    color={isOffline ? (isActive ? '#000000' : '#888888') : (isActive ? COLORS.activeWhite : COLORS.white)}
                                />
                                {isActive && <View style={[styles.activeDot, isOffline && { backgroundColor: '#000000' }]} />}
                            </View>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.navText,
                                    { 
                                        color: isOffline ? (isActive ? '#000000' : '#888888') : (isActive ? COLORS.activeWhite : COLORS.inactiveText), 
                                        fontWeight: isActive ? '700' : '400' 
                                    }
                                ]}
                                maxFontSizeMultiplier={1.1}
                            >
                                {t ? t(item.labelKey) : item.labelKey}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </LinearGradient>
        </View >
    );
};

const styles = StyleSheet.create({
    container: {
        width: width,
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: scale(8),
        paddingHorizontal: scale(25),
        width: '100%',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderTopLeftRadius: scale(20),
        borderTopRightRadius: scale(20),
    },
    navItem: {
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        paddingVertical: scale(2),
    },
    navItemActive: {
        // Optional transform
    },
    iconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: scale(28),
        marginBottom: 0,
    },
    activeDot: {
        position: 'absolute',
        bottom: -scale(4),
        width: scale(4),
        height: scale(4),
        borderRadius: scale(2),
        backgroundColor: COLORS.activeGold,
    },
    navText: {
        fontSize: moderateScale(10),
        marginTop: scale(2),
        textAlign: 'center',
    },
});

export default Footer;