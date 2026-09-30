import React from 'react';
import { ThemedButton as Button, ThemedButtonText as ButtonText } from '../themed/ThemedButton';
import { openSideLoad } from '../../util/api/userHelper';

/**
 * OpenSideLoad component for displaying a button that opens a side load URL.
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const OpenSideLoad = (props) => {
     return (
          <Button
               size="md"
               variant="solid"
               colorScheme="primary" className="w-full"
               onPress={async () => {
                   await openSideLoad(props.url);
               }}>
               <ButtonText>{props.title}</ButtonText>
          </Button>
     );
};
