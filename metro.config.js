const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const ALIASES = {
	"@": __dirname,
};

config.resolver.unstable_enablePackageExports = true;
config.resolver.resolveRequest = (context, moduleName, platform) => {
	// Ensure you call the default resolver.
	return context.resolveRequest(
		context,
		// Use an alias if one exists.
		ALIASES[moduleName] ?? moduleName,
		platform,
	);
};

// Block deeply nested node_modules to prevent ENOENT errors on Windows
config.watchFolders = [__dirname];
config.resolver.blockList = [
	// Block nested node_modules beyond 2 levels deep
	/.*\/node_modules\/.*\/node_modules\/.*\/node_modules\/.*/,
];

module.exports = config;
