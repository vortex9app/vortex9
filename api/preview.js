const { getSharePayload, buildPreviewHtml } = require('./_syndication');

function readQuery(req) {
  try {
    return new URL(req.url, 'https://mystic9.net').searchParams;
  } catch (err) {
    return new URLSearchParams();
  }
}

module.exports = (req, res) => {
  const params = readQuery(req);
  const payload = getSharePayload({
    articleId: params.get('article') || params.get('library') || '',
    portalId: params.get('portal') || params.get('view') || ''
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.status(200).send(buildPreviewHtml(payload));
};
