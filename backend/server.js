const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');

// Connect to MongoDB
connectDB();

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// FinLit V2 Routes
app.use('/api/rooms', require('./routes/roomRoutes'));
app.use('/api/expenses', require('./routes/expenseRoutes'));
app.use('/api/settlements', require('./routes/settlementRoutes'));
app.use('/api/recurring-expenses', require('./routes/recurringRoutes'));
app.use('/api/ai', require('./routes/aiRoutes'));

// Legacy routes fallback for user authentication if used
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/groups', require('./routes/groupRoutes'));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    app: 'FinLit V2',
    message: 'FinLit V2 Flatmate Expense API is running smoothly!',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 FinLit V2 Server running on port ${PORT}`);
});