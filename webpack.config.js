var path = require('path');

module.exports = {
    entry: './index.js',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'ens-utils.js',
        library: 'ens',
        libraryTarget: 'var',
    },
    mode: 'production',
};