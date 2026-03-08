import * as React from "react";
import { Dialog as DialogPrimitive } from "radix-ui";

import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button";

const AlertDialogContext = React.createContext<{
	onOpenChange?: (open: boolean) => void;
}>({});

function AlertDialog({
	onOpenChange,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return (
		<AlertDialogContext.Provider value={{ onOpenChange }}>
			<DialogPrimitive.Root
				data-slot="alert-dialog"
				onOpenChange={onOpenChange}
				{...props}
			/>
		</AlertDialogContext.Provider>
	);
}

function AlertDialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

function AlertDialogPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="alert-dialog-portal" {...props} />;
}

function AlertDialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="alert-dialog-overlay"
			className={cn(
				"fixed inset-0 z-50 bg-black/80 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
				className
			)}
			{...props}
		/>
	);
}

function AlertDialogContent({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
	const { onOpenChange } = React.useContext(AlertDialogContext);

	return (
		<AlertDialogPortal>
			<AlertDialogOverlay onClick={() => onOpenChange?.(false)} />
			<DialogPrimitive.Content
				data-slot="alert-dialog-content"
				className={cn(
					"fixed top-1/2 left-1/2 z-50 w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 -translate-y-1/2 border-4 border-white bg-black p-6 shadow-[12px_12px_0px_0px_#ccff00] outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:p-8",
					className
				)}
				{...props}
			/>
		</AlertDialogPortal>
	);
}

function AlertDialogHeader({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-header"
			className={cn("flex flex-col gap-3 text-left", className)}
			{...props}
		/>
	);
}

function AlertDialogFooter({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="alert-dialog-footer"
			className={cn("mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end", className)}
			{...props}
		/>
	);
}

function AlertDialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="alert-dialog-title"
			className={cn("font-display text-3xl leading-none text-white uppercase", className)}
			{...props}
		/>
	);
}

function AlertDialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="alert-dialog-description"
			className={cn(
				"text-base leading-relaxed font-medium text-zinc-400 [overflow-wrap:anywhere]",
				className
			)}
			{...props}
		/>
	);
}

function AlertDialogAction({
	className,
	variant = "default",
	size = "default",
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close> &
	Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
	return (
		<Button variant={variant} size={size} className={className} asChild>
			<DialogPrimitive.Close data-slot="alert-dialog-action" {...props} />
		</Button>
	);
}

function AlertDialogCancel({
	className,
	variant = "outline",
	size = "default",
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close> &
	Pick<React.ComponentProps<typeof Button>, "variant" | "size">) {
	return (
		<Button variant={variant} size={size} className={className} asChild>
			<DialogPrimitive.Close data-slot="alert-dialog-cancel" {...props} />
		</Button>
	);
}

export {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogOverlay,
	AlertDialogPortal,
	AlertDialogTitle,
	AlertDialogTrigger,
};
