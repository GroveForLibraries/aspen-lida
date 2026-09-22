import React from 'react';

import { useUserState, useLocations, useSublocations, useUpdateLocations, useUpdateSublocations, useUpdateUserProfile } from '../../../hooks/useUserData';
import {getTermFromDictionary} from "../../../translations/TranslationService";
import {Platform} from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
     Box,
     ButtonGroup,
     Button,
     ButtonText,
     FormControl,
     FormControlLabel,
     FormControlLabelText,
     Select,
     SelectTrigger,
     SelectInput,
     SelectIcon,
     SelectPortal,
     SelectBackdrop,
     SelectContent,
     SelectDragIndicatorWrapper,
     SelectDragIndicator,
     SelectItem,
     SelectScrollView,
     ChevronDownIcon,
     Checkbox,
     CheckboxLabel,
     CheckIcon,
     CheckboxIndicator,
     CheckboxIcon,
     ButtonSpinner
} from '@gluestack-ui/themed';
import {getPickupLocations, getPickupSublocations, refreshProfile, updateHoldPickupPreferences} from "../../../util/api/user";
import { formatPickupLocations } from '../../../util/api/userHelper';
import {SelectNewHoldSublocation} from "../../../components/Action/Holds/SelectNewHoldSublocation";

import { logDebugMessage } from '../../../util/logging.js';
import { useActiveLanguage } from '../../../hooks/useLanguageData';
import { useTheme } from '../../../themes/theme';
import { useLibrary } from '../../../hooks/useLibrarySystemData';

export const Settings_PickupLocations = () => {
	const stableNormalize = React.useCallback((value) => {
		if (Array.isArray(value)) {
			return value.map((entry) => stableNormalize(entry));
		}

		if (value && typeof value === 'object') {
			const normalized = {};
			Object.keys(value)
				.sort()
				.forEach((key) => {
					normalized[key] = stableNormalize(value[key]);
				});
			return normalized;
		}

		return value;
	}, []);

	const hasCollectionChanged = React.useCallback((currentValue, nextValue) => {
		return JSON.stringify(stableNormalize(currentValue ?? [])) !== JSON.stringify(stableNormalize(nextValue ?? []));
	}, [stableNormalize]);

  const normalizeRememberPickupLocation = React.useCallback((value) => {
    if (value === true || value === 1 || value === '1') return true;
    if (value === false || value === 0 || value === '0') return false;
    if (typeof value === 'string') {
      const lowered = value.toLowerCase();
      if (lowered === 'true') return true;
      if (lowered === 'false') return false;
    }
    return false;
  }, []);

	const [loading, setLoading] = React.useState(false);
	const library = useLibrary();
	const language = useActiveLanguage();
	const { data: userState } = useUserState();
    const user = userState?.user ?? {};
    const { data: locations } = useLocations();
	const { data: sublocations } = useSublocations();
	const updateLocations = useUpdateLocations();
	const updateSublocations = useUpdateSublocations();
    const updateUserProfile = useUpdateUserProfile();
	const { theme, textColor, colorMode } = useTheme();
	const insets = useSafeAreaInsets();
	const locationsRef = React.useRef(locations);
	const sublocationsRef = React.useRef(sublocations);

	React.useEffect(() => {
		locationsRef.current = locations;
	}, [locations]);

	React.useEffect(() => {
		sublocationsRef.current = sublocations;
	}, [sublocations]);

	React.useEffect(() => {
		let isActive = true;

		const refreshPickupData = async () => {
			if (!library?.baseUrl) {
				return;
			}

			try {
				const [pickupResponse, fetchedSublocations] = await Promise.all([
					getPickupLocations(library.baseUrl),
					getPickupSublocations(library.baseUrl, { persist: false }),
				]);

				if (!isActive) {
					return;
				}

				if (pickupResponse?.ok) {
					const formatted = formatPickupLocations(pickupResponse.data?.result ?? {});
					const nextLocations = Array.isArray(formatted?.locations) ? formatted.locations : [];
					if (hasCollectionChanged(locationsRef.current, nextLocations)) {
						await updateLocations(nextLocations);
						logDebugMessage('Pickup locations changed; updated cache from Settings_PickupLocations.');
					} else {
						logDebugMessage('Pickup locations unchanged; skipped cache update in Settings_PickupLocations.');
					}
				}

				const nextSublocations = Array.isArray(fetchedSublocations) || (fetchedSublocations && typeof fetchedSublocations === 'object')
					? fetchedSublocations
					: [];
				if (hasCollectionChanged(sublocationsRef.current, nextSublocations)) {
					await updateSublocations(nextSublocations);
					logDebugMessage('Pickup sublocations changed; updated cache from Settings_PickupLocations.');
				} else {
					logDebugMessage('Pickup sublocations unchanged; skipped cache update in Settings_PickupLocations.');
				}
			} catch (error) {
				logDebugMessage('Unable to refresh pickup locations in Settings_PickupLocations.');
				logDebugMessage(error);
			}
		};

		refreshPickupData();

		return () => {
			isActive = false;
		};
	}, [library?.baseUrl, hasCollectionChanged, updateLocations, updateSublocations]);

	let userPickupLocationId = user.pickupLocationId ?? user.homeLocationId;
	let userPickupLocation1Id = user.myLocation1Id ?? "";
	let userPickupLocation2Id = user.myLocation2Id ?? "";
	let userSublocationPickupId = user.pickupSublocationId ?? "";
	logDebugMessage("Remember Hold Pickup Location in Preferences is " + user.rememberHoldPickupLocation);
  const rememberHoldPickupLocation = normalizeRememberPickupLocation(user.rememberHoldPickupLocation);

	if (Number.isFinite(user.pickupLocationId)) {
		userPickupLocationId = String(user.pickupLocationId);
	}

	if (Number.isFinite(user.myLocation1Id)) {
		userPickupLocation1Id = String(user.myLocation1Id);
	}

	if (Number.isFinite(user.myLocation2Id)) {
		userPickupLocation2Id = String(user.myLocation2Id);
	}

	const showAlternatePickupLocations = locations.length > 1;

	let pickupLocation = '';
	let pickupLocation1 = '';
	let pickupLocation2 = '';
	if (showAlternatePickupLocations) {
		const userPickupLocation = locations.filter((item) => String(item?.locationId) === String(userPickupLocationId));
		const userPickupLocation1 = locations.filter((item) => String(item?.locationId) === String(userPickupLocation1Id));
		const userPickupLocation2 = locations.filter((item) => String(item?.locationId) === String(userPickupLocation2Id));

		if (userPickupLocation.length > 0) {
			pickupLocation = userPickupLocation[0];
			if (pickupLocation && typeof pickupLocation === 'object') {
				pickupLocation = pickupLocation.code;
			}
		}
		if (userPickupLocation1.length > 0) {
			pickupLocation1 = userPickupLocation1[0];
			if (pickupLocation1 && typeof pickupLocation1 === 'object') {
				pickupLocation1 = pickupLocation1.code;
			}
		}
		if (userPickupLocation2.length > 0) {
			pickupLocation2 = userPickupLocation2[0];
			if (pickupLocation2 && typeof pickupLocation2 === 'object') {
				pickupLocation2 = pickupLocation2.code;
			}
		}

		if(pickupLocation1 === 0) {
			pickupLocation1 = -1;
		}

		if(pickupLocation2 === 0) {
			pickupLocation2 = -1;
		}
	} else {
		pickupLocation = locations[0];
		if (pickupLocation && typeof pickupLocation === 'object') {
			pickupLocation = pickupLocation.code;
		}
		if(pickupLocation1 === 0) {
			pickupLocation1 = -1;
		}

		if(pickupLocation2 === 0) {
			pickupLocation2 = -1;
		}
	}

	const initialPreferences = React.useMemo(() => ({
		location: pickupLocation ?? '',
		location1Id: pickupLocation1 ?? '',
		location2Id: pickupLocation2 ?? '',
		sublocation: userSublocationPickupId ?? '',
		rememberPickupLocation: rememberHoldPickupLocation,
	}), [pickupLocation, pickupLocation1, pickupLocation2, userSublocationPickupId, rememberHoldPickupLocation]);

	const [location, setLocation] = React.useState(initialPreferences.location);
	const [location1Id, setLocation1Id] = React.useState(initialPreferences.location1Id);
	const [location2Id, setLocation2Id] = React.useState(initialPreferences.location2Id);
	const [sublocation, setSublocation] = React.useState(initialPreferences.sublocation);
	const [rememberPickupLocation, setRememberPickupLocation] = React.useState(initialPreferences.rememberPickupLocation);
	const [isDirty, setIsDirty] = React.useState(false);

	React.useEffect(() => {
		if (isDirty) {
			return;
		}

		setLocation(initialPreferences.location);
		setLocation1Id(initialPreferences.location1Id);
		setLocation2Id(initialPreferences.location2Id);
		setSublocation(initialPreferences.sublocation);
		setRememberPickupLocation(initialPreferences.rememberPickupLocation);
	}, [initialPreferences, isDirty]);

	const hasChanges =
		String(location ?? '') !== String(initialPreferences.location ?? '') ||
		String(location1Id ?? '') !== String(initialPreferences.location1Id ?? '') ||
		String(location2Id ?? '') !== String(initialPreferences.location2Id ?? '') ||
		String(sublocation ?? '') !== String(initialPreferences.sublocation ?? '') ||
    rememberPickupLocation !== initialPreferences.rememberPickupLocation;

	const selectedLocationObj = locations.find(loc => loc.code === location);
	const selectedLocation1Obj = locations.find(loc => loc.code === location1Id);
	const selectedLocation2Obj = locations.find(loc => loc.code === location2Id);
	const getLocationLabel = React.useCallback((item) => item?.displayName ?? item?.name ?? item?.code ?? '', []);

	return (
          <Box p="$5">
               <FormControl mb="$3">
                    <FormControlLabel>
                         <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'preferred_pickup_branch')}</FormControlLabelText>
                    </FormControlLabel>
                    <Select
                         name="pickupLocations"
                         selectedValue={location}
                         minWidth="200"
                         accessibilityLabel={getTermFromDictionary(language, 'select_pickup_location')}
                         mt="$1"
                         mb="$2"
                         onValueChange={(itemValue) => {
                              setIsDirty(true);
                              setLocation(itemValue);
                         }}>
                         <SelectTrigger variant="outline" size="md">
                              {selectedLocationObj ? <SelectInput py={0} value={getLocationLabel(selectedLocationObj)} color={textColor} /> : <SelectInput py={0} value={getTermFromDictionary(language, 'select_pickup_location')} color={textColor} />}
                              <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                         </SelectTrigger>
                         <SelectPortal>
                              <SelectBackdrop />
                              <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                   <SelectDragIndicatorWrapper>
                                        <SelectDragIndicator />
                                   </SelectDragIndicatorWrapper>
                                   <SelectScrollView>
                                        {locations.map((availableLocations, index) => {
                                             const locationLabel = getLocationLabel(availableLocations);
                                             if (availableLocations.code === location) {
                                                  return <SelectItem label={locationLabel} value={availableLocations.code} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                             }
                                             return (
                                                  <SelectItem
                                                       label={locationLabel}
                                                       value={availableLocations.code}
                                                       key={index}
                                                       sx={{
                                                            _text: { color: textColor },
                                                       }}
                                                  />
                                             );
                                        })}
                                   </SelectScrollView>
                              </SelectContent>
                         </SelectPortal>
                    </Select>
               </FormControl>
               {showAlternatePickupLocations ? (
                    <>
                         <FormControl mb="$3">
                              <FormControlLabel>
                                   <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'alternate_pickup_location_1')}</FormControlLabelText>
                              </FormControlLabel>
                              <Select
                                   name="pickupLocations1"
                                   selectedValue={location1Id}
                                   accessibilityLabel={getTermFromDictionary(language, 'select_pickup_location')}
                                   mt="$1"
                                   mb="$2"
                                   onValueChange={(itemValue) => {
                                        setIsDirty(true);
                                        setLocation1Id(itemValue);
                                   }}>
                                   <SelectTrigger variant="outline" size="md">
                                        {selectedLocation1Obj ? <SelectInput py={0} value={getLocationLabel(selectedLocation1Obj)} color={textColor} /> : <SelectInput py={0} value={getTermFromDictionary(language, 'select_pickup_location')} color={textColor} />}
                                        <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                   </SelectTrigger>
                                   <SelectPortal>
                                        <SelectBackdrop />
                                        <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                             <SelectDragIndicatorWrapper>
                                                  <SelectDragIndicator />
                                             </SelectDragIndicatorWrapper>
                                             <SelectScrollView>
                                                  {locations.map((availableLocations, index) => {
                                                       const locationLabel = getLocationLabel(availableLocations);
                                                       if (availableLocations.code === location1Id) {
                                                            return <SelectItem label={locationLabel} value={availableLocations.code} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                       }
                                                       return (
                                                            <SelectItem
                                                                 label={locationLabel}
                                                                 value={availableLocations.code}
                                                                 key={index}
                                                                 sx={{
                                                                      _text: { color: textColor },
                                                                 }}
                                                            />
                                                       );
                                                  })}
                                             </SelectScrollView>
                                        </SelectContent>
                                   </SelectPortal>
                              </Select>
                         </FormControl>
                         <FormControl mb="$5">
                              <FormControlLabel>
                                   <FormControlLabelText color={textColor}>{getTermFromDictionary(language, 'alternate_pickup_location_2')}</FormControlLabelText>
                              </FormControlLabel>
                              <Select
                                   name="pickupLocation2"
                                   selectedValue={location2Id}
                                   accessibilityLabel={getTermFromDictionary(language, 'select_pickup_location')}
                                   mt="$1"
                                   mb="$2"
                                   onValueChange={(itemValue) => {
                                        setIsDirty(true);
                                        setLocation2Id(itemValue);
                                   }}>
                                   <SelectTrigger variant="outline" size="md">
                                        {selectedLocation2Obj ? <SelectInput py={0} value={getLocationLabel(selectedLocation2Obj)} color={textColor} /> : <SelectInput py={0} value={getTermFromDictionary(language, 'select_pickup_location')} color={textColor} />}
                                        <SelectIcon mr="$3" as={ChevronDownIcon} color={textColor} />
                                   </SelectTrigger>
                                   <SelectPortal>
                                        <SelectBackdrop />
                                        <SelectContent bgColor={colorMode === 'light' ? '$warmGray50' : '$coolGray700'} pb={Platform.OS === 'android' ? insets.bottom + 16 : '$4'}>
                                             <SelectDragIndicatorWrapper>
                                                  <SelectDragIndicator />
                                             </SelectDragIndicatorWrapper>
                                             <SelectScrollView>
                                                  {locations.map((availableLocations, index) => {
                                                       const locationLabel = getLocationLabel(availableLocations);
                                                       if (availableLocations.code === location2Id) {
                                                            return <SelectItem label={locationLabel} value={availableLocations.code} key={index} bgColor={theme.tokens.colors.tertiary['300']} sx={{ _text: { color: theme.tokens.colors.tertiary['500-text'] } }} />;
                                                       }
                                                       return (
                                                            <SelectItem
                                                                 label={locationLabel}
                                                                 value={availableLocations.code}
                                                                 key={index}
                                                                 sx={{
                                                                      _text: { color: textColor },
                                                                 }}
                                                            />
                                                       );
                                                  })}
                                             </SelectScrollView>
                                        </SelectContent>
                                   </SelectPortal>
                              </Select>
                         </FormControl>
                    </>
               ) : null}
               <SelectNewHoldSublocation
                    sublocations={sublocations}
                    location={location}
                    activeSublocation={sublocation}
                    setActiveSublocation={(value) => {
                         setIsDirty(true);
                         setSublocation(value);
                    }}
                    language={language}
                    textColor={textColor}
                    theme={theme}
                    colorMode={colorMode}
               />
               {library.allowRememberPickupLocation ? (
                    <FormControl mb="$3">
                         <Checkbox
                              size="sm"
                              name="rememberHoldPickupLocation"
                              isChecked={rememberPickupLocation}
                              onChange={() => {
                                   setIsDirty(true);
                                   setRememberPickupLocation((prev) => !prev);
                              }}>
                              <CheckboxIndicator
                                   mr="$2"
                                   sx={{
                                        ':checked': {
                                             borderColor: theme['tokens']['colors']['primary']['500'],
                                             backgroundColor: theme['tokens']['colors']['primary']['500'],
                                        },
                                   }}>
                                   <CheckboxIcon as={CheckIcon} sx={{ color: theme['tokens']['colors']['primary']['500-text'] }} />
                              </CheckboxIndicator>
                              <CheckboxLabel color={textColor}>{getTermFromDictionary(language, 'bypass_pickup_location_prompt')}</CheckboxLabel>
                         </Checkbox>
                    </FormControl>
               ) : null}
               <ButtonGroup>
                    <Button
                         bgColor={theme.tokens.colors.primary['500']}
                         onPress={async () => {
                              if (!hasChanges) {
                                   return;
                              }

                              setLoading(true);
                              try {
                                   await updateHoldPickupPreferences(location, location1Id, location2Id, sublocation, rememberPickupLocation, language, library.baseUrl);
                                   const profileResponse = await refreshProfile(library.baseUrl);
                                   const refreshedProfile = profileResponse?.data?.result?.profile;
                                   if (profileResponse?.ok && refreshedProfile) {
                                        await updateUserProfile(refreshedProfile);
                                   } else {
                                        logDebugMessage('Refresh profile did not return a valid profile after updating pickup preferences.');
                                   }
                                   setIsDirty(false);
                              } finally {
                                   setLoading(false);
                              }
                         }}
                         isDisabled={loading || !hasChanges}>
                         {loading ? <ButtonSpinner color={theme.tokens.colors.primary['500-text']} /> : <ButtonText color={theme.tokens.colors.primary['500-text']}>{getTermFromDictionary(language, 'update')}</ButtonText>}
                    </Button>
               </ButtonGroup>
          </Box>
     );
}
