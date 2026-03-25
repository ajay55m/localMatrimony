import { ENDPOINTS } from '../config/apiConfig';

// ─── Bot protection cookie ────────────────────────────────────────────────────
// nadarmahamai.com uses Imunify360 bot protection.
// Sending this cookie with every request bypasses the 409 Conflict block.
const BOT_COOKIE = 'humans_21909=1';

// ─── Default headers (applied to every request) ───────────────────────────────
const DEFAULT_HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': 'application/json',
    'Cookie': BOT_COOKIE,
};

// ─── Image URL helpers ────────────────────────────────────────────────────────
const BASE_URL        = 'https://nadarmahamai.com/adminpanel/matrimony/userphoto/';
const CORRECT_IMG_BASE = 'https://nadarmahamai.com/adminpanel/matrimony/userphoto/';
const WRONG_IMG_BASE   = 'https://nadarmahamai.com/uploads/';

const toFullUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith(WRONG_IMG_BASE)) return CORRECT_IMG_BASE + raw.slice(WRONG_IMG_BASE.length);
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${BASE_URL}${raw}`;
};

// Checks all known image fields in priority order and returns a full URL or null.
const resolveProfileImage = (profile) => {
    if (profile?.profile_image) return toFullUrl(profile.profile_image);
    if (profile?.user_photo && profile.user_photo !== '') return toFullUrl(profile.user_photo);
    if (profile?.photo_data1) return toFullUrl(profile.photo_data1);
    if (profile?.photo_data2) return toFullUrl(profile.photo_data2);
    if (profile?.photo_data3) return toFullUrl(profile.photo_data3);
    return null;
};

// ─── Manual UTF-8 decoder (safe fallback for older devices) ───────────────────
const manualDecodeUTF8 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let result = '';
    let i = 0;
    while (i < bytes.length) {
        const c = bytes[i++];
        if (c < 128) {
            result += String.fromCharCode(c);
        } else if (c >= 192 && c < 224) {
            result += String.fromCharCode(((c & 31) << 6) | (bytes[i++] & 63));
        } else if (c >= 224 && c < 240) {
            result += String.fromCharCode(
                ((c & 15) << 12) | ((bytes[i++] & 63) << 6) | (bytes[i++] & 63)
            );
        } else if (c >= 240 && c < 248) {
            const val =
                ((c & 7) << 18) |
                ((bytes[i++] & 63) << 12) |
                ((bytes[i++] & 63) << 6) |
                (bytes[i++] & 63);
            result += String.fromCharCode(
                0xD800 + ((val - 0x10000) >> 10),
                0xDC00 + ((val - 0x10000) & 0x3FF)
            );
        }
    }
    return result;
};

// ─── Core fetch utility ───────────────────────────────────────────────────────
// Merges DEFAULT_HEADERS into every request automatically.
// Forces UTF-8 decoding from raw bytes to handle Tamil characters correctly.
export const fetchJSON = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            ...DEFAULT_HEADERS,
            ...options?.headers,
        },
    });

    if (!response.ok) throw new Error(`HTTP error: ${response.status}`);

    try {
        const buffer = await response.arrayBuffer();

        if (typeof TextDecoder !== 'undefined') {
            try {
                const decoder = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true });
                const text = decoder.decode(buffer);
                return JSON.parse(text);
            } catch (e) {
                console.warn('TextDecoder failed, falling back to manual decoder:', e);
            }
        }

        const text = manualDecodeUTF8(buffer);
        return JSON.parse(text);

    } catch (e) {
        console.error('fetchJSON parse error:', e);
        return { status: false, message: 'Invalid response from server' };
    }
};

// ─── Profile normalizer for get_selected_profiles response ───────────────────
// Backend always returns viewed:true for this action.
// Both viewed_at (snake_case from backend) and viewedAt (camelCase from local
// cache) are preserved so all screens read the timestamp correctly.
const normalizeSelectedProfile = (profile) => ({
    ...profile,
    id:              profile.tamil_profile_id || profile.id,
    profile_id:      profile.profile_id,
    name:            profile.name || profile.user_name || 'Unknown',
    profile_image:   resolveProfileImage(profile),
    age:             profile.age,
    height:          profile.height || (profile.height_feet ? `${profile.height_feet}ft ${profile.height_inches}in` : ''),
    education:       (Array.isArray(profile.education) ? profile.education[0] : profile.education) || '',
    occupation:      profile.occupation || profile.occupation_name || 'Not Specified',
    location:        profile.location || profile.place || profile.gplace || profile.city || 'Unknown',
    religion:        profile.religion || profile.religion_name,
    caste:           profile.caste || 'Nadar',
    verified:        profile.verified ?? true,
    viewed:          true,  // get_selected_profiles always returns truly viewed profiles
    is_selected:     profile.is_selected === true || profile.is_selected === '1' || profile.is_selected === 1 || false,
    photo_requested: profile.photo_requested === true || profile.photo_requested === '1' || profile.photo_requested === 1 || false,
    // Normalise timestamp — backend sends viewed_at, local cache may send viewedAt
    viewed_at:       profile.viewed_at  || profile.viewedAt || null,
    viewedAt:        profile.viewedAt   || profile.viewed_at || null,
});

// ─── API functions ────────────────────────────────────────────────────────────

/**
 * getSelectedProfiles
 * action=get_selected_profiles
 * Queries selected_profiles_count WHERE user_id=$aid, JOINs register_tamil,
 * returns ONLY truly viewed profiles with viewed:true and viewed_at timestamp.
 * This is the correct endpoint for the ViewedProfiles screen.
 */
export const getSelectedProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_selected_profiles`,
        });

        if (result?.status && Array.isArray(result.data)) {
            result.data = result.data.map(normalizeSelectedProfile);
        } else if (result?.status) {
            result.data = [];
        }

        return result;
    } catch (error) {
        console.error('getSelectedProfiles error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getViewedProfiles
 * action=get_profiles
 * Same endpoint as selected-profiles but returns full list + viewing metadata.
 * We normalize this to same structure (viewed/is_selected etc). 
 */
export const getViewedProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_profiles`,
        });

        if (result?.status && Array.isArray(result.data)) {
            result.data = result.data.map(normalizeSelectedProfile);
        } else if (result?.status) {
            result.data = [];
        }

        return result;
    } catch (error) {
        console.error('getViewedProfiles error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getSelectedCount
 * action=get_selected_count
 * Returns only counts, avoids fetching large profile data.
 */
export const getSelectedCount = async (tamilClientId) => {
    try {
        return await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_selected_count`,
        });
    } catch (error) {
        console.error('getSelectedCount error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * selectProfile
 * action=view_profile
 * Called from ProfileDetails when user opens a profile for the first time.
 * Inserts a row into selected_profiles_count:
 *   (user_id=$aid, views_list=$target_id, r_date=NOW(), count=1)
 * Backend has duplicate guard — safe to call even if already recorded.
 * Returns { status, viewed_count, viewer_id, target_id }
 */
export const selectProfile = async (tamilClientId, selectedProfileId) => {
    try {
        return await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=view_profile&selected_profile_id=${encodeURIComponent(selectedProfileId)}`,
        });
    } catch (error) {
        console.error('selectProfile error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * submitSelectedProfile
 * Calls the new backend API your_file_name.php to insert shortlist selections.
 * Keys: tamil_client_id, action, selected_profile_id
 */
export const submitSelectedProfile = async (tamilClientId, targetId, action = 'select_profile') => {
    try {
        return await fetchJSON(ENDPOINTS.SUBMIT_SELECTED_PROFILE, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=${encodeURIComponent(action)}&selected_profile_id=${encodeURIComponent(targetId)}`,
        });
    } catch (error) {
        console.error('submitSelectedProfile error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * searchProfiles
 * Searches profiles by given params. Returns max 50 results.
 */
export const searchProfiles = async (searchParams) => {
    try {
        const cleanParams = {};
        Object.keys(searchParams).forEach((key) => {
            const value = searchParams[key];
            if (
                value !== undefined &&
                value !== null &&
                value !== '' &&
                !(typeof value === 'string' && value.startsWith('SELECT_'))
            ) {
                cleanParams[key] = value;
            }
        });

        const body = Object.keys(cleanParams)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(cleanParams[key])}`)
            .join('&');

        const result = await fetchJSON(ENDPOINTS.SEARCH_PROFILES, {
            method: 'POST',
            body,
        });

        if (result?.status && Array.isArray(result.data)) {
            if (result.data.length > 50) result.data = result.data.slice(0, 50);

            result.data = result.data.map((profile) => ({
                ...profile,
                id:            profile.id || profile.profile_id,
                profile_id:    profile.profile_id || profile.id,
                name:          profile.user_name || profile.profile_name || profile.name,
                profile_image: resolveProfileImage(profile),
                lastActive:    profile.last_seen || 'Online',
                viewed:        false,
                verified:      profile.ver_flag === 1 || profile.profile_status === '1',
                education:     profile.padippu || (Array.isArray(profile.education) ? profile.education[0] : profile.education) || '',
                occupation:    profile.occupation || profile.profession || 'Not Specified',
                location:      profile.gplace || profile.city || profile.district || 'Unknown',
                avatarColor:   Math.random() > 0.5 ? ['#f3f4f7', '#2C73D2'] : ['#E74C5C', '#D32F2F'],
                age:           profile.age,
                height:        profile.height || (profile.height_feet ? `${profile.height_feet}ft ${profile.height_inches}in` : ''),
                religion:      profile.religion,
                caste:         profile.caste,
                district:      profile.district,
                city:          profile.city,
            }));
        }

        return result;
    } catch (error) {
        console.error('searchProfiles error:', error);
        return { status: false, message: 'Network error or search failed' };
    }
};

/**
 * getProfile
 * Fetches full profile details by numeric register_tamil.id.
 */
export const getProfile = async (profileId) => {
    try {
        return await fetchJSON(ENDPOINTS.GET_PROFILE, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(profileId)}`,
        });
    } catch (error) {
        console.error('getProfile error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getDashboardStats
 * Fetches dashboard counts and stats for the logged-in user.
 */
export const getDashboardStats = async (clientId) => {
    try {
        return await fetchJSON(ENDPOINTS.DASHBOARD, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(clientId)}`,
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getUserProfiles
 * Fetches the logged-in user's own profile (used in ProfileScreen).
 */
export const getUserProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.USER_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}`,
        });

        if (result?.status) {
            let profileData = null;

            if (result.data?.tamil_profile || result.data?.main_profile) {
                profileData = [result.data.tamil_profile || result.data.main_profile];
            } else if (Array.isArray(result.data)) {
                profileData = result.data;
            }

            if (profileData) {
                result.data = profileData.map((profile) => ({
                    ...profile,
                    id:            profile.tamil_profile_id || profile.id || profile.profile_id,
                    profile_id:    profile.profile_id || profile.id,
                    name:          profile.name || profile.user_name || profile.profile_name,
                    profile_image: resolveProfileImage(profile),
                    age:           profile.age,
                    height:        profile.height || (profile.height_feet ? `${profile.height_feet}ft ${profile.height_inches}in` : ''),
                    education:     (Array.isArray(profile.education) ? profile.education[0] : profile.education) || profile.padippu || '',
                    occupation:    profile.occupation || profile.profession || 'Not Specified',
                    location:      profile.location || profile.gplace || profile.city || profile.district || 'Unknown',
                    religion:      profile.religion,
                    caste:         profile.caste,
                    verified:      profile.ver_flag === 1 || profile.profile_status === '1' || profile.viewed === true,
                }));
            }
        }

        return result;
    } catch (error) {
        console.error('getUserProfiles error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getDropdowns
 * Fetches all dropdown option lists (education, occupation, etc.).
 */
export const getDropdowns = async () => {
    try {
        return await fetchJSON(ENDPOINTS.GET_DROPDOWNS, {
            method: 'POST',
            body: 'action=get_dropdowns',
        });
    } catch (error) {
        console.error('getDropdowns error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getHoroscope
 * Fetches horoscope details for a profile.
 */
export const getHoroscope = async (myId, profileId) => {
    try {
        return await fetchJSON(ENDPOINTS.VIEW_HOROSCOPE, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(myId)}&profile_id=${encodeURIComponent(profileId)}`,
        });
    } catch (error) {
        console.error('getHoroscope error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};