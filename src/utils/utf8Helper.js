/**
 * UTF-8 Helper Utilities
 * Simplified - just passthrough since we're handling encoding at fetch level
 */

/**
 * Safely decode a single UTF-8 string - just return as-is
 * The data should already be properly decoded by the fetch layer
 */
export const decodeUTF8String = (str) => {
    if (!str || typeof str !== 'string') return str;
    return str; // Return as-is, no manipulation needed
};

/**
 * Recursively decode all strings in an object/array
 */
export const decodeAllStrings = (obj) => {
    return obj; // Return as-is, no manipulation needed
};

/**
 * Parse JSON from fetch response - just parse, no extra decoding
 */
export const parseUTF8JSON = (responseText) => {
    try {
        return JSON.parse(responseText);
    } catch (e) {
        console.error('JSON parse error:', e);
        throw e;
    }
};

export const logUTF8String = (label, str) => {
    if (!str || typeof str !== 'string') return;
    console.log(`[UTF-8 DEBUG] ${label}:`, str);
    // Also log the actual character codes to debug encoding issues
    if (str.length > 0) {
        const codes = [];
        for (let i = 0; i < Math.min(str.length, 10); i++) {
            codes.push(str.charCodeAt(i));
        }
        console.log(`[UTF-8 DEBUG] ${label} char codes:`, codes);
    }
};