import { useColorModeValue, useTheme } from '../../themes/theme';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../themed/ThemedButton';
import { useUserState } from '../../hooks/useUserData';
import React from 'react';
import { useLibrary } from '../../hooks/useLibrarySystemData';
import {passUserToDiscovery} from '../../util/api/user';

/**
 * MoreInfo component for displaying a button that navigates to the Aspen Discovery grouped work page.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const MoreInfo = (props) => {
    const { neutralPairs } = useTheme();
    const { data: userState } = useUserState();
    const user = userState?.user ?? {};
    const library = useLibrary();

    const backgroundColor = useColorModeValue(neutralPairs.surface.light, neutralPairs.surface.dark);
    const textColor = useColorModeValue(neutralPairs.textMain.light, neutralPairs.textMain.dark);

    return (
        <Button
            size="xs"
            variant="link"
            style={{ width: '100%', backgroundColor }}
            onPress={async () => {
                passUserToDiscovery(library?.baseUrl ?? '', props.module, user.id, backgroundColor, textColor, props.recordId)
            }}>
            <ButtonText style={{ color: textColor }}>{props.title}</ButtonText>
        </Button>
    );
};
