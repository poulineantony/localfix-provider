import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Platform } from 'react-native';
import { chatService } from './chatService';

class ProviderTrackingService {
    private watchId: number | null = null;
    private currentBookingId: string | null = null;

    private async requestPermissions() {
        if (Platform.OS === 'ios') {
            Geolocation.requestAuthorization();
            return true;
        }

        if (Platform.OS === 'android') {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'LocalFix needs access to your location for job tracking.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                }
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return false;
    }

    async startTracking(bookingId: string) {
        if (this.watchId !== null) return;
        this.currentBookingId = bookingId;

        const hasPermission = await this.requestPermissions();
        if (!hasPermission) {
            console.error('Location permission denied');
            return;
        }

        this.watchId = Geolocation.watchPosition(
            (position) => {
                if (this.currentBookingId) {
                    chatService.sendLocation({
                        bookingId: this.currentBookingId,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    });
                }
            },
            (error) => console.log('Location error:', error),
            { enableHighAccuracy: true, distanceFilter: 10, interval: 10000 }
        );
    }

    stopTracking() {
        if (this.watchId !== null) {
            Geolocation.clearWatch(this.watchId);
            this.watchId = null;
        }
        this.currentBookingId = null;
    }
}

export const providerTrackingService = new ProviderTrackingService();
