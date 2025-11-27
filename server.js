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
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    vitaminText: { type: String, default: '' },
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

const profileSchema = new mongoose.Schema(
  {
    calorieBudget: { type: Number, default: 0 },
    proteinTarget: { type: Number, default: 0 },
  },
  { timestamps: true }
)

const Profile = mongoose.model('Profile', profileSchema)

const foodPresetSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    defaultPortion: { type: Number, default: 0 },
    caloriesIn: { type: Number, default: 0 },
    protein: { type: Number, default: 0 },
    carbs: { type: Number, default: 0 },
    fat: { type: Number, default: 0 },
    vitaminText: { type: String, default: '' },
  },
  { timestamps: true }
)

const FoodPreset = mongoose.model('FoodPreset', foodPresetSchema)

// Routes
app.get('/api/entries', async (req, res) => {
  try {
    const entries = await Entry.find().sort({ date: 1, createdAt: 1 })
    res.json(entries)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch entries' })
  }
})

app.get('/api/profile', async (req, res) => {
  try {
    let profile = await Profile.findOne()
    if (!profile) {
      profile = new Profile()
      await profile.save()
    }
    res.json(profile)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})

app.put('/api/profile', async (req, res) => {
  try {
    const { calorieBudget, proteinTarget } = req.body
    let profile = await Profile.findOne()
    if (!profile) {
      profile = new Profile({ calorieBudget, proteinTarget })
    } else {
      if (typeof calorieBudget === 'number') profile.calorieBudget = calorieBudget
      if (typeof proteinTarget === 'number') profile.proteinTarget = proteinTarget
    }
    const saved = await profile.save()
    res.json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update profile' })
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

app.get('/api/presets', async (req, res) => {
  try {
    const presets = await FoodPreset.find().sort({ name: 1 })
    res.json(presets)
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch presets' })
  }
})

app.post('/api/presets', async (req, res) => {
  try {
    const preset = new FoodPreset(req.body)
    const saved = await preset.save()
    res.status(201).json(saved)
  } catch (err) {
    res.status(400).json({ error: 'Failed to create preset' })
  }
})

app.put('/api/presets/:id', async (req, res) => {
  try {
    const updated = await FoodPreset.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    })
    if (!updated) {
      return res.status(404).json({ error: 'Preset not found' })
    }
    res.json(updated)
  } catch (err) {
    res.status(400).json({ error: 'Failed to update preset' })
  }
})

app.delete('/api/presets/:id', async (req, res) => {
  try {
    const deleted = await FoodPreset.findByIdAndDelete(req.params.id)
    if (!deleted) {
      return res.status(404).json({ error: 'Preset not found' })
    }
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: 'Failed to delete preset' })
  }
})

app.get('/', (req, res) => {
  res.send('Weight tracker API is running')
})

app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
