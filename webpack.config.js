const path = require('path')
const webpack = require("webpack");

module.exports = {
    entry: path.join(__dirname, '/src/core.js'),
    output: {
        path: path.join(__dirname + '/dist/'),
        filename: 'core.js'
    },
    module: {
        rules: []
    },
    plugins: [
        new webpack.HotModuleReplacementPlugin(),
      
    ],
    devServer: {
        contentBase: './',
        historyApiFallback:true,
        inline: true,
        hot: true,
        port: 8888,

    }
}