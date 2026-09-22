const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(__dirname, '../sample.db');

function run(db, sql) {
     return new Promise((resolve, reject) => {
          db.exec(sql, (err) => {
               if (err) reject(err);
               else resolve();
          });
     });
}

function all(db, sql) {
     return new Promise((resolve, reject) => {
          db.all(sql, (err, rows) => {
               if (err) reject(err);
               else resolve(rows);
          });
     });
}

function eachUpdate(db, updates, applied) {
     return updates.reduce(async (prev, update) => {
          await prev;

          if (!update?.key || typeof update.up !== 'function') {
               return;
          }

          if (applied.has(update.key)) {
               console.log(`Skipping already applied update ${update.key}`);
               return;
          }

          console.log(`Applying update ${update.key}`);
          await run(db, 'BEGIN;');
          try {
               await update.up({
                    execAsync: (sql) => run(db, sql),
                    runAsync: (sql, params = []) =>
                         new Promise((resolve, reject) => {
                              db.run(sql, params, function (err) {
                                   if (err) reject(err);
                                   else resolve(this);
                              });
                         }),
               });
               await run(db, `INSERT INTO schema_updates (key, applied_at) VALUES (${JSON.stringify(update.key)}, ${Date.now()});`);
               await run(db, 'COMMIT;');
               console.log(`Applied update ${update.key}`);
          } catch (error) {
               await run(db, 'ROLLBACK;').catch(() => {});
               throw error;
          }
     }, Promise.resolve());
}

async function main() {
     const db = new sqlite3.Database(dbPath);

     const versionUpdates = [require('./src/util/db/versionUpdates/26.06.00.js'), require('./src/util/db/versionUpdates/26.08.00.js'), require('./src/util/db/versionUpdates/26.08.01.js'), require('./src/util/db/versionUpdates/26.09.00.js'), require('./src/util/db/versionUpdates/26.09.01.js')];

     await run(
          db,
          `
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS schema_updates (
      key TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    );
  `
     );

     const appliedRows = await all(db, `SELECT key FROM schema_updates;`);
     const applied = new Set(appliedRows.map((row) => row.key));

     for (const update of versionUpdates) {
          if (!update?.up) continue;
          if (applied.has(update.key)) {
               console.log(`Skipping already applied update ${update.key}`);
               continue;
          }

          console.log(`Applying update ${update.key}`);
          await run(db, 'BEGIN;');
          try {
               await update.up({
                    execAsync: (sql) => run(db, sql),
                    runAsync: (sql, params = []) =>
                         new Promise((resolve, reject) => {
                              db.run(sql, params, function (err) {
                                   if (err) reject(err);
                                   else resolve(this);
                              });
                         }),
               });

               await run(db, `INSERT INTO schema_updates (key, applied_at) VALUES (${JSON.stringify(update.key)}, ${Date.now()});`);
               await run(db, 'COMMIT;');
               console.log(`Applied update ${update.key}`);
          } catch (error) {
               await run(db, 'ROLLBACK;').catch(() => {});
               throw error;
          }
     }

     db.close();
     console.log(`Done. Schema DB ready at: ${dbPath}`);
}

main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
});
