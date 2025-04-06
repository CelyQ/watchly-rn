module.exports = {
	extends: ['expo', 'prettier'],
	plugins: ['prettier', '@stylistic/eslint-plugin-js'],
	rules: {
		'prettier/prettier': 'warn',
		'@stylistic/js/indent': ['error', 2]
	}
};
