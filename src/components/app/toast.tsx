import {
	useCallback,
	useEffect,
	useMemo,
	useState,
} from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import {
	ToastContext,
	type ToastTone,
} from "#/components/app/toast-context";
import { cn } from "#/lib/utils";

type Toast = {
	id: number;
	message: string;
	tone: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
	neutral: "border-white/60 bg-white/92 text-[var(--ink)]",
	success:
		"border-emerald-200 bg-[rgba(235,255,244,0.94)] text-[color:var(--success-ink)]",
	error:
		"border-rose-200 bg-[rgba(255,240,242,0.96)] text-[color:var(--danger-ink)]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback((message: string, tone: ToastTone = "neutral") => {
		setToasts((current) => [
			...current,
			{ id: Date.now() + Math.random(), message, tone },
		]);
	}, []);

	const removeToast = useCallback((id: number) => {
		setToasts((current) => current.filter((toast) => toast.id !== id));
	}, []);

	const value = useMemo(() => ({ showToast }), [showToast]);

	return (
		<ToastContext.Provider value={value}>
			{children}
			<ToastViewport toasts={toasts} onRemove={removeToast} />
		</ToastContext.Provider>
	);
}

function ToastViewport({
	toasts,
	onRemove,
}: {
	toasts: Toast[];
	onRemove: (id: number) => void;
}) {
	if (typeof document === "undefined" || toasts.length === 0) {
		return null;
	}

	return createPortal(
		<div className="pointer-events-none fixed inset-x-0 bottom-4 z-[90] flex flex-col gap-3 px-4">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>,
		document.body,
	);
}

function ToastItem({
	toast,
	onRemove,
}: {
	toast: Toast;
	onRemove: (id: number) => void;
}) {
	useEffect(() => {
		const timeout = window.setTimeout(() => {
			onRemove(toast.id);
		}, 4000);

		return () => window.clearTimeout(timeout);
	}, [onRemove, toast.id]);

	return (
		<div
			className={cn(
				"pointer-events-auto mx-auto flex w-full max-w-[28rem] items-start gap-3 rounded-[1.35rem] border px-4 py-3 shadow-[0_28px_80px_rgba(24,16,8,0.18)] backdrop-blur-xl animate-[rise-in_240ms_ease-out]",
				toneClasses[toast.tone],
			)}
			role="status"
		>
			<p className="m-0 flex-1 text-sm font-semibold leading-6">{toast.message}</p>
			<button
				type="button"
				onClick={() => onRemove(toast.id)}
				className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/5 bg-black/[0.03] text-current"
				aria-label="Dismiss message"
			>
				<X className="h-4 w-4" />
			</button>
		</div>
	);
}
