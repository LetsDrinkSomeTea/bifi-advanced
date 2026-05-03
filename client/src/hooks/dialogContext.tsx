import { useState, type ReactNode } from 'react';
import { DialogContext, type DialogButton, type DialogState } from './dialogContextInstance';

export function DialogProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [dialogState, setDialogState] = useState<DialogState>({
    isOpen: false,
    title: '',
    message: '',
    buttons: [],
  });

  const showDialog = (title: string, message: string, buttons: DialogButton[]): void => {
    setDialogState({ isOpen: true, title, message, buttons });
  };

  const hideDialog = (): void => {
    setDialogState((prevState) => ({ ...prevState, isOpen: false }));
  };

  const providerValue = { dialogState, showDialog, hideDialog };

  return <DialogContext.Provider value={providerValue}>{children}</DialogContext.Provider>;
}
