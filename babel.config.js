module.exports = (api) => {
	api.cache(true);
	
	// Check environment using process.env to avoid cache conflicts with api.env()
	const isProduction = process.env.NODE_ENV === "production" || process.env.BABEL_ENV === "production";
	
	const plugins = [
		"react-compiler",
		[
			"module-resolver",
			{
				root: ["."],
				alias: {
					"@": ".",
				},
			},
		],
	];

	// Remove console statements in production builds
	if (isProduction) {
		plugins.push(["transform-remove-console", { exclude: ["error", "warn"] }]);
	}

	return {
		presets: ["babel-preset-expo"],
		plugins,
	};
};
