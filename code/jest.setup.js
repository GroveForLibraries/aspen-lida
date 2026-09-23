process.env.EXPO_OS = 'ios';

// Mock objects
jest.mock('expo-constants', () => {
  return {
    __esModule: true,
    ExecutionEnvironment: {
      Bare: 'bare',
      Standalone: 'standalone',
      StoreClient: 'storeClient',
    },
    default: {
      executionEnvironment: 'bare',
      expoConfig: {
        ios: {
          buildNumber: '1',
          bundleIdentifier: 'com.placeholder.ios',
        },
        android: {
          versionCode: 1,
          package: 'com.placeholder.android',
        },
        extra: {
          loginLogo: 'mock-logo-path', // Keeps line 5 of Splash.js happy
        },
        splash: {
          backgroundColor: '#010203',
        }
      },
    },
  };
});

jest.mock('expo-device', () => {
  return {
    __esModule: true,
    brand: 'Apple',
    manufacturer: 'Apple',
    modelName: 'iPhone 15',
    deviceYearClass: 2023,
    totalMemory: 6000000000,
    isDevice: false, // Useful for testing simulator vs physical device paths
    supportedCpuArchitectures: ['arm64'],
    osName: 'iOS',
    osVersion: '17.0',
    osBuildId: '21A328',
    osInternalBuildId: '21A328',
    deviceType: 1, // 1 = PHONE
  };
});

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'aspen-lida://'),
  useLinkingURL: jest.fn(() => 'aspen-lida://'),
  parse: jest.fn(() => ({ hostname: '', path: '', queryParams: {}, scheme: '' })),
  openURL: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
}));

const mockSecureStore = {};
jest.mock('expo-secure-store', () => {
  return {
    __esModule: true,
    setItemAsync: jest.fn((key, value) => {
      mockSecureStore[key] = String(value);
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key) => {
      return Promise.resolve(mockSecureStore[key] || null);
    }),
    deleteItemAsync: jest.fn((key) => {
      delete mockSecureStore[key];
      return Promise.resolve();
    }),
    // Common options objects (like keychain accessibility enums) if your app uses them
    WHEN_UNLOCKED: 'WHEN_UNLOCKED',
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    ALWAYS: 'ALWAYS',
    WHEN_PASSCODE_SET_THIS_DEVICE_ONLY: 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY',
  };
});

jest.mock('expo-sqlite', () => {
  return {
    __esModule: true,
    // Mock the modern asynchronous open method
    openDatabaseAsync: jest.fn().mockResolvedValue({
      execAsync: jest.fn().mockResolvedValue([]),
      runAsync: jest.fn().mockResolvedValue({ changes: 0, lastInsertRowId: 0 }),
      getFirstAsync: jest.fn().mockResolvedValue(null),
      getAllAsync: jest.fn().mockResolvedValue([]),
      closeAsync: jest.fn().mockResolvedValue(undefined),
      withTransactionAsync: jest.fn((callback) => callback()),
    }),
    // Mock the legacy synchronous open method (just in case your app or a dependency uses it)
    openDatabase: jest.fn(() => ({
      transaction: jest.fn((callback) => {
        callback({
          executeSql: jest.fn((sql, params, success, error) => {
            if (success) success({}, { rows: { _array: [], length: 0 } });
          }),
        });
      }),
    })),
  };
});

jest.mock('expo-updates', () => {
  return {
    __esModule: true,
    // Add common properties your app might inspect at runtime
    currentlyRunning: {
      isEmbeddedLaunch: true,
      createdAt: new Date().toISOString(),
      updateId: 'mock-update-id',
      manifest: {},
    },
    isEmergencyLaunch: false,
    isMissingRuntimeVersion: false,

    // Mock the common asynchronous methods to prevent unhandled promise rejections
    checkForUpdateAsync: jest.fn().mockResolvedValue({ isAvailable: false }),
    fetchUpdateAsync: jest.fn().mockResolvedValue({ isNew: false }),
    reloadAsync: jest.fn().mockResolvedValue(true),

    // Event listeners
    useUpdates: jest.fn(() => ({
      currentlyRunning: { isEmbeddedLaunch: true },
      isUpdateAvailable: false,
      isUpdatePending: false,
    })),
  };
});

jest.mock('expo-web-browser', () => {
  return {
    __esModule: true,
    openBrowserAsync: jest.fn().mockResolvedValue({ type: 'opened' }),
    openAuthSessionAsync: jest.fn().mockResolvedValue({ type: 'success', url: 'https://mock-redirect.com' }),
    dismissBrowser: jest.fn(),
    dismissAuthSession: jest.fn(),
    warmUpAsync: jest.fn().mockResolvedValue({}),
    coolDownAsync: jest.fn().mockResolvedValue({}),
    maybeCompleteAuthSession: jest.fn().mockReturnValue({ type: 'success' }),
  };
});

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return {
    MaterialIcons: (props) => React.createElement(Text, props, 'MaterialIcons'),
    Ionicons: (props) => React.createElement(Text, props, 'Ionicons'),
    // Add any other specific icons your app throws errors on here
  };
});

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@sentry/react-native', () => {
  return {
    __esModule: true,
    init: jest.fn(),
    captureException: jest.fn(),
    captureMessage: jest.fn(),
    captureEvent: jest.fn(),
    addBreadcrumb: jest.fn(),
    setUser: jest.fn(),
    setTags: jest.fn(),
    setExtra: jest.fn(),
    startSpan: jest.fn((ctx, callback) => callback ? callback() : null),
    // Sentry Navigation tracing mocks if your logging setup accesses them
    ReactNavigationInstrumentation: jest.fn().mockImplementation(() => ({
      registerNavigationContainer: jest.fn(),
    })),
    ReactNativeTracing: jest.fn().mockImplementation(() => ({})),
  };
});

jest.mock('react-native-css-interop', () => {
  return {
    __esModule: true,
    createInteropElement: jest.fn(),
    cssInterop: jest.fn(),
  };
});

jest.mock('nativewind', () => {
  return {
    __esModule: true,
    cssInterop: jest.fn(),
    useColorScheme: jest.fn(() => ({
      colorScheme: 'light',
      setColorScheme: jest.fn(),
    })),
    vars: jest.fn((value) => value),
  };
}, { virtual: true });

jest.mock('uniwind', () => {
  return {
    __esModule: true,
    withUniwind: (component) => component,
    Uniwind: {
      setTheme: jest.fn(),
    },
  };
}, { virtual: true });

jest.mock('@gluestack-ui/core/overlay/creator', () => ({
  __esModule: true,
  OverlayProvider: ({ children }) => children,
}), { virtual: true });

jest.mock('@gluestack-ui/core/toast/creator', () => ({
  __esModule: true,
  ToastProvider: ({ children }) => children,
  createToastHook: () => () => ({
    show: jest.fn(),
    close: jest.fn(),
    closeAll: jest.fn(),
    isActive: jest.fn(() => false),
  }),
}), { virtual: true });

jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');

  return {
    __esModule: true,
    default: {
      createAnimatedComponent: () => View,
    },
    SlideInUp: {
      duration: () => 'slide-in-up',
    },
    FadeOut: {
      duration: () => 'fade-out',
    },
    FadeIn: {
      duration: () => 'fade-in',
    },
    ZoomIn: {
      duration: () => 'zoom-in',
    },
    ZoomOut: {
      duration: () => 'zoom-out',
    },
    useSharedValue: jest.fn((value) => ({ value })),
    useAnimatedStyle: jest.fn((factory) => factory()),
    withTiming: jest.fn((value) => value),
    runOnJS: jest.fn((fn) => fn),
  };
}, { virtual: true });

jest.mock('@/components/feedback', () => ({
  __esModule: true,
  popToast: jest.fn(),
  popAlert: jest.fn(),
  ToastRegistrar: () => null,
}), { virtual: true });

jest.mock('@/components/feedback/toastService', () => ({
  __esModule: true,
  popToast: jest.fn(),
}), { virtual: true });

jest.mock('@/components/ui/alert-dialog', () => {
  const React = require('react');
  const { View } = require('react-native');

  const passthrough = React.forwardRef(({ children, ...props }, ref) => (
    <View ref={ref} {...props}>{children}</View>
  ));

  return {
    __esModule: true,
    AlertDialog: passthrough,
    AlertDialogBackdrop: passthrough,
    AlertDialogBody: passthrough,
    AlertDialogCloseButton: passthrough,
    AlertDialogContent: passthrough,
    AlertDialogFooter: passthrough,
    AlertDialogHeader: passthrough,
  };
}, { virtual: true });

jest.mock('@/components/ui/button', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const Button = React.forwardRef(({ children, ...props }, ref) => (
    <Pressable ref={ref} {...props}>{children}</Pressable>
  ));
  const ButtonText = React.forwardRef(({ children, ...props }, ref) => (
    <Text ref={ref} {...props}>{children}</Text>
  ));
  const ButtonIcon = React.forwardRef((props, ref) => <View ref={ref} {...props} />);
  const ButtonGroup = React.forwardRef(({ children, ...props }, ref) => (
    <View ref={ref} {...props}>{children}</View>
  ));

  return {
    __esModule: true,
    Button,
    ButtonText,
    ButtonIcon,
    ButtonGroup,
  };
}, { virtual: true });

jest.mock('@/components/ui/center', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Center = React.forwardRef(({ children, ...props }, ref) => (
    <View ref={ref} {...props}>{children}</View>
  ));
  return { __esModule: true, Center };
}, { virtual: true });

jest.mock('@/components/ui/heading', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Heading = React.forwardRef(({ children, ...props }, ref) => (
    <Text ref={ref} {...props}>{children}</Text>
  ));
  return { __esModule: true, Heading };
}, { virtual: true });

jest.mock('@/components/ui/text', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const MockText = React.forwardRef(({ children, ...props }, ref) => (
    <Text ref={ref} {...props}>{children}</Text>
  ));
  return { __esModule: true, Text: MockText };
}, { virtual: true });

jest.mock('@/components/ui/box', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Box = React.forwardRef(({ children, ...props }, ref) => (
    <View ref={ref} {...props}>{children}</View>
  ));
  return { __esModule: true, Box };
}, { virtual: true });

jest.mock('@/components/ui/menu', () => {
  const React = require('react');
  const { Pressable, Text, View } = require('react-native');

  const Menu = ({ children, trigger, ...props }) => (
    <View {...props}>
      {typeof trigger === 'function' ? trigger({}) : null}
      {children}
    </View>
  );
  const MenuItem = React.forwardRef(({ children, ...props }, ref) => (
    <Pressable ref={ref} {...props}>{children}</Pressable>
  ));
  const MenuItemLabel = React.forwardRef(({ children, ...props }, ref) => (
    <Text ref={ref} {...props}>{children}</Text>
  ));

  return {
    __esModule: true,
    Menu,
    MenuItem,
    MenuItemLabel,
  };
}, { virtual: true });

jest.mock('@/components/ui/spinner', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Spinner = React.forwardRef((props, ref) => <View ref={ref} {...props} />);
  return { __esModule: true, Spinner };
}, { virtual: true });
