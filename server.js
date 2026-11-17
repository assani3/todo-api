require("dotenv").config();

const express = require("express");
const swaggerUi = require("swagger-ui-express");
const openapiSpec = require("./openapi.json");
const { createPostgresTaskRepository } = require("./repositories/postgresTaskRepository");

const app = express();
const PORT = process.env.PORT || 3000;

// WIRING: the one place that decides which storage is used.
const repo = createPostgresTaskRepository(process.env.DATABASE_URL);

app.use(express.json());
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiSpec));

// Lets async handlers send errors to the error middleware below.
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// Postgres INTEGER maxes out at 2147483647; larger ids would crash the query.
const isValidId = (id) => Number.isInteger(id) && id > 0 && id <= 2147483647;

app.get("/", (req, res) => {
  res.json({ name: "Task API", version: "1.0", endpoints: ["/tasks"] });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.get("/tasks", wrap(async (req, res) => {
  res.json(await repo.findAll());
}));

app.get("/tasks/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const task = isValidId(id) ? await repo.findById(id) : null;
  if (!task) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.json(task);
}));

app.post("/tasks", wrap(async (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== "string" || title.trim() === "") {
    return res.status(400).json({ error: "title is required and cannot be empty" });
  }
  const task = await repo.create(title.trim());
  res.status(201).json(task);
}));

app.put("/tasks/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const existing = isValidId(id) ? await repo.findById(id) : null;
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

  const newTitle = title !== undefined ? title.trim() : existing.title;
  const newDone = done !== undefined ? done : existing.done;

  res.json(await repo.update(id, newTitle, newDone));
}));

app.delete("/tasks/:id", wrap(async (req, res) => {
  const id = Number(req.params.id);
  const removed = isValidId(id) ? await repo.remove(id) : false;
  if (!removed) {
    return res.status(404).json({ error: `Task ${id} not found` });
  }
  res.status(204).send();
}));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});