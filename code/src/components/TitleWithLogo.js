import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { useWindowDimensions } from 'react-native';
import { useLibrary } from '../hooks/useLibrarySystemData';
import { Image } from 'expo-image';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Box } from '@/components/ui/box';
import { Pressable } from '@/components/ui/pressable';
import { ThemedMaterialIcons as MaterialIcons } from './themed/ThemedMaterialIcons';
import { decodeHTML, isValidUrl } from '../helpers/helpers';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, TOKENS } from '../themes/theme';

/**
 * Resolves the library's logo header bar (logo/backgroundColor/alignment), preferring the active
 * theme's header data when it provides a logo, falling back to the library's headerLogo* app
 * settings for backwards compatibility. Returns { backgroundColor, content } so the caller can
 * also paint the safe-area inset above it the same color instead of leaving that region
 * transparent, or null if there's no logo to show at all.
 * @returns {{backgroundColor: string, content: React.JSX.Element}|null}
 */
function resolveHeaderLogoBar({ header, library, width }) {
     if (header?.logo) {
          const localBrandingLogoUri = isValidUrl(header.logo) ? header.logo : library.baseUrl + '/files/original/' + header.logo;
          const backgroundColor = header.backgroundColor ?? TOKENS.primitives.singletons.white;
          let headerLogoAlignment = 'center';
          if (header.alignment == 1) {
               headerLogoAlignment = 'flex-start';
          } else if (header.alignment == 3) {
               headerLogoAlignment = 'flex-end';
          }

          const originalHeight = library.headerLogoHeight ?? 200;
          const originalWidth = library.headerLogoWidth ?? 1536;

          const dims = logoSize(width, 50, originalWidth, originalHeight);

          return {
               backgroundColor,
               content: (
                    <HStack className="pt-1 pb-1" style={{ backgroundColor, justifyContent: headerLogoAlignment, flexDirection: 'row', height: dims.height + 10 }}>
                              <Image source={localBrandingLogoUri} alt={library.displayName ?? ''} contentFit='contain' style={{ width: dims.width, height: dims.height }} />
                    </HStack>
               ),
          };
     }

     if (library?.headerLogoApp){
          const localBrandingLogoUri = library.headerLogoApp;

          //Assume an image that is 1536 x 200
          let backgroundColor = TOKENS.primitives.singletons.white;
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

          return {
               backgroundColor,
               content: (
                    <HStack className="pt-1 pb-1" style={{ backgroundColor, justifyContent: headerLogoAlignment, flexDirection: 'row', height: scaledImageHeight }}>
                              <Image source={localBrandingLogoUri} alt={library.displayName ?? ''} contentFit='contain' style={{ width: scaledImageWidth, height: scaledImageHeight }} />
                    </HStack>
               ),
          };
     }else{
          return null;
     }
}

export default function TitleWithLogo(props) {
     const { brand, header } = useTheme();
     const textColor = brand.primary['500-text'];
     const bg = brand.primary[500];
     const navigation = useNavigation();
     const hideBack = props.hideBack ?? false;
     const insets = useSafeAreaInsets();
     const library = useLibrary();
     const { width } = useWindowDimensions();
     const headerLogoBar = resolveHeaderLogoBar({ header, library, width });
     const safeAreaBackgroundColor = headerLogoBar?.backgroundColor ?? bg;

     return (
          <VStack style={{ paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right, backgroundColor: safeAreaBackgroundColor }}>
               {headerLogoBar?.content}
               <HStack className="px-1 py-2" style={{ alignItems: 'center', justifyContent: 'space-between', backgroundColor: bg }}>
                    {navigation.canGoBack() && !hideBack ? (
                       <Pressable onPress={() => navigation.goBack()} className="pl-1">
                            <MaterialIcons name="chevron-left" size={24} style={{ color: textColor }} />
                       </Pressable>
                    ) : (
                       <Box className="w-6" />
                    )}
                    <Text className="pl-2" style={{ flex: 1, textAlign: 'left', color: textColor, fontWeight: 'bold' }} size="lg" numberOfLines={1} ellipsizeMode="tail">{decodeHTML(props.title)}</Text>
                    <Box className="w-6" />
               </HStack>
          </VStack>
     );
}

function logoSize(maxWidth, maxHeight, width, height) {
  if (width >= height) {
    const ratio = maxWidth / width;
    const scaledHeight = Math.ceil(ratio * height);

    if (scaledHeight > maxHeight) {
      const constrainedRatio = maxHeight / height;
      return {
        width: Math.ceil(constrainedRatio * width),
        height: maxHeight,
      };
    }

    return {
      width: maxWidth,
      height: scaledHeight,
    };
  }

  const ratio = maxHeight / height;
  const scaledWidth = Math.ceil(ratio * width);

  if (scaledWidth > maxWidth) {
    const constrainedRatio = maxWidth / width;
    return {
      width: maxWidth,
      height: Math.ceil(constrainedRatio * height),
    };
  }

  return {
    width: scaledWidth,
    height: maxHeight,
  };
}
