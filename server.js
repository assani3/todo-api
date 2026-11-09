const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");

const app = express();
const PORT = 3000;

app.use(express.json());
// Swagger UI reads openapi.json and turns it into interactive docs at /docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// ---------------------------------------------------------------------------
// Stage 0 — Database setup
// ---------------------------------------------------------------------------
// better-sqlite3 creates tasks.db automatically if the file doesn't exist.
const db = new Database(path.join(__dirname, "tasks.db"));

// SQLite has no real boolean type, so `done` is stored as 0 (false) or 1 (true).
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id    INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT    NOT NULL,
    done  INTEGER NOT NULL DEFAULT 0 CHECK (done IN (0, 1))
  )
`);

// Insert the three example tasks only when the table is empty.
const { count } = db.prepare("SELECT COUNT(*) AS count FROM tasks").get();
if (count === 0) {
  const insert = db.prepare("INSERT INTO tasks (title, done) VALUES (?, ?)");
  const seed = db.transaction(() => {
    insert.run("Buy milk", 0);
    insert.run("Walk the dog", 0);
    insert.run("Write README", 1);
  });
  seed();
}

// Prepared statements: SQL is compiled once and values are passed separately.
// The ? placeholders also protect against SQL injection.
const selectAll = db.prepare("SELECT id, title, done FROM tasks");
const selectOne = db.prepare("SELECT id, title, done FROM tasks WHERE id = ?");
const insertOne = db.prepare("INSERT INTO tasks (title, done) VALUES (?, 0)");
const updateOne = db.prepare("UPDATE tasks SET title = ?, done = ? WHERE id = ?");
const deleteOne = db.prepare("DELETE FROM tasks WHERE id = ?");

// Convert a database row (done = 0/1) into the API shape (done = true/false),
// so responses are identical to Assignment 1.
function toTask(row) {
  return { id: row.id, title: row.title, done: row.done === 1 };
}

app.get("/", (req, res) => {
  res.json({
    name: "Task API",
    version: "1.0",
    endpoints: ["/tasks"],
  });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// ---------------------------------------------------------------------------
// Stage 1 — Read
// ---------------------------------------------------------------------------

// GET /tasks — list everything
app.get("/tasks", (req, res) => {
  res.json(selectAll.all().map(toTask));
});

// GET /tasks/:id — get one task by id
app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const row = Number.isInteger(id) ? selectOne.get(id) : undefined;

  if (!row) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(toTask(row));
});

// ---------------------------------------------------------------------------
// Stage 2 — Create
// ---------------------------------------------------------------------------

// POST /tasks — create a new task
app.post("/tasks", (req, res) => {
  const { title } = req.body || {};

  // The server never trusts the client: validate before doing anything.
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required and cannot be empty" });
  }

  const info = insertOne.run(title.trim());
  const row = selectOne.get(info.lastInsertRowid);

  res.status(201).json(toTask(row));
});

// ---------------------------------------------------------------------------
// Stage 3 — Update and delete
// ---------------------------------------------------------------------------

// PUT /tasks/:id — replace a task's title and/or done
app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const existing = Number.isInteger(id) ? selectOne.get(id) : undefined;

  if (!existing) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  const { title, done } = req.body || {};

  if (title !== undefined && (typeof title !== "string" || title.trim() === "")) {
    return res.status(400).json({ error: "title, if provided, cannot be empty" });
  }
  if (done !== undefined && typeof done !== "boolean") {
    return res.status(400).json({ error: "done, if provided, must be true or false" });
  }
  if (title === undefined && done === undefined) {
    return res.status(400).json({ error: "provide at least one of: title, done" });
  }

  // Keep the existing value for any field the client didn't send.
  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDone = done !== undefined ? (done ? 1 : 0) : existing.done;

  updateOne.run(newTitle, newDone, id);

  res.json(toTask(selectOne.get(id)));
});

// DELETE /tasks/:id — remove a task
app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const info = Number.isInteger(id) ? deleteOne.run(id) : { changes: 0 };

  // `changes` is how many rows were deleted; 0 means that id didn't exist.
  if (info.changes === 0) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.status(204).send(); // 204 = success, no body
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});