import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

const useInternetSpeed = () => {
    // 'unknown', 'offline', 'slow', 'fast'
    const [speed, setSpeed] = useState('unknown');

    useEffect(() => {
        const unsubscribe = NetInfo.addEventListener(state => {
            if (!state.isConnected) {
                setSpeed('offline');
            } else {
                // Heuristic for "slow"
                // 2G/3G or poor downlink
                const isSlow = (state.type === 'cellular' && (state.details?.cellularGeneration === '2g' || state.details?.cellularGeneration === '3g')) ||
                    (state.details && typeof state.details.downlink === 'number' && state.details.downlink < 1.5);

                setSpeed(isSlow ? 'slow' : 'fast');
            }
        });

        // Initial check might be needed if event doesn't fire immediately, 
        // but addEventListener usually triggers with current state.

        return () => unsubscribe();
    }, []);

    return speed;
};

export default useInternetSpeed;
