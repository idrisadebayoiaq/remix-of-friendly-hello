import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface BackHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
}

const BackHeader = ({ title, rightContent }: BackHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
      </Button>
      <h1 className="text-lg font-bold font-display flex-1">{title}</h1>
      {rightContent}
    </div>
  );
};

export default BackHeader;
