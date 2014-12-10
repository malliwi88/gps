'use strict';


module.exports = {
		build: {
	      options: {
	          cleancss: true
	      },
	      files: [{
	          expand: true,
	          cwd: 'public/css',
	          src: ['**/*.less'],
	          dest: 'public/css/',
	          ext: '.css'
	      }]
		}
};
