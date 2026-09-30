import React from 'react';
import { ThemedScrollView as ScrollView } from '@/src/components/themed/ThemedScrollView';
import { screenContentContainerStyle } from '@/src/components/ScreenContainer';
import { CalendarPermissionStatus } from './Permission/Calendar';
import { CameraPermissionStatus } from './Permission/Camera';
import { GeolocationPermissionStatus } from './Permission/Geolocation';
import { NotificationPermissionStatus } from './Permission/Notifications';
import { ScreenBrightnessPermissionStatus } from './Permission/ScreenBrightness';

/**
 * PermissionsDashboard component that displays the status of various permissions (Camera, Calendar, Geolocation, Notifications, Screen Brightness) in a scrollable view. Each permission status is represented by its respective component.
 * @returns {React.JSX.Element}
 * @constructor
 */
export const PermissionsDashboard = () => {
     return (
          <ScrollView contentContainerStyle={{ paddingVertical: 20, ...screenContentContainerStyle }}>
               <CameraPermissionStatus />
               <CalendarPermissionStatus />
               <GeolocationPermissionStatus />
               <NotificationPermissionStatus />
               <ScreenBrightnessPermissionStatus />
          </ScrollView>
     );
};
