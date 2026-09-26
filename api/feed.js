const { buildRss, buildAtom, HUB_URL, SITE_URL, FEED_PATH } = require('./_syndication');

function readFormat(req) {
  try {
    const url = new URL(req.url, SITE_URL);
    const format = String(url.searchParams.get('format') || '').toLowerCase();
    if (format === 'atom' || url.pathname.includes('atom')) return 'atom';
  } catch (err) { /* default rss */ }
  return 'rss';
}

module.exports = (req, res) => {
  const format = readFormat(req);
  const xml = format === 'atom' ? buildAtom() : buildRss();
  const type = format === 'atom'
    ? 'application/atom+xml; charset=utf-8'
    : 'application/rss+xml; charset=utf-8';
  const selfUrl = `${SITE_URL}${format === 'atom' ? '/atom.xml' : FEED_PATH}`;

  res.setHeader('Content-Type', type);
  res.setHeader('Cache-Control', 'public, max-age=300, must-revalidate');
  res.setHeader('Link', `<${HUB_URL}>; rel="hub", <${selfUrl}>; rel="self"`);
  res.status(200).send(xml);
};
