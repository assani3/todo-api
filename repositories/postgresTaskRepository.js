const { Pool } = require("pg");

function createPostgresTaskRepository(connectionString) {
  const pool = new Pool({ connectionString });
  const COLS = "id, title, done";

  return {
    async findAll() {
      const { rows } = await pool.query(`SELECT ${COLS} FROM tasks ORDER BY id`);
      return rows;
    },
    async findById(id) {
      const { rows } = await pool.query(`SELECT ${COLS} FROM tasks WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },
    async create(title) {
      const { rows } = await pool.query(
        `INSERT INTO tasks (title) VALUES ($1) RETURNING ${COLS}`,
        [title]
      );
      return rows[0];
    },
    async update(id, title, done) {
      const { rows } = await pool.query(
        `UPDATE tasks SET title = $1, done = $2 WHERE id = $3 RETURNING ${COLS}`,
        [title, done, id]
      );
      return rows[0] ?? null;
    },
    async remove(id) {
      const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
      return result.rowCount > 0;
    },
  };
}

module.exports = { createPostgresTaskRepository };