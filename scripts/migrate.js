require('dotenv').config();
const fs=require('fs'); const path=require('path'); const {pool}=require('../src/db');
(async()=>{try{const sql=fs.readFileSync(path.join(__dirname,'../migrations/001_sprint2_catalog.sql'),'utf8');await pool.query(sql);console.log('Migration completed: 001_sprint2_catalog.sql');}catch(e){console.error(e.message);process.exitCode=1;}finally{await pool.end();}})();
