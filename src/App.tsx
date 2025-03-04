import { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import { Timetable } from './components/Timetable'
import { GPACalculator } from './components/GPACalculator'
import './App.css'

function App() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <Router>
      <div className="app">
        <Sidebar isExpanded={isExpanded} setIsExpanded={setIsExpanded} />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Navigate to="/timetable" replace />} />
            <Route path="/timetable" element={<Timetable setIsExpanded={setIsExpanded} />} />
            <Route path="/gpa-calculator" element={<GPACalculator isDarkMode={false} setIsExpanded={setIsExpanded} />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
