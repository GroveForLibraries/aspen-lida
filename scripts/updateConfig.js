const fs = require('fs');
const data = require('../app-configs/apps.json');
const build = require('../app-configs/build.json');
const version = require('../version.json');

function getSentryUploadUrl(sentryDsn) {
     try {
          return new URL(sentryDsn).origin + '/';
     } catch (e) {
          console.log('⚠️  Could not derive Sentry upload url from DSN: ' + sentryDsn);
          return undefined;
     }
}

function getArgs() {
     const args = {};
     process.argv.slice(2, process.argv.length).forEach((arg) => {
          // long arg
          if (arg.slice(0, 2) === '--') {
               const longArg = arg.split('=');
               const longArgFlag = longArg[0].slice(2, longArg[0].length);
               args[longArgFlag] = longArg.length > 1 ? longArg[1] : true;
          }
          // flags
          else if (arg[0] === '-') {
               const flags = arg.slice(1, arg.length).split('');
               flags.forEach((flag) => {
                    args[flag] = true;
               });
          }
     });
     return args;
}

const args = getArgs();
const instance = args.instance;
const app = data[instance];

let owner;
if (fs.existsSync('../app-configs/' + app['slug'] + '.projectOwner.json')) {
     owner = require('../app-configs/' + app['slug'] + '.projectOwner.json');
}else{
     owner = require('../app-configs/projectOwner.json');
}

fs.readFile('../code/eas.json', 'utf8', function (err, data) {
     if (err) {
          return console.log(err);
     } else {
          console.log('✅ Found eas.json');
          let json = JSON.stringify(data);
          json = json.replace('{{DEV_APP_ID}}', app['ascAppId']);
          json = json.replace('{{DEV_TEAM_ID}}', app['appleTeamId']);
          json = json.replace('{{DEV_APPLE_ID}}', owner['devAppleId']);
          json = json.replace('{{DEV_APPLE_API_KEY_PATH}}', app['ascApiKeyPath']);
          json = json.replace('{{DEV_APPLE_API_KEY_ISSUER_ID}}', app['ascApiKeyIssuerId']);
          json = json.replace('{{DEV_APPLE_API_KEY_ID}}', app['ascApiKeyId']);
          json = json.replace('{{DEV_GOOGLE_SERVICE_KEY_PATH}}', app['googleServiceKeyPath']);
          const obj = JSON.parse(json);
          fs.writeFile('../code/eas.json', obj, 'utf8', function (err) {
               if (err) {
                    return console.log(err);
               }
               console.log('✅ Updated eas.json');
          });
     }
});

let versionAsInt = build['build'];
versionAsInt = parseInt(versionAsInt, 10);

const app_config = {
     name: app['name'],
     slug: app['slug'],
     scheme: app['scheme'],
     owner: owner['expoProjectOwner'],
     platforms: ['ios', 'android'],
     version: version['version'],
     sdkVersion: '55.0.0',
     userInterfaceStyle: 'automatic',
     orientation: 'default',
     icon: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appIcon&slug=' + app['slug'],
     updates: {
          enabled: true,
          checkAutomatically: 'ON_LOAD',
          fallbackToCacheTimeout: 250000,
          url: 'https://u.expo.dev/' + app['easId'],
     },
     runtimeVersion: build['build'],
     splash: {
          image: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appSplash&slug=' + app['slug'],
          resizeMode: 'contain',
          backgroundColor: app['background'],
     },
     assetBundlePatterns: ['**/*'],
     ios: {
          buildNumber: build['build'],
          bundleIdentifier: app['reverseDns'],
          supportsTablet: true,
          icon: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appIcon&slug=' + app['slug'],
          infoPlist: {
               NSLocationAlwaysAndWhenInUseUsageDescription: 'This app uses your location to find nearby libraries to make logging in easier',
               NSLocationWhenInUseUsageDescription: 'This app uses your location to find nearby libraries to make logging in easier',
               LSApplicationQueriesSchemes: ['comgooglemaps', 'citymapper', 'uber', 'lyft', 'waze', 'aspen-lida', 'aspen-lida-beta', 'itms-apps'],
               CFBundleAllowMixedLocalizations: true,
               NSCameraUsageDescription: 'This app uses your camera to scan barcodes when searching for items in the library catalog',
               NSMicrophoneUsageDescription: 'This app uses your microphone when scanning barcodes when searching for items in the library catalog',
               NSCalendarsUsageDescription: 'This app can add library events to your calendar',
               NSRemindersUsageDescription: 'This app can add library events to your reminders',
          },
          config: {
               googleMapsApiKey: owner['googleApiKeyApple'],
               usesNonExemptEncryption: false,
          },
          privacyManifests: {
               NSPrivacyAccessedAPITypes: [
                    {
                         NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryDiskSpace',
                         NSPrivacyAccessedAPITypeReasons: ['E174.1'],
                    },
                    {
                         NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategorySystemBootTime',
                         NSPrivacyAccessedAPITypeReasons: ['8FFB.1'],
                    },
                    {
                         NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
                         NSPrivacyAccessedAPITypeReasons: ['DDA9.1'],
                    },
                    {
                         NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
                         NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
                    },
               ],
          },
     },
     android: {
          allowBackup: false,
          package: app['reverseDns'],
          versionCode: versionAsInt,
          permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION', 'RECEIVE_BOOT_COMPLETED', 'SCHEDULE_EXACT_ALARM', 'CAMERA', 'READ_CALENDAR', 'WRITE_CALENDAR'],
          adaptiveIcon: {
               foregroundImage: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appIconAndroid&slug=' + app['slug'],
               backgroundColor: app['background'],
          },
          icon: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appIconAndroid&slug=' + app['slug'],
          googleServicesFile: '../app-configs/google-services.json',
          config: {
               googleMaps: {
                    apiKey: owner['googleApiKeyAndroid'],
               },
          },
     },
     notification: {
          icon: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appNotification&slug=' + app['slug'],
     },
     extra: {
          apiUrl: app['discoveryUrl'],
          greenhouseUrl: owner['greenhouseUrl'],
          loginLogo: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=appLogin&slug=' + app['slug'],
          libraryCardLogo: app['discoveryUrl'] + 'API/SystemAPI?method=getLogoFile&themeId=' + app['themeId'] + '&type=logoApp&slug=' + app['slug'],
          backgroundColor: app['background'],
          libraryId: app['libraryId'],
          themeId: app['themeId'],
          sentryDSN: app['sentryDsn'],
          eas: {
               projectId: app['easId'],
          },
          iosStoreUrl: 'itms-apps://apps.apple.com/id/app/' + app['slug'] + '/id' + app['ascAppId'],
          androidStoreUrl: 'market://details?id=' + app['reverseDns'],
          patch: version['patch'],
          stage: version['stage'],
          logLevel: app['logLevel'],
     },
     plugins: [
          'expo-secure-store',
          'expo-notifications',
          'expo-sqlite',
          'expo-font',
          [
               'expo-location',
               {
                    locationAlwaysAndWhenInUsePermission: 'This app uses your location to find nearby libraries to make logging in easier',
               },
          ],
          ['expo-calendar', { calendarPermission: 'This app can add library events to your calendar' }],
          ['expo-camera', { cameraPermission: 'This app uses your camera to scan barcodes when searching for items in the library catalog or when scanning your library card.' }],
          [
               '@sentry/react-native/expo',
               {
                    authToken: app['sentryAuth'],
                    organization: owner['expoProjectOwner'],
                    project: app['sentryProject'],
                    url: getSentryUploadUrl(app['sentryDsn']),
               },
          ],
          [
               'expo-build-properties',
               {
                    android: {
                         compileSdkVersion: 36,
                         targetSdkVersion: 36,
                         buildToolsVersion: '36.0.0',
                    },
                    ios: {
                         deploymentTarget: '15.1',
                         buildReactNativeFromSource: true
                    },
               },
          ],
         [
             'expo-web-browser'
         ],
         'expo-image',
         'expo-sharing',
         '@react-native-community/datetimepicker',
          [
               "expo-maps",
               {
                    "requestLocationPermission": true,
                    "locationPermission": "Allow this app to use your location to find nearby libraries"
               }
          ]
     ],
};

fs.readFile('../code/app.config.js', 'utf8', function (err, data) {
     if (err) {
          return console.log(err);
     } else {
          console.log('✅ Found app.config.js');
          const result = data.replace('{{LOAD_APP_CONFIG}}', JSON.stringify(app_config));
          fs.writeFile('../code/app.config.js', result, 'utf8', function (err) {
               if (err) {
                    return console.log(err);
               }
               console.log('✅ Updated app.config.js');
          });
     }
});
