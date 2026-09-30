import { CommonActions, createNavigationContainerRef } from '@react-navigation/native';

/**
 * A reference to the navigation container, allowing for navigation actions to be dispatched from outside of React components.
 * @type {NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>}
 */
export const navigationRef = createNavigationContainerRef();

/**
 * Navigates to a specified screen with optional parameters.
 * @param name
 * @param params
 */
export const navigate = (name, params) => {
     if (navigationRef.current) {
          navigationRef.current.navigate(name, params);
     }
};

/**
 * Navigates to a specified stack and screen with optional parameters.
 * @param stack
 * @param screen
 * @param params
 */
export const navigateStack = (stack, screen, params) => {
     if (navigationRef.current) {
          navigationRef.current.navigate(stack, {
               screen: screen,
               params: params,
          });
     }
};

/**
 * Navigates to the BrowseTab screen with specified search term, type, and library URL.
 * @param term
 * @param type
 * @param url
 */
export const startSearch = (term, type, url) => {
     if (navigationRef.current) {
          navigationRef.current.navigate('BrowseTab', {
               screen: type,
               params: {
                    term: term,
                    libraryUrl: url,
               },
          });
     }
};

/**
 * Resets the navigation state and navigates to a specified screen, optionally setting the index of the new route.
 * @param name
 * @param index
 */
export const navigateAndSimpleReset = (name, index = 0) => {
     if (navigationRef.isReady()) {
          navigationRef.dispatch(
               CommonActions.reset({
                    index,
                    routes: [{ name }],
               })
          );
     }
};