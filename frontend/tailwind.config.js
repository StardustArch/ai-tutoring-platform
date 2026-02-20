// tailwind.config.js
import { join } from 'path';
import { skeleton } from '@skeletonlabs/tw-plugin';

/** @type {import('tailwindcss').Config} */
export default {
	darkMode: 'class', // Isso é importante!
	content: [
		'./src/**/*.{html,js,svelte,ts}',
		join(require.resolve('@skeletonlabs/skeleton'), '../**/*.{html,js,svelte,ts}')
	],
	theme: {
		extend: {},
	},
	experimental: {
		optimizeUniversalDefaults: false
	},
	future: {
		hoverOnlyWhenSupported: true
	},
	plugins: [
		skeleton({
			themes: {
				preset: [
					"wintry",
					"modern",
					"hamlindigo",
					"cerberus",
					"mint"
				]
			}
		})
	],
	safelist: [
		{
			pattern: /bg-(red|green|blue|yellow|purple|orange|teal|cyan|slate)-(100|200|300|400|500|600|700|800)/,
		}
	]

}