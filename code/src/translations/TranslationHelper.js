import { getCurrentDate } from '../helpers/helpers';


/**
 * Has the last updated time as well as an array per language of all translations
 * @type {{lastUpdated: Date}}
 */
export let translationsLibrary = {
     lastUpdated: getCurrentDate(),
};

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
