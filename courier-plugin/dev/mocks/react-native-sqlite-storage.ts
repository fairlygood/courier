// Mock for react-native-sqlite-storage — web dev environment
// Uses localStorage for persistence so auth survives page refreshes
//
// Handles the specific SQL patterns used by db.ts:
//   CREATE TABLE, INSERT OR REPLACE, SELECT, UPDATE, DELETE

const LS_KEY = 'courier_db_mock';

interface TableStore {
  [tableName: string]: any[][];
}

let tables: TableStore = {};

function loadLS(): TableStore {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function saveLS() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(tables));
  } catch {}
}

function parseColumns(sql: string): string[] {
  // Extract column names from CREATE TABLE / INSERT statements
  const match = sql.match(/\(([\s\S]+?)\)/);
  if (!match) return [];
  const body = match[1];
  // Split on commas not inside parens (for CHECK constraints)
  const cols: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of body) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) {
      cols.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) cols.push(cur.trim());
  return cols.map((c) => c.split(/\s+/)[0].replace(/^["`]|["`]$/g, ''));
}

function createResults(rows: any[][]): [any] {
  return [
    {
      rows: {
        get length() { return rows.length; },
        item: (i: number) => {
          if (i < 0 || i >= rows.length) return undefined;
          return rows[i];
        },
        raw: () => rows,
      },
    },
  ] as [any];
}

function getDB() {
  return {
    executeSql: (sql: string, params?: any[]): Promise<[any]> => {
      return new Promise((resolve, _reject) => {
        const upperSQL = sql.trim().toUpperCase();

        if (upperSQL.startsWith('CREATE TABLE')) {
          const nameMatch = sql.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
          if (nameMatch) {
            const tableName = nameMatch[1];
            if (!tables[tableName]) tables[tableName] = [];
            saveLS();
          }
          resolve(createResults([]));
          return;
        }

        if (upperSQL.startsWith('INSERT') || upperSQL.startsWith('REPLACE') || upperSQL.includes('INSERT OR REPLACE')) {
          const nameMatch = sql.match(/(?:INSERT(?:\s+OR\s+\w+)?\s+INTO|REPLACE\s+INTO)\s+(\w+)/i);
          if (nameMatch) {
            const tableName = nameMatch[1];
            if (!tables[tableName]) tables[tableName] = [];

            const cols = parseColumns(sql);
            if (cols.length > 0 && params) {
              // Build row object from columns and params
              const row: any = {};
              for (let i = 0; i < cols.length && i < params.length; i++) {
                row[cols[i]] = params[i];
              }

              // For INSERT OR REPLACE with id=1 (auth table)
              if (row.id !== undefined) {
                const existing = tables[tableName].findIndex((r: any) => r.id === row.id);
                if (existing >= 0) {
                  tables[tableName][existing] = row;
                } else {
                  tables[tableName].push(row);
                }
              } else {
                tables[tableName].push(row);
              }
              saveLS();
            }
          }
          resolve(createResults([]));
          return;
        }

        if (upperSQL.startsWith('DELETE')) {
          const nameMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
          if (nameMatch) {
            const tableName = nameMatch[1];
            tables[tableName] = [];
            saveLS();
          }
          resolve(createResults([]));
          return;
        }

        if (upperSQL.startsWith('UPDATE')) {
          const nameMatch = sql.match(/UPDATE\s+(\w+)/i);
          if (nameMatch) {
            const tableName = nameMatch[1];
            if (!tables[tableName]) tables[tableName] = [];

            const setMatch = sql.match(/SET\s+(.+?)(?:\s+WHERE|$)/is);
            if (setMatch && params && params.length > 0) {
              const setClause = setMatch[1].trim();
              const colMatch = setClause.match(/(\w+)\s*=\s*\?/i);
              if (colMatch) {
                const colName = colMatch[1];
                // Update all rows matching WHERE id = ? (simplified: auth table has id=1)
                for (const row of tables[tableName]) {
                  if ((row as any).id === 1) {
                    (row as any)[colName] = params[0];
                  }
                }
                saveLS();
              }
            }
          }
          resolve(createResults([]));
          return;
        }

        if (upperSQL.startsWith('SELECT')) {
          const nameMatch = sql.match(/SELECT\s+(.*?)\s+FROM\s+(\w+)/is);
          if (nameMatch) {
            const tableName = nameMatch[2];
            if (!tables[tableName]) tables[tableName] = [];

            let rows = [...tables[tableName]];

            // WHERE clause
            const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s*$)/is);
            if (whereMatch) {
              const whereClause = whereMatch[1].trim();
              // Simple WHERE col = ? pattern
              const eqMatch = whereClause.match(/(\w+)\s*=\s*\?/);
              if (eqMatch && params && params.length > 0) {
                const col = eqMatch[1];
                const val = params[0];
                rows = rows.filter((r: any) => r[col] === val);
              }
              // WHERE ... AND ... with two params
              const andMatch = whereClause.match(/(\w+)\s*=\s*\?\s+AND\s+(\w+)\s*=\s*\?/);
              if (andMatch && params && params.length >= 2) {
                rows = rows.filter(
                  (r: any) => r[andMatch[1]] === params[0] && r[andMatch[2]] === params[1]
                );
              }
            }

            resolve(createResults(rows));
            return;
          }

          resolve(createResults([]));
          return;
        }

        resolve(createResults([]));
      });
    },

    close: (): Promise<void> => {
      return Promise.resolve();
    },
  };
}

let _db: any = null;

export function enablePromise(_flag: boolean) {}

export function openDatabase(_options: { name: string; location: string }): Promise<any> {
  if (_db) return Promise.resolve(_db);
  tables = loadLS();
  _db = getDB();
  return Promise.resolve(_db);
}

export default {
  enablePromise,
  openDatabase,
};
