import PuzzleBoard from './PuzzleBoard'
import AuthForm from './AuthForm'
import { useAuth } from './useAuth'
import './App.css'

function App() {
  const { user, loading, login, logout, clearUser } = useAuth()

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
        <h1>Puzzle Trainer</h1>
        <AuthForm onAuth={login} />
      </div>
    )
  }

  return (
    <div className="app">
      <div className="user-bar">
        <span>Logged in as <strong>{user.username}</strong></span>
        <button onClick={logout}>Log out</button>
      </div>
      <h1>Puzzle Trainer</h1>
      <PuzzleBoard onAuthError={clearUser} />
    </div>
  )
}

export default App
