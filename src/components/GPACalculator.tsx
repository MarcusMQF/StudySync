import React, { useState } from 'react';
import { FaUndo } from 'react-icons/fa';
import DecryptedText from './DecryptedText';
import './GPACalculator.css';

interface GradePoint {
  letter: string;
  marks: string;
  points: number;
}

const gradePoints: GradePoint[] = [
  { letter: 'A+', marks: '90-100', points: 4.0 },
  { letter: 'A', marks: '80-89', points: 4.0 },
  { letter: 'A-', marks: '75-79', points: 3.7 },
  { letter: 'B+', marks: '70-74', points: 3.3 },
  { letter: 'B', marks: '65-69', points: 3.0 },
  { letter: 'B-', marks: '60-64', points: 2.7 },
  { letter: 'C+', marks: '55-59', points: 2.3 },
  { letter: 'C', marks: '50-54', points: 2.0 },
  { letter: 'C-', marks: '45-49', points: 1.7 },
  { letter: 'D+', marks: '40-44', points: 1.3 },
  { letter: 'D', marks: '35-39', points: 1.0 },
  { letter: 'F', marks: '0-34', points: 0.0 },
];

interface Subject {
  grade: string;
  creditHours: string;
}

interface GPACalculatorProps {
  isDarkMode: boolean;
}

export const GPACalculator: React.FC<GPACalculatorProps> = ({ }) => {
  const [subjects, setSubjects] = useState<Subject[]>(
    Array(10).fill({ grade: '', creditHours: '' })
  );

  const calculateGPA = () => {
    let totalPoints = 0;
    let totalCredits = 0;

    subjects.forEach(subject => {
      if (subject.grade && subject.creditHours) {
        const gradePoint = gradePoints.find(g => g.letter === subject.grade);
        if (gradePoint) {
          const credits = parseFloat(subject.creditHours);
          totalPoints += gradePoint.points * credits;
          totalCredits += credits;
        }
      }
    });

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00';
  };

  const handleInputChange = (index: number, field: keyof Subject, value: string) => {
    const newSubjects = [...subjects];
    if (field === 'creditHours') {
      // Round the input value to the nearest whole number
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        const roundedValue = Math.round(numValue).toString();
        newSubjects[index] = { ...newSubjects[index], [field]: roundedValue };
      } else {
        newSubjects[index] = { ...newSubjects[index], [field]: '' };
      }
    } else {
      newSubjects[index] = { ...newSubjects[index], [field]: value };
    }
    setSubjects(newSubjects);
  };

  const handleReset = () => {
    setSubjects(Array(10).fill({ grade: '', creditHours: '' }));
  };

  const totalCreditHours = subjects.reduce((sum, subject) => {
    return sum + (subject.creditHours ? parseFloat(subject.creditHours) : 0);
  }, 0);

  const totalGradePoints = subjects.reduce((sum, subject) => {
    if (subject.grade && subject.creditHours) {
      const gradePoint = gradePoints.find(g => g.letter === subject.grade);
      if (gradePoint) {
        return sum + gradePoint.points * parseFloat(subject.creditHours);
      }
    }
    return sum;
  }, 0);

  return (
    <div className="gpa-calculator">
      <div className="gpa-header">
        <div className="title-section">
          <h1>
            <DecryptedText
              text="GPA Calculator"
              speed={50}
              sequential={true}
              className="decrypted"
              encryptedClassName="encrypted"
              animateOn="hover"
            />
          </h1>
        </div>
        <button className="action-button reset-button" onClick={handleReset}>
          <FaUndo /> Reset
        </button>
      </div>

      <div className="gpa-layout">
        {/* Left Panel - Grade Table */}
        <div className="grade-reference">
          <h2>Grade Reference</h2>
          <table className="grade-table">
            <thead>
              <tr>
                <th>Letter</th>
                <th>Marks</th>
                <th>Grade Point</th>
              </tr>
            </thead>
            <tbody>
              {gradePoints.map((grade, index) => (
                <tr key={index}>
                  <td>{grade.letter}</td>
                  <td>{grade.marks}</td>
                  <td>{grade.points.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right Panel - Calculator */}
        <div className="calculator-section">
          <div className="subjects-input">
            <table className="subjects-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Grade</th>
                  <th>Credit</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subject, index) => (
                  <tr key={index}>
                    <td>{`Subject ${index + 1}`}</td>
                    <td>
                      <select
                        value={subject.grade}
                        onChange={(e) => handleInputChange(index, 'grade', e.target.value)}
                      >
                        <option value="">Select</option>
                        {gradePoints.map((grade) => (
                          <option key={grade.letter} value={grade.letter}>
                            {grade.letter}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="number"
                        value={subject.creditHours}
                        onChange={(e) => handleInputChange(index, 'creditHours', e.target.value)}
                        placeholder="Credits"
                        min="0"
                        step="1"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="results-dashboard">
            <div className="result-card">
              <h3>GPA</h3>
              <div className="result-value">{calculateGPA()}</div>
            </div>
            <div className="result-card">
              <h3>Total Credits</h3>
              <div className="result-value">{totalCreditHours.toFixed(1)}</div>
            </div>
            <div className="result-card">
              <h3>Grade Points</h3>
              <div className="result-value">{totalGradePoints.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 