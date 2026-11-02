
import { useState, useEffect } from 'react'
import CreateMystery from './CreateMystery'
import './App.css'

const API_URL = 'https://ai-mystery-room-1-yi3d.onrender.com/api/cases'

function App() {
  const [mystery, setMystery] = useState(null)
  const [discovered, setDiscovered] = useState([])
  const [score, setScore] = useState(0)
  const [hintsUsed, setHintsUsed] = useState(0)
  const [hint, setHint] = useState('')
  const [loading, setLoading] = useState(false)
  const [accusation, setAccusation] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [timeLeft, setTimeLeft] = useState(600)

  // Countdown timer
  useEffect(() => {
    if (!mystery || result || timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [mystery, result, timeLeft])

  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  // Start investigation with generated mystery
  const startInvestigation = (generatedMystery) => {
    setMystery(generatedMystery)
    setDiscovered([])
    setScore(generatedMystery.score || 0)
    setHintsUsed(0)
    setHint('')
    setAccusation('')
    setResult(null)
    setError('')
    setTimeLeft(600)
  }

  // Discover clue using backend API
  const discoverClue = async (clueId) => {
    if (loading || result || timeLeft === 0) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/${mystery.id}/clues/${clueId}/discover`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to discover clue.')
      }

      setDiscovered(prev => [...prev, clueId])
      setScore(data.score)

      // Update the clue with its discovered description
      setMystery(prev => ({
        ...prev,
        clues: prev.clues.map(clue =>
          clue._id === clueId
            ? { ...clue, isDiscovered: true, description: data.clue.description }
            : clue
        )
      }))

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Request hint using backend API
  const requestHint = async () => {
    if (loading || result || timeLeft === 0) return

    setLoading(true)
    setError('')
    setHint('')

    try {
      const response = await fetch(
        `${API_URL}/${mystery.id}/hints`,
        { method: 'POST' }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to get hint.')
      }

      setHint(data.hint)
      setHintsUsed(data.hintsUsed)
      setScore(data.score)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Submit accusation using backend API
  const submitAccusation = async () => {
    if (!accusation || loading || result) {
      setError('Please select a suspect first.')
      return
    }

    if (!window.confirm('Are you sure you want to submit your accusation? This will end the mystery.')) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(
        `${API_URL}/${mystery.id}/accuse`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            suspectId: accusation
          })
        }
      )

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to submit accusation.')
      }

      setResult(data.result)
      setScore(data.result.finalScore)

    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Start a new mystery
  const newMystery = () => {
    setMystery(null)
    setDiscovered([])
    setScore(0)
    setHintsUsed(0)
    setHint('')
    setAccusation('')
    setResult(null)
    setError('')
    setTimeLeft(600)
  }

  // Show mystery creation page
  if (!mystery) {
    return <CreateMystery onStart={startInvestigation} />
  }

  // Results page
  if (result) {
    return (
      <div className="dashboard">
        <main className="main-content">
          <div className="story-card">
            <h1>
              {result.isCorrect ? '🎉 Mystery Solved!' : '🔍 Investigation Complete'}
            </h1>

            <h2>{mystery.title}</h2>

            <p>
              {result.isCorrect
                ? 'Excellent detective work! You identified the correct culprit.'
                : 'Your accusation was incorrect. Here is the actual solution.'}
            </p>

            <h3>Selected Suspect</h3>
            <p>{result.selectedSuspect}</p>

            <h3>Actual Culprit</h3>
            <p>{result.culprit}</p>

            <h3>Solution Explanation</h3>
            <p>{result.explanation}</p>

            <h2>Final Score: {result.finalScore}</h2>

            <p>Difficulty: {result.difficulty}</p>
            <p>Hints used: {result.hintsUsed}</p>
            <p>Clues discovered: {result.discoveredCluesCount}</p>

            <button onClick={newMystery}>
              + Create New Mystery
            </button>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="dashboard">

      <header className="topbar">
        <h2>🕵️ AI Mystery Room</h2>

        <span className="active-status">
          <span className="status-dot"></span>
          Investigation Active
        </span>

        <button onClick={newMystery}>
          + New Mystery
        </button>
      </header>

      <main className="main-content">

        <div className="case-heading">
          <p className="case-label">YOUR MYSTERY</p>
          <h1>{mystery.title}</h1>
          <p className="subtitle">
            Every clue matters. Every suspect has a secret.
          </p>
        </div>

        <section className="timer-card">
          <div>
            <p className="section-label">INVESTIGATION TIMER</p>
            <h2>
              {String(minutes).padStart(2, '0')}:
              {String(seconds).padStart(2, '0')}
            </h2>
          </div>
          <span className="timer-icon">⏳</span>
        </section>

        {timeLeft === 0 && (
          <div className="time-up">
            ⏰ Time is up! You can still review the case and submit an accusation.
          </div>
        )}

        {error && (
          <div className="time-up">
            {error}
          </div>
        )}

        <section className="story-card">
          <h2>📖 Mystery Story</h2>
          <p>{mystery.story}</p>
          <p>
            Difficulty: <strong>{mystery.difficulty}</strong>
          </p>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2>👥 Suspects</h2>
              <p>Examine everyone carefully.</p>
            </div>
            <span className="count-badge">
              {mystery.suspects.length} Suspects
            </span>
          </div>

          <div className="suspect-grid">
            {mystery.suspects.map((suspect, index) => (
              <div className="suspect-card" key={suspect._id}>
                <div className="suspect-emoji">🕵️</div>
                <h3>{suspect.name}</h3>
                <p>{suspect.description}</p>
                <p><strong>Motive:</strong> {suspect.motive}</p>
                <p><strong>Alibi:</strong> {suspect.alibi}</p>
                <span className="suspect-number">
                  SUSPECT 0{index + 1}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="section">
          <div className="section-heading">
            <div>
              <h2>🔎 Evidence Room</h2>
              <p>Discover clues to solve the mystery.</p>
            </div>

            <span className="count-badge">
              {discovered.length}/{mystery.clues.length} Found
            </span>
          </div>

          <div className="progress-track">
            <div
              className="progress-fill"
              style={{
                width: `${(discovered.length / mystery.clues.length) * 100}%`
              }}
            ></div>
          </div>

          <div className="clue-grid">
            {mystery.clues.map((clue, index) => {
              const isFound = discovered.includes(clue._id)

              return (
                <div className="clue-card" key={clue._id}>
                  <div className="clue-icon">🔍</div>
                  <h3>{clue.title}</h3>

                  {isFound ? (
                    <>
                      <p className="clue-description">
                        {clue.description}
                      </p>
                      <span className="found-label">
                        ✓ Evidence discovered
                      </span>
                    </>
                  ) : (
                    <>
                      <p className="hidden-clue">
                        This evidence has not been examined yet.
                      </p>
                      <button
                        className="discover-button"
                        onClick={() => discoverClue(clue._id)}
                        disabled={loading}
                      >
                        Discover Clue
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        <section className="story-card">
          <h2>💡 Detective Hint</h2>

          <p>
            Hints used: {hintsUsed}/{mystery.hintsRemaining}
          </p>

          {hint && <p>{hint}</p>}

          <button
            onClick={requestHint}
            disabled={loading || hintsUsed >= mystery.hintsRemaining + hintsUsed}
          >
            {loading ? 'Please wait...' : 'Request Hint (-10 points)'}
          </button>
        </section>

        <section className="story-card">
          <h2>⚖️ Make Your Accusation</h2>
          <p>Who do you think is responsible?</p>

          <select
            value={accusation}
            onChange={(e) => setAccusation(e.target.value)}
            disabled={loading}
          >
            <option value="">Select a suspect</option>

            {mystery.suspects.map(suspect => (
              <option key={suspect._id} value={suspect._id}>
                {suspect.name}
              </option>
            ))}
          </select>

          <button
            onClick={submitAccusation}
            disabled={loading || !accusation}
          >
            {loading ? 'Submitting...' : 'Submit Final Accusation'}
          </button>
        </section>

        <section className="story-card">
          <h2>🏆 Current Score: {score}</h2>
          <p>Each discovered clue: +5 points</p>
          <p>Each hint: -10 points</p>
          <p>Correct accusation: bonus based on difficulty</p>
        </section>

        <footer>
          <p>
            AI Mystery Room | Think like a detective. Solve like a genius.
          </p>
        </footer>

      </main>
    </div>
  )
}

export default App
