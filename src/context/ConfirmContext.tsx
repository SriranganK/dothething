import React, { createContext, useContext, useState, useRef } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";

export interface ConfirmOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
  promptPlaceholder?: string;
  promptDefaultValue?: string;
  isPrompt?: boolean;
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<string | boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export const ConfirmProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({});
  const [inputValue, setInputValue] = useState("");
  const resolveRef = useRef<((value: string | boolean) => void) | null>(null);

  const confirm = (opts: ConfirmOptions) => {
    setOptions(opts);
    setInputValue(opts.promptDefaultValue || "");
    setOpen(true);
    return new Promise<string | boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  };

  const handleCancel = () => {
    setOpen(false);
    if (resolveRef.current) {
      resolveRef.current(false);
    }
  };

  const handleConfirm = () => {
    setOpen(false);
    if (resolveRef.current) {
      if (options.isPrompt) {
        resolveRef.current(inputValue);
      } else {
        resolveRef.current(true);
      }
    }
  };

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      <AlertDialog open={open} onOpenChange={(isOpen) => {
        if (!isOpen) handleCancel();
      }}>
        <AlertDialogContent className="bg-card border-border rounded-2xl text-card-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground font-bold">
              {options.title || "Are you sure?"}
            </AlertDialogTitle>
            {options.description && (
              <AlertDialogDescription className="text-muted-foreground">
                {options.description}
              </AlertDialogDescription>
            )}
            {options.isPrompt && (
              <div className="pt-3">
                <Input
                  className="rounded-xl border-border bg-background text-foreground focus-visible:ring-ring"
                  placeholder={options.promptPlaceholder}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleConfirm();
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="rounded-xl border-border bg-card text-foreground hover:bg-muted font-semibold cursor-pointer"
              onClick={handleCancel}
            >
              {options.cancelText || "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl font-semibold cursor-pointer"
              variant={options.variant || "default"}
              onClick={handleConfirm}
            >
              {options.confirmText || "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context.confirm;
};
