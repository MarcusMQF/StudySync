import * as XLSX from 'xlsx';
import { Course, CourseOccurrence, CourseSession } from '../types/course';

export const parseExcelFile = async (file: File): Promise<Course[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const rawData = XLSX.utils.sheet_to_json(worksheet);
        
        // Process the data into our Course format
        const courses: { [key: string]: Course } = {};
        
        rawData.forEach((row: any) => {
          // Map Excel columns to our data structure
          const courseId = row['Module Code'];
          const courseName = row['Module Name'];
          const occurrenceNumber = parseInt(row['Occurrence'] || '1');
          
          // Parse day and time from the "Day / Start Duration" field
          const dayTimeInfo = row['Day / Start Duration'];
          let day = '';
          let time = '';
          
          if (dayTimeInfo) {
            const lines = dayTimeInfo.split('\n');
            if (lines.length >= 1) {
              // Extract day and time
              const dayTimeParts = lines[0].split(' ');
              if (dayTimeParts.length >= 1) {
                day = dayTimeParts[0].trim();
                
                // Extract time if available
                const timeMatch = dayTimeInfo.match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
                if (timeMatch) {
                  time = `${timeMatch[1]} - ${timeMatch[2]}`;
                }
              }
            }
          }
          
          const venue = row['Room'] || '';
          const lecturer = row['Tutor'] || '';
          const activityType = row['Activity'] || ''; // LEC, TUT, etc.
          
          // Create or update the course
          if (!courses[courseId]) {
            courses[courseId] = {
              id: courseId,
              name: courseName,
              occurrences: []
            };
          }
          
          // Check if this occurrence already exists (same occurrence number)
          const existingOccIndex = courses[courseId].occurrences.findIndex(
            occ => occ.occurrenceNumber === occurrenceNumber &&
            occ.sessions.some(session => session.day === day && session.time === time)
          );
          
          if (existingOccIndex >= 0) {
            // Update existing occurrence by adding a new session
            const existingOcc = courses[courseId].occurrences[existingOccIndex];
            const newSession: CourseSession = {
              day,
              time,
              venue,
              lecturer,
              activityType
            };
            existingOcc.sessions.push(newSession);
          } else {
            // Add new occurrence with initial session
            const newOccurrence: CourseOccurrence = {
              occurrenceNumber,
              sessions: [{
                day,
                time,
                venue,
                lecturer,
                activityType
              }]
            };
            courses[courseId].occurrences.push(newOccurrence);
          }
        });
        
        resolve(Object.values(courses));
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

// Function to parse Excel data from a static file
export const parseStaticExcelData = (data: ArrayBuffer): Course[] => {
  try {
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    
    // Process the data into our Course format
    const courses: { [key: string]: Course } = {};
    
    rawData.forEach((row: any) => {
      // Map Excel columns to our data structure
      const courseId = row['Module Code'];
      const courseName = row['Module Name'];
      const occurrenceNumber = parseInt(row['Occurrence'] || '1');
      
      // Parse day and time from the "Day / Start Duration" field
      const dayTimeInfo = row['Day / Start Duration'];
      let day = '';
      let time = '';
      
      if (dayTimeInfo) {
        // More robust pattern matching for day and time
        const dayTimePattern = /^([A-Za-z]+)\s+(\d+:\d+)\s*-\s*(\d+:\d+)/i;
        const match = dayTimeInfo.match(dayTimePattern);
        if (match) {
          day = match[1].trim();
          time = `${match[2]} - ${match[3]}`;
        } else {
          // Fallback to previous approach
          const dayMatch = dayTimeInfo.match(/^([A-Za-z]+)/);
          if (dayMatch) {
            day = dayMatch[1].trim();
          }
          
          const timeMatch = dayTimeInfo.match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
          if (timeMatch) {
            time = `${timeMatch[1]} - ${timeMatch[2]}`;
          }
        }
      }
      
      const venue = row['Room'] || '';
      const lecturer = row['Tutor'] || '';
      const activityType = row['Activity'] || ''; // LEC, TUT, etc.
      
      // Skip rows with missing essential data
      if (!courseId || !courseName) {
        return;
      }
      
      // Create or update the course
      if (!courses[courseId]) {
        courses[courseId] = {
          id: courseId,
          name: courseName,
          occurrences: []
        };
      }
      
      // Check if this occurrence already exists (same occurrence number, day and time)
      const existingOccIndex = courses[courseId].occurrences.findIndex(
        occ => occ.occurrenceNumber === occurrenceNumber &&
        occ.sessions.some(session => session.day === day && session.time === time)
      );
      
      if (existingOccIndex >= 0) {
        // Update existing occurrence by adding a new session
        const existingOcc = courses[courseId].occurrences[existingOccIndex];
        const newSession: CourseSession = {
          day,
          time,
          venue,
          lecturer,
          activityType
        };
        existingOcc.sessions.push(newSession);
      } else {
        // Add new occurrence with initial session
        const newOccurrence: CourseOccurrence = {
          occurrenceNumber,
          sessions: [{
            day,
            time,
            venue,
            lecturer,
            activityType
          }]
        };
        courses[courseId].occurrences.push(newOccurrence);
      }
    });
    
    // Sort occurrences by occurrence number for each course
    Object.values(courses).forEach(course => {
      course.occurrences.sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
    });
    
    return Object.values(courses);
  } catch (error) {
    console.error("Error parsing Excel data:", error);
    return [];
  }
};

// Function to load the Excel data from a static file
export const loadExcelData = async (): Promise<Course[]> => {
  try {
    console.log("Attempting to load Excel file...");
    
    // Use the improved loadCoursesFromExcel function
    const courses = await loadCoursesFromExcel();
    
    // If no courses were parsed, return sample data
    if (courses.length === 0) {
      console.warn("No courses found in Excel file, using sample data");
      return getSampleCourses();
    }
    
    console.log(`Loaded ${courses.length} courses from Excel file`);
    return courses;
  } catch (error) {
    console.error("Error loading Excel data:", error);
    console.warn("Using sample data as fallback due to error");
    return getSampleCourses();
  }
};

// Sample courses for testing and fallback
function getSampleCourses(): Course[] {
  return [
    {
      id: "GBA0021",
      name: "APPRECIATING LITERATURE",
      occurrences: [
        {
          occurrenceNumber: 1,
          sessions: [
            {
              day: "Monday",
              time: "10:00 - 12:00",
              venue: "Room A101",
              lecturer: "Dr. Smith",
              activityType: "LEC"
            },
            {
              day: "Wednesday",
              time: "14:00 - 16:00",
              venue: "Room B202",
              lecturer: "Dr. Smith",
              activityType: "TUT"
            }
          ]
        }
      ]
    },
    {
      id: "GBA0022",
      name: "INTRODUCTION TO PHILOSOPHY",
      occurrences: [
        {
          occurrenceNumber: 1,
          sessions: [
            {
              day: "Tuesday",
              time: "09:00 - 11:00",
              venue: "Room C303",
              lecturer: "Prof. Johnson",
              activityType: "LEC"
            }
          ]
        }
      ]
    },
    {
      id: "CS1101",
      name: "INTRODUCTION TO PROGRAMMING",
      occurrences: [
        {
          occurrenceNumber: 1,
          sessions: [
            {
              day: "Monday",
              time: "14:00 - 16:00",
              venue: "Lab 1",
              lecturer: "Dr. Lee",
              activityType: "LEC"
            },
            {
              day: "Thursday",
              time: "10:00 - 12:00",
              venue: "Lab 2",
              lecturer: "Dr. Lee",
              activityType: "LAB"
            }
          ]
        }
      ]
    },
    {
      id: "MATH2001",
      name: "CALCULUS",
      occurrences: [
        {
          occurrenceNumber: 1,
          sessions: [
            {
              day: "Tuesday",
              time: "13:00 - 15:00",
              venue: "Room D404",
              lecturer: "Prof. Williams",
              activityType: "LEC"
            },
            {
              day: "Friday",
              time: "09:00 - 11:00",
              venue: "Room D405",
              lecturer: "Dr. Chen",
              activityType: "TUT"
            }
          ]
        }
      ]
    }
  ];
}

export const loadCoursesFromExcel = async (): Promise<Course[]> => {
  try {
    const response = await fetch('/STU_MVT4.xls');
    const data = await response.arrayBuffer();
    
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    const courses: { [key: string]: Course } = {};
    
    rawData.forEach((row: any) => {
      // Skip rows without essential data
      if (!row['Module Code'] || !row['Module Name']) {
        return;
      }
      
      const courseId = row['Module Code'];
      const courseName = row['Module Name'];
      const occurrenceNumber = parseInt(row['Occurrence'] || '1');
      const activityType = row['Activity'] || '';
      
      // Parse day and time
      const dayTimeInfo = row['Day/Start Duration'];
      let day = '';
      let time = '';
      
      if (dayTimeInfo && dayTimeInfo !== '- 0') {
        // Extract day and time from format like "MONDAY 08:00 - 10:00 (02:00)"
        const parts = dayTimeInfo.toString().split(' ');
        if (parts.length >= 3) {
          day = parts[0].trim();
          // Find the time part using regex
          const timeMatch = dayTimeInfo.toString().match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
          if (timeMatch) {
            time = `${timeMatch[1]} - ${timeMatch[2]}`;
          }
        }
      }
      
      // Handle multiple lecturers
      const lecturers = row['Tutor'] ? 
        row['Tutor'].toString().split('\n').map((l: string) => l.trim()).filter(Boolean) : 
        [''];
      
      const venue = row['Room'] || '';
      
      // Create course if it doesn't exist
      if (!courses[courseId]) {
        courses[courseId] = {
          id: courseId,
          name: courseName,
          occurrences: []
        };
      }
      
      // Find or create occurrence
      let existingOcc = courses[courseId].occurrences.find(
        occ => occ.occurrenceNumber === occurrenceNumber
      );
      
      if (!existingOcc) {
        existingOcc = {
          occurrenceNumber,
          sessions: []
        };
        courses[courseId].occurrences.push(existingOcc);
      }
      
      // Only add sessions if we have valid day and time
      if (day && time) {
        // Create a session for each lecturer
        lecturers.forEach((lecturer: string) => {
          // Check if this exact session already exists
          const sessionExists = existingOcc!.sessions.some(
            session => 
              session.day === day && 
              session.time === time && 
              session.venue === venue && 
              session.lecturer === lecturer &&
              session.activityType === activityType
          );
          
          if (!sessionExists) {
            existingOcc!.sessions.push({
              day,
              time,
              venue,
              lecturer,
              activityType
            });
          }
        });
      }
    });
    
    // Sort occurrences by occurrence number
    Object.values(courses).forEach(course => {
      course.occurrences.sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
      // Also sort sessions by day and time for consistent display
      course.occurrences.forEach(occ => {
        occ.sessions.sort((a, b) => {
          const dayCompare = a.day.localeCompare(b.day);
          if (dayCompare !== 0) return dayCompare;
          return a.time.localeCompare(b.time);
        });
      });
    });
    
    const coursesArray = Object.values(courses);
    console.log('Parsed courses:', coursesArray);
    return coursesArray;
  } catch (error) {
    console.error("Error loading courses from Excel:", error);
    return [];
  }
}; 