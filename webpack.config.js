const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const TerserPlugin = require('terser-webpack-plugin');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Включаем минификацию
  config.optimization = {
    ...config.optimization,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
          format: {
            comments: false,
          },
        },
        extractComments: false,
      }),
    ],
  };

  return config;
};
