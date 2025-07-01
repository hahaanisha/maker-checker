// server.js (or app.js)

const express = require('express');
const cors = require('cors'); // Required for Cross-Origin Resource Sharing
const path = require('path');
const fs = require('fs'); // File System module to read JSON file

const app = express();
const PORT = 3000;
// *** IMPORTANT CHANGE HERE ***
const DATA_FILE = path.join(__dirname, 'dataList.json'); // Now points to dataList.json

// --- Middleware ---
// Enable CORS for all routes (important for Angular frontend)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// --- Routes ---

// GET /api/transactions - Read all transactions
app.get('/api/transactions', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            console.error('Error reading dataList.json:', err);
            // If file doesn't exist or is unreadable, send an empty array or 500 error
            if (err.code === 'ENOENT') {
                console.log('dataList.json not found. Returning empty array.');
                return res.status(200).json([]); // Return empty array if file doesn't exist
            }
            return res.status(500).json({ message: 'Error reading transactions data.' });
        }
        try {
            const transactions = JSON.parse(data);
            res.json(transactions);
        } catch (parseError) {
            console.error('Error parsing dataList.json:', parseError);
            res.status(500).json({ message: 'Error parsing transactions data.' });
        }
    });
});

// POST /api/transactions - Add a new transaction
app.post('/api/transactions', (req, res) => {
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        let transactions = [];
        if (!err) {
            try {
                transactions = JSON.parse(data);
            } catch (parseError) {
                console.error('Error parsing existing dataList.json:', parseError);
                // If parse fails, start with an empty array but log error
            }
        }

        const newTransaction = {
            id: 'T' + Date.now(), // Simple unique ID
            ...req.body,
            status: 'PENDING',
            createdAt: new Date().toISOString(),
            // createdBy and other fields assumed to be passed in req.body or handled by frontend
        };
        transactions.unshift(newTransaction); // Add to the beginning for latest first

        fs.writeFile(DATA_FILE, JSON.stringify(transactions, null, 2), 'utf8', (writeErr) => {
            if (writeErr) {
                console.error('Error writing dataList.json:', writeErr);
                return res.status(500).json({ message: 'Failed to save new transaction.' });
            }
            res.status(201).json(newTransaction);
        });
    });
});

// PUT /api/transactions/:id - Update an existing transaction (for Maker edit)
app.put('/api/transactions/:id', (req, res) => {
    const transactionId = req.params.id;
    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading transactions data.' });
        }
        try {
            let transactions = JSON.parse(data);
            const index = transactions.findIndex(t => t.id === transactionId);

            if (index !== -1) {
                const updatedTransaction = { ...transactions[index], ...req.body, id: transactionId }; // Ensure ID isn't changed
                transactions[index] = updatedTransaction;

                fs.writeFile(DATA_FILE, JSON.stringify(transactions, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing dataList.json:', writeErr);
                        return res.status(500).json({ message: 'Failed to update transaction.' });
                    }
                    res.json(updatedTransaction);
                });
            } else {
                res.status(404).json({ message: 'Transaction not found.' });
            }
        } catch (parseError) {
            console.error('Error parsing dataList.json:', parseError);
            res.status(500).json({ message: 'Error parsing transactions data.' });
        }
    });
});

// PATCH /api/transactions/:id/status - Update transaction status (for Checker actions or Delete)
app.patch('/api/transactions/:id/status', (req, res) => {
    const transactionId = req.params.id;
    const { status, rejectionReason, byUser } = req.body;

    fs.readFile(DATA_FILE, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ message: 'Error reading transactions data.' });
        }
        try {
            let transactions = JSON.parse(data);
            const index = transactions.findIndex(t => t.id === transactionId);

            if (index !== -1) {
                const transaction = transactions[index];
                transaction.status = status;
                
                // Clear previous status-related fields
                delete transaction.acceptedAt;
                delete transaction.acceptedBy;
                delete transaction.rejectedAt;
                delete transaction.rejectionReason;
                delete transaction.rejectedBy;

                // Set new status-related fields based on the new status
                if (status === 'ACCEPTED') {
                    transaction.acceptedAt = new Date().toISOString();
                    transaction.acceptedBy = byUser;
                } else if (status === 'REJECTED') {
                    transaction.rejectedAt = new Date().toISOString();
                    transaction.rejectedBy = byUser;
                    transaction.rejectionReason = rejectionReason;
                }

                fs.writeFile(DATA_FILE, JSON.stringify(transactions, null, 2), 'utf8', (writeErr) => {
                    if (writeErr) {
                        console.error('Error writing dataList.json:', writeErr);
                        return res.status(500).json({ message: 'Failed to update transaction status.' });
                    }
                    res.json(transaction);
                });
            } else {
                res.status(404).json({ message: 'Transaction not found.' });
            }
        } catch (parseError) {
            console.error('Error parsing dataList.json:', parseError);
            res.status(500).json({ message: 'Error parsing transactions data.' });
        }
    });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Node.js backend running on http://localhost:${PORT}`);
    console.log(`Serving data from: ${DATA_FILE}`);

    // Optional: Create an empty dataList.json if it doesn't exist
    if (!fs.existsSync(DATA_FILE)) {
        console.log('dataList.json not found. Creating an empty one.');
        fs.writeFileSync(DATA_FILE, '[]', 'utf8');
    }
});
