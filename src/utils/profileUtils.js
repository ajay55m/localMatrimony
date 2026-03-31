/**
 * Profile Utilities
 * Functions for calculating profile metrics and metadata
 */

/**
 * calculateCompleteness
 * Calculates a percentage score based on filled fields in a profile object.
 * @param {Object} profile - The user profile data object
 * @returns {number} - Percentage (0-100)
 */
export const calculateCompleteness = (profile) => {
    if (!profile) return 0;

    // Define weights for different sections/fields
    const fields = [
        // Basic Info (30%)
        { key: 'name', weight: 5 },
        { key: 'gender', weight: 5 },
        { key: 'dob', weight: 5 },
        { key: 'phone1', weight: 5 },
        { key: 'email', weight: 10 },

        // Personal Details (20%)
        { key: 'maritalStatus', weight: 5 },
        { key: 'religion', weight: 5 },
        { key: 'caste', weight: 5 },
        { key: 'motherTongue', weight: 5 },

        // Career & Education (15%)
        { key: 'education', weight: 5 },
        { key: 'occupation', weight: 5 },
        { key: 'income', weight: 5 },

        // Physical & Location (20%)
        { key: 'height', weight: 5 },
        { key: 'complexion', weight: 5 },
        { key: 'district', weight: 5 },
        { key: 'city', weight: 5 },

        // Family & Horoscope (20%)
        { key: 'fatherName', weight: 5 },
        { key: 'motherName', weight: 5 },
        { key: 'aboutSelf', weight: 5 },
        { key: 'horoscope_image', weight: 5 },
    ];

    // Special handling for photos (10%)
    let photoPoints = 0;
    const hasPhoto =
        profile.profile_image ||
        profile.user_photo ||
        profile.photo_data1 ||
        (profile.photos && profile.photos.length > 0);

    if (hasPhoto) photoPoints = 10;

    let score = photoPoints;
    let totalWeight = 10; // Start with photo weight

    // Helper: check if a value is considered "filled"
    const isFilled = (value) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '' &&
        value !== '0' &&
        value !== 0;

    // Score each primary field
    fields.forEach(f => {
        totalWeight += f.weight;
        if (isFilled(profile[f.key])) {
            score += f.weight;
        }
    });

    // ── FIX: Actually call checkAlt for alternate keys ────────────────────────
    // If the primary key is empty but the alternate key is filled, award the points.
    const checkAlt = (primary, alt, weight) => {
        if (!isFilled(profile[primary]) && isFilled(profile[alt])) {
            score += weight;
        }
    };

    checkAlt('phone1', 'phone', 5); // phone fallback
    checkAlt('education', 'qualification', 5); // qualification alternate
    checkAlt('height', 'heightFt', 5); // heightFt alternate
    checkAlt('horoscope_image', 'horoscopePhoto', 5); // horoscopePhoto alternate

    // Ensure we don't exceed 100
    const percentage = Math.round((score / totalWeight) * 100);
    return Math.min(100, percentage);
};

/**
 * isProfileLimitReached
 * Checks if the user has reached their maximum profile selection limit.
 *
 * @param {Object} userData     - User data from session (contains user_points or no_sel_profiles)
 * @param {number} currentCount - How many profiles the user has already selected (fetched from API)
 * @returns {boolean}           - true if limit is reached, false otherwise
 *
 * Usage:
 *   const count = selectedProfiles.data.length;       // from getSelectedProfiles()
 *   const reached = isProfileLimitReached(userData, count);
 */
export const isProfileLimitReached = (userData, currentCount = 0) => {
    if (!userData) return false;

    // user_points = max allowed selections set by admin (e.g. 50)
    // currentCount = how many profiles user has actually selected so far
    const limit = parseInt(
        userData.user_points || userData.no_sel_profiles || '50',
        10
    );

    // If limit is 0 or invalid, treat as "no limit set"
    if (isNaN(limit) || limit <= 0) return false;

    return currentCount >= limit;
};

export default {
    calculateCompleteness,
    isProfileLimitReached,
};