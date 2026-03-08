import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomSheet } from "./ui";

describe("bottom sheet", () => {
	it("closes when the overlay is clicked", () => {
		const onClose = vi.fn();

		render(
			<BottomSheet
				open
				onClose={onClose}
				title="Share challenge"
				description="Dismiss me from outside."
			/>
		);

		const overlay = document.body.querySelector("[data-slot='sheet-overlay']");

		expect(overlay).not.toBeNull();
		fireEvent.pointerDown(overlay as Element);
		fireEvent.click(overlay as Element);

		expect(onClose).toHaveBeenCalled();
	});
});
