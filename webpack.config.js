const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ZoteroLocalePlugin = require('./webpack.zotero-locale-plugin');

function generateReaderConfig(build) {
	let config = {
		name: build,
		mode: build === 'dev' ? 'development' : 'production',
		devtool: (build === 'zotero' || build === 'web') ? false : 'source-map',
		entry: {
			reader: [
				'./src/index.' + build + '.js',
				'./src/common/stylesheets/main.scss'
			]
		},
		output: {
			path: path.resolve(__dirname, './build/' + build),
			filename: 'reader.js',
			libraryTarget: 'umd',
			publicPath: '',
			library: {
				name: 'reader',
				type: 'umd',
				umdNamedDefine: true,
			},
		},
		optimization: {
			minimize: build === 'web',
			minimizer: [new CssMinimizerPlugin(), '...'], // ... is for built-in TerserPlugin https://webpack.js.org/configuration/optimization/#optimizationminimizer
		},
		module: {
			rules: [
				{
					test: /\.(ts|js)x?$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: [
								['@babel/preset-env', {
									useBuiltIns: false,
									targets: build === 'zotero' || build === 'dev'
										? { firefox: 115, chrome: 128 }
										: undefined
								}],
							],
						},
					},
				},
				build === 'dev' && {
					test: /\.tsx?$/,
					exclude: /node_modules/,
					use: 'ts-loader',
				},
				{
					test: /\.s?css$/,
					exclude: path.resolve(__dirname, './src/dom'),
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
						},
						{
							loader: 'postcss-loader',
						},
						{
							loader: 'sass-loader',
							options: {
								additionalData: `$platform: '${build}';`
							}
						},
					],
				},
				{
					test: /\.scss$/,
					include: path.resolve(__dirname, './src/dom'),
					use: [
						{
							loader: 'raw-loader',
						},
						{
							loader: 'sass-loader',
							options: {
								additionalData: `$platform: '${build}';`
							}
						}
					]
				},
				{
					test: /\.svg$/i,
					issuer: /\.[jt]sx?$/,
					use: ['@svgr/webpack'],
				},
				{
					test: /\.ftl$/,
					type: 'asset/source'
				}
			].filter(Boolean)
		},
		resolve: {
			extensions: ['.js', '.ts', '.tsx'],
		},
		plugins: [
			new ZoteroLocalePlugin({
				files: ['zotero.ftl', 'reader.ftl'],
				locales: ['en-US'],
				commitHash: '42b47c54536d418f9b80e11ce55be5ff5e86b79c',
			}),
			new CleanWebpackPlugin({
				cleanOnceBeforeBuildPatterns: ['**/*', '!pdf/**']
			}),
			new MiniCssExtractPlugin({
				filename: '[name].css',
			}),
			new HtmlWebpackPlugin({
				template: './index.reader.html',
				filename: './[name].html',
				templateParameters: {
					build
				},
			}),
			new CopyWebpackPlugin({
				patterns: [
					{
						from: 'node_modules/mathjax-full/ts/output/chtml/fonts/tex-woff-v2/*.woff',
						to: './mathjax-fonts/[name].woff'
					}
				],
			}),
		],
	};

	if (build === 'zotero') {
		config.externals = {
			react: 'React',
			'react-dom': 'ReactDOM',
			'prop-types': 'PropTypes'
		};
	}
	else if (build === 'web') {
		config.externals = {
			// No support for importing EPUB annotations on the web, so no need for luaparse there
			luaparse: 'luaparse',
		};
	}
	else if (build === 'dev') {
		config.plugins.push(
			new CopyWebpackPlugin({
				patterns: [
					{ from: 'demo/epub/demo.epub', to: './' },
					{ from: 'demo/pdf/demo.pdf', to: './' },
					{ from: 'demo/snapshot/demo.html', to: './' }
				],
				options: {

				}
			})
		);
		config.devServer = {
			static: {
				directory: path.resolve(__dirname, 'build/'),
				watch: true,
			},
			devMiddleware: {
				writeToDisk: true,
			},
			open: ['/dev/reader.html?view=library'],
			port: 3000,
			setupMiddlewares: (middlewares, devServer) => {
				if (!devServer) {
					throw new Error('webpack-dev-server is not defined');
				}

				const app = devServer.app;
				const libraryPath = path.resolve(__dirname, 'library');

				if (!fs.existsSync(libraryPath)) {
					fs.mkdirSync(libraryPath);
				}

				app.use(require('express').json());

				// Helper to save metadata
				const saveMetadata = (id, metadata) => {
					const dir = path.join(libraryPath, id);
					if (!fs.existsSync(dir)) fs.mkdirSync(dir);
					fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
				};

				// GET /api/library
				app.get('/api/library', (req, res) => {
					console.log('GET /api/library request received');
					const items = [];
					if (fs.existsSync(libraryPath)) {
						const dirs = fs.readdirSync(libraryPath);
						console.log(`Found ${dirs.length} directories in library`);
						for (const dir of dirs) {
							if (dir.startsWith('.')) continue; // Skip hidden files
							const metaPath = path.join(libraryPath, dir, 'metadata.json');
							if (fs.existsSync(metaPath)) {
								try {
									const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
									items.push({ id: dir, ...metadata });
								} catch (e) {
									console.error(`Failed to parse metadata for ${dir}:`, e);
								}
							} else {
								console.warn(`No metadata found for ${dir}`);
							}
						}
					} else {
						console.warn('Library directory does not exist');
					}
					console.log(`Returning ${items.length} items`);
					res.json(items);
				});

				// GET /api/library/:id/metadata
				app.get('/api/library/:id/metadata', (req, res) => {
					const { id } = req.params;
					const metaPath = path.join(libraryPath, id, 'metadata.json');
					if (fs.existsSync(metaPath)) {
						try {
							const metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
							res.json(metadata);
						} catch (e) {
							res.status(500).json({ error: 'Failed to parse metadata' });
						}
					} else {
						res.status(404).json({ error: 'Metadata not found' });
					}
				});

				// POST /api/import
				app.post('/api/import', require('express').json(), async (req, res) => {
					const { url } = req.body;
					if (!url) return res.status(400).json({ error: 'URL is required' });

					console.log(`Importing URL: ${url}`);
					const id = crypto.randomUUID();
					const dir = path.join(libraryPath, id);
					if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

					try {
						// Use a simple fetch-like implementation with https
						const fetchUrl = (inputUrl) => {
							return new Promise((resolve, reject) => {
								const req = https.get(inputUrl, {
									headers: {
										'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
									}
								}, (res) => {
									if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
										// Handle redirect
										console.log(`Redirecting to ${res.headers.location}`);
										resolve(fetchUrl(new URL(res.headers.location, inputUrl).toString()));
										return;
									}
									if (res.statusCode !== 200) {
										reject(new Error(`Failed to fetch: ${res.statusCode}`));
										return;
									}
									let data = '';
									res.on('data', chunk => data += chunk);
									res.on('end', () => resolve(data));
								});
								req.on('error', reject);
							});
						};

						let html = await fetchUrl(url);

						// Process HTML: Rewrite relative links and remove base tag
						// Remove <base> tag to prevent relative link issues
						html = html.replace(/<base\s+href=["'][^"']*["']\s*\/?>/i, '');

						// Remove Content-Security-Policy meta tags that may block resources
						// SingleFile and other tools often add restrictive CSP that prevents proper rendering
						// Handle both double and single quoted content attributes, and both attribute orders
						html = html.replace(/<meta\s+http-equiv=["']?content-security-policy["']?\s+content="[^"]*"\s*\/?>/gi, '');
						html = html.replace(/<meta\s+http-equiv=["']?content-security-policy["']?\s+content='[^']*'\s*\/?>/gi, '');
						html = html.replace(/<meta\s+content="[^"]*"\s+http-equiv=["']?content-security-policy["']?\s*\/?>/gi, '');
						html = html.replace(/<meta\s+content='[^']*'\s+http-equiv=["']?content-security-policy["']?\s*\/?>/gi, '');

						// Remove all <script> tags to prevent execution errors and CSP issues
						// (Script stripping disabled to allow rendering of complex HTML like arXiv papers)

						// Rewrite relative links to absolute URLs (basic implementation)
						// This is a simple regex-based replacement and might not cover all cases
						// A proper HTML parser would be better for production
						const baseUrlObj = new URL(url);
						html = html.replace(/(href|src)=["']([^"']+)["']/g, (match, attr, path) => {
							if (path.startsWith('http') || path.startsWith('//') || path.startsWith('data:')) {
								return match;
							}
							try {
								const absoluteUrl = new URL(path, baseUrlObj.href).href;
								return `${attr}="${absoluteUrl}"`;
							} catch (e) {
								return match;
							}
						});

						// Extract title - try multiple sources for better compatibility
						let title = url;
						// Try <title> tag first (use [\s\S] to match across newlines)
						const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
						if (titleMatch && titleMatch[1].trim()) {
							title = titleMatch[1].trim().replace(/\s+/g, ' ');
						}
						// Fallback: try og:title meta tag
						if (title === url) {
							const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
								|| html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
							if (ogTitleMatch && ogTitleMatch[1].trim()) {
								title = ogTitleMatch[1].trim();
							}
						}
						// Fallback: try first h1 tag
						if (title === url) {
							const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
							if (h1Match && h1Match[1].trim()) {
								// Strip HTML tags from h1 content
								title = h1Match[1].replace(/<[^>]+>/g, '').trim().replace(/\s+/g, ' ');
							}
						}

						const metadata = {
							id,
							title,
							url,
							importedDate: new Date().toISOString(),
							tags: []
						};

						fs.writeFileSync(path.join(dir, 'index.html'), html);
						fs.writeFileSync(path.join(dir, 'metadata.json'), JSON.stringify(metadata, null, 2));
						fs.writeFileSync(path.join(dir, 'annotations.json'), '[]');

						console.log(`Imported successfully: ${id}`);
						res.json(metadata);
					} catch (error) {
						console.error('Import failed:', error);
						// Cleanup
						if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
						res.status(500).json({ error: 'Failed to fetch URL: ' + error.message });
					}
				});

				// POST /api/library/:id/metadata
				app.post('/api/library/:id/metadata', (req, res) => {
					const { id } = req.params;
					const dir = path.join(libraryPath, id);
					if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });

					const metaPath = path.join(libraryPath, id, 'metadata.json');
					const currentMeta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
					const newMeta = { ...currentMeta, ...req.body };

					fs.writeFileSync(metaPath, JSON.stringify(newMeta, null, 2));
					res.json(newMeta);
				});

				// DELETE /api/library/:id
				app.delete('/api/library/:id', (req, res) => {
					const { id } = req.params;
					const dir = path.join(libraryPath, id);
					if (fs.existsSync(dir)) {
						fs.rmSync(dir, { recursive: true, force: true });
					}
					res.json({ success: true });
				});

				// GET /api/library/:id/annotations
				app.get('/api/library/:id/annotations', (req, res) => {
					const { id } = req.params;
					const filePath = path.join(libraryPath, id, 'annotations.json');
					if (fs.existsSync(filePath)) {
						res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
					} else {
						res.json([]);
					}
				});

				// POST /api/library/:id/annotations
				app.post('/api/library/:id/annotations', (req, res) => {
					const { id } = req.params;
					const dir = path.join(libraryPath, id);
					if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });

					const filePath = path.join(dir, 'annotations.json');
					let currentAnnotations = [];
					if (fs.existsSync(filePath)) {
						try {
							currentAnnotations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
						} catch (e) {
							console.error('Failed to parse annotations:', e);
						}
					}

					const newAnnotations = req.body; // Array of updated/new annotations
					if (!Array.isArray(newAnnotations)) {
						return res.status(400).json({ error: 'Body must be an array of annotations' });
					}

					// Merge annotations
					for (const newAnn of newAnnotations) {
						const index = currentAnnotations.findIndex(a => a.id === newAnn.id);
						if (index !== -1) {
							currentAnnotations[index] = newAnn;
						} else {
							currentAnnotations.push(newAnn);
						}
					}

					fs.writeFileSync(filePath, JSON.stringify(currentAnnotations, null, 2));
					res.json({ success: true });
				});

				// DELETE /api/library/:id/annotations
				app.delete('/api/library/:id/annotations', (req, res) => {
					const { id } = req.params;
					const dir = path.join(libraryPath, id);
					if (!fs.existsSync(dir)) return res.status(404).json({ error: 'Not found' });

					const filePath = path.join(dir, 'annotations.json');
					let currentAnnotations = [];
					if (fs.existsSync(filePath)) {
						try {
							currentAnnotations = JSON.parse(fs.readFileSync(filePath, 'utf8'));
						} catch (e) {
							console.error('Failed to parse annotations:', e);
						}
					}

					const idsToDelete = req.body; // Array of IDs to delete
					if (!Array.isArray(idsToDelete)) {
						return res.status(400).json({ error: 'Body must be an array of annotation IDs' });
					}

					currentAnnotations = currentAnnotations.filter(a => !idsToDelete.includes(a.id));

					fs.writeFileSync(filePath, JSON.stringify(currentAnnotations, null, 2));
					res.json({ success: true });
				});

				// Serve static files from library
				app.use('/library', require('express').static(libraryPath));

				return middlewares;
			},
		};
	}

	return config;
}

function generateViewConfig(build) {
	let config = {
		name: build,
		mode: build === 'view-dev' ? 'development' : 'production',
		devtool: build === 'web' ? false : 'source-map',
		entry: {
			view: [
				'./src/index.' + build + '.js',
				'./src/common/stylesheets/view.scss'
			],
		},
		output: {
			path: path.resolve(__dirname, './build/' + build),
			filename: 'view.js',
			libraryTarget: 'umd',
			publicPath: '',
			library: {
				name: 'view',
				type: 'umd',
				umdNamedDefine: true,
			},
		},
		optimization: {
			minimize: build === 'web',
			minimizer: [new CssMinimizerPlugin(), '...'], // ... is for built-in TerserPlugin https://webpack.js.org/configuration/optimization/#optimizationminimizer
		},
		module: {
			rules: [
				{
					test: /\.(js|jsx)$/,
					exclude: /node_modules/,
					use: {
						loader: 'babel-loader',
						options: {
							presets: [
								['@babel/preset-env', { useBuiltIns: false }],
							],
						},
					},
				},
				{
					test: /\.tsx?$/,
					exclude: /node_modules/,
					use: {
						loader: 'ts-loader',
						options: {
							compilerOptions: {
								target: 'ES2022'
							}
						}
					},
				},
				{
					test: /\.s?css$/,
					exclude: path.resolve(__dirname, './src/dom'),
					use: [
						MiniCssExtractPlugin.loader,
						{
							loader: 'css-loader',
						},
						{
							loader: 'postcss-loader',
						},
						{
							loader: 'sass-loader',
						},
					]
				},
				{
					test: /\.scss$/,
					include: path.resolve(__dirname, './src/dom'),
					use: [
						{
							loader: 'raw-loader',
						},
						{
							loader: 'sass-loader',
							options: {
								additionalData: `$platform: '${build}';`
							}
						}
					]
				}
			],
		},
		resolve: {
			extensions: ['.js', '.ts', '.tsx']
		},
		plugins: [
			new CleanWebpackPlugin({
				cleanOnceBeforeBuildPatterns: ['**/*', '!pdf/**']
			}),
			new MiniCssExtractPlugin({
				filename: '[name].css',
			}),
			new HtmlWebpackPlugin({
				template: './index.view.html',
				filename: './[name].html',
				templateParameters: {
					build
				},
			}),
		],
	};

	if (build === 'view-dev') {
		config.plugins.push(
			new CopyWebpackPlugin({
				patterns: [
					{ from: 'demo/epub/demo.epub', to: './' },
					{ from: 'demo/snapshot/demo.html', to: './' }
				],
				options: {

				}
			})
		);
		config.devServer = {
			static: {
				directory: path.resolve(__dirname, 'build/'),
				watch: true,
			},
			devMiddleware: {
				writeToDisk: true,
			},
			open: '/view-dev/view.html?type=snapshot',
			port: 3001,
		};
	}

	return config;
}

module.exports = [
	generateReaderConfig('zotero'),
	generateReaderConfig('web'),
	generateReaderConfig('dev'),
	generateViewConfig('ios'),
	generateViewConfig('android'),
	generateViewConfig('view-dev'),
];
