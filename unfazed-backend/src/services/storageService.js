const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const uploadRoot = path.join(__dirname, '..', '..', 'uploads');
const extensions = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

async function saveImage(buffer, mimetype, folder = 'photos') {
  const extension = extensions[mimetype];
  if (!extension) throw new Error('Unsupported image type');
  const directory = path.join(uploadRoot, folder);
  await fs.mkdir(directory, { recursive: true });
  const filename = `${crypto.randomBytes(12).toString('hex')}${extension}`;
  await fs.writeFile(path.join(directory, filename), buffer);
  return `/uploads/${folder}/${filename}`;
}

module.exports = { saveImage, uploadRoot, allowedTypes: Object.keys(extensions) };
