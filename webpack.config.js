const { resolve } = require('path');

module.exports = {
	entry: './index.tsx',
	output: {
		filename: 'main.js',
		path: resolve(__dirname, './public/dist'),
		publicPath: '/dist',
	},
	resolve: {
		extensions: ['.js', '.jsx', '.ts', '.tsx'],
	},
	context: resolve(__dirname, './src'),
	mode: 'development',
	devServer: {
		hot: true,
		historyApiFallback: true,
		static: [resolve(__dirname, 'public')],
		port: 3334,
	},
	module: {
		rules: [
			{
				test: [/\.ts?$/, /\.tsx?$/],
				use: ['ts-loader'],
				exclude: /node_modules/,
			},
		],
	},
};
