import React, { useState } from 'react';
import { logDebugMessage } from '../util/logging.js';

/**
 * CheckoutsContext provides a context for managing checkouts state.
 * @type {React.Context<{updateCheckouts: function(), checkouts: *[], resetCheckouts: function()}>}
 */
export const CheckoutsContext = React.createContext({
     updateCheckouts: () => {},
     checkouts: [],
     resetCheckouts: () => {},
});

/**
 * HoldsContext provides a context for managing holds state.
 * @type {React.Context<{updateHolds: function(), holds: *[], resetHolds: function()}>}
 */
export const HoldsContext = React.createContext({
     updateHolds: () => {},
     holds: [],
     resetHolds: () => {},
});
/**
 * GroupedWorkContext provides a context for managing grouped work, format, and language state.
 * @type {React.Context<{updateGroupedWork: function(), updateFormat: function(), updateLanguage: function(), groupedWork: *[], format: *[], language: *[], resetGroupedWork: function()}>}
 */
export const GroupedWorkContext = React.createContext({
     updateGroupedWork: () => {},
     updateFormat: () => {},
     updateLanguage: () => {},
     groupedWork: [],
     format: [],
     language: [],
     resetGroupedWork: () => {},
});

/**
 * SystemMessagesContext provides a context for managing system messages state.
 * @type {React.Context<{updateSystemMessages: function(), systemMessages: *[], resetSystemMessages: function()}>}
 */
export const SystemMessagesContext = React.createContext({
     updateSystemMessages: () => {},
     systemMessages: [],
     resetSystemMessages: () => {},
});

/**
 * SearchContext provides a context for managing search-related state, including query, current index, current source, sources, indexes, facets, and sort order.
 * @type {React.Context<{query: string, currentIndex: string, currentSource: string, sources: *[], indexes: *[], facets: *[], sort: string, updateQuery: function(), updateCurrentIndex: function(), updateCurrentSource: function(), updateIndexes: function(), updateSources: function(), updateFacets: function(), updateSort: function(), resetSearch: function()}>}
 */
export const SearchContext = React.createContext({
     query: '',
     currentIndex: 'Keyword',
     currentSource: 'local',
     sources: [],
     indexes: [],
     facets: [],
     sort: 'relevance',
     updateQuery: () => {},
     updateCurrentIndex: () => {},
     updateCurrentSource: () => {},
     updateIndexes: () => {},
     updateSources: () => {},
     updateFacets: () => {},
     updateSort: () => {},
     resetSearch: () => {},
});

/**
 * CheckoutsProvider component for managing checkouts state and providing checkouts context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const CheckoutsProvider = ({ children }) => {
     const [checkouts, setCheckouts] = useState();

     const updateCheckouts = (data) => {
          setCheckouts(data);
          logDebugMessage('updated CheckoutsContext');
     };

     const resetCheckouts = () => {
          setCheckouts({});
          logDebugMessage('reset CheckoutsContext');
     };

     return (
          <CheckoutsContext.Provider
               value={{
                    checkouts,
                    updateCheckouts,
                    resetCheckouts,
               }}>
               {children}
          </CheckoutsContext.Provider>
     );
};

/**
 * HoldsProvider component for managing holds state and providing holds context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const HoldsProvider = ({ children }) => {
     const [holds, setHolds] = useState();

     const updateHolds = (data) => {
          setHolds(data);
          logDebugMessage('updated HoldsContext');
     };

     const resetHolds = () => {
          setHolds({});
          logDebugMessage('reset HoldsContext');
     };

     return (
          <HoldsContext.Provider
               value={{
                    holds,
                    updateHolds,
                    resetHolds,
               }}>
               {children}
          </HoldsContext.Provider>
     );
};

/**
 * GroupedWorkProvider component for managing grouped work, format, and language state and providing grouped work context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const GroupedWorkProvider = ({ children }) => {
     const [groupedWork, setGroupedWork] = useState();
     const [format, setFormat] = useState();
     const [language, setLanguage] = useState();

     const updateGroupedWork = (data) => {
          setGroupedWork(data);
          logDebugMessage('updated GroupedWorkContext');

          const formatKeys = Object.keys(data?.formats ?? {});
          setFormat(formatKeys[0]);
          logDebugMessage('updated format in GroupedWorkContext:updateGroupedWork');

          setLanguage(data.language);
          logDebugMessage('updated language in GroupedWorkContext:updateGroupedWork');
     };

     const updateFormat = (data) => {
          setFormat(data);
          logDebugMessage('updated format in GroupedWorkContext');
     };

     const updateLanguage = (data) => {
          setLanguage(data);
          logDebugMessage('updated language in GroupedWorkContext');
     };

     const resetGroupedWork = () => {
          setGroupedWork([]);
          logDebugMessage('reset GroupedWorkContext');
     };

     return <GroupedWorkContext.Provider value={{ groupedWork, format, language, updateGroupedWork, updateFormat, updateLanguage, resetGroupedWork }}>{children}</GroupedWorkContext.Provider>;
};

/**
 * SystemMessagesProvider component for managing system messages state and providing system messages context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SystemMessagesProvider = ({ children }) => {
     const [systemMessages, setSystemMessages] = useState();

     const updateSystemMessages = (data) => {
          setSystemMessages(data);
          logDebugMessage('updated SystemMessagesContext');
     };

     const resetSystemMessages = () => {
          setSystemMessages({});
          logDebugMessage('reset SystemMessagesContext');
     };

     return (
          <SystemMessagesContext.Provider
               value={{
                    systemMessages,
                    updateSystemMessages,
                    resetSystemMessages,
               }}>
               {children}
          </SystemMessagesContext.Provider>
     );
};

/**
 * SearchProvider component for managing search-related state and providing search context to its children.
 * @param param0
 * @param param0.children
 * @returns {React.JSX.Element}
 * @constructor
 */
export const SearchProvider = ({ children }) => {
     const [currentIndex, setCurrentIndex] = useState();
     const [currentSource, setCurrentSource] = useState();
     const [indexes, setIndexes] = useState();
     const [sources, setSources] = useState();
     const [facets, setFacets] = useState();
     const [sort, setSort] = useState();
     const [query, setQuery] = useState();

     const updateCurrentIndex = (data) => {
          setCurrentIndex(data);
          logDebugMessage('updated currentIndex in SearchContext');
     };

     const updateCurrentSource = (data) => {
          setCurrentSource(data);
          logDebugMessage('updated currentSource in SearchContext');
     };

     const updateIndexes = (data) => {
          setIndexes(data);
          logDebugMessage('updated indexes in SearchContext');
     };

     const updateSources = (data) => {
          setSources(data);
          logDebugMessage('updated sources in SearchContext');
     };

     const updateFacets = (data) => {
          setFacets(data);
          logDebugMessage('updated facets in SearchContext');
     };

     const updateSort = (data) => {
          setSort(data);
          logDebugMessage('updated sort in SearchContext');
     };

     const updateQuery = (data) => {
          setQuery(data);
          logDebugMessage('updated query in SearchContext');
     };

     const resetSearch = () => {
          setCurrentIndex('Keyword');
          setCurrentSource('local');
          setIndexes({});
          setSources({});
          setQuery('');
          setFacets({});
          setSort('relevance');
          logDebugMessage('reset SearchContext');
     };

     return (
          <SearchContext.Provider
               value={{
                    currentIndex,
                    updateCurrentIndex,
                    currentSource,
                    updateCurrentSource,
                    indexes,
                    updateIndexes,
                    sources,
                    updateSources,
                    facets,
                    updateFacets,
                    query,
                    updateQuery,
                    sort,
                    updateSort,
                    resetSearch,
               }}>
               {children}
          </SearchContext.Provider>
     );
};
