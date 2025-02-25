import { FaCalendarAlt, FaBook, FaCalculator, FaRobot } from 'react-icons/fa';
import { Calendar } from './Calendar';
import './Sidebar.css';
import { useState } from 'react';

interface SidebarProps {
  isExpanded: boolean;
  setIsExpanded: React.Dispatch<React.SetStateAction<boolean>>;
}

const Sidebar = ({ isExpanded, setIsExpanded }: SidebarProps) => {
  const menuItems = [
    { 
      icon: <FaCalendarAlt size={20} />, 
      label: 'Timetable', 
      path: '/timetable',
      description: 'Manage your class schedule'
    },
    { 
      icon: <FaCalculator size={20} />, 
      label: 'GPA Calculator', 
      path: '/gpa-calculator',
      description: 'Estimate your GPA easily'
    },
    { 
      icon: <FaRobot size={20} />, 
      label: 'AI Assistant', 
      path: '/ai-assistant',
      description: 'Get help with your studies'
    }
  ];

  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState(currentDate);

  return (
    <nav 
      className={`sidebar ${isExpanded ? 'expanded' : ''}`}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <div className="logo-container">
        <div className="logo-icon">
          <FaBook size={28} color="#14b8a6" />
        </div>
        <div className="logo-text">
          <h1>STUDYSYNC</h1>
          <p>PLAN • TRACK • ACHIEVE</p>
        </div>
      </div>
      <div className="sidebar-items-container">
        {menuItems.map((item, index) => (
          <a 
            key={index} 
            href={item.path}
            className="sidebar-item"
          >
            <span className="icon">{item.icon}</span>
            <div className="sidebar-item-content">
              <span className="label">{item.label}</span>
              <span className="description">{item.description}</span>
            </div>
          </a>
        ))}
      </div>
      <div className="calendar-container">
        <Calendar 
          selected={selectedDate}
          onSelect={setSelectedDate}
        />
      </div>
    </nav>
  );
};

export default Sidebar;