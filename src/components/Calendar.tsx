import { useState } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval,
  addDays,
  subDays
} from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import './Calendar.css';

interface CalendarProps {
  selected?: Date;
  onSelect?: (date: Date) => void;
}

export const Calendar = ({ selected, onSelect }: CalendarProps) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get days from previous month to fill the start
  const firstDayOfMonth = monthStart.getDay();
  const prevMonthEnd = subDays(monthStart, 1); // Get the last day of previous month
  const prevMonthDays = Array.from({ length: firstDayOfMonth }, (_, i) => 
    subDays(prevMonthEnd, firstDayOfMonth - 1 - i)
  );

  // Get days from next month to fill the end
  const nextMonthDays = Array.from({ length: 42 - (monthDays.length + prevMonthDays.length) }, (_, i) => 
    addDays(monthEnd, i + 1)
  );

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="calendar-root">
      <div className="calendar-header">
        <button onClick={prevMonth} className="nav-button">
          <FaChevronLeft size={14} />
        </button>
        <span className="month-label">
          {format(currentMonth, 'MMMM yyyy')}
        </span>
        <button onClick={nextMonth} className="nav-button">
          <FaChevronRight size={14} />
        </button>
      </div>
      <div className="calendar-grid">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        {prevMonthDays.map((day) => (
          <button
            key={day.toISOString()}
            className="calendar-day other-month"
            disabled
          >
            {format(day, 'd')}
          </button>
        ))}
        {monthDays.map((day) => {
          const isSelected = selected?.toDateString() === day.toDateString();
          const isToday = new Date().toDateString() === day.toDateString();
          
          return (
            <button
              key={day.toISOString()}
              className={`calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => onSelect?.(day)}
            >
              {format(day, 'd')}
            </button>
          );
        })}
        {nextMonthDays.map((day) => (
          <button
            key={day.toISOString()}
            className="calendar-day other-month"
            disabled
          >
            {format(day, 'd')}
          </button>
        ))}
      </div>
    </div>
  );
}; 