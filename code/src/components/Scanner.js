import { useIsFocused } from '@react-navigation/native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import BarcodeMask from 'react-native-barcode-mask';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { useNavigation } from '@react-navigation/native';
import { navigateStack } from '../helpers/RootNavigator';
import { getTermFromDictionary } from '../translations/TranslationService';
import { LoadError } from './loadError';
import { LoadingSpinner } from './loadingSpinner';
import { ScreenContainer } from './ScreenContainer';
import { useActiveLanguage } from '../hooks/useLanguageData';
import { TOKENS } from '../themes/theme';

/**
 * Scanner component for scanning barcodes using the device camera.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function Scanner() {
     const navigation = useNavigation();
     const isFocused = useIsFocused();
     const [permission, requestPermission] = useCameraPermissions();
     const [scanned, setScanned] = React.useState(false);
     const language = useActiveLanguage();

     let allowedBarcodes = ['upc_a', 'upc_e', 'ean13', 'ean8', 'codabar'];

     React.useEffect(() => {
          if (!permission || permission.status === 'undetermined') {
               requestPermission();
          }
     }, [permission]);

     const handleBarCodeScanned = ({ type, data }) => {
          if (!scanned) {
               data = cleanBarcode(data, type);
               setScanned(true);
               if (navigation.canGoBack()) {
                    navigation.goBack();
               }
               navigateStack('BrowseTab', 'SearchResults', { term: data, type: 'catalog', prevRoute: 'DiscoveryScreen', scannerSearch: true, barcodeType: type });
          }
     };

     if (!permission) {
          return (
               <ScreenContainer>
                    <LoadingSpinner message={getTermFromDictionary(language, 'scanner_request_permissions')} />
               </ScreenContainer>
          );
     }

     if (!permission.granted) {
          if (permission.canAskAgain) {
               return (
                    <ScreenContainer>
                         <LoadingSpinner message={getTermFromDictionary(language, 'scanner_request_permissions')} />
                    </ScreenContainer>
               );
          }
          return (
               <ScreenContainer>
                    <LoadError error={getTermFromDictionary(language, 'scanner_denied_permissions')} />
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
          justifyContent: 'center' },
     buttonContainer: {
          position: 'absolute',
          bottom: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%' } });

function cleanBarcode(barcode, type) {
     barcode = barcode.toUpperCase();

     if ((type === 512 || type === '512' || type === 'org.gs1.UPC-A' || type === 'org.gs1.EAN-13') && Platform.OS === 'ios') {
          let firstValue = barcode.charAt(0);
          if (firstValue === '0') {
               barcode = barcode.substring(1);
          }
     }

     return barcode;
}
