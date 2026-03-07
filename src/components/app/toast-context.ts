import { createContext } from "react";

export type ToastTone = "neutral" | "success" | "error";

export type ToastContextValue = {
	showToast: (message: string, tone?: ToastTone) => void;
};

export const ToastContext = createContext<ToastContextValue | null>(null);
