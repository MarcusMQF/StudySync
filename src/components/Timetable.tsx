import { useState, useRef, useEffect } from 'react';
import { FaSearch, FaClock, FaMapMarkerAlt, FaUser, FaChevronDown, FaChevronUp, FaPlus, FaTrash, FaDownload, FaUndo, FaExclamationTriangle} from 'react-icons/fa';
import html2canvas from 'html2canvas';
import './Timetable.css';
import DecryptedText from './DecryptedText';
import { loadCoursesFromJson } from '../utils/jsonParser';
import { Course, CourseOccurrence, TimetableOccurrence as ITimetableOccurrence } from '../types/course';
import { MenuButton } from './MenuButton';
import { ModeToggle } from './ModeToggle';

type TimetableOccurrences = {
  [key: string]: ITimetableOccurrence[];
};

// Add this function to generate consistent colors for courses
const generateCourseColor = (courseCode: string) => {
  // Color palette - modern, accessible colors
  const colors = [
    // Reds & Pinks
    { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)' },    // Red
    { bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' },    // Rose
    { bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.3)' },  // Pink
    { bg: 'rgba(251, 113, 133, 0.15)', border: 'rgba(251, 113, 133, 0.3)' }, // Light Pink
    { bg: 'rgba(255, 182, 193, 0.15)', border: 'rgba(255, 182, 193, 0.3)' }, // Baby Pink

    // Oranges & Yellows
    { bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.3)' },  // Orange
    { bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.3)' },  // Light Orange
    { bg: 'rgba(253, 186, 116, 0.15)', border: 'rgba(253, 186, 116, 0.3)' }, // Pale Orange
    { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' },  // Amber
    { bg: 'rgba(252, 211, 77, 0.15)', border: 'rgba(252, 211, 77, 0.3)' },  // Light Yellow

    // Greens
    { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)' },    // Green
    { bg: 'rgba(132, 204, 22, 0.15)', border: 'rgba(132, 204, 22, 0.3)' },  // Lime
    { bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' },  // Emerald
    { bg: 'rgba(110, 231, 183, 0.15)', border: 'rgba(110, 231, 183, 0.3)' }, // Light Mint

    // Blues & Cyans
    { bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' },    // Cyan
    { bg: 'rgba(14, 165, 233, 0.15)', border: 'rgba(14, 165, 233, 0.3)' },  // Sky
    { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' },  // Blue
    { bg: 'rgba(147, 197, 253, 0.15)', border: 'rgba(147, 197, 253, 0.3)' }, // Light Blue

    // Purples & Violets
    { bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' },  // Violet
    { bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.3)' },  // Purple
    { bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.3)' }, // Light Purple
    { bg: 'rgba(216, 180, 254, 0.15)', border: 'rgba(216, 180, 254, 0.3)' }, // Lavender

    // Browns & Neutrals
    { bg: 'rgba(180, 83, 9, 0.15)', border: 'rgba(180, 83, 9, 0.3)' },      // Burnt Orange
    { bg: 'rgba(234, 179, 8, 0.15)', border: 'rgba(234, 179, 8, 0.3)' },    // Golden
    { bg: 'rgba(161, 98, 7, 0.15)', border: 'rgba(161, 98, 7, 0.3)' },      // Bronze
    { bg: 'rgba(120, 113, 108, 0.15)', border: 'rgba(120, 113, 108, 0.3)' }, // Warm Gray
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

// Add these helper functions before the Timetable component
const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const checkTimeOverlap = (time1Start: string, time1End: string, time2Start: string, time2End: string): boolean => {
  const start1 = parseTime(time1Start);
  const end1 = parseTime(time1End);
  const start2 = parseTime(time2Start);
  const end2 = parseTime(time2End);

  return (start1 < end2 && end1 > start2);
};

const hasTimeConflict = (
  newSession: { day: string; time: string },
  existingOccurrences: { [key: string]: ITimetableOccurrence[] },
): boolean => {
  const [newStartTime, newEndTime] = newSession.time.split(' - ');
  const dayOccurrences = existingOccurrences[newSession.day] || [];

  return dayOccurrences.some(occurrence => {
    const [existingStartTime, existingEndTime] = occurrence.time.split(' - ');
    return checkTimeOverlap(newStartTime, newEndTime, existingStartTime, existingEndTime);
  });
};

// Add WarningModal interface before the Timetable component
interface WarningModalProps {
  conflicts: Array<{
    day: string;
    time: string;
  }>;
  onClose: () => void;
}

// Add WarningModal component before the Timetable component
const WarningModal: React.FC<WarningModalProps> = ({ conflicts, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300); // Match this with CSS animation duration
  };

  return (
    <div className={`modal-overlay ${isClosing ? 'modal-closing' : ''}`}>
      <div className={`warning-modal ${isClosing ? 'warning-modal-closing' : ''}`}>
        <div className="warning-header">
          <FaExclamationTriangle className="warning-icon" />
          <h3 className="warning-title">Time Conflict Detected</h3>
        </div>
        <div className="warning-content">
          <p>Unable to add this occurrence due to time conflicts on the following day and time:</p>
          <div className="conflict-days">
            {conflicts.map((conflict, index) => (
              <div key={index}>
                {conflict.day} : {conflict.time}
              </div>
            ))}
          </div>
          <p>Please choose a different occurrence or remove conflicting courses first.</p>
        </div>
        <div className="warning-actions">
          <button className="warning-button primary" onClick={handleClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};

// Add ConfirmDialog interface before the Timetable component
interface ConfirmDialogProps {
  courseId: string;
  courseName: string;
  onConfirm: () => void;
  onClose: () => void;
}

// Add ConfirmDialog component before the Timetable component
const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ courseId, courseName, onConfirm, onClose }) => {
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(onClose, 300);
  };

  const handleConfirm = () => {
    setIsClosing(true);
    setTimeout(() => {
      onConfirm();
      onClose();
    }, 300);
  };

  return (
    <div className={`confirm-dialog-overlay ${isClosing ? 'dialog-closing' : ''}`}>
      <div className={`confirm-dialog ${isClosing ? 'dialog-closing' : ''}`}>
        <div className="confirm-dialog-header">
          <h3 className="confirm-dialog-title">Remove Course</h3>
        </div>
        <div className="confirm-dialog-content">
          <p>Are you sure you want to remove {courseId}: {courseName}?</p>
          <p>This will remove all occurrences of this course from your timetable.</p>
        </div>
        <div className="confirm-dialog-actions">
          <button className="confirm-dialog-button cancel" onClick={handleClose}>
            Cancel
          </button>
          <button className="confirm-dialog-button confirm" onClick={handleConfirm}>
            Remove
          </button>
        </div>
      </div>
    </div>
  );
};

interface TimetableProps {
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Timetable = ({ setIsExpanded }: TimetableProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Course[]>([]);
  const [selectedCourses, setSelectedCourses] = useState<Course[]>(() => {
    const saved = localStorage.getItem('selectedCourses');
    return saved ? JSON.parse(saved) : [];
  });
  const [expandedCourses, setExpandedCourses] = useState<string[]>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [timetableOccurrences, setTimetableOccurrences] = useState<TimetableOccurrences>(() => {
    const saved = localStorage.getItem('timetableOccurrences');
    return saved ? JSON.parse(saved) : {};
  });
  const [addedOccurrences, setAddedOccurrences] = useState<{
    [courseId: string]: string | null;
  }>(() => {
    const saved = localStorage.getItem('addedOccurrences');
    return saved ? JSON.parse(saved) : {};
  });
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const timetableRef = useRef<HTMLDivElement>(null);
  const [courseColors, setCourseColors] = useState<{[courseId: string]: {bg: string, border: string}}>({});
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [conflicts, setConflicts] = useState<Array<{ day: string; time: string }>>([]);
  const [courseToRemove, setCourseToRemove] = useState<Course | null>(null);

  // Load courses from JSON file
  useEffect(() => {
    let isMounted = true;
    let controller = new AbortController();

    const fetchCourses = async () => {
      try {
        setIsLoading(true);
        const courses = await loadCoursesFromJson();
        if (isMounted) {
          setAvailableCourses(courses);
        }
      } catch (error) {
        console.error('Error loading courses:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchCourses();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, []);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const timeSlots = Array.from({ length: 13 }, (_, i) => {
    const hour = i + 8;
    return `${hour < 10 ? '0' : ''}${hour}:00`;
  });

  const calculateTimePosition = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    const hourPixels = (hours - 8) * 140; // Each hour is 140px
    const minutePixels = (minutes / 60) * 140; // Convert minutes to pixels proportionally
    return hourPixels + minutePixels;
  };
  
  const calculateBlockHeight = (startTime: string, endTime: string): number => {
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    
    const startTotalMinutes = startHours * 60 + startMinutes;
    const endTotalMinutes = endHours * 60 + endMinutes;
    
    return ((endTotalMinutes - startTotalMinutes) / 60) * 140; // Convert duration to pixels (140px per hour)
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

  const handleAddOccurrence = (courseId: string, occurrence: CourseOccurrence, occurrenceIndex: number, courseName: string) => {
    // Check for conflicts before adding
    let hasConflicts = false;
    const conflictInfo: Array<{ day: string; time: string }> = [];

    // Check each session in the occurrence for conflicts
    occurrence.sessions.forEach(session => {
      const standardizedDay = session.day.toUpperCase();
      if (hasTimeConflict(
        { day: standardizedDay, time: session.time },
        timetableOccurrences
      )) {
        hasConflicts = true;
        // Find the conflicting sessions
        const dayOccurrences = timetableOccurrences[standardizedDay] || [];
        const [newStartTime, newEndTime] = session.time.split(' - ');
        
        dayOccurrences.forEach(existingOcc => {
          const [existingStartTime, existingEndTime] = existingOcc.time.split(' - ');
          if (checkTimeOverlap(newStartTime, newEndTime, existingStartTime, existingEndTime)) {
            conflictInfo.push({
              day: session.day,
              time: existingOcc.time
            });
          }
        });
      }
    });

    if (hasConflicts) {
      // Show warning modal with conflict details
      setConflicts(conflictInfo);
      setShowWarning(true);
      return;
    }

    // If no conflicts, proceed with adding the occurrence
    occurrence.sessions.forEach(session => {
      const standardizedDay = session.day.toUpperCase();
      
      const newOccurrence: ITimetableOccurrence = {
        courseId,
        courseName,
        courseCode: courseId,
        occurrenceNumber: occurrence.occurrenceNumber,
        time: session.time,
        venue: session.venue,
        lecturer: session.lecturer,
        day: standardizedDay,
        activityType: session.activityType
      };

      setTimetableOccurrences(prev => {
        const dayOccurrences = [...(prev[standardizedDay] || [])];
        dayOccurrences.push(newOccurrence);
        
        return {
          ...prev,
          [standardizedDay]: dayOccurrences.sort((a, b) => {
            const timeA = a.time.split(' - ')[0];
            const timeB = b.time.split(' - ')[0];
            const timeCompare = timeA.localeCompare(timeB);
            if (timeCompare !== 0) return timeCompare;
            return a.courseId.localeCompare(b.courseId);
          })
        };
      });
    });

    // Track added occurrence
    setAddedOccurrences(prev => ({
      ...prev,
      [courseId]: occurrenceIndex.toString()
    }));
  };

  const handleRemoveOccurrence = (courseId: string, occurrenceNumber: string) => {
    // Remove all sessions for this occurrence from the timetable
    setTimetableOccurrences(prev => {
      const newTimetable = { ...prev };
      
      // Go through each day
      Object.keys(newTimetable).forEach(day => {
        // Filter out occurrences that match the courseId AND occurrenceNumber
        newTimetable[day] = newTimetable[day].filter(
          occ => !(occ.courseId === courseId && occ.occurrenceNumber === occurrenceNumber)
        );
      });
      
      return newTimetable;
    });

    // Reset the added occurrence state to allow re-adding
    setAddedOccurrences(prev => {
      const newAddedOccurrences = { ...prev };
      delete newAddedOccurrences[courseId];
      return newAddedOccurrences;
    });
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
          (occ: ITimetableOccurrence) => occ.courseId !== courseId
        );
      });
      return newOccurrences;
    });
    
    // Reset the addedOccurrences state for this course
    setAddedOccurrences(prev => {
      const newAddedOccurrences = { ...prev };
      delete newAddedOccurrences[courseId];
      return newAddedOccurrences;
    });
  };

  const handleReset = () => {
    setTimetableOccurrences({});
    setAddedOccurrences({});
    setSelectedCourses([]);
    localStorage.removeItem('timetableOccurrences');
    localStorage.removeItem('addedOccurrences');
    localStorage.removeItem('selectedCourses');
  };
  
  const handleSaveAsPng = () => {
    if (timetableRef.current) {
      // Create a wrapper div with wider dimensions
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.left = '-9999px';
      wrapper.style.width = '1920px'; // Increased width
      wrapper.style.height = '1080';
      wrapper.style.backgroundColor = '#030712';
      wrapper.style.padding = '40px';
      wrapper.style.boxSizing = 'border-box';
      
      // Clone the timetable
      const clone = timetableRef.current.cloneNode(true) as HTMLElement;
      clone.style.height = 'auto';
      clone.style.overflow = 'visible';
      clone.style.width = '100%';
      clone.style.maxWidth = '2000px'; // Increased max-width
      clone.style.margin = '0 auto';
      clone.style.transform = 'scale(0.8)'; // Scale down to fit more content
      clone.style.transformOrigin = 'top center';
      
      // Add to wrapper
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);
      
      // Capture the image with adjusted dimensions
      html2canvas(wrapper, {
        backgroundColor: '#030712',
        scale: 5, // Adjusted scale for better quality
        useCORS: true,
        allowTaint: true,
        logging: false,
        width: 2000, // Match wrapper width
        height: wrapper.offsetHeight * 0.8 // Reduce height proportion
      }).then(canvas => {
        const image = canvas.toDataURL('image/png', 1.0);
        const link = document.createElement('a');
        link.href = image;
        link.download = 'timetable.png';
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

  // Add useEffect hooks for persistence
  useEffect(() => {
    localStorage.setItem('selectedCourses', JSON.stringify(selectedCourses));
  }, [selectedCourses]);

  useEffect(() => {
    localStorage.setItem('timetableOccurrences', JSON.stringify(timetableOccurrences));
  }, [timetableOccurrences]);

  useEffect(() => {
    localStorage.setItem('addedOccurrences', JSON.stringify(addedOccurrences));
  }, [addedOccurrences]);

  // Add initiateRemoveCourse function
  const initiateRemoveCourse = (course: Course, e: React.MouseEvent) => {
    e.stopPropagation();
    setCourseToRemove(course);
  };

  return (
    <div className="timetable-container">
      {/* Add warning modal */}
      {showWarning && (
        <WarningModal
          conflicts={conflicts}
          onClose={() => setShowWarning(false)}
        />
      )}
      
      {/* Add confirmation dialog */}
      {courseToRemove && (
        <ConfirmDialog
          courseId={courseToRemove.id}
          courseName={courseToRemove.name}
          onConfirm={() => handleRemoveCourse(courseToRemove.id)}
          onClose={() => setCourseToRemove(null)}
        />
      )}
      
      <div className="timetable-header">
        <h1 className="title-container">
          <MenuButton onClick={() => setIsExpanded(true)} />
          <DecryptedText 
            text="Academic Timetable"
            speed={50}
            sequential={true}
            className="decrypted"
            encryptedClassName="encrypted"
            animateOn="hover"
          />
          <span className="draft-tag">Semester 2 2024/2025</span>
        </h1>
        <div className="header-actions">
          <button className="action-button reset-button" onClick={handleReset}>
            <FaUndo /> Reset
          </button>
          <button className="action-button save-button" onClick={handleSaveAsPng}>
            <FaDownload /> Save as PNG
          </button>
          <ModeToggle />
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
                        onClick={(e) => initiateRemoveCourse(course, e)}
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
                      <div key={occurrence.occurrenceNumber} className="occurrence-item">
                        <div className="occurrence-number">
                          <div className="tag-group">
                            <span>Occurrence {occurrence.occurrenceNumber}</span>
                          </div>
                          {addedOccurrences[course.id] === index.toString() ? (
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
                                handleAddOccurrence(course.id, occurrence, index, course.name);
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
                                  {session.activityType && (
                                    <span className="activity-type">{session.activityType}</span>
                                  )}
                                </>
                              ) : (
                                <span className="incomplete-details">{session.day || 'No day and time specified'}</span>
                              )}
                            </div>
                            <div className="occurrence-details">
                              <div className="detail-row">
                                <FaMapMarkerAlt size={12} style={{ marginRight: '4px' }} />
                                <span className="detail-text">{session.venue || 'No venue specified'}</span>
                              </div>
                              <div className="detail-row">
                                <FaUser size={12} style={{ marginRight: '4px' }} />
                                <span className="detail-text" style={{ 
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  display: 'block'
                                }}>{session.lecturer}</span>
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
          <div className="grid-wrapper">
            <div className="grid-scroll-container">
              <div className="days-header">
                <div className="day-header"></div>
                {days.map((day) => (
                  <div key={day} className="day-header">{day}</div>
                ))}
              </div>

              <div className="time-column">
                {timeSlots.map((time) => (
                  <div key={time} className="time-label">{time}</div>
                ))}
              </div>

              <div className="grid-lines">
                <div className="horizontal-lines">
                  {Array.from({ length: 13 }, (_, i) => (
                    <div key={i} className="horizontal-line"></div>
                  ))}
                </div>
                <div className="vertical-lines">
                  {Array.from({ length: 5 }, (_, i) => (
                    <div key={i} className="vertical-line"></div>
                  ))}
                </div>
              </div>

              <div className="grid-content">
                {days.map((day) => (
                  <div key={day} className="day-column">
                    {timetableOccurrences[day.toUpperCase()]?.map((occurrence, index) => {
                      const [startTime, endTime] = occurrence.time.split(' - ');
                      const topPosition = calculateTimePosition(startTime);
                      const blockHeight = calculateBlockHeight(startTime, endTime);

                      return (
                        <div 
                          key={`${occurrence.courseId}-${occurrence.occurrenceNumber}-${index}`} 
                          className="course-block"
                          style={{
                            top: `${topPosition}px`,
                            height: `${blockHeight}px`,
                            backgroundColor: courseColors[occurrence.courseId]?.bg || 'rgba(20, 184, 166, 0.15)',
                            borderColor: courseColors[occurrence.courseId]?.border || 'rgba(20, 184, 166, 0.3)'
                          }}
                        >
                          <div className="course-block-content">
                            <div className="course-header-row">
                              <span className="course-code">{occurrence.courseCode}</span>
                              <div className="tags-container">
                                <span className="occ-tag">OCC {occurrence.occurrenceNumber}</span>
                                {occurrence.activityType && (
                                  <span className="activity-type" style={{ marginLeft: '4px' }}>{occurrence.activityType}</span>
                                )}
                              </div>
                            </div>
                            <div className="course-name">{occurrence.courseName}</div>
                            <div className="course-details">
                              <div className="detail-row">
                                <FaMapMarkerAlt className="detail-icon" />
                                <span className="detail-text">{occurrence.venue}</span>
                              </div>
                              <div className="detail-row">
                                <FaUser className="detail-icon" />
                                <span className="detail-text">
                                  {occurrence.lecturer}
                                </span>
                              </div>
                            </div>
                          </div>
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
    </div>
  );
};