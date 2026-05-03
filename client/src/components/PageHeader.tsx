import { ArrowLeft } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  onBack: () => void;
}

export function PageHeader({ title, subtitle, onBack }: Props): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 mb-6">
      <button
        onClick={onBack}
        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={20} />
      </button>
      <div>
        <h1 className="text-xl font-bold">{title}</h1>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
  );
}
