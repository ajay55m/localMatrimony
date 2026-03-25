import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import useInternetSpeed from '../hooks/useInternetSpeed';

const { width } = Dimensions.get('window');

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

const Shimmer = ({ width: w, height: h, borderRadius = 4, style }) => {
    const translateX = useRef(new Animated.Value(-width)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.timing(translateX, {
                toValue: width,
                duration: 1500,
                useNativeDriver: true,
            })
        );
        animation.start();
        return () => animation.stop();
    }, []);

    // Width handling: if percentage, allow View to handle it
    const containerStyle = {
        width: w,
        height: h,
        borderRadius,
        overflow: 'hidden',
        backgroundColor: '#E0E0E0', // Base grey
        ...style
    };

    return (
        <View style={[styles.shimmerContainer, containerStyle]}>
            <AnimatedGradient
                colors={['#E0E0E0', '#F5F5F5', '#E0E0E0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                    ...StyleSheet.absoluteFillObject,
                    transform: [{ translateX }],
                }}
            />
        </View>
    );
};

// ----------------- Layouts -----------------

const ProfileCardSkeleton = () => (
    <View style={styles.cardSkeleton}>
        <View style={styles.row}>
            {/* Avatar */}
            <Shimmer width={72} height={72} borderRadius={36} />

            {/* Right Info */}
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Shimmer width="60%" height={20} style={{ marginBottom: 10 }} />
                <Shimmer width="40%" height={16} />
                <View style={{ marginTop: 10, flexDirection: 'row', gap: 5 }}>
                    <Shimmer width={50} height={20} borderRadius={10} />
                    <Shimmer width={50} height={20} borderRadius={10} />
                </View>
            </View>
        </View>

        {/* Details Grid */}
        <View style={{ marginTop: 20, flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1, gap: 8 }}>
                <Shimmer width="100%" height={16} />
                <Shimmer width="100%" height={16} />
                <Shimmer width="100%" height={16} />
            </View>
            <View style={{ flex: 1, gap: 8 }}>
                <Shimmer width="100%" height={16} />
                <Shimmer width="100%" height={16} />
                <Shimmer width="100%" height={16} />
            </View>
        </View>

        {/* Action Button */}
        <View style={{ marginTop: 20 }}>
            <Shimmer width="100%" height={45} borderRadius={22.5} />
        </View>
    </View>
);

const DashboardSkeleton = () => (
    <View style={styles.dashboardSkeleton}>
        {/* Top Widgets */}
        <View style={styles.rowBetween}>
            <Shimmer width={width * 0.44} height={100} borderRadius={12} />
            <Shimmer width={width * 0.44} height={100} borderRadius={12} />
        </View>

        {/* Section Title */}
        <View style={{ marginTop: 25, marginBottom: 15 }}>
            <Shimmer width={150} height={24} />
        </View>

        {/* Horizontal List (Stories/Profiles) */}
        <View style={{ flexDirection: 'row', gap: 15, overflow: 'hidden' }}>
            <Shimmer width={100} height={140} borderRadius={12} />
            <Shimmer width={100} height={140} borderRadius={12} />
            <Shimmer width={100} height={140} borderRadius={12} />
        </View>

        {/* Another Section */}
        <View style={{ marginTop: 25, marginBottom: 15 }}>
            <Shimmer width={180} height={24} />
        </View>

        {/* Big Card */}
        <View style={{ marginBottom: 20 }}>
            <Shimmer width="100%" height={180} borderRadius={16} />
        </View>
    </View>
);

const ListSkeleton = () => (
    <View style={{ padding: 15 }}>
        <Shimmer width="100%" height={80} borderRadius={12} style={{ marginBottom: 15 }} />
        <Shimmer width="100%" height={80} borderRadius={12} style={{ marginBottom: 15 }} />
        <Shimmer width="100%" height={80} borderRadius={12} style={{ marginBottom: 15 }} />
        <Shimmer width="100%" height={80} borderRadius={12} style={{ marginBottom: 15 }} />
        <Shimmer width="100%" height={80} borderRadius={12} style={{ marginBottom: 15 }} />
    </View>
);

const ContactSkeleton = () => (
    <View style={{ padding: 15 }}>
        {/* Title */}
        <Shimmer width={120} height={24} style={{ marginBottom: 20 }} />

        {/* List Items with Icons */}
        {[1, 2, 3, 4].map(i => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <Shimmer width={40} height={40} borderRadius={20} />
                <View style={{ marginLeft: 15, flex: 1 }}>
                    <Shimmer width="50%" height={14} style={{ marginBottom: 6 }} />
                    <Shimmer width="80%" height={18} />
                </View>
            </View>
        ))}
    </View>
);

const HoroscopeSkeleton = () => (
    <View style={{ padding: 15, gap: 14 }}>
        {/* Name Banner */}
        <Shimmer width="100%" height={74} borderRadius={14} />

        {/* Personal Details */}
        <Shimmer width="100%" height={65} borderRadius={16} />

        {/* Jothidam Badges */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><Shimmer width="100%" height={90} borderRadius={12} /></View>
            <View style={{ flex: 1 }}><Shimmer width="100%" height={90} borderRadius={12} /></View>
            <View style={{ flex: 1 }}><Shimmer width="100%" height={90} borderRadius={12} /></View>
        </View>

        {/* Charts */}
        <Shimmer width="100%" height={280} borderRadius={16} />
        <Shimmer width="100%" height={280} borderRadius={16} />
    </View>
);

// ----------------- Main -----------------

const Skeleton = ({ type = 'default' }) => {
    const speed = useInternetSpeed();

    const renderContent = () => {
        switch (type) {
            case 'Profile':
                // Show multiple cards for profile feed
                return (
                    <View style={{ padding: 15 }}>
                        <ProfileCardSkeleton />
                        <View style={{ height: 20 }} />
                        <ProfileCardSkeleton />
                    </View>
                );
            case 'Dashboard':
                return <DashboardSkeleton />;
            case 'Contact':
                return <ContactSkeleton />;
            case 'Horoscope':
                return <HoroscopeSkeleton />;
            case 'List':
            case 'Search':
                return <ListSkeleton />;
            default:
                return (
                    <View style={{ padding: 15 }}>
                        <Shimmer width="100%" height={200} borderRadius={8} />
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            {renderContent()}

            {/* Speed Indicators */}
            {speed === 'offline' && (
                <View style={[styles.statusBanner, { backgroundColor: '#D32F2F' }]}>
                    <Text style={styles.statusText}>You are currently offline</Text>
                </View>
            )}
            {speed === 'slow' && (
                <View style={[styles.statusBanner, { backgroundColor: '#F57C00' }]}>
                    <Text style={styles.statusText}>Weak connection. Loading may take time.</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    shimmerContainer: {
        // Wrapper styles handled inline mostly
    },
    cardSkeleton: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 15,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    dashboardSkeleton: {
        padding: 15,
    },
    row: {
        flexDirection: 'row',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statusBanner: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    }
});

export default Skeleton;
