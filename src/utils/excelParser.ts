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
          const occurrenceNumber = (row['Occurrence'] || '1').toString();
          
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
      const occurrenceNumber = (row['Occurrence'] || '1').toString();
      
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
      course.occurrences.sort((a, b) => a.occurrenceNumber.localeCompare(b.occurrenceNumber));
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
          occurrenceNumber: "1",
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
          occurrenceNumber: "1",
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
          occurrenceNumber: "1",
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
          occurrenceNumber: "1",
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
    console.log("Starting to load Excel file...");
    const response = await fetch('./STU_MVT4.xls');
    console.log("Fetch response status:", response.status);
    
    if (!response.ok) {
      console.error("Failed to fetch Excel file:", response.statusText);
      throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
    }
    
    const data = await response.arrayBuffer();
    console.log("Excel file loaded, size:", data.byteLength, "bytes");
    
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rawData = XLSX.utils.sheet_to_json(worksheet);
    console.log("Raw data rows:", rawData.length);

    // Log raw data for GBT0002
    console.log("Raw data for GBT0002:", rawData.filter((row: any) => 
      row['Module Code']?.toString().trim() === 'GBT0002'
    ));

    // First pass: Group all data by course ID
    const courseMap = new Map<string, {
      name: string;
      occurrences: Map<string, {
        sessions: {
          day: string;
          time: string;
          venue: string;
          lecturers: Set<string>;
          activityType: string;
        }[];
      }>;
    }>();

    // Process each row
    rawData.forEach((row: any) => {
      if (!row['Module Code'] || !row['Module Name']) return;
      
      const courseId = row['Module Code'].toString().trim();
      const courseName = row['Module Name'].toString().trim();
      const occurrenceStr = (row['Occurrence'] || '').toString().trim() || '1';
      const activityType = row['Activity']?.toString().trim() || '';
      
      // Handle venue
      let venue = row['Room']?.toString().trim() || '';
      if (activityType.toUpperCase().includes('ONLINE') || activityType.toUpperCase() === 'ONL') {
        venue = 'Online';
      }
      
      // Parse day and time
      const dayTimeInfo = row['Day / Start Duration '] || row['Day/Start Duration'] || row['Day / Start Duration'] || row['Day/Start'] || row['Day / Start'];
      let day = '';
      let time = '';
      
      if (dayTimeInfo && dayTimeInfo !== '- ()') {
        const dayTimeStr = dayTimeInfo.toString();
        
        // Try different patterns to match day and time
        const patterns = [
          /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
          /^(MON|TUE|WED|THU|FRI|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i,
          {
            day: /(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|MON|TUE|WED|THU|FRI)/i,
            time: /(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/
          }
        ];

        // Try each pattern until we find a match
        for (const pattern of patterns) {
          if (pattern instanceof RegExp) {
            const match = dayTimeStr.match(pattern);
            if (match) {
              day = match[1].toUpperCase();
              day = day.replace(/^MON$/, 'MONDAY')
                      .replace(/^TUE$/, 'TUESDAY')
                      .replace(/^WED$/, 'WEDNESDAY')
                      .replace(/^THU$/, 'THURSDAY')
                      .replace(/^FRI$/, 'FRIDAY');
              time = `${match[2]} - ${match[3]}`;
              break;
            }
          } else {
            const dayMatch = dayTimeStr.match(pattern.day);
            const timeMatch = dayTimeStr.match(pattern.time);
            if (dayMatch && timeMatch) {
              day = dayMatch[1].toUpperCase();
              day = day.replace(/^MON$/, 'MONDAY')
                      .replace(/^TUE$/, 'TUESDAY')
                      .replace(/^WED$/, 'WEDNESDAY')
                      .replace(/^THU$/, 'THURSDAY')
                      .replace(/^FRI$/, 'FRIDAY');
              time = `${timeMatch[1]} - ${timeMatch[2]}`;
              break;
            }
          }
        }
      }

      // Handle lecturers - split by both comma and newline
      const lecturers = new Set<string>(
        (row['Tutor'] || '')
          .toString()
          .split(/[,\n]/)
          .map((l: string) => l.trim())
          .filter((l: string): l is string => Boolean(l && l !== '-'))
      );

      // Get or create course
      if (!courseMap.has(courseId)) {
        courseMap.set(courseId, {
          name: courseName,
          occurrences: new Map()
        });
      }
      const course = courseMap.get(courseId)!;

      // Get or create occurrence
      if (!course.occurrences.has(occurrenceStr)) {
        course.occurrences.set(occurrenceStr, {
          sessions: []
        });
      }
      const occurrence = course.occurrences.get(occurrenceStr)!;

      // Create session with appropriate information
      occurrence.sessions.push({
        day: day && time ? day : 'No day and time specified',
        time: day && time ? time : '',
        venue,
        lecturers,
        activityType: activityType.toUpperCase()
      });
    });

    // Convert to final format
    const courses: Course[] = Array.from(courseMap.entries()).map(([courseId, courseData]) => ({
      id: courseId,
      name: courseData.name,
      occurrences: Array.from(courseData.occurrences.entries())
        .map(([occNumber, occData]) => ({
          occurrenceNumber: occNumber,
          sessions: occData.sessions
            .map(session => ({
              day: session.day,
              time: session.time,
              venue: session.venue,
              lecturer: Array.from(session.lecturers).join(', '),
              activityType: session.activityType
            }))
            .sort((a, b) => {
              const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
              const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
              if (dayDiff !== 0) return dayDiff;
              return a.time.localeCompare(b.time);
            })
        }))
        .filter(occ => occ.sessions.length > 0)
        .sort((a, b) => a.occurrenceNumber.localeCompare(b.occurrenceNumber))
    }));

    // Before returning courses, log details for GBT0002
    const gbt0002 = courses.find(c => c.id === 'GBT0002');
    if (gbt0002) {
      console.log("GBT0002 details:", {
        name: gbt0002.name,
        occurrences: gbt0002.occurrences.map(occ => ({
          number: occ.occurrenceNumber,
          sessionCount: occ.sessions.length,
          sessions: occ.sessions
        }))
      });
    } else {
      console.log("GBT0002 not found in processed courses");
    }

    console.log("Total unique courses:", courses.length);
    console.log("Sample course occurrences:", 
      courses.length > 0 ? 
        `${courses[0].id} has ${courses[0].occurrences.length} occurrences` : 
        "No courses found"
    );

    if (courses.length === 0) {
      console.warn("No courses were processed, falling back to sample data");
      return getSampleCourses();
    }

    return courses;
  } catch (error) {
    console.error("Error loading courses from Excel:", error);
    console.warn("Using sample data as fallback due to error");
    return getSampleCourses();
  }
};