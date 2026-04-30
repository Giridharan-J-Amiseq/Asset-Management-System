import { Button } from "./Button";

export function ConfirmButton({ confirmText = "Confirm", danger = false, onConfirm, children }) {
  return (
    <Button
      variant={danger ? "danger" : "secondary"}
      onClick={() => {
        if (window.confirm(confirmText)) {
          onConfirm?.();
        }
      }}
    >
      {children}
    </Button>
  );
}