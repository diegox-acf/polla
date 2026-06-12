// Sync manual de resultados desde la terminal: npm run sync
import "dotenv/config";
import { pool } from "../lib/db";
import { syncResults } from "../lib/sync";

syncResults({ force: true })
  .then((summary) => {
    console.log(
      `✔ sync: ${summary.updated} de ${summary.checked} partidos actualizados`,
    );
    return pool.end();
  })
  .catch(async (err) => {
    console.error(err);
    await pool.end();
    process.exit(1);
  });
