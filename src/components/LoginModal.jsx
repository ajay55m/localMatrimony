import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { loginUser } from '../services/authService';
import { getProfile } from '../services/profileService';
import { setSession } from '../utils/session';
import { useNavigation } from '@react-navigation/native';
import { moderateScale } from '../utils/responsive';

const { width } = Dimensions.get('window');

const LoginModal = ({ visible, onClose, onLoginSuccess, t }) => {
    const navigation = useNavigation();
    const [profileId, setProfileId] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleForgotPassword = () => {
        Alert.alert(
            t('FORGOT_PASSWORD_TITLE') || 'Forgot Password',
            t('FORGOT_PASSWORD_MSG') || 'Please contact administrator to reset your password.',
            [{ text: t('OK') || 'OK' }]
        );
    };

    const submitLogin = async () => {
        if (!profileId || !password) {
            Alert.alert(t('ERROR') || 'Required Fields', t('FILL_ALL_FIELDS') || 'Please enter both your Profile ID and Password to continue.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await loginUser(profileId, password);
            if (result.status && result.data) {
                const clientId = result.data.tamil_client_id || result.data.id || result.data.m_id;
                let sessionDataToStore = result.data;

                if (clientId) {
                    try {
                        const fullProfileRes = await getProfile(clientId);
                        if (fullProfileRes?.status && fullProfileRes?.data) {
                            const liveData = fullProfileRes.data.tamil_profile || fullProfileRes.data.main_profile || fullProfileRes.data;
                            if (liveData) {
                                sessionDataToStore = { ...result.data, ...liveData };
                            }
                        }
                    } catch (fetchErr) {
                        console.error('Failed to fetch full profile during login modal', fetchErr);
                    }
                }

                await setSession(sessionDataToStore);
                if (onLoginSuccess) {
                    onLoginSuccess(sessionDataToStore);
                }
                setProfileId('');
                setPassword('');
            } else {
                const errorStr = (result.message || '').toLowerCase();
                let professionalAuthAlert = result.message || 'Login failed. Please check your credentials and try again.';

                if (errorStr.includes('password') || errorStr.includes('wrong pass')) {
                    professionalAuthAlert = 'The password entered is incorrect. Please verify your password and try again.';
                } else if (errorStr.includes('profile') || errorStr.includes('invalid') || errorStr.includes('not found')) {
                    professionalAuthAlert = 'The Profile ID you entered could not be found. Please check your ID and try again.';
                }

                Alert.alert('Login Unsuccessful', professionalAuthAlert);
            }
        } catch (error) {
            console.error('Login error modal:', error);
            Alert.alert('Connection Error', 'We are unable to connect to the server at this time.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.loginModalContainer}>
                    <TouchableOpacity
                        style={styles.closeModalBtn}
                        onPress={onClose}
                    >
                        <Icon name="close" size={24} color="#ef0d8d" />
                    </TouchableOpacity>

                    <Text style={styles.modalTitle}>{t('LOGIN')}</Text>
                    <Text style={styles.modalSubtitle}>{t('PLEASE_LOGIN')}</Text>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('PROFILE_ID') || 'Profile ID'}</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="account" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="HN1234..."
                                placeholderTextColor="#999"
                                value={profileId}
                                onChangeText={setProfileId}
                                textContentType="username"
                                autoComplete="username"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <View style={styles.inputContainer}>
                        <Text style={styles.inputLabel}>{t('PASSWORD') || 'Password'}</Text>
                        <View style={styles.inputWrapper}>
                            <Icon name="lock" size={20} color="#666" style={styles.inputIcon} />
                            <TextInput
                                style={styles.modalInput}
                                placeholder="******"
                                placeholderTextColor="#999"
                                secureTextEntry
                                value={password}
                                onChangeText={setPassword}
                                textContentType="password"
                                autoComplete="password"
                                autoCapitalize="none"
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.fullWidthBtn}
                        onPress={submitLogin}
                        disabled={isSubmitting}
                    >
                        <LinearGradient
                            colors={['#ef0d8d', '#ad0761']}
                            style={styles.btnGradient}
                        >
                            <Text style={styles.btnText}>
                                {isSubmitting ? '...' : t('LOGIN')}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <View style={styles.loginExtraActions}>
                        <TouchableOpacity style={styles.forgotBtn} onPress={handleForgotPassword}>
                            <Text style={styles.forgotText}>{t('FORGOT_PASSWORD') || 'Forgot Password?'}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.registerLinkBtn}
                            onPress={() => {
                                onClose();
                                navigation.navigate('Register');
                            }}
                        >
                            <Text style={styles.registerLinkText}>
                                {t('NO_ACCOUNT') || "Don't have an account?"} <Text style={styles.registerLinkSpan}>{t('REGISTER')}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginModalContainer: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 25,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
    },
    closeModalBtn: {
        position: 'absolute',
        top: 15,
        right: 15,
        zIndex: 10,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#ef0d8d',
        textAlign: 'center',
        marginBottom: 10,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 25,
    },
    inputContainer: {
        marginBottom: 15,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 12,
    },
    inputIcon: {
        marginRight: 10,
    },
    modalInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
        color: '#333',
    },
    fullWidthBtn: {
        marginTop: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    btnGradient: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loginExtraActions: {
        marginTop: 20,
        alignItems: 'center',
        gap: 15,
    },
    forgotBtn: {
        alignItems: 'center',
    },
    forgotText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '500',
    },
    registerLinkBtn: {
        marginTop: 5,
    },
    registerLinkText: {
        color: '#666',
        fontSize: 14,
    },
    registerLinkSpan: {
        color: '#ef0d8d',
        fontWeight: 'bold',
    },
});

export default LoginModal;
