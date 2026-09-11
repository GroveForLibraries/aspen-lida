import { getDb } from '../sqlite';
import { safeStringify } from '../serialize';
import {logDebugMessage} from '../../logging';
import { loadLibraryLanguages, saveLibraryLanguages } from '@/src/util/db';

function safeParse(json) {
     if (!json || typeof json !== 'string') return null;
     try {
          return JSON.parse(json);
     } catch {
          return null;
     }
}

function isPlainObject(value) {
     return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeLanguageCode(code) {
     if (typeof code !== 'string') return '';
     return code.trim().toLowerCase();
}

function toDictionaryEntries(dictionary = {}) {
     if (!isPlainObject(dictionary)) return [];
     return Object.entries(dictionary)
          .map(([code, terms]) => [normalizeLanguageCode(code), terms])
          .filter(([code, terms]) => Boolean(code) && isPlainObject(terms));
}

export async function saveAvailableLanguages(languages = []) {
     logDebugMessage("Saving Available languages ");
     logDebugMessage(languages);
     await saveLibraryLanguages(languages);
}

export async function loadAvailableLanguages() {
     return loadLibraryLanguages();
}

export async function saveDictionary(dictionary = {}) {
     const db = await getDb();
     const now = Date.now();
     logDebugMessage("Saving dictionary");
     Object.keys(dictionary ?? {}).forEach((key) => {
          logDebugMessage(` - Dictionary key: ${key}`);
     });

     const entries = toDictionaryEntries(dictionary);
     await db.withTransactionAsync(async () => {
          await db.runAsync(`DELETE FROM language_state;`);
          for (const [languageCode, terms] of entries) {
               await db.runAsync(
                    `INSERT INTO language_state (language_code, updated_at, dictionary_json)
                     VALUES (?, ?, ?);`,
                    [languageCode, now, safeStringify(terms)]
               );
          }
     });
}

export async function loadDictionary() {
     const db = await getDb();
     const rows = await db.getAllAsync(
          `SELECT language_code, dictionary_json FROM language_state;`
     );
     const result = {};
     (rows ?? []).forEach((row) => {
          const code = normalizeLanguageCode(row?.language_code);
          const parsed = safeParse(row?.dictionary_json);
          if (code && isPlainObject(parsed)) {
               result[code] = parsed;
          }
     });
     logDebugMessage("Loading dictionary");
     Object.keys(result ?? {}).forEach((key) => {
          logDebugMessage(` - Dictionary key: ${key}`);
     });
     return result;
}

export async function loadDictionaryForLanguage(languageCode = 'en') {
     const db = await getDb();
     const normalizedCode = normalizeLanguageCode(languageCode);
     if (!normalizedCode) {
          return {};
     }

     const row = await db.getFirstAsync(
          `SELECT dictionary_json FROM language_state WHERE language_code = ? LIMIT 1;`,
          [normalizedCode]
     );
     const parsed = safeParse(row?.dictionary_json);
     return isPlainObject(parsed) ? parsed : {};
}

export async function saveAllLanguageData(state = {}) {
     logDebugMessage("Saving allLanguageData ");
     await Promise.all([
          saveAvailableLanguages(state.languages ?? []),
          saveDictionary(state.dictionary ?? {}),
     ]);
}

export async function loadAllLanguageData() {
     const db = await getDb();
     const [languages, dictionary, row] = await Promise.all([
          loadAvailableLanguages(),
          loadDictionary(),
          db.getFirstAsync(`SELECT MAX(updated_at) AS updated_at FROM language_state;`),
     ]);

     const normalizedLanguages = Array.isArray(languages) ? languages : [];
     const normalizedDictionary = isPlainObject(dictionary) ? dictionary : {};
     const hasAnyLanguageData = normalizedLanguages.length > 0 || Object.keys(normalizedDictionary).length > 0;
     if (!hasAnyLanguageData) {
          return null;
     }

     return {
          languages: normalizedLanguages,
          dictionary: normalizedDictionary,
          updatedAt: row.updated_at ?? 0,
     };
}

export async function resetLanguageData() {
     const db = await getDb();
     await Promise.all([
          db.runAsync(`DELETE FROM language_state;`),
          saveAvailableLanguages([]),
     ]);
}

