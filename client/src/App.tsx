import { useState, useCallback } from 'react'
import PuzzleBoard from './PuzzleBoard'
import StatsPage from './StatsPage'
import GoogleSignIn from './GoogleSignIn'
import { useAuth } from './useAuth'
import './App.css'

type Tab = "play" | "stats"

function App() {
  const { user, setUser, initialPuzzle, loading, loginWithGoogle, logout, clearUser } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>("play")

  const handleRatingUpdate = useCallback((newRating: number) => {
    setUser(prev => prev ? { ...prev, rating: newRating } : prev);
  }, [setUser]);

  if (loading) {
    return (
      <div className="app">
        <h1>Puzzle Trainer</h1>
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <h1>Tactic Monster</h1>
        <GoogleSignIn onAuth={loginWithGoogle} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="user-bar">
        <span>Logged in as <strong>{user.name}</strong> &middot; Elo: {user.rating}</span>
        <button onClick={logout}>Log out</button>
      </div>
      <h1>Tactic Monster</h1>
      <div className="tab-bar">
        <button
          className={activeTab === "play" ? "active" : ""}
          onClick={() => setActiveTab("play")}
        >
          Play
        </button>
        <button
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => setActiveTab("stats")}
        >
          Stats
        </button>
      </div>
      {activeTab === "play" ? (
        <PuzzleBoard onAuthError={clearUser} userRating={user.rating} onRatingUpdate={handleRatingUpdate} initialPuzzle={initialPuzzle} />
      ) : (
        <StatsPage key={Date.now()} onAuthError={clearUser} />
      )}
    </div>
  )
}

export default App
