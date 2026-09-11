import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import _ from 'lodash';
import React, {useState} from 'react';
import { StyleSheet } from 'react-native';
import BarcodeMask from 'react-native-barcode-mask';
import { LoadError } from '../../components/loadError';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { useSelfCheckSettings } from '../../hooks/useLibraryBranchData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../../components/themed/ThemedButton';
import { View } from '@/components/ui/view';
import { ScreenContainer } from '@/src/components/ScreenContainer';
import { TOKENS } from '../../themes/theme';

/**
 * SelfCheckScanner component that provides a camera view for scanning barcodes in a self-checkout process. It handles camera permissions, barcode scanning, and navigation to the self-checkout screen with the scanned barcode data.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function SelfCheckScanner() {
     const navigation = useNavigation();
     const isFocused = useIsFocused();
     const [isLoading, setIsLoading] = useState(false);
     const language = useActiveLanguage();
     const selfCheckSettings = useSelfCheckSettings();
     const [permission, requestPermission] = useCameraPermissions();
     const [scanned, setScanned] = useState(false);

     let allowedBarcodes = ['upc_a', 'upc_e', 'ean13', 'ean8', 'codabar'];
     if (selfCheckSettings.barcodeStyles && _.isArray(selfCheckSettings.barcodeStyles)) {
          allowedBarcodes = selfCheckSettings.barcodeStyles;
     }

     let activeAccount = useRoute().params?.activeAccount ?? false;
     
     React.useEffect(() => {
          if (!permission || permission.status === 'undetermined') {
               requestPermission();
          }
     }, [permission]);

     const handleBarCodeScanned = async ({ type, data }) => {
          setIsLoading(true);
          if (!scanned) {
               if (type === '8' || type === 8 || type === '64' || type === 64 || type === 'org.gs1.EAN-8') {
                    data = cleanBarcode(data, type);
               }
               setScanned(true);
               navigation.replace('SelfCheckOut', {
                    barcode: data,
                    type: type,
                    activeAccount,
                    startNew: false,
               });
               setIsLoading(false);
          } else {
               setIsLoading(false);
          }
     };

     if (!permission) {
          return (
               <ScreenContainer>
                    {/* TODO(translation): Replace hardcoded loading message with TranslationService-backed key. */}
                    <LoadingSpinner message="Requesting for camera permissions" />
               </ScreenContainer>
          );
     }

     if (!permission.granted) {
          if (permission.canAskAgain) {
               return (
                    <ScreenContainer>
                         {/* TODO(translation): Replace hardcoded loading message with TranslationService-backed key. */}
                         <LoadingSpinner message="Requesting for camera permissions" />
                    </ScreenContainer>
               );
          }
          return (
               <ScreenContainer>
                    {/* TODO(translation): Replace hardcoded error message with TranslationService-backed key. */}
                    <LoadError error="No access to camera" />
               </ScreenContainer>
          );
     }

     if (isLoading) {
          return (
               <ScreenContainer>
                    <LoadingSpinner />
               </ScreenContainer>
          );
     }

     return (
          <View className="flex-1 flex-col justify-end">
               {isFocused && (
                    <>
                         <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={[StyleSheet.absoluteFillObject, styles.container]} barcodeScannerSettings={{ barcodeTypes: allowedBarcodes }}>
                              <BarcodeMask edgeColor="#62B1F6" showAnimatedLine={false} />
                              <View style={styles.buttonContainer}>
                                   <Button variant="outline" colorScheme="secondary" onPress={() => navigation.goBack()} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: TOKENS.primitives.singletons.white }}>
                                       <ButtonText style={{ color: TOKENS.primitives.singletons.white }}>Cancel</ButtonText>
                                   </Button>
                                   {scanned && (
                                       <Button onPress={() => setScanned(false)} className="ml-4">
                                             <ButtonText>{getTermFromDictionary(language, 'scan_again')}</ButtonText>
                                        </Button>
                                   )}
                              </View>
                         </CameraView>
                    </>
               )}
          </View>
     );
}

const styles = StyleSheet.create({
     container: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
     },
     buttonContainer: {
          position: 'absolute',
          bottom: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
     },
});

/**
 * Cleans the scanned barcode based on its type. For EAN-8 barcodes, it removes leading and trailing characters if they are 'A', 'B', 'C', or 'D'. For EAN-8 and EAN-13 barcodes, it removes the last character (check digit).
 * @param barcode
 * @param type
 * @returns {string}
 */
function cleanBarcode(barcode, type) {
     barcode = barcode.toUpperCase();
     if (type === '8' || type === 8) {
          let firstValue = barcode.charAt(0);
          if (firstValue === 'A' || firstValue === 'B' || firstValue === 'C' || firstValue === 'D') {
               barcode = barcode.substring(1);
          }

          let lastValue = barcode.charAt(barcode.length - 1);
          if (lastValue === 'A' || lastValue === 'B' || lastValue === 'C' || lastValue === 'D') {
               barcode = barcode.substring(0, barcode.length - 1);
          }
     }

     if (type === '64' || type === 64 || type === 'org.gs1.EAN-8') {
          barcode = barcode.substring(0, barcode.length - 1);
     }

     return barcode;
}
