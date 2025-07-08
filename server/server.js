// server.js (or app.js)

const express = require('express');
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb'); // Import MongoClient and ObjectId

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

// POST /api/login - User authentication
app.post('/api/login', async (req, res) => {
    const { role, password } = req.body;

    if (!role || !password) {
        return res.status(400).json({ success: false, message: 'Role and password are required.' });
    }

    try {
        const usersCollection = db.collection(USERS_COLLECTION_NAME);
        const user = await usersCollection.findOne({ role: role, password: password });

        if (user) {
            res.json({ success: true, message: 'Login successful', role: user.role });
        } else {
            res.status(401).json({ success: false, message: 'Invalid role or password.' });
        }
    } catch (error) {
        console.error('Backend login error:', error);
        res.status(500).json({ success: false, message: 'An error occurred during login.' });
    }
});


app.get('/api/transactions', async (req, res) => {
    try {
        const transactions = await db.collection(COLLECTION_NAME).find({}).sort({ createdAt: -1 }).toArray();
        res.json(transactions);
    } catch (error) {
        console.error('Error fetching transactions from MongoDB:', error);
        res.status(500).json({ message: 'Error fetching transactions from database.' });
    }
});

// Add a new transaction
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
        console.error('Error adding new transaction to MongoDB:', error);
        res.status(500).json({ message: 'Failed to save new transaction to database.' });
    }
});


// PUT /api/transactions/:_id - Update an existing transaction by its MongoDB _id
app.put('/api/transactions/:_id', async (req, res) => {
    const transactionMongoId = req.params._id;
    const updateData = { ...req.body };
    delete updateData._id;

    console.log(`[DEBUG - PUT] Received _id: ${transactionMongoId}`);
    console.log(`[DEBUG - PUT] Update data:`, updateData);

    try {
        const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
            { _id: new ObjectId(transactionMongoId) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        // Detailed logging for the result of findOneAndUpdate
        console.log(`[DEBUG - PUT] findOneAndUpdate result:`, result);

        if (result.value) {
            res.json(result.value);
        } else {
            console.log(`[DEBUG - PUT] Transaction with _id ${transactionMongoId} not found for update.`);
            res.status(404).json({ message: 'Transaction not found.' });
        }
    } catch (error) {
        console.error('Error updating transaction in MongoDB:', error);
        if (error.name === 'BSONTypeError' || error.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer')) {
            return res.status(400).json({ message: `Invalid transaction ID format for PUT: ${transactionMongoId}` });
        }
        res.status(500).json({ message: 'Failed to update transaction in database.' });
    }
});


// PATCH /api/transactions/:_id/status - Update transaction status by its MongoDB _id
app.patch('/api/transactions/:_id/status', async (req, res) => {
    const transactionMongoId = req.params._id;
    const { status, rejectionReason, byUser } = req.body;

    console.log(`[DEBUG - PATCH Status] Received _id: ${transactionMongoId}`);
    console.log(`[DEBUG - PATCH Status] New Status: ${status}, Reason: ${rejectionReason}, By: ${byUser}`);


    let updateFields = {
        status: status,
    };

    // Clear all status-related fields first to ensure consistency
    updateFields.acceptedAt = null;
    updateFields.acceptedBy = null;
    updateFields.rejectedAt = null;
    updateFields.rejectionReason = null;
    updateFields.rejectedBy = null;
    updateFields.deletedAt = null;
    updateFields.deletedBy = null;


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
            { _id: new ObjectId(transactionMongoId) },
            { $set: updateFields },
            { returnDocument: 'after' }
        );

        // Detailed logging for the result of findOneAndUpdate
        console.log(`[DEBUG - PATCH Status] findOneAndUpdate result:`, result);

        if (result.value) {
            res.json(result.value);
        } else {
            console.log(`[DEBUG - PATCH Status] Transaction with _id ${transactionMongoId} not found for status update.`);
            res.status(404).json({ message: 'Transaction not found.' });
        }
    } catch (error) {
        console.error('Error updating transaction status in MongoDB:', error);
        if (error.name === 'BSONTypeError' || error.message.includes('Argument passed in must be a string of 12 bytes or a string of 24 hex characters or an integer')) {
            return res.status(400).json({ message: `Invalid transaction ID format for PATCH status: ${transactionMongoId}` });
        }
        res.status(500).json({ message: 'Failed to update transaction status in database.' });
    }
});

connectToMongoDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Node.js backend running on http://localhost:${PORT}`);
        console.log(`Connected to database: ${DB_NAME}, Collection: ${COLLECTION_NAME}`);
    });
});
