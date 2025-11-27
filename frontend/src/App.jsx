import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts'
import './App.css'

const todayString = () => new Date().toISOString().slice(0, 10)

function App() {
  const [entries, setEntries] = useState([])
  const [weights, setWeights] = useState([])

  const [entryDate, setEntryDate] = useState(todayString())
  const [entryType, setEntryType] = useState('food')
  const [entryText, setEntryText] = useState('')
  const [entryCaloriesIn, setEntryCaloriesIn] = useState('')
  const [entryCaloriesOut, setEntryCaloriesOut] = useState('')
  const [entryProtein, setEntryProtein] = useState('')
  const [entryCarbs, setEntryCarbs] = useState('')
  const [entryFat, setEntryFat] = useState('')
  const [entryVitamins, setEntryVitamins] = useState('')

  const [weightDate, setWeightDate] = useState(todayString())
  const [weightValue, setWeightValue] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('stats')
  const [profile, setProfile] = useState({ calorieBudget: 0, proteinTarget: 0 })
  const [presets, setPresets] = useState([])
  const [presetName, setPresetName] = useState('')
  const [presetPortion, setPresetPortion] = useState('')
  const [presetCaloriesIn, setPresetCaloriesIn] = useState('')
  const [presetProtein, setPresetProtein] = useState('')
  const [presetCarbs, setPresetCarbs] = useState('')
  const [presetFat, setPresetFat] = useState('')
  const [presetVitamins, setPresetVitamins] = useState('')

  useEffect(() => {
    async function loadAll() {
      try {
        setError('')
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const [entriesRes, weightsRes, profileRes, presetsRes] = await Promise.all([
          fetch(`${baseUrl}/api/entries`),
          fetch(`${baseUrl}/api/weights`),
          fetch(`${baseUrl}/api/profile`),
          fetch(`${baseUrl}/api/presets`),
        ])

        if (!entriesRes.ok || !weightsRes.ok || !profileRes.ok || !presetsRes.ok) {
          throw new Error('Failed to load data from API')
        }

        const [entriesData, weightsData, profileData, presetsData] = await Promise.all([
          entriesRes.json(),
          weightsRes.json(),
          profileRes.json(),
          presetsRes.json(),
        ])

        setEntries(Array.isArray(entriesData) ? entriesData : [])
        setWeights(Array.isArray(weightsData) ? weightsData : [])
        if (profileData && typeof profileData === 'object') {
          setProfile({
            calorieBudget: Number(profileData.calorieBudget) || 0,
            proteinTarget: Number(profileData.proteinTarget) || 0,
          })
        }
        setPresets(Array.isArray(presetsData) ? presetsData : [])
      } catch (err) {
        setError(err.message || 'Failed to load from API')
      } finally {
        setLoadingInitial(false)
      }
    }

    loadAll()
  }, [])

  const dailyCalories = useMemo(() => {
    const map = {}
    for (const e of entries) {
      if (!map[e.date]) {
        map[e.date] = {
          date: e.date,
          in: 0,
          out: 0,
          net: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        }
      }
      map[e.date].in += e.caloriesIn || 0
      map[e.date].out += e.caloriesOut || 0
      map[e.date].net = map[e.date].in - map[e.date].out
      map[e.date].protein += e.protein || 0
      map[e.date].carbs += e.carbs || 0
      map[e.date].fat += e.fat || 0
    }
    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date))
  }, [entries])

  const weightSeries = useMemo(() => {
    return [...weights].sort((a, b) => a.date.localeCompare(b.date))
  }, [weights])

  const filteredDailyCalories = useMemo(() => {
    if (dateRange === 'all') return dailyCalories
    const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : 1
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (days - 1))
    return dailyCalories.filter((d) => new Date(d.date) >= cutoff)
  }, [dailyCalories, dateRange])

  const filteredWeightSeries = useMemo(() => {
    if (dateRange === 'all') return weightSeries
    const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : 1
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - (days - 1))
    return weightSeries.filter((d) => new Date(d.date) >= cutoff)
  }, [weightSeries, dateRange])

  const todaySummary = useMemo(() => {
    const today = todayString()
    const todayRow = dailyCalories.find((d) => d.date === today)
    const latestWeight = weightSeries[weightSeries.length - 1]
    const firstWeight = weightSeries[0]
    return {
      todayIn: todayRow?.in || 0,
      todayOut: todayRow?.out || 0,
      todayNet: todayRow?.net || 0,
      todayProtein: todayRow?.protein || 0,
      todayCarbs: todayRow?.carbs || 0,
      todayFat: todayRow?.fat || 0,
      latestWeight: latestWeight?.weight ?? null,
      deltaWeight:
        latestWeight && firstWeight
          ? latestWeight.weight - firstWeight.weight
          : null,
    }
  }, [dailyCalories, weightSeries])

  async function handleAddEntry(e) {
    e.preventDefault()
    setError('')
    if (!entryText.trim()) {
      setError('Please describe what you ate or which activity you did.')
      return
    }

    const caloriesInNumber = Number(entryCaloriesIn) || 0
    const caloriesOutNumber = Number(entryCaloriesOut) || 0
    const proteinNumber = Number(entryProtein) || 0
    const carbsNumber = Number(entryCarbs) || 0
    const fatNumber = Number(entryFat) || 0
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
      const responseSave = await fetch(`${baseUrl}/api/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: entryDate || todayString(),
          type: entryType,
          text: entryText.trim(),
          caloriesIn: caloriesInNumber,
          caloriesOut: caloriesOutNumber,
          protein: proteinNumber,
          carbs: carbsNumber,
          fat: fatNumber,
          vitaminText: entryVitamins.trim(),
          explanation: entryText.trim(),
        }),
      })

      if (!responseSave.ok) {
        throw new Error('Failed to save entry to server')
      }

      const saved = await responseSave.json()

      setEntries((prev) => [...prev, saved])
      setEntryText('')
      setEntryCaloriesIn('')
      setEntryCaloriesOut('')
      setEntryProtein('')
      setEntryCarbs('')
      setEntryFat('')
      setEntryVitamins('')
    } catch (err) {
      setError(err.message || 'Failed to save entry')
    }
  }

  function handleAddWeight(e) {
    e.preventDefault()
    setError('')
    const w = parseFloat(weightValue)
    if (!weightDate || Number.isNaN(w)) {
      setError('Please enter a valid weight and date.')
      return
    }
    async function saveWeight() {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const res = await fetch(`${baseUrl}/api/weights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: weightDate, weight: w }),
        })

        if (!res.ok) {
          throw new Error('Failed to save weight to server')
        }

        const saved = await res.json()
        setWeights((prev) => {
          const filtered = prev.filter((item) => item.date !== saved.date)
          return [...filtered, saved]
        })
        setWeightValue('')
      } catch (err) {
        setError(err.message || 'Failed to save weight')
      }
    }

    saveWeight()
  }

  return (
    <div className="app-root">
      <h1>Weight & Calorie Tracker</h1>

      <div className="tabs">
        <button
          type="button"
          className={activeTab === 'stats' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('stats')}
        >
          Stats
        </button>
        <button
          type="button"
          className={activeTab === 'log' ? 'tab active' : 'tab'}
          onClick={() => setActiveTab('log')}
        >
          Log & Settings
        </button>
      </div>

      {loadingInitial && <p className="empty">Loading data…</p>}

      {activeTab === 'stats' && (
        <section className="summary">
        <div className="summary-header">
          <h2>Today</h2>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="all">All time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="today">Today only</option>
          </select>
        </div>
        <div className="summary-grid">
          <div>
            <div className="summary-label">Calories in</div>
            <div className="summary-value">{todaySummary.todayIn}</div>
          </div>
          <div>
            <div className="summary-label">Calories out</div>
            <div className="summary-value">{todaySummary.todayOut}</div>
          </div>
          <div>
            <div className="summary-label">Net</div>
            <div className="summary-value">{todaySummary.todayNet}</div>
          </div>
          <div>
            <div className="summary-label">Latest weight</div>
            <div className="summary-value">
              {todaySummary.latestWeight != null
                ? `${todaySummary.latestWeight}`
                : '—'}
            </div>
          </div>
          <div>
            <div className="summary-label">Change</div>
            <div className="summary-value">
              {todaySummary.deltaWeight != null
                ? `${todaySummary.deltaWeight.toFixed(1)}`
                : '—'}
            </div>
          </div>
          <div>
            <div className="summary-label">Protein today</div>
            <div className="summary-value">
              {todaySummary.todayProtein}
              {profile.proteinTarget
                ? ` / ${profile.proteinTarget} g`
                : ' g'}
            </div>
          </div>
          <div>
            <div className="summary-label">Carbs today</div>
            <div className="summary-value">{todaySummary.todayCarbs} g</div>
          </div>
          <div>
            <div className="summary-label">Fat today</div>
            <div className="summary-value">{todaySummary.todayFat} g</div>
          </div>
        </div>
      </section>
      )}

      {error && <div className="error">{error}</div>}

      {activeTab === 'log' && (
        <section className="forms">
          <div className="card">
            <h2>Log food or activity</h2>
            <form onSubmit={handleAddEntry} className="form">
            <label>
              Date
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                value={entryType}
                onChange={(e) => setEntryType(e.target.value)}
              >
                <option value="food">Food / drink</option>
                <option value="activity">Activity</option>
              </select>
            </label>
            <label>
              Description / note
              <textarea
                rows={3}
                value={entryText}
                onChange={(e) => setEntryText(e.target.value)}
                placeholder="e.g. 2 eggs, 3 slices toast and butter"
              />
            </label>
            <label>
              Calories in
              <input
                type="number"
                value={entryCaloriesIn}
                onChange={(e) => setEntryCaloriesIn(e.target.value)}
                placeholder="e.g. 500"
              />
            </label>
            <label>
              Calories out
              <input
                type="number"
                value={entryCaloriesOut}
                onChange={(e) => setEntryCaloriesOut(e.target.value)}
                placeholder="e.g. 200"
              />
            </label>
            <label>
              Protein (g)
              <input
                type="number"
                value={entryProtein}
                onChange={(e) => setEntryProtein(e.target.value)}
                placeholder="e.g. 30"
              />
            </label>
            <label>
              Carbs (g)
              <input
                type="number"
                value={entryCarbs}
                onChange={(e) => setEntryCarbs(e.target.value)}
                placeholder="e.g. 40"
              />
            </label>
            <label>
              Fat (g)
              <input
                type="number"
                value={entryFat}
                onChange={(e) => setEntryFat(e.target.value)}
                placeholder="e.g. 10"
              />
            </label>
            <label>
              Vitamins (optional note)
              <textarea
                rows={2}
                value={entryVitamins}
                onChange={(e) => setEntryVitamins(e.target.value)}
                placeholder="e.g. C: 75mg; D: 10µg"
              />
            </label>
            <button type="submit">Save entry</button>
          </form>
        </div>

        <div className="card">
          <h2>Food presets</h2>
          {presets.length === 0 ? (
            <p className="empty">No presets yet. Create one below.</p>
          ) : (
            <ul className="preset-list">
              {presets.map((p) => (
                <li key={p._id} className="preset-item">
                  <div className="preset-main">
                    <span className="preset-name">{p.name}</span>
                    {p.defaultPortion ? (
                      <span className="preset-portion">
                        ({p.defaultPortion} g/serving)
                      </span>
                    ) : null}
                  </div>
                  <div className="preset-meta">
                    <span>{p.caloriesIn || 0} kcal</span>
                    <span>{p.protein || 0} g protein</span>
                    <span>{p.carbs || 0} g carbs</span>
                    <span>{p.fat || 0} g fat</span>
                  </div>
                  <button
                    type="button"
                    className="small-button"
                    onClick={() => applyPreset(p)}
                  >
                    Use preset
                  </button>
                </li>
              ))}
            </ul>
          )}

          <form onSubmit={handleSavePreset} className="form preset-form">
            <label>
              Name
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                placeholder="e.g. Oats with whey"
              />
            </label>
            <label>
              Default portion (g or serving)
              <input
                type="number"
                value={presetPortion}
                onChange={(e) => setPresetPortion(e.target.value)}
                placeholder="e.g. 100"
              />
            </label>
            <label>
              Calories in
              <input
                type="number"
                value={presetCaloriesIn}
                onChange={(e) => setPresetCaloriesIn(e.target.value)}
                placeholder="e.g. 450"
              />
            </label>
            <label>
              Protein (g)
              <input
                type="number"
                value={presetProtein}
                onChange={(e) => setPresetProtein(e.target.value)}
                placeholder="e.g. 35"
              />
            </label>
            <label>
              Carbs (g)
              <input
                type="number"
                value={presetCarbs}
                onChange={(e) => setPresetCarbs(e.target.value)}
                placeholder="e.g. 50"
              />
            </label>
            <label>
              Fat (g)
              <input
                type="number"
                value={presetFat}
                onChange={(e) => setPresetFat(e.target.value)}
                placeholder="e.g. 12"
              />
            </label>
            <label>
              Vitamins (optional note)
              <textarea
                rows={2}
                value={presetVitamins}
                onChange={(e) => setPresetVitamins(e.target.value)}
                placeholder="e.g. C: 75mg; D: 10µg"
              />
            </label>
            <button type="submit">Save preset</button>
          </form>
        </div>

        <div className="card">
          <h2>Log weight</h2>
          <form onSubmit={handleAddWeight} className="form">
            <label>
              Date
              <input
                type="date"
                value={weightDate}
                onChange={(e) => setWeightDate(e.target.value)}
              />
            </label>
            <label>
              Weight
              <input
                type="number"
                step="0.1"
                value={weightValue}
                onChange={(e) => setWeightValue(e.target.value)}
                placeholder="e.g. 78.5"
              />
            </label>
            <button type="submit">Save weight</button>
          </form>
        </div>

        <div className="card">
          <h2>Profile & goals</h2>
          <form onSubmit={handleSaveProfile} className="form">
            <label>
              Daily calorie budget
              <input
                type="number"
                value={profile.calorieBudget}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, calorieBudget: e.target.value }))
                }
                placeholder="e.g. 2200"
              />
            </label>
            <label>
              Daily protein target (g)
              <input
                type="number"
                value={profile.proteinTarget}
                onChange={(e) =>
                  setProfile((p) => ({ ...p, proteinTarget: e.target.value }))
                }
                placeholder="e.g. 160"
              />
            </label>
            <button type="submit">Save profile</button>
          </form>
        </div>
      </section>
      )}

      <section className="charts">
        <div className="card">
          <h2>Daily calories</h2>
          {filteredDailyCalories.length === 0 ? (
            <p className="empty">No entries yet.</p>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={filteredDailyCalories}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="in" fill="#8884d8" name="In" />
                  <Bar dataKey="out" fill="#82ca9d" name="Out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="card">
          <h2>Weight over time</h2>
          {filteredWeightSeries.length === 0 ? (
            <p className="empty">No weights logged yet.</p>
          ) : (
            <div className="chart-wrapper">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={filteredWeightSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#8884d8"
                    name="Weight"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {entries.length > 0 && (
        <section className="history">
          <h2>Recent entries</h2>
          <ul className="entry-list">
            {[...entries]
              .sort((a, b) => {
                if (a.date !== b.date) {
                  return b.date.localeCompare(a.date)
                }
                const aId = String(a._id || '')
                const bId = String(b._id || '')
                return bId.localeCompare(aId)
              })
              .slice(0, 10)
              .map((e, idx) => (
                <li key={e._id || idx} className="entry-item">
                  <div className="entry-main">
                    <span className="entry-date">{e.date}</span>
                    <span className="entry-type">{e.type}</span>
                    <span className="entry-text">{e.text}</span>
                  </div>
                  <div className="entry-meta">
                    <span>In: {e.caloriesIn}</span>
                    <span>Out: {e.caloriesOut}</span>
                    {typeof e.protein === 'number' && e.protein > 0 && (
                      <span>Protein: {e.protein} g</span>
                    )}
                    {typeof e.carbs === 'number' && e.carbs > 0 && (
                      <span>Carbs: {e.carbs} g</span>
                    )}
                    {typeof e.fat === 'number' && e.fat > 0 && (
                      <span>Fat: {e.fat} g</span>
                    )}
                  </div>
                  {e.explanation && (
                    <div className="entry-explanation">{e.explanation}</div>
                  )}
                  {e.vitaminText && (
                    <div className="entry-explanation">Vitamins: {e.vitaminText}</div>
                  )}
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default App
