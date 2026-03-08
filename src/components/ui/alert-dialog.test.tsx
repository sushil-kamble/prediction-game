import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
	AlertDialog,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogTitle,
} from "./alert-dialog";

describe("alert dialog", () => {
	it("closes when the overlay is clicked", () => {
		const onOpenChange = vi.fn();

		render(
			<AlertDialog open onOpenChange={onOpenChange}>
				<AlertDialogContent>
					<AlertDialogTitle>Confirm change</AlertDialogTitle>
					<AlertDialogDescription>Close me on overlay click.</AlertDialogDescription>
				</AlertDialogContent>
			</AlertDialog>
		);

		const overlay = document.body.querySelector(
			"[data-slot='alert-dialog-overlay']"
		);

		expect(overlay).not.toBeNull();
		fireEvent.pointerDown(overlay as Element);
		fireEvent.click(overlay as Element);

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("closes when escape is pressed", () => {
		const onOpenChange = vi.fn();

		render(
			<AlertDialog open onOpenChange={onOpenChange}>
				<AlertDialogContent>
					<AlertDialogTitle>Confirm change</AlertDialogTitle>
					<AlertDialogDescription>Close me on escape.</AlertDialogDescription>
				</AlertDialogContent>
			</AlertDialog>
		);

		fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});
});
