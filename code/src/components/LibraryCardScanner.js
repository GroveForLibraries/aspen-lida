import { useNavigation, useRoute } from '@react-navigation/native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import React from 'react';
import { StyleSheet } from 'react-native';
import BarcodeMask from 'react-native-barcode-mask';
import { navigate } from '../helpers/RootNavigator';
import { LoadError } from './loadError';
import { LoadingSpinner } from './loadingSpinner';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from './themed/ThemedButton';
import { View } from '@/components/ui/view';
import { TOKENS } from '../themes/theme';

/**
 * LibraryCardScanner component for scanning library cards using the device camera.
 * @returns {React.JSX.Element}
 * @constructor
 */
export default function LibraryCardScanner() {
     const navigation = useNavigation();
     const allowCode39 = useRoute().params?.allowCode39 ?? false;
     const [permission, requestPermission] = useCameraPermissions();
     const [scanned, setScanned] = React.useState(false);
     let allowedBarcodes = ['code128', 'codabar', 'ean13', 'ean8', 'itf14'];

     React.useEffect(() => {
          if (!permission || permission.status === 'undetermined') {
               requestPermission();
          }
     }, [permission]);

     const handleBarCodeScanned = ({ type, data, bounds, cornerPoints }) => {
          if (!scanned) {
               let cleanData = data;
               if (type === '8' || type === 8) {
                    cleanData = cleanBarcode(data, type);
               }
               setScanned(true);
               navigate('Login', {
                    barcode: cleanData,
               });
          }
     };

     if (!permission) {
          return (
               <View className="flex-1">
                    {/* TODO(translation): Replace hardcoded loading message with TranslationService-backed key. */}
                    <LoadingSpinner message="Requesting for camera permissions" />
               </View>
          );
     }

     if (!permission.granted) {
          if (permission.canAskAgain) {
               return (
                    <View className="flex-1">
                         {/* TODO(translation): Replace hardcoded loading message with TranslationService-backed key. */}
                         <LoadingSpinner message="Requesting for camera permissions" />
                    </View>
               );
          }
          return (
               <View className="flex-1">
                    {/* TODO(translation): Replace hardcoded error message with TranslationService-backed key. */}
                    <LoadError error="No access to camera" />
               </View>
          );
     }

     if (allowCode39) {
          allowedBarcodes = ['code128', 'codabar', 'ean13', 'ean8', 'itf14', 'code39'];
     }

     return (
          <View className="flex-1">
               <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={[StyleSheet.absoluteFillObject, styles.container]} barcodeScannerSettings={{ barcodeTypes: allowedBarcodes }}>
                    <BarcodeMask edgeColor="#62B1F6" showAnimatedLine={false} />
                    <View style={styles.buttonContainer}>
                         {/* TODO(translation): Replace hardcoded button label with TranslationService-backed key. */}
                         <Button variant="outline" colorScheme="secondary" onPress={() => navigation.goBack()} style={{ backgroundColor: 'rgba(0,0,0,0.5)', borderColor: TOKENS.primitives.singletons.white }}>
                              <ButtonText style={{ color: TOKENS.primitives.singletons.white }}>Cancel</ButtonText>
                         </Button>
                         {/* TODO(translation): Replace hardcoded button label with TranslationService-backed key. */}
                         {scanned && (
                              <Button onPress={() => setScanned(false)} className="ml-4">
                                   <ButtonText>Scan Again</ButtonText>
                              </Button>
                         )}
                    </View>
               </CameraView>
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
