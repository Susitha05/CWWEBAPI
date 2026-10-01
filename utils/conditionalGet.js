const crypto = require('crypto');


function sendWithConditionalGet(req, res, payload, lastModifiedDate) {
  const etag = '"' + crypto.createHash('sha1').update(JSON.stringify(payload)).digest('hex') + '"';
  const lastModified = (lastModifiedDate || new Date()).toUTCString();

  res.set('ETag', etag);
  res.set('Last-Modified', lastModified);

  const ifNoneMatch = req.header('If-None-Match');
  const ifModifiedSince = req.header('If-Modified-Since');

  const etagMatches = ifNoneMatch && ifNoneMatch === etag;
  const notModifiedSince = ifModifiedSince && new Date(ifModifiedSince) >= new Date(lastModified);

  if (etagMatches || notModifiedSince) {
    return res.status(304).end();
  }
  return res.status(200).json(payload);
}

module.exports = { sendWithConditionalGet };
