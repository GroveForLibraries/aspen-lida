/**
 * sessionContext.test.js
 * Tests for the in-memory user/location/library identity tracker that every scoped
 * repository reads/writes against.
 */

import {
     setCurrentUserId, getCurrentUserId,
     setCurrentLocationId, getCurrentLocationId,
     setCurrentLibraryId, getCurrentLibraryId,
     clearSessionContext,
} from '../src/util/db/sessionContext';
import { parseStoredNumber } from '../src/helpers/helpers';

describe('sessionContext', () => {
     afterEach(() => {
          clearSessionContext();
     });

     it('starts with no identity set', () => {
          expect(getCurrentUserId()).toBeNull();
          expect(getCurrentLocationId()).toBeNull();
          expect(getCurrentLibraryId()).toBeNull();
     });

     it('tracks user, location, and library independently', () => {
          setCurrentUserId(5);
          setCurrentLocationId(10);
          setCurrentLibraryId(2);

          expect(getCurrentUserId()).toBe(5);
          expect(getCurrentLocationId()).toBe(10);
          expect(getCurrentLibraryId()).toBe(2);
     });

     it('coerces numeric strings to numbers', () => {
          setCurrentUserId('42');
          expect(getCurrentUserId()).toBe(42);
     });

     it('stores non-numeric values as null', () => {
          setCurrentUserId('not-a-number');
          expect(getCurrentUserId()).toBeNull();

          setCurrentLocationId(undefined);
          expect(getCurrentLocationId()).toBeNull();

          setCurrentLibraryId(NaN);
          expect(getCurrentLibraryId()).toBeNull();
     });

     it('treats 0 as a valid id, not "unset"', () => {
          setCurrentUserId(0);
          expect(getCurrentUserId()).toBe(0);
     });

     it('clearSessionContext resets all three values back to null', () => {
          setCurrentUserId(5);
          setCurrentLocationId(10);
          setCurrentLibraryId(2);

          clearSessionContext();

          expect(getCurrentUserId()).toBeNull();
          expect(getCurrentLocationId()).toBeNull();
          expect(getCurrentLibraryId()).toBeNull();
     });

     it('setting one identity does not affect the others', () => {
          setCurrentUserId(5);
          expect(getCurrentLocationId()).toBeNull();
          expect(getCurrentLibraryId()).toBeNull();
     });

     describe('parseStoredNumber', () => {
          it('parses a plain numeric string', () => {
               expect(parseStoredNumber('5')).toBe(5);
          });

          it('parses a JSON.stringify\'d string value (quoted numeric string)', () => {
               expect(parseStoredNumber('"5"')).toBe(5);
          });

          it('returns null for non-numeric garbage', () => {
               expect(parseStoredNumber('not-a-number')).toBeNull();
          });

          it('returns null for null or undefined', () => {
               expect(parseStoredNumber(null)).toBeNull();
               expect(parseStoredNumber(undefined)).toBeNull();
          });

          it('returns 0 for a stored zero rather than treating it as unset', () => {
               expect(parseStoredNumber('0')).toBe(0);
          });
     });
});
