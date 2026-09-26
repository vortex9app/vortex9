const fs = require('fs');
const path = require('path');
const {
  buildRss,
  buildAtom,
  buildSitemap,
  buildRobots,
  pingWebSub
} = require('../api/_syndication');

const root = path.join(__dirname, '..');

async function main() {
  fs.writeFileSync(path.join(root, 'feed.xml'), buildRss());
  fs.writeFileSync(path.join(root, 'atom.xml'), buildAtom());
  fs.writeFileSync(path.join(root, 'sitemap.xml'), buildSitemap());
  fs.writeFileSync(path.join(root, 'robots.txt'), buildRobots());

  if (process.env.SYNDICATION_PING === '1') {
    await pingWebSub();
  }

  console.log('Wrote feed.xml, atom.xml, sitemap.xml, and robots.txt');
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
