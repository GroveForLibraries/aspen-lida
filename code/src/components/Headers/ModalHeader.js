import React from 'react';
import { ThemedMaterialIcons as MaterialIcons } from '@/src/components/themed/ThemedMaterialIcons';
import { Box } from '@/components/ui/box';
import { HStack } from '@/components/ui/hstack';
import { Pressable } from '@/components/ui/pressable';
import { ThemedText as Text } from '@/src/components/themed/ThemedText';
import { useTheme } from '../../themes/theme';

/**
 * ModalHeader component for displaying a header in a modal with optional back and close buttons.
 * @param param0
 * @param param0.title
 * @param param0.onBack
 * @param param0.onClose
 * @param param0.showBack
 * @param param0.showClose
 * @param param0.centerTitle
 * @returns {React.JSX.Element}
 * @constructor
 */
export const ModalHeader = ({ title, onBack, onClose, showBack = true, showClose = true, centerTitle = true }) => {
     const { brand } = useTheme();
     const iconColor = brand.primary['500-text'];
     const bg = brand.primary[500];

     return (
          <Box className="px-3 py-3" style={{ backgroundColor: bg }}>
               <HStack className="items-center justify-between">
                    <Box className="min-w-10">
                         {showBack && onBack ? (
                              <Pressable onPress={onBack} className="p-1">
                                   <MaterialIcons name="chevron-left" size={28} color={iconColor} />
                              </Pressable>
                         ) : null}
                    </Box>

                    <Box className={centerTitle ? 'flex-1 items-center' : 'flex-1 items-start'}>
                         <Text bold size="lg" numberOfLines={1} style={{ color: iconColor }}>
                              {title}
                         </Text>
                    </Box>

                    <Box className="items-end min-w-10">
                         {showClose && onClose ? (
                              <Pressable onPress={onClose} className="p-1">
                                   <MaterialIcons name="close" size={24} color={iconColor} />
                              </Pressable>
                         ) : null}
                    </Box>
               </HStack>
          </Box>
     );
};
