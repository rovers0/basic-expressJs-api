const express = require('express')
var mysql = require('mysql')
var bodyParser = require('body-parser')
var jwt = require('jsonwebtoken')

const app = express()
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = process.env.PORT || 8080;

var getUserId = (req) => {
  const theToken = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(theToken, secrectToken);

  return decoded.id;
}

var con = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'application',
});

const secrectToken = 'the-super-strong-secrect'


// Authentication routes
app.post('/api/auth/login', async (req, res, next) => {
  const { email, password } = req.body;
  con.query('SELECT * FROM User WHERE email = ? AND password = ?', [email, password], function (err, result) {
    if (err) throw err;
    let payload = { id : result[0].id};
    let token = jwt.sign( payload, secrectToken, { noTimestamp:true, expiresIn: '1h' });
    res.status(200).send({
      msg: 'Logged in!',
      token
    });
  });
});

// Middleware to authenticate requests with JWT
const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
  return res.status(401).json({ message: 'Authorization header missing' });
  }
  const token = authHeader.split(' ')[1];
  try {
  const decodedToken = jwt.verify(token, secrectToken);
  req.userId = decodedToken.userId;
  next();
  } catch (err) {
  res.status(401).json({ message: 'Invalid or expired token' });
  }
};

app.use(authenticate);

app.get('/api/stores',  async (req, res) => {
  const { limit = 10, search = '' } = req.query;
  con.query('SELECT * FROM Store WHERE name LIKE ? LIMIT 10', [`%${search}%`, limit], function (err, result) {
      if (err) throw err;
      res.json(result);
  });
});
  
app.get('/api/stores/:id', async (req, res) => {
  const { id } = req.params;
  con.query('SELECT * FROM Store WHERE id = ?', [id], function (err, result) {
    if (err) throw err;
    res.json(result);
  });
});

app.post('/api/stores', async (req, res) => {
  const { name, description } = req.body;
  const theToken = req.headers.authorization.split(' ')[1];
  const decoded = jwt.verify(theToken, secrectToken)
  con.query('INSERT INTO Store (user_id, name, description, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())', [decoded.id, name, description], function (err, result) {
    if (err) throw err;
    res.status(201).json({ id: result.insertId, user_id: result.userId, name, description });
  });
});

app.put('/api/stores/:id', async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  const { name, description } = req.body;
  con.query('UPDATE Store SET name = ?, description = ?, updated_at = NOW() WHERE id = ? AND user_id = ?', [name, description, id, userId], function (err, result) {
    if (err) throw err;
    res.status(201).json({ id, user_id: userId, name, description });
  });
});
  
app.delete('/api/stores/:id', async (req, res) => {
  const userId = getUserId(req);
  const { id } = req.params;
  con.query('DELETE FROM Store WHERE id = ? AND user_id = ?', [id, userId], function (err, result) {
    if (err) throw err;
    res.json({ status: 'success' });
  });
});

app.get('/api/stores/:store_id/products', async (req, res) => {
  const { limit = 10, offset = 0, search = '' } = req.query;
  const { store_id } = req.params;
  con.query('SELECT * FROM Product WHERE store_id = ? AND name LIKE ? LIMIT ? OFFSET ?', [store_id, `%${search}%`, limit, offset], function (err, result) {
    if (err) throw err;
    res.json(result);
  });
});
  
app.get('/api/stores/:store_id/products/:id', async (req, res) => {
  const { store_id, id } = req.params;
  con.query('SELECT * FROM Product WHERE store_id = ? AND id = ?', [store_id, id], function (err, result) {
    if (err) throw err;
    res.json(result);
  });
});

app.post('/api/stores/:store_id/products', async (req, res) => {
  const { store_id } = req.params;
  const { name, description, price, quantity } = req.body;
  con.query('INSERT INTO Product (store_id, name, description, price, quantity, created_at, updated_at) VALUES (?, ?, ?, ?, ?, NOW(), NOW())', [store_id, name, description, price, quantity], function (err, result) {
    if (err) throw err;
    const product = { id: result.insertId, store_id, name, description, price, quantity };
    res.status(201).json(product);
  });
});
  
app.put('/api/stores/:store_id/products/:id', async (req, res) => {
  const { store_id, id } = req.params;
  const { name, description, price, quantity } = req.body;
  con.query('UPDATE Product SET name = ?, description = ?, price = ?, quantity = ?, updated_at = NOW() WHERE store_id = ? AND id = ?', [name, description, price, quantity, store_id, id], function (err, result) {
    if (err) throw err;
    const product = { id : id, store_id, name, description, price, quantity };
    res.json(product);
  });
});

app.delete('/api/stores/:store_id/products/:id', async (req, res) => {
  const { store_id, id } = req.params;
  con.query('DELETE FROM Product WHERE store_id = ? AND id = ?', [store_id, id], function (err, result) {
    if (err) throw err;
    res.json({ status: 'success' });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}.`);
});
