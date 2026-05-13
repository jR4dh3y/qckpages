export type ThemeMode = 'light' | 'dark';

const storageKey = 'qckpages-theme';

class ThemeController {
	mode = $state<ThemeMode>('light');

	init(): void {
		let stored: string | null;
		let preferredDark = false;

		try {
			stored = window.localStorage.getItem(storageKey);
			preferredDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		} catch {
			stored = document.documentElement.dataset.theme ?? null;
		}

		this.mode = stored === 'light' || stored === 'dark' ? stored : preferredDark ? 'dark' : 'light';
		this.apply();
	}

	toggle(): void {
		this.mode = this.mode === 'dark' ? 'light' : 'dark';
		try {
			window.localStorage.setItem(storageKey, this.mode);
		} catch {
			// Theme still applies for this page even if storage is unavailable.
		}
		this.apply();
	}

	private apply(): void {
		document.documentElement.dataset.theme = this.mode;
	}
}

export const theme = new ThemeController();
