import { DisplayEventResult } from './DisplayEventResult';
import { DisplayGroupedWorkResult } from './DisplayGroupedWorkResult';
import { DisplayListResult } from './DisplayListResult';

/**
 *
 * @param props
 * @returns {React.JSX.Element}
 * @constructor
 */
export const DisplayResult = (props) => {
     const item = props.data;
     let currentSource = item.type ?? 'unknown';
     if (currentSource === 'unknown') {
          if (item.recordtype) {
               currentSource = item.recordtype;
          }
     }

     if (currentSource === 'event') {
          return <DisplayEventResult data={item} />;
     }

     if (currentSource === 'list') {
          return <DisplayListResult data={item} />;
     }

     return <DisplayGroupedWorkResult data={item} />;
};