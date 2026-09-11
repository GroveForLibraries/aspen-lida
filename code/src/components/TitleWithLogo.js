import React from 'react';
import { useNavigation } from '@react-navigation/native';

import { useLibrary } from '../hooks/useLibrarySystemData';
import { View, Image, Text, HStack, VStack, Box, Pressable, Icon, ChevronLeftIcon } from '@gluestack-ui/themed';
import { useWindowDimensions } from 'react-native';
import { decodeHTML, isValidUrl } from '../helpers/helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../themes/theme';

const HeaderLogoBar = (props) => {
     const { theme, colorMode, header } = useTheme();
     const library = useLibrary();
     const { width, height } = useWindowDimensions();

     // Prefer the active theme's header data (logo/backgroundColor/alignment) when the
     // theme catalog actually provides a logo; otherwise fall back to the library's
     // headerLogo* app settings for backwards compatibility.
     if (header?.logo) {
          const localBrandingLogoUri = isValidUrl(header.logo) ? header.logo : library.baseUrl + '/files/original/' + header.logo;
          const backgroundColor = header.backgroundColor ?? '#FFFFFF';
          let headerLogoAlignment = 'center';
          if (header.alignment == 1) {
               headerLogoAlignment = 'flex-start';
          } else if (header.alignment == 3) {
               headerLogoAlignment = 'flex-end';
          }

          const originalHeight = library.headerLogoHeight ?? 200;
          const originalWidth = library.headerLogoWidth ?? 1536;

          const dims = logoSize(width, 50, originalWidth, originalHeight);

          return (
               <HStack backgroundColor={backgroundColor} safeAreaTop='1' safeAreaBottom='1' justifyContent={headerLogoAlignment} flexDirection='row' height={dims.height}>
                         <Image source={{uri: localBrandingLogoUri}} alt={library.displayName ?? ''} placeholder="" width={dims.width} height={dims.height} resizeMode='contain' />
               </HStack>
          );
     }

     if (library?.headerLogoApp){
          const localBrandingLogoUri = library.headerLogoApp;

          //Assume an image that is 1536 x 200
          let backgroundColor = '#FFFFFF';
          if (library.headerLogoBackgroundColorApp !== undefined) {
               backgroundColor = library.headerLogoBackgroundColorApp;
          }

          let headerLogoAlignment = 'center';
          if (library.headerLogoAlignmentApp !== undefined) {
               if (library.headerLogoAlignmentApp == 1) {
                    headerLogoAlignment = 'flex-start';
               }else if (library.headerLogoAlignmentApp == 2) {
                    headerLogoAlignment = 'center';
               }else if (library.headerLogoAlignmentApp == 3) {
                     headerLogoAlignment = 'flex-end';
               }
          }

          let originalHeight = library.headerLogoHeight ?? 200;
          let originalWidth = library.headerLogoWidth ?? 1536;

          var dims = logoSize(width, 50, originalWidth,originalHeight);
          var scaledImageWidth = dims.width;
          var scaledImageHeight = dims.height;

          return (
               <HStack backgroundColor={backgroundColor} safeAreaTop='1' safeAreaBottom='1' justifyContent={headerLogoAlignment} flexDirection='row' height={scaledImageHeight}>
                         <Image source={{uri: localBrandingLogoUri}} alt={library.displayName ?? ''} placeholder="" width={scaledImageWidth} height={scaledImageHeight} resizeMode='contain' />
               </HStack>
          );
     }else{
          return null;
     }
};

export default function TitleWithLogo(props) {
     const { theme } = useTheme();
     const navigation = useNavigation();
     const hideBack = props.hideBack ?? false;
     const insets = useSafeAreaInsets();

     return (
          <VStack pt={insets.top} pl={insets.left} pr={insets.right}>
               <HeaderLogoBar />
               <HStack px="$1" py="$2" alignItems="left" justifyContent="space-between" backgroundColor={theme['tokens']['colors']['primary']['base']}>
                    {navigation.canGoBack() && !hideBack ? (
                       <Pressable onPress={() => navigation.goBack()} pl="$1">
                            <Icon as={ChevronLeftIcon} size="xl" color={theme['tokens']['colors']['primary']['baseContrast']} />
                       </Pressable>
                    ) : (
                       <Box width="$6" />
                    )}
                    <Text pl="$2" flex={1} textAlign="left" color={theme['tokens']['colors']['primary']['baseContrast']} size="lg" lineHeight="$lg" fontWeight="bold" numberOfLines={1} ellipsizeMode="tail">{decodeHTML(props.title)}</Text>
                    <Box width="$6" />
               </HStack>
          </VStack>
     );
}

function logoSize(maxWidth, maxHeight, width, height) {
  var maxWidth = maxWidth;
  var maxHeight = maxHeight;

  if (width >= height) {
    var ratio = maxWidth / width;
    var h = Math.ceil(ratio * height);

    if (h > maxHeight) {
      // Too tall, resize
      var ratio = maxHeight / height;
      var w = Math.ceil(ratio * width);
      var ret = {
        'width': w,
        'height': maxHeight
      };
    } else {
      var ret = {
        'width': maxWidth,
        'height': h
      };
    }

  } else {
    var ratio = maxHeight / height;
    var w = Math.ceil(ratio * width);

    if (w > maxWidth) {
      var ratio = maxWidth / width;
      var h = Math.ceil(ratio * height);
      var ret = {
        'width': maxWidth,
        'height': h
      };
    } else {
      var ret = {
        'width': w,
        'height': maxHeight
      };
    }
  }

  return ret;
}
