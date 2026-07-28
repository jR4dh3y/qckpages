export const CLI_INSTALL_COMMANDS = {
	unix: 'curl -fsSL https://github.com/jR4dh3y/qckpages/releases/latest/download/install.sh | bash',
	windows:
		'iwr -useb https://github.com/jR4dh3y/qckpages/releases/latest/download/install.ps1 | iex'
} as const;

export type CliInstallPlatform = keyof typeof CLI_INSTALL_COMMANDS;
