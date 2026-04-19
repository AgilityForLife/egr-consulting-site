#!/usr/bin/env node
/**
 * Submit sitemap URLs to IndexNow (Bing, Yandex, Seznam, Naver).
 * Usage: node scripts/submit-indexnow.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const KEY = '3707c191beed4a19adcdb280fbbf15d2';
const HOST = 'www.egrconsultingservices.com';
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

function extractUrlsFromSitemap(sitemapPath) {
  const xml = fs.readFileSync(sitemapPath, 'utf8');
  const matches = xml.match(/<loc>([^<]+)<\/loc>/g) || [];
  return matches.map(m => m.replace(/<\/?loc>/g, '').trim());
}

function submit(urls) {
  const body = JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  });

  const req = https.request({
    hostname: 'api.indexnow.org',
    port: 443,
    path: '/indexnow',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(body),
    },
  }, res => {
    console.log(`IndexNow response: ${res.statusCode} ${res.statusMessage}`);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      if (data) console.log('Body:', data);
      console.log(`Submitted ${urls.length} URLs`);
    });
  });

  req.on('error', err => console.error('Request error:', err));
  req.write(body);
  req.end();
}

const sitemapPath = path.join(__dirname, '..', 'sitemap.xml');
const urls = extractUrlsFromSitemap(sitemapPath);
console.log(`Found ${urls.length} URLs in sitemap.xml`);
submit(urls);
