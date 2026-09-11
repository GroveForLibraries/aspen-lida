import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import {SplashScreen} from '../src/screens/Auth/Splash';
import * as TranslationService from '../src/translations/TranslationService';

/*
 *  Basic test to ensure the screen itself renders properly without crashing.
 */
describe('<SplashScreen />', () => {
     it('renders correctly', async () => {
          const translationSpy = jest
             .spyOn(TranslationService, 'getTermFromDictionary')
             .mockReturnValue('Mocked App Name');

          await render(<SplashScreen />);

          // 1. Assert that the component renders without crashing
          expect(screen.toJSON()).toBeTruthy();

          // 2. Find the image by its accessible 'alt' text (or accessibilityLabel)
          //    and verify it exists
          // Note: expo-image's test-environment native view mock isn't recognized by
          // getByRole('image', ...) role inference, so match on the accessibility label instead.
          const logoImage = screen.getByLabelText('Mocked App Name');
          expect(logoImage).toBeTruthy();

          // 3. Verify properties on the image source
          // (Note: Since we mocked 'loginLogo' as 'mock-logo-path' in jest.setup.js, it should match here)
          // expo-image normalizes `source` into an array of source objects.
          expect(logoImage.props.source[0].uri).toBe('mock-logo-path');

          expect(translationSpy).toHaveBeenCalledWith('en', 'app_name');

          // Clean up the spy so it doesn't affect other tests
          translationSpy.mockRestore();
     });
});

/*
 * Make sure we render full screen
 */
describe('<SplashScreen /> - Layout Styles', () => {
  it('applies full screen container styles', async () => {
    await render(<SplashScreen />);

    // Grabbing the top-level container element
    // Gluestack components map down to base React Native views under the hood
    const container = screen.toJSON();

    const flattenedStyles = StyleSheet.flatten(container.props.style);

    // Assert that the flex property is set to fill the screen
    expect(flattenedStyles).toMatchObject({
      flex: 1,
    });
  });
});

/*
 * Make sure the correct background color is set based on the overall environment (as defined in jest.setup.js)
 */
describe('<SplashScreen /> - Color Theme', () => {
  it('applies the correct background color configuration', async () => {
    await render(<SplashScreen />);

    // Target the specific component directly using its testID
    const centerComponent = screen.getByTestId('splash-center');

    // Flatten the styles on this specific element
    const flattenedStyles = StyleSheet.flatten(centerComponent.props.style);

    // Verify it matches your mocked environment setup (#010203)
    expect(flattenedStyles).toMatchObject({
      backgroundColor: '#010203',
    });
  });
});
