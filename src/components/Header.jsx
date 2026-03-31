import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Image,
    TouchableOpacity,
    ImageBackground,
    StatusBar,
} from 'react-native';
import { getSession, KEYS } from '../utils/session';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, moderateScale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const COLORS = {
    white: '#FFFFFF',
    sidemenuHeader: '#ad0761',
};

const Header = ({ setMenuVisible, isLoggedIn, onBack, isOffline = false }) => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation();
    const [userGender, setUserGender] = useState('Male');

    useEffect(() => {
        const loadUserData = async () => {
            if (isLoggedIn) {
                try {
                    const ud = await getSession(KEYS.USER_DATA);
                    setUserGender(ud?.gender || 'Male');
                } catch (error) {
                    console.error('Failed to load user data in Header', error);
                }
            }
        };
        loadUserData();
    }, [isLoggedIn]);

    return (
        <ImageBackground
            source={isOffline ? null : require('../assets/images/bg-saffron.jpg.jpeg')}
            style={[
                styles.header, 
                { paddingTop: insets.top + scale(5) },
                isOffline && { backgroundColor: '#FFFFFF', borderBottomColor: '#000000', borderWidth: 1 }
            ]}
            resizeMode="cover"
        >
            <View style={styles.headerContent}>
                {onBack && (
                    <TouchableOpacity onPress={onBack} style={styles.backButton}>
                        <Icon name="arrow-left" size={28} color={isOffline ? '#000000' : COLORS.white} />
                    </TouchableOpacity>
                )}
                <Image
                    source={require('../assets/images/nadar-mahamai5.png')}
                    style={[styles.newHeaderLogo, onBack && { marginLeft: scale(5) }]}
                    resizeMode="contain"
                />

                <View style={styles.headerRight}>
                    {/* TEMP: TEST BUTTON for Server Slow Page */}
                    <TouchableOpacity
                        style={styles.headerMenuBtn}
                        onPress={() => navigation.navigate('ServerSlow')}
                    >
                        <Icon name="alert-circle-outline" size={24} color={isOffline ? '#000000' : '#FFFFFF'} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.headerMenuBtn}
                        onPress={() => setMenuVisible(true)}
                    >
                        <Icon name="menu" size={28} color={isOffline ? '#000000' : COLORS.white} />
                    </TouchableOpacity>
                </View>
            </View>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingBottom: scale(8),
        paddingLeft: 0,
        paddingRight: scale(10),
        borderBottomLeftRadius: scale(20),
        borderBottomRightRadius: scale(20),
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    backButton: {
        paddingLeft: scale(15),
        paddingRight: scale(5),
    },
    newHeaderLogo: {
        width: scale(320),
        height: scale(75),
        marginLeft: -scale(15),
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'absolute',
        right: scale(5),
        gap: scale(10),
    },
    headerMenuBtn: {
        padding: scale(5),
    },
    avatarTouch: {
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
    },
    headerAvatar: {
        width: scale(35),
        height: scale(35),
        borderRadius: scale(17.5),
        borderWidth: scale(1.5),
        borderColor: COLORS.white,
    },
});

export default Header;