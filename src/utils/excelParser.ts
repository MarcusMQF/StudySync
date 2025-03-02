import * as XLSX from 'xlsx';
import { Course, CourseSession } from '../types/course';

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
          const courseId = row['Module Code']?.toString().trim();
          const courseName = row['Module Name']?.toString().trim();
          const occurrenceNumber = row['Occurrence']?.toString().trim() || '1';
          const dayTimeInfo = row['Day / Start Duration ']?.toString().trim();
          const activityType = row['Activity']?.toString().trim() || 'LEC';
          
          // Skip invalid rows
          if (!courseId || !courseName || !dayTimeInfo) {
            return;
          }

          // Parse day and time
          const dayMatch = dayTimeInfo.match(/^([A-Za-z]+)/);
          const timeMatch = dayTimeInfo.match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
          
          if (!dayMatch || !timeMatch) {
            return;
          }

          const day = dayMatch[1].toUpperCase();
          const time = `${timeMatch[1]} - ${timeMatch[2]}`;
          
          // Create course if it doesn't exist
          if (!courses[courseId]) {
            courses[courseId] = {
              id: courseId,
              name: courseName,
              occurrences: []
            };
          }

          // Find or create occurrence
          let occurrence = courses[courseId].occurrences.find(
            occ => occ.occurrenceNumber === occurrenceNumber
          );

          if (!occurrence) {
            occurrence = {
              occurrenceNumber,
              activityType: activityType.toUpperCase(),
              sessions: []
            };
            courses[courseId].occurrences.push(occurrence);
          }

          // Handle venue - for ONL activity type, all sessions in this occurrence should be Online
          let venue = occurrence.activityType === 'ONL' ? 'Online' : (row['Room']?.toString().trim() || '');
          
          // Create new session
          const session: CourseSession = {
            day,
            time,
            venue,
            lecturer: row['Tutor']?.toString().trim() || ''
          };

          // Check if this exact session already exists
          const sessionExists = occurrence.sessions.some(
            existingSession =>
              existingSession.day === session.day &&
              existingSession.time === session.time &&
              existingSession.venue === session.venue &&
              existingSession.lecturer === session.lecturer
          );

          // Only add if this exact session doesn't exist
          if (!sessionExists) {
            occurrence.sessions.push(session);
          }
        });

        // Sort occurrences and sessions
        Object.values(courses).forEach(course => {
          // Sort occurrences by number
          course.occurrences.sort((a, b) => 
            parseInt(a.occurrenceNumber) - parseInt(b.occurrenceNumber)
          );

          // Sort sessions in each occurrence by day and time
          course.occurrences.forEach(occurrence => {
            occurrence.sessions.sort((a, b) => {
              const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
              const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
              if (dayDiff !== 0) return dayDiff;
              return a.time.localeCompare(b.time);
            });
          });
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
      const activityType = (row['Activity'] || 'LEC').toString().trim().toUpperCase();
      
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
      
      // Find or create occurrence
      let occurrence = courses[courseId].occurrences.find(
        occ => occ.occurrenceNumber === occurrenceNumber
      );
      
      if (!occurrence) {
        occurrence = {
          occurrenceNumber,
          activityType,
          sessions: []
        };
        courses[courseId].occurrences.push(occurrence);
      }
      
      // Add new session
      const newSession = {
        day,
        time,
        venue,
        lecturer
      };
      
      // Check if session already exists
      const sessionExists = occurrence.sessions.some(
        existingSession =>
          existingSession.day === newSession.day &&
          existingSession.time === newSession.time &&
          existingSession.venue === newSession.venue &&
          existingSession.lecturer === newSession.lecturer
      );
      
      if (!sessionExists) {
        occurrence.sessions.push(newSession);
      }
    });
    
    // Sort occurrences by occurrence number for each course
    Object.values(courses).forEach(course => {
      course.occurrences.sort((a, b) => a.occurrenceNumber.localeCompare(b.occurrenceNumber));
      
      // Sort sessions in each occurrence
      course.occurrences.forEach(occurrence => {
        occurrence.sessions.sort((a, b) => {
          const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
          const dayDiff = days.indexOf(a.day.toUpperCase()) - days.indexOf(b.day.toUpperCase());
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        });
      });
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
          activityType: "LEC",
          sessions: [
            {
              day: "Monday",
              time: "10:00 - 12:00",
              venue: "Room A101",
              lecturer: "Dr. Smith"
            },
            {
              day: "Wednesday",
              time: "14:00 - 16:00",
              venue: "Room B202",
              lecturer: "Dr. Smith"
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
          activityType: "LEC",
          sessions: [
            {
              day: "Tuesday",
              time: "09:00 - 11:00",
              venue: "Room C303",
              lecturer: "Prof. Johnson"
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
          activityType: "LEC",
          sessions: [
            {
              day: "Monday",
              time: "14:00 - 16:00",
              venue: "Lab 1",
              lecturer: "Dr. Lee"
            },
            {
              day: "Thursday",
              time: "10:00 - 12:00",
              venue: "Lab 2",
              lecturer: "Dr. Lee"
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
    
    // Get worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    console.log('Worksheet range:', {
      startRow: range.s.r,
      endRow: range.e.r,
      startCol: range.s.c,
      endCol: range.e.c,
      totalRows: range.e.r - range.s.r + 1
    });

    // First get the raw data without any merging
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: '',  // Use empty string for empty cells
      blankrows: false,
      header: 1  // Get array format first
    }) as any[][];

    // Get headers and validate
    const headers = rawData[0];
    console.log('Found headers:', headers);

    const columnIndexes = {
      moduleCode: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Module Code'),
      moduleName: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Module Name'),
      occurrence: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Occurrence'),
      activity: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Activity'),
      dayTime: headers.findIndex((h: string) => typeof h === 'string' && h.trim().replace(/\s+$/, '') === 'Day / Start Duration'),
      tutor: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Tutor'),
      room: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Room'),
      location: headers.findIndex((h: string) => typeof h === 'string' && h.trim() === 'Location')
    };

    // Log the actual headers for debugging
    console.log('Header debug:', {
      headers,
      dayTimeColumn: headers[columnIndexes.dayTime],
      dayTimeIndex: columnIndexes.dayTime
    });

    // Validate column indexes
    console.log('Column indexes:', columnIndexes);
    if (columnIndexes.moduleCode === -1) {
      console.error('Could not find Module Code column');
      throw new Error('Required column "Module Code" not found');
    }

    // Convert array data to objects with strict typing
    let lastValidModuleCode = '';
    let lastValidModuleName = '';
    const jsonData = rawData.slice(1).map(row => {
      const moduleCode = row[columnIndexes.moduleCode]?.toString().trim();
      const moduleName = row[columnIndexes.moduleName]?.toString().trim();

      // If this row has a module code, update our last valid values
      if (moduleCode) {
        lastValidModuleCode = moduleCode;
        lastValidModuleName = moduleName || lastValidModuleName;
      }

      // Use either the current row's values or the last valid values
      return {
        'Module Code': moduleCode || lastValidModuleCode,
        'Module Name': moduleName || lastValidModuleName,
        'Occurrence': row[columnIndexes.occurrence]?.toString().trim(),
        'Activity': row[columnIndexes.activity]?.toString().trim(),
        'Day / Start Duration': row[columnIndexes.dayTime]?.toString().trim(),
        'Tutor': row[columnIndexes.tutor]?.toString().trim(),
        'Room': row[columnIndexes.room]?.toString().trim(),
        'Location': row[columnIndexes.location]?.toString().trim()
      };
    });

    // Log total rows
    console.log('Total rows processed:', jsonData.length);

    // Debug log for GBB0046
    const gbb0046Rows = jsonData.filter(row => row['Module Code'] === 'GBB0046');
    console.log("GBB0046 raw rows:", {
      totalRows: gbb0046Rows.length,
      rows: gbb0046Rows
    });

    // First pass: Group all data by course ID
    const courseMap = new Map<string, {
      name: string;
      occurrences: Map<string, {
        sessions: {
          day: string;
          time: string;
          venue: string;
          lecturers: Set<string>;
        }[];
        activityType: string;
      }>;
    }>();

    // Process each row
    jsonData.forEach((row, index) => {
      const courseId = row['Module Code'];
      const courseName = row['Module Name'] || '';
      const occurrenceStr = row['Occurrence'] || '1';
      const activityType = row['Activity']?.toUpperCase() || 'LEC';
      const dayTimeInfo = row['Day / Start Duration'];
      
      // Log each row being processed for GBB0046
      if (courseId === 'GBB0046') {
        console.log(`Processing GBB0046 row ${index}:`, {
          occurrence: occurrenceStr,
          activity: activityType,
          dayTime: dayTimeInfo,
          tutor: row['Tutor'],
          room: row['Room']
        });
      }

      // Parse day and time
      let day = '';
      let time = '';
      
      if (dayTimeInfo) {
        // First try exact format from Excel (e.g., "THURSDAY 14:00 - 16:00 (02:00)")
        const fullPattern = /^(MON|TUE|WED|THU|FRI|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/i;
        const match = dayTimeInfo.match(fullPattern);
        
        if (match) {
          day = match[1].toUpperCase()
            .replace(/^MON$/, 'MONDAY')
            .replace(/^TUE$/, 'TUESDAY')
            .replace(/^WED$/, 'WEDNESDAY')
            .replace(/^THU$/, 'THURSDAY')
            .replace(/^FRI$/, 'FRIDAY');
          time = `${match[2]} - ${match[3]}`;
        } else {
          // Fallback to separate day and time matching
          const dayMatch = dayTimeInfo.match(/^(MON|TUE|WED|THU|FRI|MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY)/i);
          const timeMatch = dayTimeInfo.match(/(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})/);
          
          if (dayMatch) {
            day = dayMatch[1].toUpperCase()
              .replace(/^MON$/, 'MONDAY')
              .replace(/^TUE$/, 'TUESDAY')
              .replace(/^WED$/, 'WEDNESDAY')
              .replace(/^THU$/, 'THURSDAY')
              .replace(/^FRI$/, 'FRIDAY');
          }
          
          if (timeMatch) {
            time = `${timeMatch[1]} - ${timeMatch[2]}`;
          }
        }

        if (courseId === 'GBB0046') {
          console.log(`Parsed day/time for GBB0046:`, {
            original: dayTimeInfo,
            parsedDay: day,
            parsedTime: time
          });
        }
      }

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
          sessions: [],
          activityType
        });
      }
      const occurrence = course.occurrences.get(occurrenceStr)!;

      // Handle venue - for ONL activity type, all sessions in this occurrence should be Online
      let venue = occurrence.activityType === 'ONL' ? 'Online' : (row['Room']?.toString().trim() || '');
      
      // Create new session regardless of day/time presence
      const session = {
        day: day || '',  // Empty string if no day
        time: time || '', // Empty string if no time
        venue,
        lecturers: new Set<string>()
      };

      // Add lecturer if present
      if (row['Tutor']) {
        const lecturers = row['Tutor']
          .split(/[,\n\r]+/)
          .map((l: string) => l.trim())
          .filter((l: string) => l && l !== '-');
        
        lecturers.forEach((l: string) => session.lecturers.add(l));
      }

      // Check if this exact session already exists
      const sessionExists = occurrence.sessions.some(existingSession =>
        existingSession.day === session.day &&
        existingSession.time === session.time &&
        existingSession.venue === session.venue
      );

      if (!sessionExists) {
        occurrence.sessions.push(session);
        if (courseId === 'GBB0046') {
          console.log(`Added new session for GBB0046:`, {
            occurrence: occurrenceStr,
            session: {
              day: session.day,
              time: session.time,
              venue: session.venue,
              lecturers: Array.from(session.lecturers)
            }
          });
        }
      }
    });

    // Debug log for GBB0046 after processing
    const gbb0046 = courseMap.get('GBB0046');
    if (gbb0046) {
      console.log('GBB0046 final processed data:', JSON.stringify({
        name: gbb0046.name,
        occurrences: Array.from(gbb0046.occurrences.entries()).map(([occNum, occ]) => ({
          number: occNum,
          activityType: occ.activityType,
          sessions: occ.sessions.map(session => ({
            day: session.day,
            time: session.time,
            venue: session.venue,
            lecturers: Array.from(session.lecturers)
          }))
        }))
      }, null, 2));
    }

    // Convert to final format
    const courses: Course[] = Array.from(courseMap.entries()).map(([courseId, courseData]) => ({
      id: courseId,
      name: courseData.name,
      occurrences: Array.from(courseData.occurrences.entries())
        .map(([occNumber, occData]) => ({
          occurrenceNumber: occNumber,
          activityType: occData.activityType,
          sessions: occData.sessions
            .map(session => ({
              day: session.day,
              time: session.time,
              venue: session.venue,
              lecturer: Array.from(session.lecturers).join(', ')
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

    // Log summary of all courses
    console.log('Course summary:', courses.map(course => ({
      id: course.id,
      occurrences: course.occurrences.length,
      totalSessions: course.occurrences.reduce((sum, occ) => sum + occ.sessions.length, 0)
    })));

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