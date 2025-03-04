import { FaBars } from 'react-icons/fa';
import './MenuButton.css';

interface MenuButtonProps {
  onClick: () => void;
}

export const MenuButton = ({ onClick }: MenuButtonProps) => {
  return (
    <button className="menu-button" onClick={onClick}>
      <FaBars size={20} />
    </button>
  );
}; 