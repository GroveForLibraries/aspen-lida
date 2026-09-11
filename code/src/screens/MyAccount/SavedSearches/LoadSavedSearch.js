import { useRoute, useNavigation, StackActions } from '@react-navigation/native';
import { getCleanTitle } from '@/src/helpers/item';
import { useLibrary } from '@/src/hooks/useLibrarySystemData';

/**
 * LoadSavedSearch component that navigates to the MySavedSearch screen with the provided search ID and title. It retrieves the search ID and title from the route parameters and constructs a navigation action to push the MySavedSearch screen onto the navigation stack.
 * @constructor
 */
export const LoadSavedSearch = () => {
     const navigation = useNavigation();
     const id = useRoute().params.search ?? 0;
     const title = useRoute().params.name ?? 'Saved Search Results';
     const library = useLibrary();
     const url = library.baseUrl;

     const pushAction = StackActions.push('MySavedSearch',
         {
              id: id,
              title: getCleanTitle(title),
              libraryUrl: url,
              prevRoute: 'NONE'
         });

     navigation.dispatch(pushAction);

}