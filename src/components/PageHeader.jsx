import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import { scale, moderateScale } from '../utils/responsive';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const PageHeader = ({ title, onBack, rightComponent, icon, backIcon = 'arrow-left', isOffline = false }) => {
    const insets = useSafeAreaInsets();
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" translucent={true} />
            <View style={[styles.header, { paddingTop: insets.top + scale(5) }, isOffline && { borderBottomWidth: 1, borderBottomColor: '#000000' }]}>
                {onBack ? (
                    <TouchableOpacity onPress={onBack} style={[styles.backButton, isOffline && { borderWidth: 1, borderColor: '#000000', backgroundColor: '#FFFFFF' }]}>
                        <Icon name={backIcon} size={24} color={isOffline ? '#000000' : "#ad0761"} />
                    </TouchableOpacity>
                ) : <View style={styles.backButtonPlaceholder} />}

                <View style={styles.titleBadgeContainer}>
                    <LinearGradient
                        colors={isOffline ? ['#FFFFFF', '#FFFFFF'] : ['#ef0d8d', '#ad0761']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.titleBadge, isOffline && { borderWidth: 1, borderColor: '#000000', elevation: 0 }]}
                    >
                        {icon && <Icon name={icon} size={scale(18)} color={isOffline ? '#000000' : "#FFFFFF"} style={{ marginRight: scale(8) }} />}
                        <Text style={[styles.headerTitle, isOffline && { color: '#000000' }]} numberOfLines={1}>{title}</Text>
                    </LinearGradient>
                </View>

                {rightComponent ? <View style={styles.rightPlaceholder}>{rightComponent}</View> : <View style={styles.backButtonPlaceholder} />}
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(15),
        paddingBottom: scale(10),
        backgroundColor: '#FFF',
    },
    backButton: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        backgroundColor: 'rgba(0,0,0,0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonPlaceholder: {
        width: scale(40),
    },
    titleBadgeContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: scale(10),
    },
    titleBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: scale(8),
        borderRadius: scale(25),
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        maxWidth: '100%',
    },
    headerTitle: {
        fontSize: moderateScale(14),
        fontWeight: 'bold',
        color: '#FFFFFF',
        letterSpacing: 0.5,
        flexShrink: 1,
    },
    rightPlaceholder: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        minWidth: scale(40),
        justifyContent: 'flex-end',
    },
});

export default PageHeader;
