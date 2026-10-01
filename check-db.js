const { pool } = require('./src/db');
async function check() {
  try {
    const cols = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='categories' ORDER BY ordinal_position");
    console.log('=== CATEGORIES COLUMNS ===');
    console.table(cols.rows);
    try {
      const ins = await pool.query("INSERT INTO categories(name, slug) VALUES('TestCat', 'testcat-xyz') RETURNING *");
      console.log('=== INSERT SUCCESS ===');
      console.log(JSON.stringify(ins.rows[0], null, 2));
    } catch (e) {
      console.log('=== INSERT FAILED ===');
      console.log('CODE:', e.code);
      console.log('MESSAGE:', e.message);
      console.log('DETAIL:', e.detail);
    }
  } catch (e) {
    console.error('OUTER ERROR:', e.message);
  } finally {
    pool.end();
  }
}
check();
