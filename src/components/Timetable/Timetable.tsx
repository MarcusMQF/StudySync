import { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import './Timetable.css';

export const Timetable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    return `${hour}:00`;
  });

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h1>Course Timetable</h1>
        <span className="draft-tag">Beta</span>
      </div>
      
      <div className="timetable-layout">
        {/* Left Panel - Course Search */}
        <div className="course-panel">
          <div className="search-container">
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="course-list">
            <div className="course-item">
              <div className="course-header">
                <h3>CSC148: Introduction to Computer Science</h3>
                <span className="occurrence-count">3 Occurrences</span>
              </div>
            </div>
            
            <div className="course-item">
              <div className="course-header">
                <h3>MAT137: Calculus</h3>
                <span className="occurrence-count">4 Occurrences</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Timetable Grid */}
        <div className="timetable-grid">
          <div className="time-headers">
            <div /> {/* Empty cell for time column */}
            {days.map(day => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          
          <div className="grid-container">
            <div className="time-column">
              {timeSlots.map(time => (
                <div key={time} className="time-slot">{time}</div>
              ))}
            </div>
            {days.map(day => (
              <div key={day} className="day-column">
                {timeSlots.map(time => (
                  <div key={`${day}-${time}`} className="time-slot" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
