export interface CourseOccurrence {
  day: string;
  time: string;
  venue: string;
  lecturer: string;
  activityType?: string; // LEC, TUT, etc.
  occurrenceNumber: number;
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
  occurrenceNumber: number;
  time: string;
  venue: string;
  lecturer: string;
  day: string;
  activityType?: string;
}

export interface TimetableState {
  [key: string]: TimetableOccurrence[];
} 