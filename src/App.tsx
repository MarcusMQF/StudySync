import { useState } from 'react'
import Sidebar from './components/Sidebar'
import { Timetable } from './components/Timetable'
import './App.css'

function App() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="app">
      <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
      <main className="main-content">
        <Timetable />
      </main>
    </div>
  )
}

export default App
