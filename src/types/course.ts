export interface CourseSession {
  day: string;
  time: string;
  venue: string;
  lecturer: string;
}

export interface CourseOccurrence {
  occurrenceNumber: string;
  activityType: string;
  sessions: CourseSession[];
}

export interface Course {
  id: string;
  name: string;
  occurrences: CourseOccurrence[];
}

export interface TimetableOccurrence {
  courseId: string;
  courseName: string;
  courseCode: string;
  occurrenceNumber: string;
  time: string;
  venue: string;
  lecturer: string;
  day: string;
  activityType: string;
}

export interface TimetableState {
  [key: string]: TimetableOccurrence[];
} 