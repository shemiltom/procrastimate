const { formatReference } = require('../src/services/references.js');

process.stdout.write(formatReference(process.argv[2] || '') + '\n');
