const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('./db');
const { requireAdmin } = require('./auth');

const app = express();
app.use(express.json());

function validation(res, message) { return res.status(400).json({ error: message }); }
function isPositiveMoney(v) { return typeof v === 'number' && Number.isFinite(v) && v >= 0; }
function isNonNegativeInt(v) { return Number.isInteger(v) && v >= 0; }

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/v1/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return validation(res, 'email and password are required');
    const result = await pool.query('SELECT id,email,password_hash,role FROM users WHERE email=$1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET || 'dev-secret', { expiresIn: '2h' });
    res.json({ token });
  } catch (e) { next(e); }
});

app.post('/api/v1/admin/categories', requireAdmin, async (req, res, next) => {
  try {
    const { name, slug, parent_id } = req.body || {};
    if (!name || !slug) return validation(res, 'name and slug are required');
    if (parent_id === undefined) {
      const r = await pool.query('INSERT INTO categories(name,slug) VALUES($1,$2) RETURNING *', [name, slug]);
      return res.status(201).json(r.rows[0]);
    }
    if (!Number.isInteger(parent_id)) return validation(res, 'parent_id must be an integer');
    if (parent_id === null) {
      const r = await pool.query('INSERT INTO categories(name,slug,parent_id) VALUES($1,$2,NULL) RETURNING *', [name, slug]);
      return res.status(201).json(r.rows[0]);
    }
    const parent = await pool.query('SELECT id FROM categories WHERE id=$1', [parent_id]);
    if (!parent.rowCount) return validation(res, 'parent category not found');
    const r = await pool.query('INSERT INTO categories(name,slug,parent_id) VALUES($1,$2,$3) RETURNING *', [name, slug, parent_id]);
    res.status(201).json(r.rows[0]);
  } catch (e) { if (e.code === '23505') return validation(res, 'category slug already exists'); next(e); }
});

app.get('/api/v1/admin/categories', requireAdmin, async (_req, res, next) => {
  try { const r = await pool.query('SELECT * FROM categories ORDER BY id'); res.json(r.rows); } catch (e) { next(e); }
});

app.patch('/api/v1/admin/categories/:id', requireAdmin, async (req, res, next) => {
  try {
    const id = Number(req.params.id); const { name, slug, parent_id, active } = req.body || {};
    if (!Number.isInteger(id)) return validation(res, 'invalid category id');
    const current = await pool.query('SELECT * FROM categories WHERE id=$1', [id]);
    if (!current.rowCount) return res.status(404).json({ error: 'category not found' });
    if (parent_id === id) return validation(res, 'category cannot be its own parent');
    if (parent_id !== undefined && parent_id !== null) {
      const parent = await pool.query('SELECT id,parent_id FROM categories WHERE id=$1', [parent_id]);
      if (!parent.rowCount) return validation(res, 'parent category not found');
      let cursor = parent.rows[0].id;
      const seen = new Set();
      while (cursor) {
        if (cursor === id) return validation(res, 'category cannot become its own ancestor');
        if (seen.has(cursor)) break;
        seen.add(cursor);
        const p = await pool.query('SELECT parent_id FROM categories WHERE id=$1', [cursor]);
        cursor = p.rows[0]?.parent_id || null;
      }
    }
    const row = current.rows[0];
    const r = await pool.query(`UPDATE categories SET name=$1, slug=$2, parent_id=$3, active=$4, updated_at=NOW() WHERE id=$5 RETURNING *`, [name ?? row.name, slug ?? row.slug, parent_id === undefined ? row.parent_id : parent_id, active === undefined ? row.active : active, id]);
    res.json(r.rows[0]);
  } catch (e) { if (e.code === '23505') return validation(res, 'category slug already exists'); next(e); }
});

app.delete('/api/v1/admin/categories/:id', requireAdmin, async (req, res, next) => {
  try { const r = await pool.query('UPDATE categories SET active=false, updated_at=NOW() WHERE id=$1 RETURNING *', [Number(req.params.id)]); if (!r.rowCount) return res.status(404).json({error:'category not found'}); res.json(r.rows[0]); } catch(e){ next(e); }
});

app.post('/api/v1/admin/products', requireAdmin, async (req, res, next) => {
  try {
    const { name, slug, description = '', status = 'draft', category_id } = req.body || {};
    if (!name || !slug || !Number.isInteger(category_id)) return validation(res, 'name, slug, and category_id are required');
    if (!['draft','published','archived'].includes(status)) return validation(res, 'invalid status');
    const c = await pool.query('SELECT id,active FROM categories WHERE id=$1', [category_id]);
    if (!c.rowCount || !c.rows[0].active) return validation(res, 'active category is required');
    const r = await pool.query('INSERT INTO products(name,slug,description,status,category_id) VALUES($1,$2,$3,$4,$5) RETURNING *', [name,slug,description,status,category_id]);
    res.status(201).json(r.rows[0]);
  } catch(e){ if(e.code==='23505') return validation(res,'product slug already exists'); next(e); }
});

app.get('/api/v1/admin/products', requireAdmin, async (_req,res,next)=>{
  try { const r=await pool.query(`SELECT p.*, c.name category_name FROM products p JOIN categories c ON c.id=p.category_id ORDER BY p.id`); res.json(r.rows); } catch(e){next(e);}
});

app.patch('/api/v1/admin/products/:id', requireAdmin, async(req,res,next)=>{
  try { const id=Number(req.params.id); const old=(await pool.query('SELECT * FROM products WHERE id=$1',[id])).rows[0]; if(!old)return res.status(404).json({error:'product not found'}); const b=req.body||{}; if(b.status && !['draft','published','archived'].includes(b.status))return validation(res,'invalid status'); if(b.category_id!==undefined){const c=await pool.query('SELECT active FROM categories WHERE id=$1',[b.category_id]);if(!c.rowCount||!c.rows[0].active)return validation(res,'active category is required');} const r=await pool.query(`UPDATE products SET name=$1,slug=$2,description=$3,status=$4,category_id=$5,updated_at=NOW() WHERE id=$6 RETURNING *`,[b.name??old.name,b.slug??old.slug,b.description??old.description,b.status??old.status,b.category_id??old.category_id,id]);res.json(r.rows[0]); } catch(e){if(e.code==='23505')return validation(res,'product slug already exists');next(e);}
});

app.delete('/api/v1/admin/products/:id', requireAdmin, async(req,res,next)=>{try{const r=await pool.query("UPDATE products SET status='archived',updated_at=NOW() WHERE id=$1 RETURNING *",[Number(req.params.id)]);if(!r.rowCount)return res.status(404).json({error:'product not found'});res.json(r.rows[0]);}catch(e){next(e);}});

app.post('/api/v1/admin/products/:id/variants', requireAdmin, async(req,res,next)=>{try{const productId=Number(req.params.id);const {option_values}=req.body||{};if(!option_values||typeof option_values!=='object'||Array.isArray(option_values))return validation(res,'option_values object is required');const p=await pool.query('SELECT id FROM products WHERE id=$1',[productId]);if(!p.rowCount)return res.status(404).json({error:'product not found'});const r=await pool.query('INSERT INTO variants(product_id,option_values) VALUES($1,$2) RETURNING *',[productId,JSON.stringify(option_values)]);res.status(201).json(r.rows[0]);}catch(e){if(e.code==='23505')return validation(res,'variant combination already exists');next(e);}});

app.post('/api/v1/admin/products/:id/skus', requireAdmin, async(req,res,next)=>{try{const {variant_id,sku_code,price,stock_quantity=0,active=true}=req.body||{};if(!Number.isInteger(variant_id)||!sku_code||!isPositiveMoney(price)||!isNonNegativeInt(stock_quantity))return validation(res,'variant_id, sku_code, non-negative price and non-negative stock are required');const v=await pool.query('SELECT id,product_id FROM variants WHERE id=$1',[variant_id]);if(!v.rowCount||v.rows[0].product_id!==Number(req.params.id))return validation(res,'variant does not belong to product');const r=await pool.query('INSERT INTO skus(variant_id,sku_code,price,stock_quantity,active) VALUES($1,$2,$3,$4,$5) RETURNING *',[variant_id,sku_code,price,stock_quantity,active]);res.status(201).json(r.rows[0]);}catch(e){if(e.code==='23505')return validation(res,'SKU code already exists');if(e.code==='23514')return validation(res,'stock cannot be negative and price must be non-negative');next(e);}});

app.patch('/api/v1/admin/skus/:id', requireAdmin, async(req,res,next)=>{try{const id=Number(req.params.id);const old=(await pool.query('SELECT * FROM skus WHERE id=$1',[id])).rows[0];if(!old)return res.status(404).json({error:'SKU not found'});const b=req.body||{};if(b.price!==undefined&&!isPositiveMoney(b.price))return validation(res,'price must be non-negative');if(b.stock_quantity!==undefined&&!isNonNegativeInt(b.stock_quantity))return validation(res,'stock cannot be negative');const r=await pool.query('UPDATE skus SET price=$1,stock_quantity=$2,active=$3,updated_at=NOW() WHERE id=$4 RETURNING *',[b.price??old.price,b.stock_quantity??old.stock_quantity,b.active??old.active,id]);res.json(r.rows[0]);}catch(e){next(e);}});

app.delete('/api/v1/admin/skus/:id', requireAdmin, async(req,res,next)=>{try{const r=await pool.query('UPDATE skus SET active=false,updated_at=NOW() WHERE id=$1 RETURNING *',[Number(req.params.id)]);if(!r.rowCount)return res.status(404).json({error:'SKU not found'});res.json(r.rows[0]);}catch(e){next(e);}});

app.use((err,_req,res,_next)=>{ console.error(err); res.status(500).json({error:'Internal server error'}); });
module.exports = app;
