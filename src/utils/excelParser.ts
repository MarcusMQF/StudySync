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
    
    // Import the Excel file as a static asset
    const response = await fetch('/STU_MVT4.xls');
    
    if (!response.ok) {
      console.error(`Failed to load Excel file: ${response.status} ${response.statusText}`);
      console.warn("Using sample data as fallback");
      return getSampleCourses();
    }
    
    console.log("Excel file loaded successfully, parsing data...");
    const arrayBuffer = await response.arrayBuffer();
    
    // Parse the Excel data using the existing utility
    const courses = parseStaticExcelData(arrayBuffer);
    console.log(`Parsed ${courses.length} courses from Excel file`);
    
    // If no courses were parsed, return sample data
    if (courses.length === 0) {
      console.warn("No courses found in Excel file, using sample data");
      return getSampleCourses();
    }
    
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
    // Fetch the Excel file from the public folder
    const response = await fetch('/STU_MVT4.xls');
    const data = await response.arrayBuffer();
    
    // Parse the Excel file
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    // Find the header row (row with "Module Code")
    let headerRowIndex = -1;
    for (let i = 0; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (row && row.includes("Module Code")) {
        headerRowIndex = i;
        break;
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error("Header row not found in Excel file");
    }
    
    // Get the header row
    const headerRow = rawData[headerRowIndex] as string[];
    
    // Find column indices
    const moduleCodeIndex = headerRow.indexOf("Module Code");
    const moduleNameIndex = headerRow.indexOf("Module Name");
    const occurrenceIndex = headerRow.indexOf("Occurrence");
    const activityIndex = headerRow.indexOf("Activity");
    const dayTimeIndex = headerRow.indexOf("Day / Start Duration");
    const tutorIndex = headerRow.indexOf("Tutor");
    const roomIndex = headerRow.indexOf("Room");
    
    // Process data rows
    const courses: { [key: string]: Course } = {};
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i] as any[];
      if (!row || !row[moduleCodeIndex]) continue;
      
      const courseId = row[moduleCodeIndex];
      const courseName = row[moduleNameIndex];
      const occurrenceNumber = parseInt(row[occurrenceIndex] || '1');
      const activityType = row[activityIndex] || '';
      
      // Parse day and time
      let day = '';
      let time = '';
      const dayTimeInfo = row[dayTimeIndex];
      
      if (dayTimeInfo) {
        // Extract day
        const dayMatch = dayTimeInfo.toString().match(/^([A-Za-z]+)/);
        if (dayMatch) {
          day = dayMatch[1].trim();
        }
        
        // Extract time (ignoring the duration in parentheses)
        const timeMatch = dayTimeInfo.toString().match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
        if (timeMatch) {
          time = `${timeMatch[1]} - ${timeMatch[2]}`;
        }
      }
      
      const lecturer = row[tutorIndex] || '';
      const venue = row[roomIndex] || '';
      
      // Skip rows with missing essential data
      if (!courseId || !courseName || !day || !time) {
        continue;
      }
      
      // Create or update the course
      if (!courses[courseId]) {
        courses[courseId] = {
          id: courseId,
          name: courseName,
          occurrences: []
        };
      }
      
      // Find or create the occurrence
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
    }
    
    // Sort occurrences by occurrence number for each course
    Object.values(courses).forEach(course => {
      course.occurrences.sort((a, b) => a.occurrenceNumber - b.occurrenceNumber);
    });
    
    return Object.values(courses);
  } catch (error) {
    console.error("Error loading courses from Excel:", error);
    return [];
  }
}; 