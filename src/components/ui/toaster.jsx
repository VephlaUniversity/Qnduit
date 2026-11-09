import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast";
import { useToast } from "../hooks/useToast";

export function Toaster() {
  const { toasts } = useToast();

  return (
    // The queue holds one toast. A new notification needs fresh Radix pause
    // state, including after the previous toast was closed with focus inside.
    <ToastProvider key={toasts[0]?.id || "empty"} duration={5000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose aria-label="Dismiss notification" />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
