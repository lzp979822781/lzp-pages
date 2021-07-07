const {src, dest, parallel, series, watch} = require('gulp');

const gutil = require('gulp-util');

const gulpLoadPlugins = require('gulp-load-plugins');
const plugins = gulpLoadPlugins();
// const sass = require('gulp-sass')(require('sass'));

const browserSync = require('browser-sync');
const browserServer = browserSync.create();

const cwd = process.cwd();
let config = {
	build: {
		src: 'src',
		dist: 'dist',
		public: 'public',
		temp: 'temp',
		paths: {
			styles: 'assets/styles/*.scss',
			scripts: 'assets/scripts/*.js',
			pages: '*.html',
			images: 'assets/images/**',
			fonts: 'assets/fonts/**'
		}
	}
};



try {
    const loadConfig = require(`${cwd}/pages.config.js`);
    config = Object.assign({}, config, loadConfig);
}catch(e) {
    console.log('require pages.config.js', e);
}

const del = require('del');



const basePath = config.build.src;
const tempPath = config.build.temp;
const distPath = config.build.dist;

const clean = () => {
	return del([distPath, tempPath]);
};


const style = () => {
	return src(config.build.paths.styles, {base: basePath, cwd: basePath})
		.pipe(plugins.sass(require('sass'))().on('error', plugins.sass(require('sass')).logError))
		.pipe(dest(tempPath))
		.pipe(browserServer.reload({stream: true}));
};

const script = () => {
	return src(config.build.paths.scripts, {base: basePath, cwd: basePath})
		.pipe(plugins.babel({ presets: [require('@babel/preset-env')]}))
		.pipe(dest(tempPath))
		.pipe(browserServer.reload({stream: true}));
};

const page = () => {
	return src(config.build.paths.pages, {base: basePath, cwd: basePath})
		.pipe(plugins.swig({ data: config.data, defaults: {cache: false}}))
		.pipe(dest(tempPath))
		.pipe(browserServer.reload({stream: true}));
};

const image = () => {
	return src(config.build.paths.images, {base: basePath, cwd: basePath})
		.pipe(plugins.imagemin())
		.pipe(dest(distPath));
};

const font = () => {
	return src(config.build.paths.fonts, {base: basePath, cwd: basePath})
		.pipe(plugins.imagemin())
		.pipe(dest(distPath));
};

// 处理public目录
const extra = () => {
	return src('**', { base: config.build.public, cwd: config.build.public })
		.pipe(dest(distPath));
};

const serve = () => {
	watch(config.build.paths.styles, {cwd: basePath}, style);
	watch(config.build.paths.scripts, {cwd: basePath}, script);
	watch(config.build.paths.pages, {cwd: basePath}, page);

	watch([
		config.build.paths.images,
		config.build.paths.fonts
	], {cwd: basePath}, browserServer.reload);
	watch([
		config.build.paths.pages
	], {cwd: config.build.public}, browserServer.reload);
	browserServer.init({
		notify: false,
		// files: 'dist/**', // 监听文件变化
		server: {
			baseDir: [tempPath, basePath, config.build.public],
			routes: {
				'/node_modules': 'node_modules'
			}
		}
	})
};

const useref = () => {
	return src(config.build.paths.pages, {cwd: tempPath}, {base: tempPath})
		.pipe(plugins.useref({searchPath: [tempPath, '.']}))
		.pipe(plugins.if(/\.js$/, plugins.babel({
			presets: [require('@babel/preset-env')]
		})))
		.pipe(plugins.if(/\.js$/, plugins.uglify()))
        .on('error', function(err) {
            gutil.log(gutil.colors.red('[Error]'), err.toString());
        })
		.pipe(plugins.if(/\.css$/, plugins.cleanCss()))
		.pipe(plugins.if(/\.html$/, plugins.htmlmin({
			collapseWhitespace: true,
			minifyCSS: true,
			minifyJS: true
		})))
		.pipe(dest(distPath));
};

const compile = parallel(style, script, page);

const build = series(clean, parallel(
	series(compile, useref),
	image,
	font,
	extra
));

const dev = series(compile, serve);

module.exports = {
	clean,
	build,
	dev
};