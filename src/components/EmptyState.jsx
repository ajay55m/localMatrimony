import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, moderateScale } from '../utils/responsive';

const EmptyState = ({ icon = 'database-remove', title = 'No Data Found', message = "We couldn't track down any records at the moment." }) => {
    return (
        <View style={styles.container}>
            <View style={styles.iconContainer}>
                <Icon name={icon} size={scale(44)} color="#ef0d8d" />
            </View>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: scale(20),
        minHeight: scale(250),
    },
    iconContainer: {
        width: scale(90),
        height: scale(90),
        borderRadius: scale(45),
        backgroundColor: '#FFE4F3',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: scale(16),
        shadowColor: '#ef0d8d',
        shadowOffset: { width: 0, height: scale(4) },
        shadowOpacity: 0.1,
        shadowRadius: scale(6),
        elevation: 3,
    },
    title: {
        fontSize: moderateScale(18),
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: scale(8),
        textAlign: 'center',
        fontFamily: 'NotoSansTamil-Bold',
    },
    message: {
        fontSize: moderateScale(14),
        color: '#6B7280',
        textAlign: 'center',
        paddingHorizontal: scale(20),
        lineHeight: moderateScale(22),
        fontFamily: 'NotoSansTamil-Regular',
    }
});

export default EmptyState;
