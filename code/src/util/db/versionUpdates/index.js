import * as m260600 from './26.06.00';
import * as m260800 from './26.08.00';
import * as m2608001 from './26.08.01';
import * as m260900 from './26.09.00';
import * as m2609001 from './26.09.01';

/**
 * Compare two release keys in the format of "major.minor.patch" and sort them in ascending order.
 * @param a
 * @param b
 * @returns {number}
 */
export function compareReleaseKeys(a, b) {
     const pa = String(a.key)
          .split('.')
          .map((n) => parseInt(n, 10));
     const pb = String(b.key)
          .split('.')
          .map((n) => parseInt(n, 10));

     for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
          const av = pa[i] ?? 0;
          const bv = pb[i] ?? 0;
          if (av !== bv) return av - bv;
     }
     return 0;
}

export const versionUpdates = [m260600, m260800, m2608001, m260900, m2609001].sort(compareReleaseKeys);
