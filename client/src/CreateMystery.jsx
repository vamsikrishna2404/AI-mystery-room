
import { useState } from 'react'
import './CreateMystery.css'

function CreateMystery({ onStart }) {
  const [premise, setPremise] = useState('')
  const [difficulty, setDifficulty] = useState('Easy')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!premise.trim()) {
      setError('Please enter a mystery premise!')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('http://localhost:5000/api/cases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          premise: premise.trim(),
          difficulty
        })
      })

      const data = await response.json()

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to generate mystery.')
      }

      // Pass the generated mystery to App.jsx
      onStart(data.mystery)

    } catch (err) {
      console.error('Mystery generation error:', err)
      setError(err.message || 'Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-page">
      <div className="create-card">

        <div className="create-icon">🕵️</div>

        <p className="create-label">AI MYSTERY GENERATOR</p>

        <h1>Create Your Mystery</h1>

        <p className="create-description">
          Design your mystery and let the investigation begin.
        </p>

        <form onSubmit={handleSubmit}>

          <label>Mystery Premise</label>

          <textarea
            value={premise}
            onChange={(e) => setPremise(e.target.value)}
            placeholder="Example: A priceless diamond disappears from a museum during a private exhibition..."
            rows="5"
            maxLength={500}
            disabled={loading}
          />

          <div className="character-count">
            {premise.length}/500 characters
          </div>

          <label>Select Difficulty</label>

          <div className="difficulty-options">

            {['Easy', 'Medium', 'Hard'].map((level) => (
              <button
                type="button"
                key={level}
                className={`difficulty-button ${
                  difficulty === level ? 'selected' : ''
                }`}
                onClick={() => setDifficulty(level)}
                disabled={loading}
              >
                {level === 'Easy' && '🟢'}
                {level === 'Medium' && '🟡'}
                {level === 'Hard' && '🔴'}
                <span>{level}</span>
              </button>
            ))}

          </div>

          <div className="difficulty-info">
            {difficulty === 'Easy' &&
              '3 suspects • 5 clues • 2 hints'}
            {difficulty === 'Medium' &&
              '4 suspects • 7 clues • 3 hints'}
            {difficulty === 'Hard' &&
              '5 suspects • 9 clues • 3 hints'}
          </div>

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="start-button"
            disabled={loading}
          >
            {loading ? 'Generating Mystery...' : 'Generate Mystery →'}
          </button>

        </form>

        <p className="back-text">
          {loading
            ? 'AI is preparing your mystery. Please wait...'
            : 'Choose your difficulty and prepare to investigate.'}
        </p>

      </div>
    </div>
  )
}

export default CreateMystery
