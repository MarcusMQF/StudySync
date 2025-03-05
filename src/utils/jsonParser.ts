import { Course, CourseOccurrence, CourseSession } from '../types/course';

interface LecturerInfo {
  lecturerId: string;
  fullName: string;
  title: string;
  email: string;
  jobTitle: string;
  jobCategory: string;
  facultyCode: string;
  departmentCode: string;
}

interface TimeEditActivity {
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  room: string;
  lecturer?: LecturerInfo;
  occurrences: string[];
}

interface TimeEditData {
  moduleName: string;
  moduleCode: string;
  activities: {
    [key: string]: TimeEditActivity[];
  };
}

const formatLecturerName = (lecturer: LecturerInfo | undefined): string => {
  if (!lecturer) return 'No lecturer specified';
  return `${lecturer.title} ${lecturer.fullName}`;
};

export const loadCoursesFromJson = async (): Promise<Course[]> => {
  let totalCourses = 0;
  let skippedCourses = 0;
  let examVenues = 0;

  try {
    const response = await fetch('/timetable_data.json');
    if (!response.ok) {
      throw new Error(`Failed to load timetable data: ${response.status} ${response.statusText}`);
    }
    
    const jsonData: TimeEditData[] = await response.json();
    totalCourses = jsonData.length;
    
    const courses = convertTimeEditDataToCourses(jsonData, (stats) => {
      skippedCourses = stats.skippedCourses;
      examVenues = stats.examVenues;
    });
    
    // Log only essential information
    console.info('📚 Course Loading Summary:', {
      totalCoursesAvailable: totalCourses,
      coursesLoaded: courses.length,
      skippedCourses,
      examVenuesSkipped: examVenues
    });
    
    return courses;
  } catch (error) {
    console.error('Error loading courses from JSON:', error);
    return [];
  }
};

const convertTimeEditDataToCourses = (
  data: TimeEditData[], 
  onStats: (stats: { skippedCourses: number; examVenues: number }) => void
): Course[] => {
  let skippedCourses = 0;
  let examVenues = 0;

  try {
    const courses = data.map(courseData => {
      const occurrenceMap = new Map<string, CourseOccurrence>();
      let hasValidSessions = false;

      // Process each activity type (LEC, TUT, etc.)
      Object.entries(courseData.activities).forEach(([activityType, activities]) => {
        if (!activities || activities.length === 0) return;
        
        activities.forEach(activity => {
          // Track exam venues
          if (activity.room.includes('EXAM_HOLD')) {
            examVenues++;
            return;
          }
          
          if (!activity.occurrences || activity.occurrences.length === 0) return;
          
          hasValidSessions = true;
          activity.occurrences.forEach(occNum => {
            if (!occurrenceMap.has(occNum)) {
              occurrenceMap.set(occNum, {
                occurrenceNumber: occNum,
                activityType: '',
                sessions: []
              });
            }

            const session: CourseSession = {
              day: activity.dayOfWeek.toUpperCase(),
              time: `${activity.startTime} - ${activity.endTime}`,
              venue: activity.room || 'No venue specified',
              lecturer: formatLecturerName(activity.lecturer)
            };

            const occurrence = occurrenceMap.get(occNum)!;
            occurrence.sessions.push(session);

            const currentTypes = new Set(occurrence.activityType.split('/').filter(t => t));
            currentTypes.add(activityType);
            occurrence.activityType = Array.from(currentTypes).join('/');
          });
        });
      });

      // If course has no valid sessions, increment skipped counter
      if (!hasValidSessions) {
        skippedCourses++;
        return null;
      }

      const occurrences = Array.from(occurrenceMap.values())
        .map(occurrence => ({
          ...occurrence,
          sessions: occurrence.sessions.sort((a, b) => {
            const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
            const dayDiff = days.indexOf(a.day) - days.indexOf(b.day);
            if (dayDiff !== 0) return dayDiff;
            return a.time.localeCompare(b.time);
          })
        }))
        .sort((a, b) => parseInt(a.occurrenceNumber) - parseInt(b.occurrenceNumber));

      return {
        id: courseData.moduleCode,
        name: courseData.moduleName,
        occurrences
      };
    }).filter((course): course is Course => course !== null);

    onStats({ skippedCourses, examVenues });
    return courses;
  } catch (error) {
    console.error('Error converting TimeEdit data to courses:', error);
    return [];
  }
}; 