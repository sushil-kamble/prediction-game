import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
	cleanup();
});

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean })
	.IS_REACT_ACT_ENVIRONMENT = true;

if (typeof window !== "undefined") {
	window.scrollTo = () => undefined;
}

if (typeof HTMLElement !== "undefined") {
	HTMLElement.prototype.scrollIntoView = () => undefined;
}
