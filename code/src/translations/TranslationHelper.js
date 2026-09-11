import moment from 'moment';

/**
 * Has the last updated time as well as an array per language of all translations
 * @type {{lastUpdated: *|moment.Moment}}
 */
export let translationsLibrary = {
     lastUpdated: moment(),
};

/**
 * Gets a term from the translations library or defaults.json if not found
 * @param language
 * @param key
 * @param ellipsis
 * @param dictionaryOverride
 * @returns {*|string}
 */
export const getTermFromDictionary = (language = 'en', key, ellipsis = false, dictionaryOverride = undefined) => {
    if (language && key) {
         let tmpDictionary = dictionaryOverride || translationsLibrary;
         if (tmpDictionary !== undefined) {
              if (tmpDictionary[language]) {
                   const thisDictionary = tmpDictionary[language];
                   if (thisDictionary[key]) {
                        if (ellipsis) {
                             return tmpDictionary[language][key] + '...';
                        }
                        return tmpDictionary[language][key];
                   } else {
                         if (tmpDictionary.en) {
                              const englishDictionary = tmpDictionary.en;
                              if (englishDictionary[key]) {
                                   if (ellipsis) {
                                        return englishDictionary[key] + '...';
                                   }
                                   return englishDictionary[key];
                              }
                         }
                   }
              }else{
                   //logDebugMessage("Dictionary for " + language + " did not exist");
              }
         }
    }
    let defaults = require('./defaults.json');
    if (ellipsis) {
        return defaults[key] + '...';
    }
    return defaults[key];
};
