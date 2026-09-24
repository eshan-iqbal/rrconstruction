/**
 * @deprecated
 * SQLite database storage has been fully migrated to Layerbase Cloud PostgreSQL.
 * All queries now use src/lib/db/postgres.ts.
 */
import { pool } from './postgres';

export default pool;
