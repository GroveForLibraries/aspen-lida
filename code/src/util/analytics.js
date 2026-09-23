import { createApiClient } from './api/apiFactory';
import { GLOBALS } from './globals';

/**
 * Tracks app launches by sending a POST request to the server. This function is useful for analytics purposes, allowing the server to record when the app is launched. It uses a default timeout defined in GLOBALS and can accept an optional URL parameter to specify the API endpoint.
 * @param url
 * @returns {Promise<boolean>}
 */
export async function trackAppLaunches(url = null) {
     try {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutAverage,
          });
          const response = await client.post('/UserAPI?method=trackAppLaunches', {});
          return response.ok;
     } catch (error) {
          console.error('Failed to track app launch: ', error);
          return false;
     }
}

/**
 * Tracks app resumes by sending a POST request to the server. This function is useful for analytics purposes, allowing the server to record when the app is resumed from a background state. It uses a default timeout defined in GLOBALS and can accept an optional URL parameter to specify the API endpoint.
 * @param url
 * @returns {Promise<boolean>}
 */
export async function trackAppResume(url = null) {
     try {
          const client = createApiClient({
               url,
               timeout: GLOBALS.timeoutAverage,
          });
          const response = await client.post('/UserAPI?method=trackAppResume', {});
          return response.ok;
     } catch (error) {
          console.error('Failed to track app resume: ', error);
          return false;
     }
}
