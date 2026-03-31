import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    SafeAreaView,
    StatusBar,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Header from '../components/Header';
import { scale, moderateScale, width } from '../utils/responsive';

const COLORS = {
    primaryGradientStart: '#fe29a5',
    primaryGradientEnd: '#d60bc2',
    bg: '#FBFBFF',
    textMain: '#1F2937',
    textSub: '#6B7280',
    white: '#FFFFFF',
    clockBg: '#7A4B00', // Darker brown
    wifiOffText: '#8E8E9A',
    iconPurpleStart: '#f1a7ff',
    iconPurpleEnd: '#c471ed',
};

const ServerSlow = () => {
    const navigation = useNavigation();

    const handleTryAgain = () => {
        // In a real scenario, this would retry the last request
        if (navigation.canGoBack()) {
            navigation.goBack();
        } else {
            navigation.navigate('Main');
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* Header matches HomeScreen */}
            <Header 
                setMenuVisible={() => {}} // Simple header
                isLoggedIn={false} 
            />

            <View style={styles.content}>
                {/* Illustration Section - Glassmorphic / Premium look */}
                <View style={styles.illustrationWrapper}>
                    <View style={styles.whiteCard}>
                        {/* Main Server Center Piece */}
                        <LinearGradient
                            colors={['#E6CBFF', '#bb82f9ff']}
                            style={styles.serverIconSquare}
                        >
                            <Icon name="server" size={scale(65)} color={COLORS.white} />
                        </LinearGradient>

                        {/* Status Overlays */}
                        {/* Clock - Top Right */}
                        <View style={styles.clockCircle}>
                            <Icon name="clock-outline" size={scale(22)} color={COLORS.white} />
                        </View>

                        {/* Wifi-off - Bottom Left */}
                        <View style={styles.wifiOffCircle}>
                            <Icon name="wifi-off" size={scale(22)} color="#ad0761" />
                        </View>
                    </View>
                </View>

                {/* Error Messaging */}
                <View style={styles.messageBox}>
                    <Text style={styles.titleText}>Oops! Something went wrong.</Text>
                    <Text style={styles.subtitleText}>
                        The server is taking longer than usual. Please check your connection or try again.
                    </Text>
                </View>

                {/* Retrigger Action */}
                <View style={styles.footerAction}>
                    <TouchableOpacity 
                        onPress={handleTryAgain} 
                        style={styles.buttonShadow}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={[COLORS.primaryGradientStart, COLORS.primaryGradientEnd]}
                            style={styles.actionButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Icon name="refresh" size={24} color={COLORS.white} style={styles.refreshIcon} />
                            <Text style={styles.actionButtonText}>TRY AGAIN</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: scale(30),
        paddingTop: scale(80),
    },
    illustrationWrapper: {
        marginBottom: scale(60),
    },
    whiteCard: {
        width: scale(200),
        height: scale(200),
        backgroundColor: COLORS.white,
        borderRadius: scale(50),
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 12,
        shadowColor: '#ad0761',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 15,
        position: 'relative',
    },
    serverIconSquare: {
        width: scale(130),
        height: scale(130),
        borderRadius: scale(40),
        justifyContent: 'center',
        alignItems: 'center',
    },
    clockCircle: {
        position: 'absolute',
        top: scale(-5),
        right: scale(-5),
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: COLORS.clockBg,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: COLORS.white,
    },
    wifiOffCircle: {
        position: 'absolute',
        bottom: scale(40),
        left: scale(-20),
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    messageBox: {
        alignItems: 'center',
    },
    titleText: {
        fontSize: moderateScale(26),
        fontWeight: 'bold',
        color: '#2d2d2d',
        textAlign: 'center',
        marginBottom: scale(15),
        letterSpacing: 0.5,
    },
    subtitleText: {
        fontSize: moderateScale(16),
        color: '#6c757d',
        textAlign: 'center',
        lineHeight: scale(24),
    },
    footerAction: {
        width: '100%',
        position: 'absolute',
        bottom: scale(50),
    },
    buttonShadow: {
        borderRadius: scale(35),
        elevation: 10,
        shadowColor: COLORS.primaryGradientStart,
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
    },
    actionButton: {
        flexDirection: 'row',
        height: scale(65),
        borderRadius: scale(32.5),
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshIcon: {
        marginRight: scale(12),
    },
    actionButtonText: {
        color: COLORS.white,
        fontSize: moderateScale(18),
        fontWeight: '900',
        letterSpacing: 2,
    },
});

export default ServerSlow;
