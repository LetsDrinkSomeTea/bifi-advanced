import { createContext } from 'react';
import { type VariantProps } from 'class-variance-authority';
import { type buttonVariants } from '../components/ui/button-variants';

export interface DialogButton {
  text: string;
  onClick: () => void;
  variant?: VariantProps<typeof buttonVariants>['variant'];
}

export interface DialogState {
  isOpen: boolean;
  title: string;
  message: string;
  buttons: DialogButton[];
}

export const DialogContext = createContext<
  | {
      dialogState: DialogState;
      showDialog: (title: string, message: string, buttons: DialogButton[]) => void;
      hideDialog: () => void;
    }
  | undefined
>(undefined);
