import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { ToastContext, type ToastTone } from "#/components/app/toast-context";
import { cn } from "#/lib/utils";

type Toast = {
	id: number;
	message: string;
	tone: ToastTone;
};

const toneClasses: Record<ToastTone, string> = {
	neutral: "border-zinc-700 bg-zinc-950 text-white",
	success: "border-emerald-400 bg-emerald-950 text-emerald-50",
	error: "border-rose-400 bg-rose-950 text-rose-50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const showToast = useCallback(
		(message: string, tone: ToastTone = "neutral") => {
			setToasts((current) => [
				...current,
				{ id: Date.now() + Math.random(), message, tone },
			]);
		},
		[]
	);

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
		<div
			className="pointer-events-none fixed inset-x-0 z-[90] flex flex-col gap-3 px-4"
			style={{
				bottom: "max(5rem, calc(4.5rem + env(safe-area-inset-bottom, 0px)))",
			}}
		>
			{" "}
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>,
		document.body
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
				"pointer-events-auto mx-auto flex w-full max-w-[28rem] animate-[rise-in_240ms_ease-out] items-start gap-3 rounded-xl border-2 px-4 py-3 shadow-[0_20px_60px_rgba(0,0,0,0.55)]",
				toneClasses[toast.tone]
			)}
			role={toast.tone === "error" ? "alert" : "status"}
			aria-live={toast.tone === "error" ? "assertive" : "polite"}
		>
			<p className="m-0 flex-1 text-sm leading-6 font-semibold">
				{toast.message}
			</p>
			<button
				type="button"
				onClick={() => onRemove(toast.id)}
				className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-current/30 bg-black/30 text-current transition-colors hover:bg-black/50"
				aria-label="Dismiss message"
			>
				<X className="h-3.5 w-3.5" />
			</button>
		</div>
	);
}
