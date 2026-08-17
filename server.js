const express = require("express");
const app = express();
const PORT = 3000;

app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});