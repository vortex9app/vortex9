'use strict';

const https = require('https');

const MAX_BODY = 65536;

function assertHttps(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') throw new Error('TLS required');
  return url;
}

function readBody(res) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    res.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        res.destroy();
        reject(new Error('response too large'));
        return;
      }
      chunks.push(chunk);
    });
    res.on('end', () => resolve(Buffer.concat(chunks)));
    res.on('error', reject);
  });
}

function requestJson(value, options, redirects) {
  const url = assertHttps(value);
  const settings = options || {};
  const hops = redirects || 0;
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: settings.method || 'GET',
      headers: settings.headers,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: url.hostname,
      timeout: 12000
    }, (res) => {
      const status = res.statusCode || 0;
      if (status >= 300 && status < 400 && res.headers.location) {
        res.resume();
        if ((settings.method || 'GET') !== 'GET' || hops >= 2) {
          reject(new Error('redirect refused'));
          return;
        }
        let next;
        try {
          next = new URL(res.headers.location, url);
        } catch (err) {
          reject(err);
          return;
        }
        requestJson(next.toString(), { method: 'GET', headers: settings.headers }, hops + 1).then(resolve, reject);
        return;
      }
      readBody(res).then((body) => {
        resolve({ status, json: JSON.parse(body.toString('utf8')) });
      }).catch(reject);
    });
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    if (settings.body) req.write(settings.body);
    req.end();
  });
}

module.exports = { assertHttps, requestJson };
