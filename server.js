require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')

const app = express()
const PORT = process.env.PORT || 4000

app.use(cors())
app.use(express.json())

// Mongo connection
const mongoUri = process.env.MONGODB_URI
if (!mongoUri) {
  console.warn('MONGODB_URI not set. Set it in a .env file in the project root.')
}

mongoose
  .connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch((err) => console.error('Mongo connection error:', err.message))

// Schemas
const entrySchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    type: { type: String, enum: ['food', 'activity'], required: true },
    text: { type: String, required: true },
    caloriesIn: { type: Number, default: 0 },
    caloriesOut: { type: Number, default: 0 },
    explanation: { type: String, default: '' },
  },
  { timestamps: true }
)

const weightSchema = new mongoose.Schema(
  {
    date: { type: String, required: true }, // YYYY-MM-DD
    weight: { type: Number, required: true },
  },
  { timestamps: true }
)

const Entry = mongoose.model('Entry', entrySchema)
const Weight = mongoose.model('Weight', weightSchema)

// Routes
app.get('/api/entries', async (req, res) => {
  try {
    const entries = await Entry.find().sort({ date: 1, createdAt: 1 })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' })
  }
})

app.post('/api/entries', async (req, res) => {
  try {
    const entry = new Entry(req.body)
    const saved = await entry.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create entry' })
  }
})

app.get('/api/weights', async (req, res) => {
  try {
    const weights = await Weight.find().sort({ date: 1 })
    res.json(weights)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch weights' })
  }
})

app.post('/api/weights', async (req, res) => {
  try {
    const weight = new Weight(req.body)
    const saved = await weight.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create weight' })
  }
})

app.get('/', (req, res) => {
  res.send('Weight tracker API is running')
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
