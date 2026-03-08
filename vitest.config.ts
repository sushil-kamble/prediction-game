import { defineConfig, defineProject } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [tsconfigPaths({ projects: ["./tsconfig.json"] })],
	test: {
		projects: [
			defineProject({
				test: {
					name: "node",
					environment: "node",
					include: ["shared/**/*.test.ts", "src/**/*.test.ts"],
				},
			}),
			defineProject({
				test: {
					name: "jsdom",
					environment: "jsdom",
					setupFiles: ["./src/test/setup.ts"],
					include: ["src/**/*.test.tsx"],
				},
			}),
		],
	},
});
