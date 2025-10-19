module.exports = function (options, webpack) {
  return {
    ...options,
    externals: {
      // Externalize bcrypt to avoid bundling native modules
      'bcrypt': 'commonjs2 bcrypt',
      '@mapbox/node-pre-gyp': 'commonjs2 @mapbox/node-pre-gyp',
    },
    module: {
      rules: [
        ...options.module.rules,
        {
          test: /\.html$/,
          loader: 'ignore-loader',
        },
      ],
    },
    plugins: [
      ...options.plugins,
      new webpack.IgnorePlugin({
        resourceRegExp: /^(mock-aws-s3|aws-sdk|nock)$/,
      }),
    ],
  };
};

