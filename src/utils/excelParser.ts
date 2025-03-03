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

          // Parse day and time ONCE
          let day = '';
          let time = '';
          if (dayTimeInfo) {
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
              return; // Skip if can't parse day/time
            }
          }

          // Parse lecturers ONCE
          let lecturerList: string[] = [];
          if (row['Tutor']) {
            lecturerList = row['Tutor']
              .split(/[,\n\r]+/)
              .map((l: string) => l.trim())
              .filter((l: string) => l && l !== '-');
          }

          // Skip if no valid data
          if (!day || !time || lecturerList.length === 0) {
            return;
          }

          // Create course if it doesn't exist (ONCE)
          if (!courses[courseId]) {
            courses[courseId] = {
              id: courseId,
              name: courseName,
              occurrences: []
            };
          }

          // Find or create occurrence (ONCE)
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

          // Find if this exact day/time combination exists in current occurrence
          const existingSessionIndex = occurrence.sessions.findIndex(
            session => session.day === day && session.time === time
          );

          if (existingSessionIndex !== -1) {
            // This is a multi-lecturer session in the same occurrence
            const existingSession = occurrence.sessions[existingSessionIndex];
            const existingLecturers = new Set(
              existingSession.lecturer
                .split(/[,\n\r]+/)
                .map(l => l.trim())
                .filter(l => l && l !== '-')
            );
            
            // Add all new lecturers without checking for duplicates
            lecturerList.forEach(l => existingLecturers.add(l));
            
            // Update venue only if we have a valid one
            let updatedVenue = existingSession.venue;
            if (venue && venue !== 'No venue specified') {
              updatedVenue = venue;
            }
            
            occurrence.sessions[existingSessionIndex] = {
              ...existingSession,
              venue: updatedVenue,
              lecturer: Array.from(existingLecturers).join(', ')
            };
          } else {
            // This is a new session for this occurrence
            const newSession: CourseSession = {
              day,
              time,
              venue,
              lecturer: lecturerList.join(', ')
            };
            occurrence.sessions.push(newSession);
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
      
      // Check if session already exists in the SAME occurrence (only check day and time)
      const sessionExists = occurrence.sessions.some(
        existingSession =>
          existingSession.day === newSession.day &&
          existingSession.time === newSession.time
      );
      
      // Only add if it doesn't exist in this occurrence
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
    
    // If no courses were parsed, return empty array
    if (courses.length === 0) {
      console.warn("No courses found in Excel file");
      return [];
    }
    
    return courses;
  } catch (error) {
    console.error("Error loading Excel data:", error);
    return [];
  }
};

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
          occurrenceNumber: occurrenceStr
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
      if (day && time && lecturerList.length > 0) {
        // Find if this exact day/time combination exists in current occurrence
        const existingSessionIndex = occurrence.sessions.findIndex(
          session => session.day === day && session.time === time
        );

        if (existingSessionIndex !== -1) {
          // This is a multi-lecturer session in the same occurrence
          const existingSession = occurrence.sessions[existingSessionIndex];
          const existingLecturers = new Set(
            existingSession.lecturer
              .split(/[,\n\r]+/)
              .map(l => l.trim())
              .filter(l => l && l !== '-')
          );
          
          // Add all new lecturers without checking for duplicates
          lecturerList.forEach(l => existingLecturers.add(l));
          
          // Update venue only if we have a valid one
          let updatedVenue = existingSession.venue;
          if (venue && venue !== 'No venue specified') {
            updatedVenue = venue;
          }
          
          occurrence.sessions[existingSessionIndex] = {
            ...existingSession,
            venue: updatedVenue,
            lecturer: Array.from(existingLecturers).join(', ')
          };
        } else {
          // This is a new session for this occurrence
          const newSession: CourseSession = {
            day,
            time,
            venue,
            lecturer: lecturerList.join(', ')
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
          
          // Always merge lecturers for the same session
          lecturerList.forEach((l) => existingLecturers.add(l));

          // Update venue only if we have a valid one
          let updatedVenue = existingSession.venue;
          if (venue && venue !== 'No venue specified') {
            updatedVenue = venue;
          }

          occurrence.sessions[existingSessionIndex] = {
            ...existingSession,
            venue: updatedVenue,
            lecturer: Array.from(existingLecturers).join(', ')
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
      console.warn("No valid courses were processed");
      return [];
    }

    return validCourses;
  } catch (error) {
    console.error("Error loading courses from Excel:", error);
    return [];
  }
};