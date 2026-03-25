import AsyncStorage from '@react-native-async-storage/async-storage';

export const KEYS = {
    USER_SESSION: 'userSession',
    USER_DATA: 'userData',
    CLIENT_ID: 'client_id',
    TAMIL_CLIENT_ID: 'tamil_client_id',
    USERNAME: 'username',
    SELECTED_PROFILES_LIST: 'selected_profiles_list',
};

export const setSession = async (data) => {
    try {
        if (!data) return false;

        await AsyncStorage.multiRemove([
            KEYS.TAMIL_CLIENT_ID,
            KEYS.USERNAME,
        ]);

        const updatedData = { ...data, no_sel_profiles: '0' };

        const sessionData = {
            [KEYS.USER_SESSION]: 'true',
            [KEYS.USER_DATA]: JSON.stringify(updatedData),
        };

        // ── FIX: Store the NUMERIC register_tamil.id as TAMIL_CLIENT_ID ──────
        // PHP selected-profiles.php uses WHERE id='$uid' (numeric lookup).
        // Priority: tamil_client_id (if explicitly returned by login API)
        //         → id (numeric register_tamil.id — most reliable)
        //         → client_id (may be m_id string like HM8282 — avoid for PHP lookups)
        const numericId = data.tamil_client_id || data.id || data.m_id || null;
        if (numericId) sessionData[KEYS.TAMIL_CLIENT_ID] = String(numericId);

        // Store client_id separately (may be m_id string, used for display)
        if (data.client_id) sessionData[KEYS.CLIENT_ID] = String(data.client_id);
        if (data.username) sessionData[KEYS.USERNAME] = data.username;

        await AsyncStorage.multiSet(Object.entries(sessionData));

        console.log('[session] initialized for', numericId, 'client_id:', data.client_id);
        return true;
    } catch (error) {
        console.error('[session] setSession error:', error);
        return false;
    }
};

export const getSession = async (key) => {
    try {
        const value = await AsyncStorage.getItem(key);
        if (key === KEYS.USER_DATA && value) return JSON.parse(value);
        return value;
    } catch (error) {
        console.error(`[session] getSession(${key}) error:`, error);
        return null;
    }
};

export const clearSession = async () => {
    try {
        await AsyncStorage.setItem('justLoggedOut', 'true');
        await AsyncStorage.multiRemove(Object.values(KEYS));
        console.log('[session] cleared');
        return true;
    } catch (error) {
        console.error('[session] clearSession error:', error);
        return false;
    }
};

export const isLoggedIn = async () => {
    try {
        const session = await AsyncStorage.getItem(KEYS.USER_SESSION);
        return session === 'true';
    } catch {
        return false;
    }
};

export default { setSession, getSession, clearSession, isLoggedIn, KEYS };