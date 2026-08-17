const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");const app = express();
const PORT = 3000;

app.use(express.json());
// Swagger UI reads openapi.json and turns it into interactive docs at /docs
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Our "database" — just an array in memory. Resets every time the server restarts.
let tasks = [
  { id: 1, title: "Buy milk", done: false },
  { id: 2, title: "Walk the dog", done: false },
  { id: 3, title: "Write README", done: true },
];
let nextId = 4; // tracks the next free id to hand out

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

// GET /tasks — list everything
app.get("/tasks", (req, res) => {
  res.json(tasks);
});

// GET /tasks/:id — get one task by id
app.get("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  res.json(task);
});

// POST /tasks — create a new task
app.post("/tasks", (req, res) => {
  const { title } = req.body || {};

  // The server never trusts the client: validate before doing anything.
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required and cannot be empty" });
  }

  const newTask = { id: nextId++, title: title.trim(), done: false };
  tasks.push(newTask);

  res.status(201).json(newTask);
});

// PUT /tasks/:id — replace a task's title and/or done
app.put("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const task = tasks.find((t) => t.id === id);

  if (!task) {
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

  if (title !== undefined) task.title = title.trim();
  if (done !== undefined) task.done = done;

  res.json(task);
});

// DELETE /tasks/:id — remove a task
app.delete("/tasks/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = tasks.findIndex((t) => t.id === id);

  if (index === -1) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }

  tasks.splice(index, 1);
  res.status(204).send(); // 204 = success, no body
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});