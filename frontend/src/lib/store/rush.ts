import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type RushState = {
	currentState: 'MENU' | 'PLAYING' | 'GAMEOVER' | 'BLOCKED' | 'DIAGNOSTIC';
	selectedSubject: string;
	selectedSubtopic: string;
	lives: number;
	xp: number; // 🔥 O teu score/xp agora é um só e vive aqui
	streak: number;
	questionData: any;
	blockedUntil: string | null;
	diagnosticQuestions: any[];
	currentDiagnosticIndex: number;
	diagnosticAnswers: { topico: string; acertou: boolean }[];
	totalExercicios: number;
	acertos: number;
	erros: number;
};

const getEmptyState = (): RushState => ({
	currentState: 'MENU',
	selectedSubject: '',
	selectedSubtopic: '',
	lives: 3,
	xp: 0, // 🔥 Começa a zero se não houver nada no storage
	streak: 0,
	questionData: null,
	blockedUntil: null,
	diagnosticQuestions: [],
	currentDiagnosticIndex: 0,
	diagnosticAnswers: [],
	totalExercicios: 0,
	acertos: 0,
	erros: 0
});

function createRushStore() {
	const { subscribe, set, update } = writable<RushState>(getEmptyState());
	let studentKey = '';

	function save(state: RushState) {
		if (!browser || !studentKey) return;
		localStorage.setItem(studentKey, JSON.stringify(state));
	}

	return {
		subscribe,
		init: (studentId: string) => {
			if (!browser) return getEmptyState();
			studentKey = `rush_state_${studentId}`;
			const saved = localStorage.getItem(studentKey);
			if (saved) {
				const parsed = JSON.parse(saved);
				set(parsed);
				return parsed;
			}
			return getEmptyState();
		},
		set: (state: RushState) => {
			set(state);
			save(state);
		},
		update: (fn: (state: RushState) => RushState) =>
			update((state) => {
				const newState = fn(state);
				save(newState);
				return newState;
			}),
		// No teu rushStore.ts, altera a função clear:
		clear: () => {
			update((s) => {
				const freshState = getEmptyState();
				// 🔥 Mantemos o XP e as estatísticas globais, resetamos o resto
				const savedProgress = {
					...freshState,
					xp: s.xp,
					acertos: s.acertos,
					erros: s.erros,
					totalExercicios: s.totalExercicios
				};
				if (browser && studentKey) {
					localStorage.setItem(studentKey, JSON.stringify(savedProgress));
				}
				return savedProgress;
			});
		}
	};
}

export const rushStore = createRushStore();
