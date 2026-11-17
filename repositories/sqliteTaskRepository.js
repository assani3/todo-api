const path = require("path");
const Database = require("better-sqlite3");

function createSqliteTaskRepository(
  dbPath = path.join(__dirname, "..", "tasks.db")
) {
  const db = new Database(dbPath);

  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT    NOT NULL,
      done  INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
    )
  `);

  const { count } = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
  if (count === 0) {
    const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
    db.transaction(() => {
      insert.run("Buy milk", 0);
      insert.run("Walk the dog", 0);
      insert.run("Write README", 1);
    })();
  }

  const selectAll = db.prepare("SELECT id, title, done FROM tasks ORDER BY id");
  const selectOne = db.prepare("SELECT id, title, done FROM tasks WHERE id = ?");
  const insertOne = db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)");
  const updateOne = db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?");
  const deleteOne = db.prepare("DELETE FROM tasks WHERE id = ?");

  const toTask = (row) => ({ id: row.id, title: row.title, done: row.done === 1 });

  return {
    async findAll() {
      return selectAll.all().map(toTask);
    },
    async findById(id) {
      const row = selectOne.get(id);
      return row ? toTask(row) : null;
    },
    async create(title) {
      const info = insertOne.run(title);
      return toTask(selectOne.get(info.lastInsertRowid));
    },
    async update(id, title, done) {
      const info = updateOne.run(title, done ? 1 : 0, id);
      return info.changes === 0 ? null : toTask(selectOne.get(id));
    },
    async remove(id) {
      return deleteOne.run(id).changes > 0;
    },
  };
}

module.exports = { createSqliteTaskRepository };