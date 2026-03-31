import { ENDPOINTS } from '../config/apiConfig';
import { parseUTF8JSON } from '../utils/utf8Helper';
import { navigate } from '../navigation/NavigationService';

// ─── Bot protection cookie ────────────────────────────────────────────────────
// nadarmahamai.com uses Imunify360 bot protection.
// This cookie bypasses the 409 Conflict block on all requests.
const BOT_COOKIE = 'humans_21909=1';

/**
 * Login User
 * @param {string} profileId
 * @param {string} password
 */
export const loginUser = async (profileId, password) => {
    try {
        const body = `email=${encodeURIComponent(profileId)}&password=${encodeURIComponent(password)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(ENDPOINTS.LOGIN, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json, text/plain, */*',
                'Accept-Charset': 'utf-8',
                'Cache-Control': 'no-cache',
                'Cookie': BOT_COOKIE,   // ← bypasses Imunify360 bot protection
            },
            body,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status >= 500) {
                navigate('ServerSlow');
            }
            throw new Error(`Network response error: ${response.status}`);
        }

        const responseText = await response.text();
        const result = parseUTF8JSON(responseText);

        console.log('Login Response:', JSON.stringify(result, null, 2));
        return result;

    } catch (error) {
        if (error.name === 'AbortError' || error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
            navigate('ServerSlow');
            return { status: false, message: 'Server is slow or unreachable' };
        }
        
        console.error('Login error:', error);
        return {
            status: false,
            message: 'Network error or server unavailable. Please check your connection.',
        };
    }
};

/**
 * Register User
 * @param {Object} formData
 */
export const registerUser = async (formData) => {
    try {
        const details = {
            name: formData.name || '',
            gender: formData.gender || '',
            dob: formData.dob || '',
            birthTime: formData.birthTime || '',
            birthPlace: formData.birthPlace || '',
            nativePlace: formData.nativePlace || '',
            state: formData.state || '',
            district: formData.district || '',
            city: formData.city || '',
            fatherName: formData.fatherName || '',
            motherName: formData.motherName || '',
            phone1: formData.phone1 || '',
            phone2: formData.phone2 || '',
            email: formData.email || '',
            password: formData.password || '',
            religion: formData.religion || '',
            rasi: formData.rasi || '',
            star: formData.star || '',
            direction: formData.direction || '',
            gothram: formData.gothram || '',
            complexion: formData.complexion || '',
            heightFt: formData.heightFt || '0',
            heightIn: formData.heightIn || '0',
            education: formData.education || '',
            job: formData.job || '',
            workPlace: formData.workPlace || '',
            income: formData.income || '0',
            maritalStatus: formData.maritalStatus || '',
            marriageType: formData.marriageType || '',
            marriageReason: formData.marriageReason || '',
            hasChildren: formData.hasChildren || 'No',
            noOfChildren: formData.noOfChildren || '0',
            childrenDetails: formData.childrenDetails || '',
            brothers: formData.brothers || '0',
            sisters: formData.sisters || '0',
            marriedBrothers: formData.marriedBrothers || '0',
            marriedSisters: formData.marriedSisters || '0',
            expectations: formData.expectations || '',
            aboutSelf: formData.aboutSelf || '',
            motherTongue: formData.motherTongue || 'தமிழ்',
        };

        const formBody = Object.keys(details)
            .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(details[key])}`)
            .join('&');

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(ENDPOINTS.REGISTER, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'Accept': 'application/json',
                'Cookie': BOT_COOKIE,   // ← bypasses Imunify360 bot protection
            },
            body: formBody,
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status >= 500) {
                navigate('ServerSlow');
            }
            const errorText = await response.text();
            console.error('Registration API Error:', errorText);
            throw new Error('Registration failed');
        }

        const responseText = await response.text();
        return parseUTF8JSON(responseText);

    } catch (error) {
        if (error.name === 'AbortError' || error.message?.includes('Network request failed') || error.message?.includes('Failed to fetch')) {
            navigate('ServerSlow');
            return { status: false, message: 'Server is slow or unreachable' };
        }

        console.error('Registration error:', error);
        return {
            status: false,
            message: 'Failed to connect to the server: ' + error.message,
        };
    }
};