module.exports = function(grunt) {

    grunt.initConfig({

        version: grunt.file.readJSON('package.json').version,
        coveralls: {
            options: {
                coverage_dir: 'coverage/'
            }
        }

    })

    grunt.loadNpmTasks('grunt-karma-coveralls')
    grunt.loadNpmTasks('grunt-saucelabs')
    grunt.loadNpmTasks('grunt-contrib-watch')
    grunt.loadNpmTasks('grunt-contrib-jshint')
    grunt.loadNpmTasks('grunt-contrib-connect')

    // load custom tasks
    grunt.file.recurse('tasks', function(path) {
        require('./' + path)(grunt)
    })

    grunt.registerTask('default', [
        'build'
    ])

}