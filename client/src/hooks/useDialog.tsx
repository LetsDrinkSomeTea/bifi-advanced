import { useContext } from 'react';
import { DialogContext } from './dialogContextInstance';

export interface DialogApi {
  alert: (title: string, message: string) => Promise<void>;
  confirm: (title: string, message: string) => Promise<boolean>;
  confirmDelete: (title: string, message: string) => Promise<boolean>;
}

export const useDialog = (): DialogApi => {
  const context = useContext(DialogContext);
  if (context === undefined) {
    throw new Error('useDialog must be used within a DialogProvider');
  }

  const { showDialog, hideDialog } = context;

  const alert = (title: string, message: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      showDialog(title, message, [
        {
          text: 'OK',
          onClick: () => {
            hideDialog();
            resolve();
          },
          variant: 'default',
        },
      ]);
    });
  };

  const confirmDelete = (title: string, message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      showDialog(title, message, [
        {
          text: 'Abbrechen',
          onClick: () => {
            hideDialog();
            resolve(false);
          },
          variant: 'secondary',
        },
        {
          text: 'Löschen',
          onClick: () => {
            hideDialog();
            resolve(true);
          },
          variant: 'destructive',
        },
      ]);
    });
  };

  const confirm = (title: string, message: string): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      showDialog(title, message, [
        {
          text: 'Abbrechen',
          onClick: () => {
            hideDialog();
            resolve(false);
          },
          variant: 'secondary',
        },
        {
          text: 'OK',
          onClick: () => {
            hideDialog();
            resolve(true);
          },
          variant: 'default',
        },
      ]);
    });
  };

  return { alert, confirm, confirmDelete };
};
