import { useNavigation, useIsFocused, useRoute } from '@react-navigation/native';
import { useCameraPermissions, CameraView } from 'expo-camera';
import { Button, ButtonText, View } from '@gluestack-ui/themed';
import React, {useState} from 'react';
import { StyleSheet } from 'react-native';
import BarcodeMask from 'react-native-barcode-mask';
import { LoadError } from '../../components/loadError';
import { LoadingSpinner } from '../../components/loadingSpinner';
import { useSelfCheckSettings } from '../../hooks/useLibraryBranchData';
import { getTermFromDictionary } from '../../translations/TranslationService';
import { useActiveLanguage } from '../../hooks/useLanguageData';

export default function SelfCheckScanner() {
     const navigation = useNavigation();
     const isFocused = useIsFocused();
     const [isLoading, setIsLoading] = useState(false);
     const language = useActiveLanguage();
     const selfCheckSettings = useSelfCheckSettings();
     const [permission, requestPermission] = useCameraPermissions();
     const [scanned, setScanned] = useState(false);

     let allowedBarcodes = ['upc_a', 'upc_e', 'ean13', 'ean8', 'codabar'];
     if (selfCheckSettings.barcodeStyles && Array.isArray(selfCheckSettings.barcodeStyles)) {
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
               <View style={{ flex: 1 }}>
                    <LoadingSpinner message="Requesting for camera permissions" />
               </View>
          );
     }

     if (!permission.granted) {
          if (permission.canAskAgain) {
               return (
                    <View style={{ flex: 1 }}>
                         <LoadingSpinner message="Requesting for camera permissions" />
                    </View>
               );
          }
          return (
               <View style={{ flex: 1 }}>
                    <LoadError error="No access to camera" />
               </View>
          );
     }

     if (isLoading) {
          return (
               <View style={{ flex: 1 }}>
                    <LoadingSpinner />
               </View>
          );
     }

     return (
          <View style={{ flex: 1, flexDirection: 'column', justifyContent: 'flex-end' }}>
               {isFocused && (
                    <>
                         <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={[StyleSheet.absoluteFillObject, styles.container]} barcodeScannerSettings={{ barcodeTypes: allowedBarcodes }}>
                              <BarcodeMask edgeColor="#62B1F6" showAnimatedLine={false} />
                              <View style={styles.buttonContainer}>
                                   <Button variant="outline" action="secondary" onPress={() => navigation.goBack()} bgColor="rgba(0,0,0,0.5)" borderColor="$white">
                                        <ButtonText color="$white">Cancel</ButtonText>
                                   </Button>
                                   {scanned && (
                                        <Button onPress={() => setScanned(false)} ml="$4">
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
