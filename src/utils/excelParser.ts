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

          // Parse lecturers first
          let lecturerList: string[] = [];
          if (row['Tutor']) {
            lecturerList = row['Tutor']
              .split(/[,\n\r]+/)
              .map((l: string) => l.trim())
              .filter((l: string) => l && l !== '-');
          }

          // Check if we should process this row (not a placeholder)
          const shouldProcessRow = dayTimeInfo !== '- ()' && dayTimeInfo !== '-' && dayTimeInfo !== '()' && dayTimeInfo?.trim() !== '';

          // Only process the row if it's not a placeholder and has lecturers
          if (shouldProcessRow && lecturerList.length > 0) {
            // Parse day and time
            const dayMatch = dayTimeInfo.match(/^([A-Za-z]+)/);
            const timeMatch = dayTimeInfo.match(/(\d+:\d+)\s*-\s*(\d+:\d+)/);
            
            if (!dayMatch || !timeMatch) {
              return;
            }

            const day = dayMatch[1].toUpperCase();
            const time = `${timeMatch[1]} - ${timeMatch[2]}`;

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

            // Handle venue
            let venue = occurrence.activityType === 'ONL' ? 'Online' : (row['Room']?.toString().trim() || 'No venue specified');

            // Find existing session with same day/time
            const existingSessionIndex = occurrence.sessions.findIndex(
              session => session.day === day && session.time === time
            );

            if (existingSessionIndex !== -1) {
              // Get the existing session
              const existingSession = occurrence.sessions[existingSessionIndex];
              
              // Get existing lecturers as a Set
              const allLecturers = new Set(
                existingSession.lecturer
                  .split(/[,\n\r]+/)
                  .map(l => l.trim())
                  .filter(l => l && l !== '-')
              );
              
              // Add new lecturers to the set
              lecturerList.forEach((l: string) => allLecturers.add(l));

              // Update the session while preserving existing data
              occurrence.sessions[existingSessionIndex] = {
                ...existingSession,           // Preserve all existing session data
                venue: venue,                 // Update venue if needed
                lecturer: Array.from(allLecturers).sort().join(', ') // Update with combined lecturers
              };

              if (courseId === 'GBB0046') {
                console.log('Updated session for GBB0046:', {
                  occurrence: occurrenceNumber,
                  day,
                  time,
                  existingLecturers: existingSession.lecturer,
                  newLecturers: lecturerList,
                  combinedLecturers: Array.from(allLecturers)
                });
              }
            } else {
              // Create new session
              const newSession: CourseSession = {
                day,
                time,
                venue,
                lecturer: lecturerList.join(', ')
              };
              occurrence.sessions.push(newSession);

              if (courseId === 'GBB0046') {
                console.log('Created new session for GBB0046:', {
                  occurrence: occurrenceNumber,
                  day,
                  time,
                  lecturers: lecturerList
                });
              }
            }
          }

          if (courseId === 'GQA0078') {
            console.log(`Processing GQA0078:`, {
              day,
              time,
              lecturers: lecturerList,
              sessions: occurrence.sessions.map(s => ({
                day: s.day,
                time: s.time,
                venue: s.venue,
                lecturer: s.lecturer
              }))
            });
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
    // Use the improved loadCoursesFromExcel function
    const courses = await loadCoursesFromExcel();
    
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
    
    if (!response.ok) {
      throw new Error(`Failed to fetch Excel file: ${response.statusText}`);
    }
    
    const data = await response.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Get worksheet range
    const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
    const totalRows = range.e.r - range.s.r + 1;
    console.log(`Processing ${totalRows} rows from Excel file...`);

    // First get the raw data without any merging
    const rawData = XLSX.utils.sheet_to_json(worksheet, {
      raw: true,
      defval: '',  // Use empty string for empty cells
      blankrows: false,
      header: 1  // Get array format first
    }) as any[][];

    // Get headers and validate
    const headers = rawData[0];
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

    // Validate column indexes
    if (columnIndexes.moduleCode === -1) {
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

    // Process data into course format
    const courseMap = new Map<string, {
      name: string;
      occurrences: Map<string, {
        sessions: CourseSession[];
        activityType: string;
        occurrenceNumber: string;
      }>;
    }>();

    // Process each row
    let lastValidDay = '';
    let lastValidTime = '';
    let lastValidOccurrence = '';

    jsonData.forEach(row => {
      const courseId = row['Module Code'];
      const courseName = row['Module Name'] || '';
      const occurrenceStr = row['Occurrence'] || '1';
      const activityType = row['Activity']?.toUpperCase() || 'LEC';
      const dayTimeInfo = row['Day / Start Duration'];

      // Reset last valid day/time when occurrence changes
      if (occurrenceStr !== lastValidOccurrence) {
        lastValidDay = '';
        lastValidTime = '';
        lastValidOccurrence = occurrenceStr;
      }
      
      // Parse day and time
      let day = '';
      let time = '';
      
      if (dayTimeInfo) {
        // First try exact format from Excel
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
          
          // Update last valid day/time
          lastValidDay = day;
          lastValidTime = time;
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
          activityType,
          occurrenceNumber: occurrenceStr  // Store the occurrence number explicitly
        });
      }
      const occurrence = course.occurrences.get(occurrenceStr)!;

      // Handle venue
      let venue = occurrence.activityType === 'ONL' ? 'Online' : (row['Room']?.toString().trim() || 'No venue specified');
      
      // Parse lecturers
      let lecturerList: string[] = [];
      if (row['Tutor']) {
        lecturerList = row['Tutor']
          .split(/[,\n\r]+/)
          .map((l: string) => l.trim())
          .filter((l: string) => l && l !== '-');
      }

      // If we have day/time in this row, create or update a session
      if (day && time) {
        // Find existing session with same day and time within this occurrence
        const existingSessionIndex = occurrence.sessions.findIndex(
          (s) =>
            s.day === day &&
            s.time === time
        );

        if (existingSessionIndex !== -1) {
          // Get the existing session
          const existingSession = occurrence.sessions[existingSessionIndex];
          
          if (lecturerList.length > 0) {
            // Get existing lecturers as a Set
            const existingLecturers = new Set(
              existingSession.lecturer
                .split(/[,\n\r]+/)
                .map((l) => l.trim())
                .filter((l) => l && l !== '-')
            );
            
            // Add new lecturers to the set
            lecturerList.forEach((l) => existingLecturers.add(l));

            // Update the session while preserving existing data
            occurrence.sessions[existingSessionIndex] = {
              ...existingSession,           // Preserve all existing session data
              venue: venue,                 // Update venue if needed
              lecturer: Array.from(existingLecturers).sort().join(', ') // Update with combined lecturers, sorted for consistency
            };
          }
        } else {
          // Create new session regardless of whether there are lecturers
          const newSession: CourseSession = {
            day,
            time,
            venue,
            lecturer: lecturerList.sort().join(', ') // Sort lecturers for consistency
          };
          occurrence.sessions.push(newSession);
        }
      } else if (lecturerList.length > 0 && lastValidDay && lastValidTime && occurrenceStr === lastValidOccurrence) {
        // If we have lecturers but no day/time, add them to the last valid session IN THE SAME OCCURRENCE
        const existingSessionIndex = occurrence.sessions.findIndex(
          (s) =>
            s.day === lastValidDay &&
            s.time === lastValidTime
        );

        if (existingSessionIndex !== -1) {
          const existingSession = occurrence.sessions[existingSessionIndex];
          const existingLecturers = new Set(
            existingSession.lecturer
              .split(/[,\n\r]+/)
              .map((l) => l.trim())
              .filter((l) => l && l !== '-')
          );
          lecturerList.forEach((l) => existingLecturers.add(l));
          occurrence.sessions[existingSessionIndex] = {
            ...existingSession,
            lecturer: Array.from(existingLecturers).sort().join(', ') // Sort lecturers for consistency
          };
        }
      }
    });

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
              lecturer: session.lecturer
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

    // Filter out courses that have no sessions with valid day and time
    const validCourses = courses.filter(course => 
      course.occurrences.some(occ => 
        occ.sessions.some(session => 
          session.day && session.time
        )
      )
    );

    console.log('Excel processing summary:', {
      totalRowsProcessed: jsonData.length,
      totalCoursesInExcel: courses.length,
      validCoursesCount: validCourses.length,
      invalidCoursesCount: courses.length - validCourses.length
    });

    if (validCourses.length === 0) {
      console.warn("No valid courses were processed, falling back to sample data");
      return getSampleCourses();
    }

    return validCourses;
  } catch (error) {
    console.error("Error loading courses from Excel:", error);
    console.warn("Using sample data as fallback due to error");
    return getSampleCourses();
  }
};