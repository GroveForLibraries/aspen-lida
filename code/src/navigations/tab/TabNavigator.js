import { MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DrawerActions } from '@react-navigation/native';
import React from 'react';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { VStack } from '@/components/ui/vstack';
import { useSelfCheckEnabled, useSelfCheckSettings } from '../../hooks/useLibraryBranchData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import AccountStackNavigator from '../stack/AccountStackNavigator';
import BrowseStackNavigator from '../stack/BrowseStackNavigator';
import LibraryCardStackNavigator from '../stack/LibraryCardStackNavigator';
import MoreStackNavigator from '../stack/MoreStackNavigator';
import SelfCheckOutStackNavigator from '../stack/SelfCheckOutStackNavigator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { TOKENS, useTheme } from '../../themes/theme';

const Tab = createBottomTabNavigator();
/**
 * TabNavigator component that sets up a bottom tab navigator with tabs for browsing, library card, self-checkout (if enabled), account, and more. The self-checkout tab is conditionally displayed based on the self-checkout settings.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function TabNavigator() {
     const enableSelfCheck = useSelfCheckEnabled();
     const selfCheckSettings = useSelfCheckSettings();
     const { brand, colorMode } = useTheme();
     const tabColors = TOKENS.componentTokens.tabNavigator[colorMode === 'dark' ? 'dark' : 'light'];

     const settingsEnabledCandidates = [
          selfCheckSettings?.isEnabled,
          selfCheckSettings?.enableSelfCheck,
          selfCheckSettings?.selfCheckEnabled,
     ];
     const settingsEnableSelfCheck = settingsEnabledCandidates.some((value) =>
          value === true || value === 1 || value === '1' || (typeof value === 'string' && value.toLowerCase() === 'true')
     );
     const showSelfCheckTab = enableSelfCheck === true || settingsEnableSelfCheck;

     const activeTint = brand.primary[500];
     const inactiveTint = tabColors.inactiveTint;
     const tabBarBackgroundColor = tabColors.background;

     return (
          <Tab.Navigator
               tabBar={(props) => <TabItem {...props} />}
               initialRouteName="BrowseTab"
               screenOptions={{
                    headerShown: false,
                    backBehavior: 'none',
                    tabBarHideOnKeyboard: true,
                    tabBarActiveTintColor: activeTint,
                    tabBarInactiveTintColor: inactiveTint,
                    tabBarLabelStyle: { fontWeight: '400' },
                    tabBarStyle: { backgroundColor: tabBarBackgroundColor, borderTopColor: tabColors.borderTop, elevation: 0 },
               }}>
               <Tab.Screen name="BrowseTab" component={BrowseStackNavigator} />
               <Tab.Screen name="LibraryCardTab" component={LibraryCardStackNavigator} />
               {showSelfCheckTab ? <Tab.Screen name="SelfCheckTab" component={SelfCheckOutStackNavigator} /> : null}
               <Tab.Screen
                    name="AccountTab"
                    component={AccountStackNavigator}
                    listeners={({ navigation }) => ({
                         tabPress: (e) => {
                              navigation.dispatch(DrawerActions.toggleDrawer());
                              e.preventDefault();
                         },
                    })}
               />
               <Tab.Screen name="AccountScreenTab" component={AccountStackNavigator} options={{ tabBarButton: () => null }} />
               <Tab.Screen
                    name="MoreTab"
                    component={MoreStackNavigator}
                    listeners={({ navigation }) => ({
                         tabPress: (e) => {
                              e.preventDefault();
                              navigation.navigate('MoreTab', { screen: 'MoreMenu' });
                         },
                    })}
               />
          </Tab.Navigator>
     );
}

/**
 * TabItem component that renders the custom tab bar for the bottom tab navigator, displaying icons and labels for each tab based on the current state and descriptors. It also handles navigation when a tab is pressed or long-pressed.
 * @param param0
 * @param param0.state
 * @param param0.descriptors
 * @param param0.navigation
 * @returns {React.JSX.Element}
 * @constructor
 */
export const TabItem = ({ state, descriptors, navigation }) => {
     const language = useActiveLanguage();
     const { brand, colorMode } = useTheme();
     const tabColors = TOKENS.componentTokens.tabNavigator[colorMode === 'dark' ? 'dark' : 'light'];
     const activeIconColor = brand.primary[500];
     const inactiveIconColor = tabColors.inactiveTint;
     const tabBarBackgroundColor = tabColors.background;
     const tabBorderColor = tabColors.borderTop;
     const insets = useSafeAreaInsets();

     const [browseTabLabel, setBrowseTabLabel] = React.useState(getTermFromDictionary(language, 'nav_discover'));
     const [cardTabLabel, setCardTabLabel] = React.useState(getTermFromDictionary(language, 'nav_card'));
     const [accountTabLabel, setAccountTabLabel] = React.useState(getTermFromDictionary(language, 'nav_account'));
     const [scoTabLabel, setScoTabLabel] = React.useState(getTermFromDictionary(language, 'nav_sco'));
     const [moreTabLabel, setMoreTabLabel] = React.useState(getTermFromDictionary(language, 'nav_more'));

     React.useEffect(() => {
          const timer = setTimeout(() => {
               setBrowseTabLabel(getTermFromDictionary(language, 'nav_discover'));
               setCardTabLabel(getTermFromDictionary(language, 'nav_card'));
               setAccountTabLabel(getTermFromDictionary(language, 'nav_account'));
               setScoTabLabel(getTermFromDictionary(language, 'nav_sco'));
               setMoreTabLabel(getTermFromDictionary(language, 'nav_more'));
          }, 1500);

          return () => clearTimeout(timer);
     }, [language]);

     return (
          <HStack
               space="lg"
               className="px-7 pt-2 items-center justify-between border-t"
               style={{
                    paddingBottom: insets.bottom,
                    backgroundColor: tabBarBackgroundColor,
                    borderColor: tabBorderColor,
               }}>
               {state.routes.map((route, index) => {
                    const { options } = descriptors[route.key];
                    const isFocused = state.index === index;

                    // Focus is conveyed by iconColor below, not by swapping to a filled/outline
                    // glyph variant -- MaterialIcons/MaterialCommunityIcons don't have a matching
                    // filled/outline pair for every one of these the way Ionicons did.
                    let iconName = 'circle';
                    let IconComponent = MaterialIcons;
                    let label = route.name;

                    if (route.name === 'BrowseTab') {
                         iconName = 'local-library';
                         label = browseTabLabel;
                    } else if (route.name === 'LibraryCardTab') {
                         iconName = 'credit-card';
                         label = cardTabLabel;
                    } else if (route.name === 'AccountTab') {
                         iconName = 'person';
                         label = accountTabLabel;
                    } else if (route.name === 'MoreTab') {
                         iconName = 'more-horiz';
                         label = moreTabLabel;
                    } else if (route.name === 'SelfCheckTab') {
                         iconName = 'barcode';
                         IconComponent = MaterialCommunityIcons;
                         label = scoTabLabel;
                    }

                    const iconColor = isFocused ? activeIconColor : inactiveIconColor;

                    const onPress = () => {
                         const event = navigation.emit({
                              type: 'tabPress',
                              target: route.key,
                              canPreventDefault: true,
                         });

                         if (!isFocused && !event.defaultPrevented) {
                              navigation.navigate(route.name, route.params);
                         }
                    };

                    const onLongPress = () => {
                         navigation.emit({
                              type: 'tabLongPress',
                              target: route.key,
                         });
                    };

                    if (route.name === 'AccountScreenTab') {
                         return null;
                    }

                    return (
                         <Pressable
                              key={route.key}
                              accessibilityRole="button"
                              accessibilityState={isFocused ? { selected: true } : {}}
                              accessibilityLabel={options.tabBarAccessibilityLabel}
                              testID={options.tabBarTestID}
                              onPress={onPress}
                              onLongPress={onLongPress}>
                              <VStack space="xs" className="items-center">
                                   <IconComponent name={iconName} size={22} color={iconColor} />
                                   <Text size="2xs" style={{ color: iconColor, fontWeight: '400' }}>
                                        {label}
                                   </Text>
                              </VStack>
                         </Pressable>
                    );
               })}
          </HStack>
     );
};
