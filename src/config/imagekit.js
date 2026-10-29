let client;
function getImageKit() {
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!privateKey || !process.env.IMAGEKIT_PUBLIC_KEY || !process.env.IMAGEKIT_URL_ENDPOINT) {
    throw Object.assign(new Error("Media storage is not configured"), { statusCode: 503 });
  }
  if (!client) {
    const ImageKit = require("@imagekit/nodejs").default;
    client = new ImageKit({ privateKey });
  }
  return client;
}
module.exports = { getImageKit };
