'use strict';

const NAME = 'vue_selectbox';

var connect = require('gulp-connect');
var gulp = require('gulp');
var path = require('path');
var pug = require('gulp-pug');
var pug_compiler = require('pug');
var sass = require('gulp-sass')(require('sass'));
var webpackcompiler = require('webpack');
var webpack = require('webpack-stream');

var prod = process.env.develop != 'true' && process.argv.indexOf("--develop") == -1;

gulp.task('scss', function() {
    return gulp.src(['src/*.scss', '!src/scss/_*.scss'])
    .pipe(sass({
        outputStyle: prod ? 'compressed' : 'expanded',
    }).on('error', sass.logError))
    .pipe(gulp.dest('build'))
    .pipe(connect.reload());
});

gulp.task('pug', function() {
    return gulp.src(['src/*.pug', '!src/_*.pug'])
    .pipe(pug({
        pretty: true
    }))
    .pipe(gulp.dest('build'))
    .pipe(connect.reload());
});

gulp.task('js', function() {
    process.env.NODE_ENV = prod ? 'production' : 'develop';

    return gulp.src('src/' + NAME + '.js')
    .pipe(webpack({
        resolve: {
            modules: [
                path.resolve('src'),
                path.resolve('node_modules'),
            ],
        },
        module: {
            rules: [
                {
                    test: /\.pug$/i,
                    loader: 'html-loader',
                    options: {
                        preprocessor: function(c) {
                            return pug_compiler.compile(c, {
                                pretty: false,
                            })({});
                        }
                    }
                }
            ],
        },
        externals: {
            jquery: 'jquery',
        },
        mode: prod ? 'production' : 'development',
        devtool: prod ? false : 'cheap-source-map',
        output: {
            filename: NAME + '.js',
            library: {
                type: 'umd',
                name: 'vue_selectbox',
            },
        }
    }, webpackcompiler))
    .pipe(gulp.dest('dist'))
    .pipe(connect.reload());
});

gulp.task('compile', gulp.parallel('pug', 'scss', 'js'));

gulp.task('compile_prod', gulp.series(async function() {
    //force prod to be true
    prod = true;
}, 'compile'));

gulp.task('watch', gulp.series('compile', function() {
    //force prod to be false
    prod = false;

    gulp.watch(['src/*.scss'], gulp.parallel('scss'));
    gulp.watch(['src/*.pug'], gulp.parallel('pug', 'js'));
    gulp.watch(['src/*.js'], gulp.parallel('js'));

    connect.server({
        livereload: true,
        port: 8000,
    });
}));

gulp.task('default', gulp.parallel('watch'));
