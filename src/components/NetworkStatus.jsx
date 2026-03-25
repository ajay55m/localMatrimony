import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { moderateScale } from '../utils/responsive';

// ─── Constants ───────────────────────────────────────────────────────────────
const BANNER_VISIBLE_DURATION = 3000;
const ANIMATION_DURATION = 280;
const BANNER_HEIGHT = 44;

// ─── Component ───────────────────────────────────────────────────────────────
const NetworkStatus = () => {
    const insets = useSafeAreaInsets();
    const [status, setStatus] = useState('connected'); // 'connected' | 'offline' | 'restored'
    const translateY = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
    const hideTimer = useRef(null);

    const showBanner = useCallback(() => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: ANIMATION_DURATION,
            useNativeDriver: true,
        }).start();

        hideTimer.current = setTimeout(() => {
            Animated.timing(translateY, {
                toValue: -BANNER_HEIGHT,
                duration: ANIMATION_DURATION,
                useNativeDriver: true,
            }).start(() => setStatus('connected'));
        }, BANNER_VISIBLE_DURATION);
    }, [translateY]);

    useEffect(() => {
        let prevConnected = true;

        const unsubscribe = NetInfo.addEventListener(({ isConnected }) => {
            if (isConnected === false) {
                clearTimeout(hideTimer.current);
                setStatus('offline');
            } else if (isConnected === true && prevConnected === false) {
                setStatus('restored');
                showBanner();
            }
            prevConnected = isConnected ?? true;
        });

        return () => {
            unsubscribe();
            clearTimeout(hideTimer.current);
        };
    }, [showBanner]);

    const handleRetry = useCallback(() => {
        NetInfo.fetch().then(({ isConnected }) => {
            if (isConnected) setStatus('connected');
        });
    }, []);

    // ── Offline fullscreen ──────────────────────────────────────────────────
    if (status === 'offline') {
        return (
            <View style={styles.offlineScreen}>
                <View style={styles.iconRing}>
                    <Icon
                        name="wifi-off"
                        size={moderateScale(32)}
                        color="#ef0d8d"
                    />
                </View>

                <Text style={styles.offlineTitle}>No Connection</Text>
                <Text style={styles.offlineSubtitle}>
                    Check your Wi-Fi or cellular data and try again.
                </Text>

                <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={handleRetry}
                    activeOpacity={0.75}
                >
                    <Icon name="refresh" size={moderateScale(16)} color="#FFF" />
                    <Text style={styles.retryLabel}>Try Again</Text>
                </TouchableOpacity>
            </View>
        );
    }

    // ── Restored banner ─────────────────────────────────────────────────────
    if (status === 'restored') {
        return (
            <Animated.View
                style={[
                    styles.banner,
                    { top: insets.top, transform: [{ translateY }] },
                ]}
            >
                <Icon name="check-circle-outline" size={moderateScale(15)} color="#FFF" />
                <Text style={styles.bannerLabel}>Back online</Text>
            </Animated.View>
        );
    }

    return null;
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    /* ── Offline screen ── */
    offlineScreen: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: '#FFFFFF',
        zIndex: 10000,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: moderateScale(36),
    },
    iconRing: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(40),
        backgroundColor: '#FFF0F7',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: moderateScale(24),
    },
    offlineTitle: {
        fontSize: moderateScale(20),
        fontWeight: '700',
        color: '#1A1A2E',
        marginBottom: moderateScale(8),
        letterSpacing: 0.2,
    },
    offlineSubtitle: {
        fontSize: moderateScale(14),
        color: '#8E8E9A',
        textAlign: 'center',
        lineHeight: 21,
        marginBottom: moderateScale(32),
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: '#ef0d8d',
        paddingHorizontal: moderateScale(28),
        paddingVertical: moderateScale(13),
        borderRadius: moderateScale(24),
        shadowColor: '#ef0d8d',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 4,
    },
    retryLabel: {
        color: '#FFFFFF',
        fontSize: moderateScale(14),
        fontWeight: '600',
        letterSpacing: 0.4,
    },

    /* ── Restored banner ── */
    banner: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: BANNER_HEIGHT,
        zIndex: 9999,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: '#27AE60',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
        elevation: 6,
    },
    bannerLabel: {
        color: '#FFFFFF',
        fontSize: moderateScale(13),
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});

export default NetworkStatus;