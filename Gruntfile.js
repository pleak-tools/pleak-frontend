module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt);

  var path = require('path');

  /**
   * Resolve external project resource as file path
   */
  function resolvePath(project, file) {
    return path.join(path.dirname(require.resolve(project)), file);
  }

  // project configuration
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    config: {
      sources: 'modeler',
      dist: 'dist'
    },

    // clean dist directory before build
    clean: ['dist'],


    copy: {
      workspace_fonts: {
        files: [
          {
            expand: true,
            cwd: 'node_modules/bootstrap/dist/fonts/',
            src: '*',
            dest: 'dist/workspace/fonts/'
          }
        ]
      },

      modeler_fonts: {
        files: [
          {
            expand: true,
            cwd: 'node_modules/bootstrap/dist/fonts/',
            src: '*',
            dest: 'dist/modeler/fonts/'
          },
          {
            expand: true,
            cwd: 'modeler/fonts/',
            src: '*',
            dest: 'dist/modeler/fonts/'
          },
          {
            expand: true,
            cwd: 'node_modules/bpmn-js/assets/bpmn-font/font/',
            src: '*',
            dest: 'dist/modeler/css/font/'
          }
        ]
      },
      modeler_files: {
        files: [
          {
            expand: true,
            cwd: '<%= config.sources %>/',
            src: 'index.html',
            dest: '<%= config.dist %>/modeler/'
          }
        ]
      },
    },


    concat: {
      options: {
        separator: ';',
      },

      workspace_css: {
        src: [
          'node_modules/bootstrap/dist/css/bootstrap.min.css',
          'node_modules/html5-boilerplate/dist/css/normalize.css',
          'node_modules/html5-boilerplate/dist/css/main.css',
          'app/main.css',
        ],
        dest: 'dist/workspace/css/styles.css'
      },

      workspace_js: {
        src: [
          'node_modules/jquery/dist/jquery.js',
          'node_modules/bootstrap/dist/js/bootstrap.js',
          'node_modules/html5-boilerplate/dist/js/vendor/modernizr-2.8.3.min.js',
          'node_modules/angular/angular.js',
          'node_modules/angular-animate/angular-animate.js',
          'node_modules/angular-route/angular-route.js',
          'node_modules/ngstorage/ngStorage.js',
          'node_modules/jwt-decode/build/jwt-decode.js',
          'bower_components/bpmn-js/dist/bpmn-navigated-viewer.js'
        ],
        dest: 'dist/workspace/includes.js'
      },

      modeler_css_includes: {
        src: [
          'node_modules/diagram-js/assets/diagram-js.css',
          'node_modules/bpmn-js/assets/bpmn-font/css/bpmn.css',
          'node_modules/bpmn-js/assets/bpmn-font/css/bpmn-embedded.css',
          'node_modules/bootstrap/dist/css/bootstrap.min.css'
        ],
        dest: 'dist/modeler/css/styles.css'
      },

      modeler_css_custom: {
        src: [
          'modeler/css/modeler.css',
          'modeler/css/buttons.css',
          'modeler/css/matrices.css',
          'modeler/css/comments.css',
          'modeler/css/app.css'
        ],
        dest: 'dist/modeler/css/custom.css'
      },

      modeler_js: {
        src: [
          'node_modules/jquery/dist/jquery.js',
          'node_modules/bootstrap/dist/js/bootstrap.js'
        ],
        dest: 'dist/modeler/includes.js'
      },

    },


    browserify: {
      options: {
        browserifyOptions: {
          debug: true,
          insertGlobalVars: []
        },
        transform: [ 'brfs' ]
      },
      modeler: {
        files: {
          '<%= config.dist %>/modeler/modeler.js': [ '<%= config.sources %>/**/*.js' ]
        }
      }
    },

    uglify: {
      workspace_includes: {
        files: {
          'dist/workspace/includes.min.js': ['dist/workspace/includes.js']
        }
      },
      modeler_includes: {
        files: {
          'dist/modeler/includes.min.js': ['dist/modeler/includes.js']
        }
      },
      modeler: {
        options: {
          mangle: false
        },
        files: {
          'dist/modeler/modeler.min.js': ['dist/modeler/modeler.js']
        }
      }
    }

  });

  // tasks
  grunt.registerTask('workspace_build', [ 'copy:workspace_fonts', 'concat:workspace_css', 'concat:workspace_js', 'uglify:workspace_includes']);
  grunt.registerTask('modeler_build', [ 'copy:modeler_files', 'copy:modeler_fonts', 'concat:modeler_css_includes', 'concat:modeler_css_custom', 'concat:modeler_js', 'uglify:modeler_includes', 'browserify', 'uglify:modeler']);

  grunt.registerTask('build', [ 'clean', 'workspace_build', 'modeler_build' ]);

};
