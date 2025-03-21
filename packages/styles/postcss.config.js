const PREFIX = 'lk';

module.exports = {
  plugins: [
    require('postcss-prefixer')({
      prefix: `${PREFIX}-`,
      ignore: [`\\[class\\*=" ${PREFIX}-"\\]`, /\.ant-/, /\.unprefix-/],
    }),
    require('postcss-variables-prefixer')({
      prefix: `${PREFIX}-`,
      ignore: [/--dst/],
    }),
    require('./postcss-plugins/data-attribute-prefixer')({ prefix: `${PREFIX}-` }),
  ],
};
