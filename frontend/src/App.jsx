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

  const [weightDate, setWeightDate] = useState(todayString())
  const [weightValue, setWeightValue] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [loadingInitial, setLoadingInitial] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadAll() {
      try {
        setError('')
        const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const [entriesRes, weightsRes] = await Promise.all([
          fetch(`${baseUrl}/api/entries`),
          fetch(`${baseUrl}/api/weights`),
        ])

        if (!entriesRes.ok || !weightsRes.ok) {
          throw new Error('Failed to load data from API')
        }

        const [entriesData, weightsData] = await Promise.all([
          entriesRes.json(),
          weightsRes.json(),
        ])

        setEntries(Array.isArray(entriesData) ? entriesData : [])
        setWeights(Array.isArray(weightsData) ? weightsData : [])
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
        map[e.date] = { date: e.date, in: 0, out: 0, net: 0 }
      }
      map[e.date].in += e.caloriesIn || 0
      map[e.date].out += e.caloriesOut || 0
      map[e.date].net = map[e.date].in - map[e.date].out
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

      {loadingInitial && <p className="empty">Loading data…</p>}

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
        </div>
      </section>

      {error && <div className="error">{error}</div>}

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
            <button type="submit">Save entry</button>
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
      </section>

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
                  </div>
                  {e.explanation && (
                    <div className="entry-explanation">{e.explanation}</div>
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
