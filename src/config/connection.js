//

import mysql from 'mysql2/promise';
import 'dotenv/config';

const pool = mysql.createPool({
  host:               process.env.DB_HOST,    
  port:               parseInt(process.env.DB_PORT) || 3306,
  database:           process.env.DB_NAME,     
  user:               process.env.DB_USER,     
  password:           process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit:    10,
  idleTimeout:        30000,
  connectTimeout:     2000,
  charset:            'utf8mb4',
});

pool.on('connection', (conn) => {
  console.log(`[DB] Nueva conexión establecida (id: ${conn.threadId})`);
});

export default pool;