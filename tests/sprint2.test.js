const { newDb } = require('pg-mem');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

let app, pool;
beforeAll(async()=>{
  process.env.JWT_SECRET='test-secret';
  const db=newDb();
  const pg=db.adapters.createPg();
  pool=new pg.Pool();
  const sql=require('fs').readFileSync(require('path').join(__dirname,'../migrations/001_sprint2_catalog.sql'),'utf8');
  await pool.query(sql);
  jest.resetModules();
  jest.doMock('../src/db',()=>({pool}));
  app=require('../src/app');
  const hash=await bcrypt.hash('Admin@12345',10);
  await pool.query(`INSERT INTO users(email,password_hash,name,role) VALUES('admin@test.local',$1,'Admin','admin')`,[hash]);
  await pool.query(`INSERT INTO users(email,password_hash,name,role) VALUES('user@test.local',$1,'User','customer')`,[hash]);
  await pool.query(`INSERT INTO categories(name,slug) VALUES('Programming','programming')`);
});
afterAll(async()=>pool&&pool.end());
function token(role='admin'){return jwt.sign({id:1,email:'admin@test.local',role},process.env.JWT_SECRET);}

test('admin can create category and product',async()=>{
 const cat=await request(app).post('/api/v1/admin/categories').set('Authorization',`Bearer ${token()}`).send({name:'Databases',slug:'databases'});expect(cat.statusCode).toBe(201);
 const p=await request(app).post('/api/v1/admin/products').set('Authorization',`Bearer ${token()}`).send({name:'DB Book',slug:'db-book',description:'Test',category_id:cat.body.id});expect(p.statusCode).toBe(201);
});
test('duplicate product slug is rejected',async()=>{
 const cat=(await pool.query("SELECT id FROM categories WHERE slug='programming'")).rows[0].id;
 await request(app).post('/api/v1/admin/products').set('Authorization',`Bearer ${token()}`).send({name:'One',slug:'same',category_id:cat});
 const r=await request(app).post('/api/v1/admin/products').set('Authorization',`Bearer ${token()}`).send({name:'Two',slug:'same',category_id:cat});expect(r.statusCode).toBe(400);
});
test('SKU duplicate and negative stock are rejected',async()=>{
 const cat=(await pool.query("SELECT id FROM categories WHERE slug='programming'")).rows[0].id;
 const p=(await pool.query("INSERT INTO products(category_id,name,slug) VALUES($1,'SKU Product','sku-product') RETURNING id",[cat])).rows[0].id;
 const v=(await pool.query("INSERT INTO variants(product_id,option_values) VALUES($1,'{\"format\":\"paperback\"}') RETURNING id",[p])).rows[0].id;
 const a=await request(app).post(`/api/v1/admin/products/${p}/skus`).set('Authorization',`Bearer ${token()}`).send({variant_id:v,sku_code:'SKU-1',price:10,stock_quantity:2});expect(a.statusCode).toBe(201);
 const dup=await request(app).post(`/api/v1/admin/products/${p}/skus`).set('Authorization',`Bearer ${token()}`).send({variant_id:v,sku_code:'SKU-1',price:10,stock_quantity:2});expect(dup.statusCode).toBe(400);
 const neg=await request(app).patch(`/api/v1/admin/skus/${a.body.id}`).set('Authorization',`Bearer ${token()}`).send({stock_quantity:-1});expect(neg.statusCode).toBe(400);
});
test('category cycle is rejected',async()=>{
 const a=(await pool.query("INSERT INTO categories(name,slug) VALUES('A','a') RETURNING id")).rows[0].id;
 const b=(await pool.query("INSERT INTO categories(name,slug,parent_id) VALUES('B','b',$1) RETURNING id",[a])).rows[0].id;
 const r=await request(app).patch(`/api/v1/admin/categories/${a}`).set('Authorization',`Bearer ${token()}`).send({parent_id:b});expect(r.statusCode).toBe(400);
});
test('admin endpoint rejects unauthenticated and customer users',async()=>{
 const unauth=await request(app).get('/api/v1/admin/products');expect(unauth.statusCode).toBe(401);
 const customer=jwt.sign({id:2,email:'user@test.local',role:'customer'},process.env.JWT_SECRET);
 const forbidden=await request(app).get('/api/v1/admin/products').set('Authorization',`Bearer ${customer}`);expect(forbidden.statusCode).toBe(403);
});
