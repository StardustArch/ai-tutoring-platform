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
}