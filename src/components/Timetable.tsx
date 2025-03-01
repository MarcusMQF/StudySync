import React, { useState, useRef, useEffect } from 'react';
import { FaSearch, FaClock, FaMapMarkerAlt, FaUser, FaChevronDown, FaChevronUp, FaPlus, FaTrash, FaDownload, FaUndo } from 'react-icons/fa';
import html2canvas from 'html2canvas';
import './Timetable.css';
import DecryptedText from './DecryptedText';
import { loadExcelData } from '../utils/excelParser';
import { Course, CourseOccurrence } from '../types/course';

interface TimetableOccurrence {
  courseId: string;
  courseName: string;
  courseCode: string;
  occurrenceNumber: string;
  time: string;
  venue: string;
  lecturer: string;
  day: string;
  activityType?: string;
}

type TimetableOccurrences = {
  [key: string]: TimetableOccurrence[];
};

// Add this function to generate consistent colors for courses
const generateCourseColor = (courseCode: string) => {
  // Color palette - modern, accessible colors
  const colors = [
    { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },    // Red
    { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' },  // Orange
    { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { bg: 'rgba(132, 204, 22, 0.15)', border: 'rgba(132, 204, 22, 0.3)' },  // Lime
    { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)' },    // Green
    { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },  // Emerald
    { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)' },  // Teal
    { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },    // Cyan
    { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },  // Sky
    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },  // Blue
    { bg: 'rgba(99, 102, 241, 0.15)', border: 'rgba(99, 102, 241, 0.3)' },  // Indigo
    { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' },  // Purple
    { bg: 'rgba(217, 70, 239, 0.15)', border: 'rgba(217, 70, 239, 0.3)' },  // Fuchsia
    { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' },  // Pink
    { bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' },    // Rose
  ];
  
  // Hash the course code to get a consistent index
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Use the hash to select a color
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

export const Timetable = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>([]);
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [timetableOccurrences, setTimetableOccurrences] = useState<TimetableOccurrences>({});
  const [addedOccurrences, setAddedOccurrences] = useState<{
    [courseId: string]: string | null;
  }>({});
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const timetableRef = useRef<HTMLDivElement>(null);
  const [courseColors, setCourseColors] = useState<{[courseId: string]: {bg: string, border: string}}>({});
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load courses from Excel file
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const courses = await loadExcelData();
        setAvailableCourses(courses);
        console.log('Loaded courses:', courses);
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCourses();
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    return `${hour < 10 ? '0' : ''}${hour}:00`;
  });

  const calculateTimePosition = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    // Precise calculation with 0.5px offset for perfect alignment
    return Math.round((hours - 8) * 100 + (minutes / 60) * 100);
  };
  
  const calculateBlockHeight = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    // Precise height calculation with slight adjustment for borders
    const heightInPixels = Math.round((endTotalMinutes - startTotalMinutes) * (100 / 60));
    
    return Math.max(heightInPixels, 30);
  };

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

  const handleAddOccurrence = (courseId: string, occurrence: CourseOccurrence, courseName: string) => {
    // Add all sessions from this occurrence to the timetable
    occurrence.sessions.forEach(session => {
      // Only add sessions that have both day and time
      if (session.day && session.time) {
        const newOccurrence: TimetableOccurrence = {
          courseId,
          courseName,
          courseCode: courseId,
          occurrenceNumber: occurrence.occurrenceNumber,
          time: session.time,
          venue: session.venue || 'No venue specified',
          lecturer: session.lecturer || 'No lecturer specified',
          day: session.day,
          activityType: occurrence.activityType
        };

        setTimetableOccurrences(prev => ({
          ...prev,
          [session.day]: [...(prev[session.day] || []), newOccurrence]
        }));
      }
    });

    setAddedOccurrences(prev => ({
      ...prev,
      [courseId]: occurrence.occurrenceNumber
    }));
  };

  const handleRemoveOccurrence = (courseId: string, occurrenceNumber: string) => {
    // Remove all sessions of this occurrence from all days
    setTimetableOccurrences(prev => {
      const newOccurrences = { ...prev };
      Object.keys(newOccurrences).forEach(day => {
        newOccurrences[day] = newOccurrences[day].filter(
          (occ: TimetableOccurrence) => !(occ.courseId === courseId && occ.occurrenceNumber === occurrenceNumber)
        );
      });
      return newOccurrences;
    });

    setAddedOccurrences(prev => ({
      ...prev,
      [courseId]: null
    }));
  };

  const handleRemoveCourse = (courseId: string) => {
    // Remove the course from selectedCourses
    setSelectedCourses(prev => prev.filter(course => course.id !== courseId));
    
    // Remove the course from expandedCourses if it's expanded
    setExpandedCourses(prev => prev.filter(id => id !== courseId));
    
    // Remove all occurrences of this course from the timetable
    setTimetableOccurrences(prev => {
      const newOccurrences = { ...prev };
      Object.keys(newOccurrences).forEach(day => {
        newOccurrences[day] = newOccurrences[day].filter(
          (occ: TimetableOccurrence) => occ.courseId !== courseId
        );
      });
      return newOccurrences;
    });
    
    // Reset the addedOccurrences state for this course
    setAddedOccurrences(prev => {
      const newAddedOccurrences = { ...prev };
      delete newAddedOccurrences[courseId]; // Remove the course entry completely
      return newAddedOccurrences;
    });
  };

  const handleReset = () => {
    setTimetableOccurrences({});
    setAddedOccurrences({});
  };
  
  const handleSaveAsPng = () => {
    if (timetableRef.current) {
      // Create a wrapper div with wider dimensions
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '1600px'; // Make it wider
      wrapper.style.height = 'auto';
      wrapper.style.backgroundColor = '#030712';
      wrapper.style.padding = '40px';
      wrapper.style.boxSizing = 'border-box';
      
      // Clone the timetable
      const clone = timetableRef.current.cloneNode(true) as HTMLElement;
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.width = '100%';
      clone.style.maxWidth = '1400px';
      clone.style.margin = '0 auto';
      
      // Add to wrapper
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Capture the image
      html2canvas(wrapper, {
        backgroundColor: '#030712',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 1600,
        height: wrapper.offsetHeight
      }).then(canvas => {
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = 'course-timetable.png';
        link.click();
        
        // Clean up
        document.body.removeChild(wrapper);
      });
    }
  };

  // Add this useEffect to generate colors when courses are loaded
  useEffect(() => {
    const colors: {[courseId: string]: {bg: string, border: string}} = {};
    
    availableCourses.forEach(course => {
      colors[course.id] = generateCourseColor(course.id);
    });
    
    setCourseColors(colors);
  }, [availableCourses]);

  return (
    <div className="timetable-container">
      <div className="timetable-header">
        <h1 className="title-container">
          <DecryptedText 
            text="Academic" 
            speed={30}
            maxIterations={15}
            sequential={true}
            revealDirection="center"
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()"
            className="decrypted-text-revealed"
            encryptedClassName="decrypted-text-encrypted"
            animateOn="hover"
          />
          <span className="title-spacer"> </span>
          <DecryptedText 
            text="Timetable" 
            speed={30}
            maxIterations={15}
            sequential={true}
            revealDirection="center"
            characters="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()"
            className="decrypted-text-revealed"
            encryptedClassName="decrypted-text-encrypted"
            animateOn="hover"
          />
        </h1>
        <span className="draft-tag">Beta</span>
        <div className="header-actions">
          <button className="action-button reset-button" onClick={handleReset}>
            <FaUndo /> Reset
          </button>
          <button className="action-button save-button" onClick={handleSaveAsPng}>
            <FaDownload /> Save as PNG
          </button>
        </div>
      </div>
      
      <div className="timetable-layout">
        {/* Left Panel - Course Search */}
        <div className="course-panel">
          <div className="search-container" ref={searchContainerRef}>
            <div className="search-bar">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
              />
            </div>
            
            {showSearchResults && searchQuery.trim() !== '' && (
              <div className="search-results">
                {isLoading ? (
                  <div className="loading-message">Loading courses...</div>
                ) : searchResults.length > 0 ? (
                  searchResults.map(course => (
                    <div
                      key={course.id}
                      className="search-result-item"
                      onClick={() => handleCourseSelect(course)}
                    >
                      <strong>{course.id}</strong>: {course.name}
                    </div>
                  ))
                ) : (
                  <div className="no-results">No courses found</div>
                )}
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
                        onClick={() => handleRemoveCourse(course.id)}
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
                    {course.occurrences.map((occurrence) => (
                      <div key={occurrence.occurrenceNumber} className="occurrence-item">
                        <div className="occurrence-number">
                          <div className="tag-group">
                            <span>Occurrence {occurrence.occurrenceNumber}</span>
                            {occurrence.activityType && (
                              <span className="activity-type">{occurrence.activityType}</span>
                            )}
                          </div>
                          {addedOccurrences[course.id] === occurrence.occurrenceNumber ? (
                            <button 
                              className="remove-occurrence-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveOccurrence(course.id, occurrence.occurrenceNumber);
                              }}
                            >
                              <FaTrash size={12} />
                              Remove
                            </button>
                          ) : (
                            <button 
                              className="add-occurrence-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddOccurrence(course.id, occurrence, course.name);
                              }}
                              disabled={addedOccurrences[course.id] !== undefined && addedOccurrences[course.id] !== null}
                            >
                              <FaPlus size={12} />
                              Add
                            </button>
                          )}
                        </div>
                        
                        {/* Display all sessions for this occurrence */}
                        {occurrence.sessions.map((session, sessionIndex) => (
                          <div key={sessionIndex} className="occurrence-session">
                            <div className="occurrence-time">
                              <FaClock size={12} style={{ marginRight: '4px' }} />
                              {session.day && session.time ? (
                                <>
                                  {session.day}, {session.time}
                                </>
                              ) : (
                                <span className="incomplete-details">{session.day}</span>
                              )}
                            </div>
                            <div className="occurrence-details">
                              <div className="detail-row">
                                <FaMapMarkerAlt size={12} style={{ marginRight: '4px' }} />
                                <span className="detail-text">{session.venue || 'No venue specified'}</span>
                              </div>
                              <div className="detail-row">
                                <FaUser size={12} style={{ marginRight: '4px' }} />
                                <span className="detail-text">{session.lecturer || 'No lecturer specified'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel - Timetable Grid */}
        <div className="timetable-grid" ref={timetableRef}>
          <div className="days-header">
            <div></div> {/* Empty cell for time column */}
            {days.map((day) => (
              <div key={day} className="day-header">{day}</div>
            ))}
          </div>
          
          <div className="grid-scroll-container">
            <div className="time-column">
              {timeSlots.map((time) => (
                <div key={time} className="time-label" style={{ height: '100px' }}>{time}</div>
              ))}
            </div>

            {/* Grid lines */}
            <div className="grid-lines">
              <div className="horizontal-lines">
                {timeSlots.map((_, i) => (
                  <div key={i} className="horizontal-line" style={{ height: '100px' }} />
                ))}
              </div>
              <div className="vertical-lines">
                {days.map((_, index) => (
                  <div key={index} className="vertical-line" />
                ))}
              </div>
            </div>

            <div className="grid-content">
              {days.map((day) => (
                <div key={day} className="day-column">
                  {timetableOccurrences[day]?.map((occurrence, index) => {
                    const startTime = occurrence.time.split(' - ')[0];
                    const endTime = occurrence.time.split(' - ')[1];
                    const topPosition = calculateTimePosition(startTime);
                    const blockHeight = calculateBlockHeight(startTime, endTime);
                    const courseColor = courseColors[occurrence.courseId] || { bg: 'rgba(20, 184, 166, 0.15)', border: 'rgba(20, 184, 166, 0.3)' };
                    
                    return (
                      <div 
                        key={`${occurrence.courseId}-${index}`} 
                        className="course-block"
                        style={{
                          top: `${topPosition}px`,
                          '--block-height': `${blockHeight}px`,
                          height: `${blockHeight}px`,
                          background: courseColor.bg,
                          borderColor: courseColor.border
                        } as React.CSSProperties}
                      >
                        <div className="course-header-row">
                          <span className="course-code">{occurrence.courseCode}</span>
                          <div className="tags-container">
                            <span className="occ-tag">OCC {occurrence.occurrenceNumber}</span>
                            {occurrence.activityType && (
                              <span className="activity-type">{occurrence.activityType}</span>
                            )}
                          </div>
                        </div>
                        <div className="course-name">{occurrence.courseName}</div>
                        {blockHeight > 50 && (
                          <div className="course-details">
                            <div className="detail-row">
                              <FaUser className="detail-icon" />
                              <span className="detail-text">{occurrence.lecturer}</span>
                            </div>
                            {blockHeight > 70 && (
                              <div className="detail-row">
                                <FaMapMarkerAlt className="detail-icon" />
                                <span className="detail-text">{occurrence.venue}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};