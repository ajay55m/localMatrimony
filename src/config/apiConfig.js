/**
 * API Configuration
 * Centralized place for all API related constants
 */

export const BASE_URL = 'https://nadarmahamai.com/api';

export const ENDPOINTS = {
    LOGIN: `${BASE_URL}/login.php`,
    REGISTER: `${BASE_URL}/register.php`,
    SELECTED_PROFILES: `${BASE_URL}/selected-profiles.php`,
    SEARCH_PROFILES: `${BASE_URL}/search_profiles.php`,
    GET_PROFILE: `${BASE_URL}/get-profile.php`,
    USER_PROFILES: `${BASE_URL}/userProfile.php`,
    DASHBOARD: `${BASE_URL}/get-profile.php`,
    GET_DROPDOWNS: `${BASE_URL}/register.php`,
    VIEW_HOROSCOPE: `${BASE_URL}/view_horoscope_api.php`,
    SUBMIT_SELECTED_PROFILE: `${BASE_URL}/selected-profiles.php`,
};

export default {
    BASE_URL,
    ENDPOINTS,
};