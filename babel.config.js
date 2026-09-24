module.exports = function (api) {
  // Release builds drop console.log/info/debug; errors and warnings stay
  const production = api.env('production');
  return {
    presets: ['babel-preset-expo'],
    plugins: production ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : [],
  };
};
