import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/Button';

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function PageHeader({ title, subtitle, onBack }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 mb-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onBack}
        className="shrink-0"
      >
        <ArrowLeft size={20} />
      </Button>
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
