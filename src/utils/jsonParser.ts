import { Course, CourseOccurrence, CourseSession } from '../types/course';

interface TimeEditActivity {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  occurrences: string[];
}

interface TimeEditData {
  moduleName: string;
  moduleCode: string;
  activities: {
    [key: string]: TimeEditActivity[];
  };
}

export const loadCoursesFromJson = async (): Promise<Course[]> => {
  try {
    console.log('Attempting to fetch timetable_data.json...');
    const response = await fetch('/timetable_data.json');
    if (!response.ok) {
      throw new Error(`Failed to load timetable data: ${response.status} ${response.statusText}`);
    }
    
    const jsonData: TimeEditData[] = await response.json();
    console.log('Successfully loaded JSON data:', {
      numberOfCourses: jsonData.length,
      sampleCourse: jsonData[0] // Log first course as sample
    });
    
    const courses = convertTimeEditDataToCourses(jsonData);
    console.log('Converted courses:', {
      numberOfCourses: courses.length,
      sampleCourse: courses[0] // Log first converted course
    });
    
    return courses;
  } catch (error) {
    console.error('Error loading courses from JSON:', error);
    console.error('Stack trace:', (error as Error).stack);
    return [];
  }
};

const convertTimeEditDataToCourses = (data: TimeEditData[]): Course[] => {
  try {
    return data.map(courseData => {
      const occurrenceMap = new Map<string, CourseOccurrence>();

      // Process each activity type (LEC, TUT, etc.)
      Object.entries(courseData.activities).forEach(([activityType, activities]) => {
        if (!activities || activities.length === 0) return; // Skip empty activities
        
        activities.forEach(activity => {
          // Skip exam venue sessions
          if (activity.room === 'EXAM_HOLD_G') return;
          
          if (!activity.occurrences || activity.occurrences.length === 0) return;
          
          activity.occurrences.forEach(occNum => {
            // Initialize occurrence if it doesn't exist
            if (!occurrenceMap.has(occNum)) {
              occurrenceMap.set(occNum, {
                occurrenceNumber: occNum,
                activityType: '', // This will be a combined string of all activity types
                sessions: []
              });
            }

            // Create session
            const session: CourseSession = {
              day: activity.dayOfWeek.toUpperCase(),
              time: `${activity.startTime} - ${activity.endTime}`,
              venue: activity.room || 'No venue specified',
              lecturer: '' // TimeEdit data doesn't include lecturer info
            };

            // Add session to the occurrence
            const occurrence = occurrenceMap.get(occNum)!;
            occurrence.sessions.push(session);

            // Update activity type string
            const currentTypes = new Set(occurrence.activityType.split('/').filter(t => t));
            currentTypes.add(activityType);
            occurrence.activityType = Array.from(currentTypes).join('/');
          });
        });
      });

      // Convert map to array and sort sessions within each occurrence
      const occurrences = Array.from(occurrenceMap.values()).map(occurrence => ({
        ...occurrence,
        sessions: occurrence.sessions.sort((a, b) => {
          const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
          const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
          if (dayDiff !== 0) return dayDiff;
          return a.time.localeCompare(b.time);
        })
      }));

      // Sort occurrences by number
      occurrences.sort((a, b) => 
        parseInt(a.occurrenceNumber) - parseInt(b.occurrenceNumber)
      );

      return {
        id: courseData.moduleCode,
        name: courseData.moduleName,
        occurrences
      };
    });
  } catch (error) {
    console.error('Error converting TimeEdit data to courses:', error);
    console.error('Stack trace:', (error as Error).stack);
    return [];
  }
}; 