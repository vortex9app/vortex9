const { pingWebSub, SITE_URL, FEED_PATH } = require('./_syndication');

module.exports = async (req, res) => {
  let hub = 'skipped';
  try {
    await pingWebSub();
    hub = 'pinged';
  } catch (err) {
    hub = 'failed';
  }
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({
    ok: true,
    site: SITE_URL,
    feed: `${SITE_URL}${FEED_PATH}`,
    hub,
    at: new Date().toISOString()
  });
};
