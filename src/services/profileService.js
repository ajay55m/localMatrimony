import { ENDPOINTS, BASE_IMAGE_URL, WRONG_IMAGE_URL } from '../config/apiConfig';
import { navigate } from '../navigation/NavigationService';

/**
 * ── Bot protection cookie ────────────────────────────────────────────────────
 * nadarmahamai.com uses Imunify360 bot protection.
 * Sending this cookie with every request bypasses the 409 Conflict block.
 */
const BOT_COOKIE = 'humans_21909=1';

// ── Default headers (applied to every request) ───────────────────────────────
const DEFAULT_HEADERS = {
    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
    'Accept': 'application/json',
    'Cookie': BOT_COOKIE,
};

// ── Image URL helpers ────────────────────────────────────────────────────────
const toFullUrl = (raw) => {
    if (!raw) return null;
    if (raw.startsWith(WRONG_IMAGE_URL)) return BASE_IMAGE_URL + raw.slice(WRONG_IMAGE_URL.length);
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    return `${BASE_IMAGE_URL}${raw}`;
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

// ── Manual UTF-8 decoder (safe fallback for older devices) ───────────────────
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

// ── Core fetch utility ───────────────────────────────────────────────────────
// Merges DEFAULT_HEADERS into every request automatically.
// Forces UTF-8 decoding from raw bytes to handle Tamil characters correctly.
export const fetchJSON = async (url, options = {}) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
            headers: {
                ...DEFAULT_HEADERS,
                ...options?.headers,
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status >= 500) {
                navigate('ServerSlow');
            }
            throw new Error(`HTTP error: ${response.status}`);
        }

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
        clearTimeout(timeoutId);
        
        if (e.name === 'AbortError' || e.message?.includes('Network request failed') || e.message?.includes('Failed to fetch')) {
            console.warn('[Network] Server slow or unreachable:', e.message);
            navigate('ServerSlow');
            return { status: false, message: 'Server is slow or unreachable' };
        }

        console.error('fetchJSON parse error:', e);
        return { status: false, message: 'Invalid response from server' };
    }
};

// ── Profile normalizer ─────────────────────────────────────────────────────────
const normalizeProfile = (profile) => ({
    ...profile,
    id: profile.tamil_profile_id || profile.id,
    profile_id: profile.profile_id,
    name: profile.name || profile.user_name || 'Unknown',
    profile_image: resolveProfileImage(profile),
    age: profile.age,
    height: profile.height || (profile.height_feet ? `${profile.height_feet}ft ${profile.height_inches}in` : ''),
    education: (Array.isArray(profile.education) ? profile.education[0] : profile.education) || '',
    occupation: profile.occupation || profile.occupation_name || 'Not Specified',
    location: profile.location || profile.place || profile.gplace || profile.city || 'Unknown',
    religion: profile.religion || profile.religion_name,
    caste: profile.caste || 'Nadar',
    verified: profile.verified ?? true,
    is_selected: profile.is_selected === true || profile.is_selected === '1' || profile.is_selected === 1 || false,
    photo_requested: profile.photo_requested === true || profile.photo_requested === '1' || profile.photo_requested === 1 || false,
    viewed_at: profile.viewed_at || profile.viewedAt || null,
});

// ── API functions ────────────────────────────────────────────────────────────

/**
 * getSelectedProfiles
 * Returns profiles that the user has selected (shortlisted).
 */
export const getSelectedProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_selected_profiles`,
        });

        if (result?.status && Array.isArray(result.data)) {
            result.data = result.data.map(normalizeProfile);
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
 * Returns profiles that the user has viewed.
 */
export const getViewedProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_profiles`,
        });

        if (result?.status && Array.isArray(result.data)) {
            result.data = result.data.map(normalizeProfile);
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
 * selectProfile (record view)
 * Records that a profile has been viewed.
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
 * submitSelectedProfile (shortlist)
 * Adds a profile to the user's shortlisted profiles.
 */
export const submitSelectedProfile = async (tamilClientId, targetId, action = 'select_profile') => {
    try {
        return await fetchJSON(ENDPOINTS.SUBMIT_SELECTED_PROFILE || ENDPOINTS.SELECTED_PROFILES, {
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
            result.data = result.data.map(normalizeProfile);
        }

        return result;
    } catch (error) {
        console.error('searchProfiles error:', error);
        return { status: false, message: 'Network error or search failed' };
    }
};

/**
 * getProfile
 * Fetches full profile details by numeric ID.
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
 * getUserProfiles
 * Fetches profiles matching the logged-in user's preference/search.
 */
export const getUserProfiles = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.USER_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}`,
        });

        if (result?.status && Array.isArray(result.data)) {
            result.data = result.data.map(normalizeProfile);
        }

        return result;
    } catch (error) {
        console.error('getUserProfiles error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getDropdowns
 * Fetches all dropdown option lists.
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
 * getDashboardStats
 * Returns basic stats for the dashboard.
 */
export const getDashboardStats = async (tamilClientId) => {
    try {
        return await fetchJSON(ENDPOINTS.DASHBOARD, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}`,
        });
    } catch (error) {
        console.error('getDashboardStats error:', error);
        return { status: false, message: 'Network error or server unavailable' };
    }
};

/**
 * getSelectedCount
 * Returns just the counts for viewed and selected profiles.
 */
export const getSelectedCount = async (tamilClientId) => {
    try {
        const result = await fetchJSON(ENDPOINTS.SELECTED_PROFILES, {
            method: 'POST',
            body: `tamil_client_id=${encodeURIComponent(tamilClientId)}&action=get_selected_profiles`,
        });
        return result;
    } catch (error) {
        console.error('getSelectedCount error:', error);
        return { status: false, message: 'Network error' };
    }
};

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