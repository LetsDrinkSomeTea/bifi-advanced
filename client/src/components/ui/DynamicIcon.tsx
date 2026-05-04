import React from 'react';
import * as LucideIcons from 'lucide-react';
import { type LucideProps } from 'lucide-react';

interface DynamicIconProps extends LucideProps {
  name: string;
}

export const DynamicIcon = ({ name, ...props }: DynamicIconProps): React.JSX.Element => {
  // Convert kebab-case to PascalCase (e.g., 'shopping-cart' -> 'ShoppingCart')
  const pascalName = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');

  const IconComponent = (
    LucideIcons as unknown as Record<string, React.ComponentType<LucideProps>>
  )[pascalName];

  if (!IconComponent) {
    console.warn(`Icon "${name}" (Pascal: "${pascalName}") not found in lucide-react`);
    return <LucideIcons.HelpCircle {...props} />;
  }

  return <IconComponent {...props} />;
};
