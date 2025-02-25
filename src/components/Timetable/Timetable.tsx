import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaClock, FaMapMarkerAlt, FaUser, FaChevronDown, FaChevronUp, FaPlus, FaTrash } from 'react-icons/fa';
import './Timetable.css';

interface CourseOccurrence {
  time: string;
  venue: string;
  lecturer: string;
  day: string;
}

interface Course {
  id: string;
  name: string;
  occurrences: CourseOccurrence[];
}

interface TimetableOccurrence extends CourseOccurrence {
  courseId: string;
  courseName: string;
  occurrenceIndex: number;
  gridPosition?: {
    startColumn: number;
    width: number;
  };
}

type TimetableOccurrences = {
  [key: string]: TimetableOccurrence[];
};

export const Timetable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [timetableOccurrences, setTimetableOccurrences] = useState<TimetableOccurrences>({});
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Available courses data
  const availableCourses: Course[] = [
    {
      id: 'WIX1001',
      name: 'Computer System and Organizations',
      occurrences: [
        {
          time: '9:00 - 10:00',
          venue: 'Room 1, Computing Building',
          lecturer: 'Dr. Anderson',
          day: 'Monday'
        },
        {
          time: '14:00 - 15:00',
          venue: 'Lab 1, Computing Building',
          lecturer: 'Dr. Anderson',
          day: 'Wednesday'
        },
        {
          time: '11:00 - 12:00',
          venue: 'Room 1, Computing Building',
          lecturer: 'Dr. Wilson',
          day: 'Friday'
        }
      ]
    },
    {
      id: 'WIX1002',
      name: 'Fundamental of Programming',
      occurrences: [
        {
          time: '10:00 - 11:00',
          venue: 'Room 2, Computing Building',
          lecturer: 'Dr. Lee',
          day: 'Tuesday'
        },
        {
          time: '15:00 - 16:00',
          venue: 'Lab 2, Computing Building',
          lecturer: 'Dr. Lee',
          day: 'Thursday'
        },
        {
          time: '13:00 - 14:00',
          venue: 'Room 2, Computing Building',
          lecturer: 'Ms. Chen',
          day: 'Friday'
        }
      ]
    },
    {
      id: 'WIX1003',
      name: 'Computing Mathematics I',
      occurrences: [
        {
          time: '11:00 - 12:00',
          venue: 'Room 3, Mathematics Building',
          lecturer: 'Dr. Zhang',
          day: 'Monday'
        },
        {
          time: '14:00 - 15:00',
          venue: 'Tutorial Room 1',
          lecturer: 'Dr. Zhang',
          day: 'Wednesday'
        },
        {
          time: '9:00 - 10:00',
          venue: 'Room 3, Mathematics Building',
          lecturer: 'Dr. Wang',
          day: 'Thursday'
        }
      ]
    },
    {
      id: 'WIA2010',
      name: 'Human Computer Interaction',
      occurrences: [
        {
          time: '13:00 - 14:00',
          venue: 'Room 4, Computing Building',
          lecturer: 'Dr. Taylor',
          day: 'Tuesday'
        },
        {
          time: '10:00 - 11:00',
          venue: 'Lab 3, Computing Building',
          lecturer: 'Dr. Taylor',
          day: 'Thursday'
        },
        {
          time: '15:00 - 16:00',
          venue: 'Room 4, Computing Building',
          lecturer: 'Ms. Rodriguez',
          day: 'Friday'
        }
      ]
    }
  ];
  
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    return `${hour}:00`;
  });

  // Handle search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase();
    const results = availableCourses.filter(
      course => 
        course.id.toLowerCase().includes(query) || 
        course.name.toLowerCase().includes(query)
    );
    setSearchResults(results);
  }, [searchQuery]);

  // Handle click outside search results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCourseSelect = (course: Course) => {
    if (!selectedCourses.find(c => c.id === course.id)) {
      setSelectedCourses([...selectedCourses, course]);
      setExpandedCourses([...expandedCourses, course.id]);
    }
    setSearchQuery('');
    setShowSearchResults(false);
  };

  const toggleCourseExpansion = (courseId: string) => {
    setExpandedCourses(prev => 
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleAddOccurrence = (courseId: string, occurrence: CourseOccurrence) => {
    // TODO: Add occurrence to timetable grid
    console.log('Adding occurrence:', courseId, occurrence);
  };

  const handleRemoveCourse = (e: React.MouseEvent, courseId: string) => {
    e.stopPropagation();
    setSelectedCourses(prev => prev.filter(course => course.id !== courseId));
    setExpandedCourses(prev => prev.filter(id => id !== courseId));
    setTimetableOccurrences(prev => {
      const newOccurrences = { ...prev };
      Object.keys(newOccurrences).forEach(day => {
        newOccurrences[day] = newOccurrences[day].filter(
          (occ: TimetableOccurrence) => occ.courseId !== courseId
        );
      });
      return newOccurrences;
    });
  };

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h1>Course Timetable</h1>
        <span className="draft-tag">Beta</span>
      </div>
      
      <div className="timetable-layout">
        {/* Left Panel - Course Search */}
        <div className="course-panel">
          <div className="search-container" ref={searchContainerRef}>
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
              />
            </div>
            {showSearchResults && searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map((course) => (
                  <div
                    key={course.id}
                    className="search-result-item"
                    onClick={() => handleCourseSelect(course)}
                  >
                    <strong>{course.id}</strong>: {course.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="course-list">
            {selectedCourses.map((course) => (
              <div key={course.id} className="course-item">
                <div 
                  className="course-header"
                  onClick={() => toggleCourseExpansion(course.id)}
                >
                  <div className="course-title">
                    <h3>{course.id}: {course.name}</h3>
                    <div className="course-title-icons">
                      <FaTrash 
                        className="remove-icon" 
                        size={14}
                        onClick={(e) => handleRemoveCourse(e, course.id)}
                      />
                      {expandedCourses.includes(course.id) ? (
                        <FaChevronUp className="expand-icon" />
                      ) : (
                        <FaChevronDown className="expand-icon" />
                      )}
                    </div>
                  </div>
                </div>
                {expandedCourses.includes(course.id) && (
                  <div className="course-occurrences">
                    {course.occurrences.map((occurrence, index) => (
                      <div key={index} className="occurrence-item">
                        <span className="occurrence-number">Occurrence {index + 1}</span>
                        <div className="occurrence-time">
                          <FaClock size={12} style={{ marginRight: '4px' }} />
                          {occurrence.day}, {occurrence.time}
                        </div>
                        <div className="occurrence-details">
                          <div>
                            <FaMapMarkerAlt size={12} style={{ marginRight: '4px' }} />
                            {occurrence.venue}
                          </div>
                          <div>
                            <FaUser size={12} style={{ marginRight: '4px' }} />
                            {occurrence.lecturer}
                          </div>
                        </div>
                        <button 
                          className="add-occurrence-btn"
                          onClick={() => handleAddOccurrence(course.id, occurrence)}
                        >
                          <FaPlus size={12} />
                          Add
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Timetable Grid */}
        <div className="timetable-grid">
          <div className="time-headers">
            <div></div>
            {days.map((day) => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          
          <div className="grid-container">
            <div className="time-column">
              {timeSlots.map((time) => (
                <div key={time} className="time-slot">{time}</div>
              ))}
            </div>
            {days.map((day) => (
              <div key={day} className="day-column">
                {timetableOccurrences[day]?.map((occurrence, index) => (
                  <div key={`${occurrence.courseId}-${index}`} className="timetable-occurrence">
                    {occurrence.courseName}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
