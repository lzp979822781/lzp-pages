#!/usr/bin/env node

const {src, dest, parallel, series, watch} = require('gulp');

const gutil = require('gulp-util');

const gulpLoadPlugins = require('gulp-load-plugins');
const plugins = gulpLoadPlugins();
// const sass = require('gulp-sass')(require('sass'));

const browserSync = require('browser-sync');
const browserServer = browserSync.create();

const cwd = process.cwd();
let config = {};

try {
    const loadConfig = require(`${cwd}/pages.config.js`);
    config = Object.assign({}, config, loadConfig);
}catch(e) {
    console.log('require pages.config.js', e);
}

const del = require('del');

const clean = () => {
	return del(['dist', 'temp']);
};

const style = () => {
	return src('src/assets/styles/*.scss', {base: 'src'})
		.pipe(plugins.sass(require('sass'))().on('error', plugins.sass(require('sass')).logError))
		.pipe(dest('temp'))
		.pipe(browserServer.reload({stream: true}));
};

const script = () => {
	return src('src/assets/scripts/*.js', {base: 'src'})
		.pipe(plugins.babel({ presets: [require('@babel/preset-env')]}))
		.pipe(dest('temp'))
		.pipe(browserServer.reload({stream: true}));
};

const page = () => {
	return src('src/*.html', {base: 'src'})
		.pipe(plugins.swig({ data: config.data, defaults: {cache: false}}))
		.pipe(dest('temp'))
		.pipe(browserServer.reload({stream: true}));
};

const image = () => {
	return src('src/assets/images/**', {base: 'src'})
		.pipe(plugins.imagemin())
		.pipe(dest('dist'));
};

const font = () => {
	return src('src/assets/fonts/**', {base: 'src'})
		.pipe(plugins.imagemin())
		.pipe(dest('dist'));
};

// 处理public目录
const extra = () => {
	return src('public/**', { base: 'public' })
		.pipe(dest('dist'));
};

const serve = () => {
	watch('src/assets/styles/**', style);
	watch('src/assets/scripts/**', script);
	watch('src/*.html', page);

	watch([
		'src/assets/images/**',
		'src/assets/fonts/**',
		'public/**'
	], browserServer.reload);
	browserServer.init({
		notify: false,
		// files: 'dist/**', // 监听文件变化
		server: {
			baseDir: ['temp/', 'src', 'public'],
			routes: {
				'/node_modules': 'node_modules'
			}
		}
	})
};

const useref = () => {
	return src('temp/*.html', {base: 'temp'})
		.pipe(plugins.useref({searchPath: ['temp', '.']}))
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
		.pipe(dest('dist'));
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