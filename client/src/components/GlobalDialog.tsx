import { useContext } from 'react';
import { DialogContext } from '../hooks/dialogContextInstance';
import { Modal } from './Modal';
import { Button } from './ui/Button';

export function GlobalDialog(): React.JSX.Element | null {
  const ctx = useContext(DialogContext);
  if (!ctx) return null;
  const { dialogState, hideDialog } = ctx;

  if (!dialogState.isOpen) {
    return null;
  }

  return (
    <Modal open={dialogState.isOpen} onClose={hideDialog} title={dialogState.title}>
      <div>
        <p className="text-muted-foreground">{dialogState.message}</p>
        <div className="flex justify-end gap-2 mt-4">
          {dialogState.buttons.map((button, index) => (
            <Button key={index} onClick={button.onClick} variant={button.variant}>
              {button.text}
            </Button>
          ))}
        </div>
      </div>
    </Modal>
  );
}
