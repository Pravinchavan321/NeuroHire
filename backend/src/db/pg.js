const { Pool } = require('pg');
module.exports = new Pool(process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL
} : {
  host: process.env.PG_HOST,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DB,
  port: 5432,
});
