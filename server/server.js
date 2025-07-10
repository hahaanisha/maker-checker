// server.js
const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = 3000;

const MONGODB_URI = 'mongodb+srv://myuser:YJMd6GWGTow3C4ov@cluster0.hp6v7gu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'maker_checker_db';
const COLLECTION_NAME = 'transactions';
const USERS_COLLECTION_NAME = 'users';

let db;

app.use(cors());
app.use(express.json());

async function connectToMongoDB() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(DB_NAME);
    console.log('Connected to MongoDB Atlas Successfully!');

    const usersCount = await db.collection(USERS_COLLECTION_NAME).countDocuments();
    if (usersCount === 0) {
      console.log('No users found. Initializing default users...');
      await db.collection(USERS_COLLECTION_NAME).insertMany([
        { role: 'admin', password: 'adminpassword' },
        { role: 'maker', password: 'makerpassword' },
        { role: 'checker', password: 'checkerpassword' }
      ]);
      console.log('Default users created: admin, maker, checker');
    }
  } catch (err) {
    console.error('MongoDB Atlas Connection Error:', err.message);
    process.exit(1);
  }
}

// --- Routes ---

// POST /api/signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: 'Name, email, password, and role are required.' });
  }

  try {
    const usersCollection = db.collection(USERS_COLLECTION_NAME);
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already exists.' });
    }

    const result = await usersCollection.insertOne({ name, email, password, role });
    res.json({ success: true, message: 'User registered successfully.' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ success: false, message: 'Signup error', error: error.message });
  }
});

// POST /api/login
app.post('/api/login', async (req, res) => {
  const { email, role, password } = req.body;
  if (!email || !role || !password) {
    return res.status(400).json({ success: false, message: 'Email, role, and password are required.' });
  }

  try {
    const user = await db.collection(USERS_COLLECTION_NAME).findOne({ email, role, password });
    if (user) {
      res.json({ success: true, message: 'Login successful', role: user.role, name: user.name });
    } else {
      res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Login error', error: error.message });
  }
});

// GET /api/transactions
app.get('/api/transactions', async (req, res) => {
  try {
    const transactions = await db.collection(COLLECTION_NAME).find({}).sort({ createdAt: -1 }).toArray();
    res.json(transactions);
  } catch (error) {
    console.error('Fetch transactions error:', error);
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
});

// POST /api/transactions
app.post('/api/transactions', async (req, res) => {
  const transactionData = { ...req.body };
  delete transactionData._id;
  delete transactionData.id;

  const newTransaction = {
    ...transactionData,
    id: 'T' + Date.now().toString(),
    status: 'PENDING',
    createdAt: new Date().toISOString(),
  };

  try {
    const result = await db.collection(COLLECTION_NAME).insertOne(newTransaction);
    res.status(201).json({ ...newTransaction, _id: result.insertedId });
  } catch (error) {
    console.error('Add transaction error:', error);
    res.status(500).json({ message: 'Failed to save transaction.' });
  }
});

// PUT /api/transactions/:_id
app.put('/api/transactions/:_id', async (req, res) => {
  const id = req.params._id;
  const updateData = { ...req.body };
  delete updateData._id;

  try {
    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (result.value) res.json(result.value);
    else res.status(404).json({ message: 'Transaction not found.' });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Failed to update transaction.' });
  }
});

// PATCH /api/transactions/:_id/status
app.patch('/api/transactions/:_id/status', async (req, res) => {
  const id = req.params._id;
  const { status, rejectionReason, byUser } = req.body;

  const updateFields = {
    status,
    acceptedAt: null,
    acceptedBy: null,
    rejectedAt: null,
    rejectedBy: null,
    rejectionReason: null,
    deletedAt: null,
    deletedBy: null,
  };

  if (status === 'ACCEPTED') {
    updateFields.acceptedAt = new Date().toISOString();
    updateFields.acceptedBy = byUser;
  } else if (status === 'REJECTED') {
    updateFields.rejectedAt = new Date().toISOString();
    updateFields.rejectedBy = byUser;
    updateFields.rejectionReason = rejectionReason;
  } else if (status === 'DELETED') {
    updateFields.deletedAt = new Date().toISOString();
    updateFields.deletedBy = byUser;
  }

  try {
    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (result.value) res.json(result.value);
    else res.status(404).json({ message: 'Transaction not found.' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ message: 'Failed to update transaction status.' });
  }
});

connectToMongoDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Node.js backend running on http://localhost:${PORT}`);
    console.log(`Connected to database: ${DB_NAME}, Collection: ${COLLECTION_NAME}`);
  });
});
