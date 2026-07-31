const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'db_emulated.json');

// Initialize database file if it doesn't exist
const initDb = () => {
  if (!fs.existsSync(DB_PATH)) {
    const initialData = {
      users: [],
      ai_employees: [],
      prompts: [],
      chats: [],
      messages: [],
      documents: [],
      settings: [],
      analytics: [],
      activity_logs: [],
      document_chunks: []
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2), 'utf8');
  }
};

const readDb = () => {
  initDb();
  try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Failed to read emulated db, resetting:', err.message);
    const initialData = {
      users: [],
      ai_employees: [],
      prompts: [],
      chats: [],
      messages: [],
      documents: [],
      settings: [],
      analytics: [],
      activity_logs: [],
      document_chunks: []
    };
    return initialData;
  }
};

const writeDb = (data) => {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write emulated db:', err.message);
  }
};

const resolveVal = (valStr, params) => {
  const trimmed = valStr.trim();
  if (trimmed.startsWith('$')) {
    const idx = parseInt(trimmed.substring(1)) - 1;
    return params[idx];
  }
  if (trimmed === 'NULL' || trimmed === 'null') {
    return null;
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1);
  }
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  if (trimmed === 'NOW()' || trimmed === 'CURRENT_TIMESTAMP') {
    return new Date().toISOString();
  }
  if (trimmed.match(/NOW\(\)\s*-\s*INTERVAL\s*'\d+\s+\w+'/i)) {
    const match = trimmed.match(/INTERVAL\s*'(\d+)\s+(\w+)'/i);
    if (match) {
      const amt = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const date = new Date();
      if (unit.startsWith('hour')) {
        date.setHours(date.getHours() - amt);
      } else if (unit.startsWith('day')) {
        date.setDate(date.getDate() - amt);
      } else if (unit.startsWith('minute')) {
        date.setMinutes(date.getMinutes() - amt);
      }
      return date.toISOString();
    }
  }
  const num = Number(trimmed);
  if (!isNaN(num) && trimmed !== '') {
    return num;
  }
  // Try JSON parsing for arrays/objects
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const cleanedJson = trimmed.replace(/::jsonb/gi, '');
      return JSON.parse(cleanedJson);
    } catch (e) {
      // return as string if json parse fails
    }
  }
  return trimmed;
};

// Simple where clause parser supporting field = $N, field != $N, and, or, ILIKE, IN
const parseWhereClause = (whereStr) => {
  // Strip trailing sorting/limiting if it leaked
  const cleaned = whereStr.replace(/\s+(ORDER\s+BY|LIMIT|GROUP\s+BY).*/i, '').trim();

  // Splits by ' AND ' (case insensitive)
  const parts = cleaned.split(/\s+AND\s+/i).map(p => p.trim());
  const conditions = [];

  parts.forEach(part => {
    let op = '=';
    let field = '';
    let valStr = '';

    if (part.includes('!=')) {
      op = '!=';
      const index = part.indexOf('!=');
      field = part.substring(0, index).trim();
      valStr = part.substring(index + 2).trim();
    } else if (part.includes('<>')) {
      op = '!=';
      const index = part.indexOf('<>');
      field = part.substring(0, index).trim();
      valStr = part.substring(index + 2).trim();
    } else if (part.match(/\s+ILIKE\s+/i)) {
      op = 'ILIKE';
      const match = part.match(/(.+?)\s+ILIKE\s+(.+)/i);
      field = match[1].trim();
      valStr = match[2].trim();
    } else if (part.match(/\s+IN\s+/i)) {
      op = 'IN';
      const match = part.match(/(.+?)\s+IN\s*\((.+)\)/i);
      field = match[1].trim();
      valStr = match[2].trim();
    } else if (part.includes('=')) {
      op = '=';
      const index = part.indexOf('=');
      field = part.substring(0, index).trim();
      valStr = part.substring(index + 1).trim();
    } else {
      return;
    }

    // Strip table prefix if any
    field = field.split('.').pop().toLowerCase();

    conditions.push({
      field,
      op,
      valStr
    });
  });

  return conditions;
};

const matchesFilter = (row, filter, params) => {
  if (!filter || filter.length === 0) return true;

  return filter.every(cond => {
    const { field, op, valStr } = cond;
    
    const getParamVal = (vStr) => {
      const m = vStr.trim().match(/^\$(\d+)$/);
      if (m) {
        return params[parseInt(m[1]) - 1];
      }
      if (vStr.startsWith("'") && vStr.endsWith("'")) {
        return vStr.slice(1, -1);
      }
      return vStr;
    };

    let actual = row[field];
    if (actual === undefined) {
      if (field === 'user_id' && row.userId !== undefined) actual = row.userId;
      else if (field === 'employee_id' && row.employeeId !== undefined) actual = row.employeeId;
    }

    if (op === '=') {
      const val = getParamVal(valStr);
      return String(actual) === String(val);
    }
    if (op === '!=') {
      const val = getParamVal(valStr);
      return String(actual) !== String(val);
    }
    if (op === 'ILIKE') {
      let val = valStr;
      const m = valStr.trim().match(/^\$(\d+)$/);
      if (m) {
        val = params[parseInt(m[1]) - 1];
      } else if (valStr.startsWith("'") && valStr.endsWith("'")) {
        val = valStr.slice(1, -1);
      }
      const cleanVal = String(val).replace(/%/g, '').toLowerCase();
      return String(actual || '').toLowerCase().includes(cleanVal);
    }
    if (op === 'IN') {
      const listStr = valStr.replace(/^\(|\)$/g, '');
      const listVals = listStr.split(',').map(v => {
        const trimmed = v.trim();
        const m = trimmed.match(/^\$(\d+)$/);
        if (m) return params[parseInt(m[1]) - 1];
        if (trimmed.startsWith("'") && trimmed.endsWith("'")) return trimmed.slice(1, -1);
        return trimmed;
      });
      return listVals.includes(String(actual));
    }

    return true;
  });
};

const executeQuery = async (queryText, params = []) => {
  // Clean whitespace
  const sql = queryText.replace(/\s+/g, ' ').trim();
  const dbData = readDb();

  // 1. CREATE TABLE check
  if (sql.match(/^CREATE\s+TABLE/i)) {
    return { rows: [], rowCount: 0 };
  }

  // 2. INSERT statement
  if (sql.match(/^INSERT\s+INTO/i)) {
    const insertMatch = sql.match(/INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\((.+)\)/i);
    if (!insertMatch) {
      throw new Error(`Failed to parse INSERT query: ${sql}`);
    }
    const tableName = insertMatch[1].toLowerCase();
    const cols = insertMatch[2].split(',').map(c => c.trim());
    const valuesListStr = insertMatch[3];
    
    // Split values by commas, respecting quotes and parentheses
    const vals = [];
    let current = '';
    let inString = false;
    let parenCount = 0;
    for (let i = 0; i < valuesListStr.length; i++) {
      const char = valuesListStr[i];
      if (char === "'" && valuesListStr[i - 1] !== '\\') {
        inString = !inString;
      }
      if (!inString) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
      }
      if (char === ',' && !inString && parenCount === 0) {
        vals.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    vals.push(current);

    const tableList = dbData[tableName] || [];
    const newRecord = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    cols.forEach((col, idx) => {
      newRecord[col] = resolveVal(vals[idx], params);
    });

    tableList.push(newRecord);
    dbData[tableName] = tableList;
    writeDb(dbData);

    return { rows: [newRecord], rowCount: 1 };
  }

  // 3. UPDATE statement
  if (sql.match(/^UPDATE/i)) {
    const updateMatch = sql.match(/UPDATE\s+(\w+)\s+SET\s+(.+?)\s+WHERE\s+(.+)/i);
    if (!updateMatch) {
      throw new Error(`Failed to parse UPDATE query: ${sql}`);
    }
    const tableName = updateMatch[1].toLowerCase();
    const setStr = updateMatch[2];
    const whereStr = updateMatch[3];

    // Parse SET fields
    const setPairs = setStr.split(',').map(p => p.trim());
    const updates = {};
    setPairs.forEach(pair => {
      const eqIdx = pair.indexOf('=');
      if (eqIdx !== -1) {
        const col = pair.substring(0, eqIdx).trim();
        const valStr = pair.substring(eqIdx + 1).trim();
        updates[col] = resolveVal(valStr, params);
      }
    });

    // Parse WHERE filter
    const filter = parseWhereClause(whereStr);
    const tableList = dbData[tableName] || [];
    let updatedCount = 0;
    const updatedRows = [];

    tableList.forEach(row => {
      if (matchesFilter(row, filter, params)) {
        Object.assign(row, updates);
        row.updated_at = new Date().toISOString();
        updatedRows.push(row);
        updatedCount++;
      }
    });

    if (updatedCount > 0) {
      writeDb(dbData);
    }

    return { rows: updatedRows, rowCount: updatedCount };
  }

  // 4. DELETE statement
  if (sql.match(/^DELETE\s+FROM/i)) {
    const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)(?:\s+WHERE\s+(.+))?/i);
    if (!deleteMatch) {
      throw new Error(`Failed to parse DELETE query: ${sql}`);
    }
    const tableName = deleteMatch[1].toLowerCase();
    const whereStr = deleteMatch[2];

    const filter = whereStr ? parseWhereClause(whereStr) : null;
    const tableList = dbData[tableName] || [];
    
    const remaining = [];
    const deleted = [];
    tableList.forEach(row => {
      if (filter && matchesFilter(row, filter, params)) {
        deleted.push(row);
      } else {
        remaining.push(row);
      }
    });

    dbData[tableName] = remaining;

    // Handle cascade deletes
    if (deleted.length > 0) {
      deleted.forEach(row => {
        const id = row.id;
        if (tableName === 'ai_employees') {
          dbData.prompts = (dbData.prompts || []).filter(p => p.employee_id !== id);
          dbData.chats = (dbData.chats || []).filter(c => c.employee_id !== id);
          dbData.documents = (dbData.documents || []).filter(d => d.employee_id !== id);
          dbData.document_chunks = (dbData.document_chunks || []).filter(ch => ch.employee_id !== id);
        } else if (tableName === 'chats') {
          dbData.messages = (dbData.messages || []).filter(m => m.chat_id !== id);
        } else if (tableName === 'documents') {
          dbData.document_chunks = (dbData.document_chunks || []).filter(ch => ch.document_id !== id);
        }
      });
      writeDb(dbData);
    }

    return { rows: deleted, rowCount: deleted.length };
  }

  // 5. SELECT statement
  if (sql.match(/^SELECT/i)) {
    const fromMatch = sql.match(/FROM\s+(\w+)(?:\s+(\w+))?/i);
    if (!fromMatch) {
      if (sql.includes('NOW()') || sql.includes('CURRENT_TIMESTAMP')) {
        return { rows: [{ now: new Date().toISOString() }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0 };
    }

    const tableName = fromMatch[1].toLowerCase();
    const tableAlias = fromMatch[2] ? fromMatch[2].toLowerCase() : null;

    let rows = JSON.parse(JSON.stringify(dbData[tableName] || []));

    // Handle JOINS
    const joinMatches = [...sql.matchAll(/(LEFT\s+)?JOIN\s+(\w+)(?:\s+(\w+))?\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi)];
    joinMatches.forEach(join => {
      const joinTable = join[2].toLowerCase();
      const joinAlias = join[3] ? join[3].toLowerCase() : null;
      const onLeft = join[4].toLowerCase();
      const onRight = join[5].toLowerCase();

      const leftField = onLeft.split('.')[1];
      const rightField = onRight.split('.')[1];
      const joinList = dbData[joinTable] || [];

      rows = rows.map(row => {
        const matchingRecord = joinList.find(jr => {
          const lVal = row[leftField] || row[onLeft.split('.')[0] === tableAlias ? leftField : rightField];
          const rVal = jr[rightField] || jr[onRight.split('.')[0] === joinAlias ? rightField : leftField];
          return lVal && rVal && lVal === rVal;
        });

        if (matchingRecord) {
          const merged = { ...row };
          Object.keys(matchingRecord).forEach(k => {
            if (k !== 'id' && k !== 'created_at' && k !== 'updated_at') {
              if (joinAlias) {
                merged[`${joinAlias}_${k}`] = matchingRecord[k];
              }
              if (!merged.hasOwnProperty(k) || joinTable === 'prompts') {
                merged[k] = matchingRecord[k];
              }
            }
          });
          if (joinTable === 'ai_employees') {
            merged.employee_name = matchingRecord.name;
            merged.employee_avatar = matchingRecord.avatar_url;
            merged.employee_category = matchingRecord.category;
          }
          if (joinTable === 'users') {
            merged.user_name = matchingRecord.name;
            merged.user_email = matchingRecord.email;
          }
          return merged;
        }
        return row;
      });
    });

    // Handle WHERE clause
    const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+GROUP\s+BY|\s+ORDER\s+BY|\s+LIMIT|$)/i);
    if (whereMatch) {
      const filter = parseWhereClause(whereMatch[1]);
      rows = rows.filter(row => matchesFilter(row, filter, params));
    }

    // Handle aggregates
    if (sql.match(/SELECT\s+COUNT\(\*\)/i)) {
      const groupByMatch = sql.match(/GROUP\s+BY\s+([\w.]+)/i);
      if (groupByMatch) {
        const groupCol = groupByMatch[1].split('.').pop().toLowerCase();
        const groups = {};
        rows.forEach(r => {
          const val = r[groupCol];
          groups[val] = (groups[val] || 0) + 1;
        });
        const groupedRows = Object.keys(groups).map(k => ({
          [groupCol]: k,
          name: k,
          value: groups[k],
          count: groups[k]
        }));
        return { rows: groupedRows, rowCount: groupedRows.length };
      }

      return { rows: [{ count: rows.length }], rowCount: 1 };
    }

    if (sql.match(/SELECT\s+COALESCE/i) || sql.match(/AVG\(/i) || sql.match(/SUM\(/i)) {
      let totalTokens = 0;
      let totalCost = 0;
      let totalTime = 0;
      let count = 0;

      rows.forEach(r => {
        totalTokens += Number(r.tokens_used || 0);
        totalCost += Number(r.cost || 0);
        totalTime += Number(r.response_time || 0);
        count++;
      });

      const avgTime = count > 0 ? Math.round(totalTime / count) : 0;

      return {
        rows: [{
          total_tokens: totalTokens,
          tokens: totalTokens,
          total_cost: totalCost,
          avg_time: avgTime
        }],
        rowCount: 1
      };
    }

    // Special handler for Daily volume chat history charting
    if (sql.includes('TO_CHAR') || sql.includes('date_trunc')) {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        days.push({
          date_label: label,
          conversations: 0,
          tokens: 0
        });
      }

      rows.forEach(r => {
        const rDate = new Date(r.created_at);
        const rLabel = rDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });
        const dayObj = days.find(d => d.date_label === rLabel);
        if (dayObj) {
          dayObj.conversations++;
          dayObj.tokens += Number(r.tokens || r.tokens_used || 150);
        }
      });

      return { rows: days, rowCount: days.length };
    }

    // Handle ORDER BY
    const orderByMatch = sql.match(/ORDER\s+BY\s+([\w.]+)(?:\s+(ASC|DESC))?/i);
    if (orderByMatch) {
      const field = orderByMatch[1].split('.').pop().toLowerCase();
      const isDesc = orderByMatch[2] ? orderByMatch[2].toUpperCase() === 'DESC' : false;

      rows.sort((a, b) => {
        let valA = a[field];
        let valB = b[field];

        if (field === 'created_at' || field === 'updated_at' || field === 'timestamp') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }

        if (valA < valB) return isDesc ? 1 : -1;
        if (valA > valB) return isDesc ? -1 : 1;
        return 0;
      });
    }

    // Handle LIMIT
    const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
    if (limitMatch) {
      const lim = parseInt(limitMatch[1]);
      rows = rows.slice(0, lim);
    }

    return { rows, rowCount: rows.length };
  }

  return { rows: [], rowCount: 0 };
};

const pool = {
  query: (text, params) => executeQuery(text, params),
  connect: async () => {
    return {
      query: (text, params) => executeQuery(text, params),
      release: () => {}
    };
  },
  on: () => {}
};

module.exports = {
  pool,
  query: (text, params) => executeQuery(text, params),
};
