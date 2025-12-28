"use client";

import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";

interface ConfirmationDialogContextType {
  confirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      onCancel?: () => void;
      variant?: "default" | "destructive";
    }
  ) => void;
}

const ConfirmationDialogContext = React.createContext<ConfirmationDialogContextType | null>(null);

export function GlobalConfirmationDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const [config, setConfig] = React.useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel?: () => void;
    variant?: "default" | "destructive";
  } | null>(null);

  const confirm = React.useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      options?: {
        confirmText?: string;
        cancelText?: string;
        onCancel?: () => void;
        variant?: "default" | "destructive";
      }
    ) => {
      setConfig({
        title,
        message,
        onConfirm,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        onCancel: options?.onCancel,
        variant: options?.variant,
      });
      setOpen(true);
    },
    []
  );

  const handleConfirm = () => {
    if (config?.onConfirm) {
      config.onConfirm();
    }
    setOpen(false);
  };

  const handleCancel = () => {
    if (config?.onCancel) {
      config.onCancel();
    }
    setOpen(false);
  };

  return (
    <ConfirmationDialogContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle>{config?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {config?.message}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialogCancel onClick={handleCancel}>
              {config?.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={
                config?.variant === "destructive"
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {config?.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmationDialogContext.Provider>
  );
}

export function useGlobalConfirmationDialog() {
  const context = React.useContext(ConfirmationDialogContext);
  if (!context) {
    throw new Error("useGlobalConfirmationDialog must be used within GlobalConfirmationDialogProvider");
  }
  return context;
}
