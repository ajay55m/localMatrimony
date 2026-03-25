import { Dimensions, PixelRatio, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

/**
 * Scale based on width
 * @param size 
 */
export const scale = (size) => (SCREEN_WIDTH / guidelineBaseWidth) * size;

/**
 * Scale based on height
 * @param size 
 */
export const verticalScale = (size) => (SCREEN_HEIGHT / guidelineBaseHeight) * size;

/**
 * Moderate scale that allows controlling the factor
 * @param size 
 * @param factor 
 */
export const moderateScale = (size, factor = 0.5) => size + (scale(size) - size) * factor;

/**
 * Get screen width
 */
export const width = SCREEN_WIDTH;

/**
 * Get screen height
 */
export const height = SCREEN_HEIGHT;

/**
 * Device characterisics
 */
export const isTablet = () => {
    const pixelDensity = PixelRatio.get();
    const adjustedWidth = SCREEN_WIDTH * pixelDensity;
    const adjustedHeight = SCREEN_HEIGHT * pixelDensity;
    if (pixelDensity < 2 && (adjustedWidth >= 1000 || adjustedHeight >= 1000)) {
        return true;
    }
    return (
        pixelDensity === 2 && (adjustedWidth >= 1920 || adjustedHeight >= 1920)
    );
};

export const isSmallDevice = SCREEN_WIDTH < 375;

/**
 * Breakpoints for media query style logic
 */
export const breakpoints = {
    sm: 375,
    md: 768,
    lg: 1024,
    xl: 1280
};

export default {
    scale,
    verticalScale,
    moderateScale,
    width,
    height,
    isTablet,
    isSmallDevice,
    breakpoints
};
