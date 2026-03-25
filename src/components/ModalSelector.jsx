import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    FlatList,
    Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { height } = Dimensions.get('window');

const ModalSelector = ({ visible, options, selectedValue, onSelect, onClose, title, labels = {} }) => {
    if (!visible) return null;

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.optionItem,
                item === selectedValue && styles.selectedOption
            ]}
            onPress={() => {
                onSelect(item);
                onClose();
            }}
        >
            <Text style={[
                styles.optionText,
                item === selectedValue && styles.selectedOptionText
            ]}>
                {labels[item] || item}
            </Text>
            {item === selectedValue && (
                <Icon name="check" size={20} color="#ef0d8d" />
            )}
        </TouchableOpacity>
    );

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title || 'Select Option'}</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Icon name="close" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={options}
                        renderItem={renderItem}
                        keyExtractor={(item) => item.toString()}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.listContent}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: height * 0.7,
        width: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    closeButton: {
        padding: 4,
    },
    listContent: {
        padding: 16,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f5f5f5',
    },
    selectedOption: {
        backgroundColor: '#fff0f8',
        borderRadius: 8,
        borderBottomWidth: 0,
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
    selectedOptionText: {
        color: '#ef0d8d',
        fontWeight: 'bold',
    },
});

export default ModalSelector;
