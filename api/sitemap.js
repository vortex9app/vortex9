const { buildSitemap } = require('./_syndication');

module.exports = (req, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.status(200).send(buildSitemap());
};
