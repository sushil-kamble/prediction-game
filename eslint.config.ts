import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default tseslint.config(
	{
		ignores: [
			"src/routeTree.gen.ts",
			"convex/_generated/**",
			"dist/**",
			".output/**",
			".vinxi/**",
			"node_modules/**",
		],
	},
	{
		extends: [js.configs.recommended, ...tseslint.configs.recommended],
		files: ["**/*.{ts,tsx}"],
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.es2022,
			},
		},
		plugins: {
			"react-hooks": reactHooks,
			"react-refresh": reactRefresh,
		},
		rules: {
			...reactHooks.configs["recommended-latest"].rules,
			"react-refresh/only-export-components": [
				"warn",
				{ allowConstantExport: true },
			],
		},
	},
	// TanStack Start route files export loaders + components — suppress fast-refresh warning
	{
		files: ["src/routes/**/*.{ts,tsx}"],
		rules: {
			"react-refresh/only-export-components": "off",
		},
	},
	prettierConfig
);
