import * as XLSX from 'xlsx';
import { Course, CourseOccurrence } from '../types/course';

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
            occ => occ.occurrenceNumber === occurrenceNumber && occ.day === day && occ.time === time
          );
          
          if (existingOccIndex >= 0) {
            // Update existing occurrence with additional info (e.g., LEC + TUT)
            const existingOcc = courses[courseId].occurrences[existingOccIndex];
            courses[courseId].occurrences[existingOccIndex] = {
              ...existingOcc,
              venue: venue ? (existingOcc.venue ? `${existingOcc.venue} / ${venue}` : venue) : existingOcc.venue,
              lecturer: lecturer ? (existingOcc.lecturer ? `${existingOcc.lecturer} / ${lecturer}` : lecturer) : existingOcc.lecturer,
              activityType: activityType ? (existingOcc.activityType ? `${existingOcc.activityType} & ${activityType}` : activityType) : existingOcc.activityType
            };
          } else {
            // Add new occurrence
            const newOccurrence: CourseOccurrence = {
              day,
              time,
              venue,
              lecturer,
              activityType,
              occurrenceNumber
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
        occ => occ.occurrenceNumber === occurrenceNumber && occ.day === day && occ.time === time
      );
      
      if (existingOccIndex >= 0) {
        // Update existing occurrence with additional info (e.g., LEC + TUT)
        const existingOcc = courses[courseId].occurrences[existingOccIndex];
        courses[courseId].occurrences[existingOccIndex] = {
          ...existingOcc,
          venue: venue ? (existingOcc.venue ? `${existingOcc.venue} / ${venue}` : venue) : existingOcc.venue,
          lecturer: lecturer ? (existingOcc.lecturer ? `${existingOcc.lecturer} / ${lecturer}` : lecturer) : existingOcc.lecturer,
          activityType: activityType ? (existingOcc.activityType ? `${existingOcc.activityType} + ${activityType}` : activityType) : existingOcc.activityType
        };
      } else {
        // Add new occurrence
        const newOccurrence: CourseOccurrence = {
          day,
          time,
          venue,
          lecturer,
          activityType,
          occurrenceNumber
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
          day: "Monday",
          time: "10:00 - 12:00",
          venue: "Room A101",
          lecturer: "Dr. Smith",
          activityType: "LEC",
          occurrenceNumber: 1
        },
        {
          day: "Wednesday",
          time: "14:00 - 16:00",
          venue: "Room B202",
          lecturer: "Dr. Smith",
          activityType: "TUT",
          occurrenceNumber: 1
        }
      ]
    },
    {
      id: "GBA0022",
      name: "INTRODUCTION TO PHILOSOPHY",
      occurrences: [
        {
          day: "Tuesday",
          time: "09:00 - 11:00",
          venue: "Room C303",
          lecturer: "Prof. Johnson",
          activityType: "LEC",
          occurrenceNumber: 1
        }
      ]
    },
    {
      id: "CS1101",
      name: "INTRODUCTION TO PROGRAMMING",
      occurrences: [
        {
          day: "Monday",
          time: "14:00 - 16:00",
          venue: "Lab 1",
          lecturer: "Dr. Lee",
          activityType: "LEC",
          occurrenceNumber: 1
        },
        {
          day: "Thursday",
          time: "10:00 - 12:00",
          venue: "Lab 2",
          lecturer: "Dr. Lee",
          activityType: "LAB",
          occurrenceNumber: 1
        }
      ]
    },
    {
      id: "MATH2001",
      name: "CALCULUS",
      occurrences: [
        {
          day: "Tuesday",
          time: "13:00 - 15:00",
          venue: "Room D404",
          lecturer: "Prof. Williams",
          activityType: "LEC",
          occurrenceNumber: 1
        },
        {
          day: "Friday",
          time: "09:00 - 11:00",
          venue: "Room D405",
          lecturer: "Dr. Chen",
          activityType: "TUT",
          occurrenceNumber: 1
        }
      ]
    }
  ];
} 