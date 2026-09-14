// backend/storage/index.js
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

const STORAGE_MODE = process.env.STORAGE_MODE || 'local';

const localUploadsDir = path.join(__dirname, '..', 'uploads', 'foods');
if (!fs.existsSync(localUploadsDir)) fs.mkdirSync(localUploadsDir, { recursive: true });

async function processLocally(buffer, prefix = 'food') {
  const filename = `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}.webp`;
  const filepath = path.join(localUploadsDir, filename);

  await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(filepath);

  return { url: `/uploads/foods/${filename}`, publicId: filename, provider: 'local' };
}

let cloudinary = null;
if (STORAGE_MODE === 'cloudinary') {
  cloudinary = require('cloudinary').v2;
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

async function processCloudinary(buffer, prefix = 'food') {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'foodexpress',
        public_id: `${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}`,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 1200, crop: 'limit', quality: 'auto:good', fetch_format: 'auto' }
        ]
      },
      (err, result) => {
        if (err) return reject(err);
        resolve({ url: result.secure_url, publicId: result.public_id, provider: 'cloudinary' });
      }
    );
    uploadStream.end(buffer);
  });
}

let s3Client = null;
if (STORAGE_MODE === 's3') {
  const { S3Client } = require('@aws-sdk/client-s3');
  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
  });
}

async function processS3(buffer, prefix = 'food') {
  const { PutObjectCommand } = require('@aws-sdk/client-s3');
  const key = `foodexpress/${prefix}_${Date.now()}_${Math.round(Math.random() * 1e9)}.webp`;

  const optimized = await sharp(buffer)
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await s3Client.send(new PutObjectCommand({
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
    Body: optimized,
    ContentType: 'image/webp',
    CacheControl: 'public, max-age=31536000'
  }));

  return {
    url: `${process.env.AWS_PUBLIC_URL}/${key}`,
    publicId: key,
    provider: 's3'
  };
}

async function processAndStoreImage(buffer, prefix = 'food') {
  switch (STORAGE_MODE) {
    case 'cloudinary': return processCloudinary(buffer, prefix);
    case 's3': return processS3(buffer, prefix);
    default: return processLocally(buffer, prefix);
  }
}

async function deleteImage(publicId) {
  if (!publicId) return;
  if (STORAGE_MODE === 'cloudinary' && cloudinary) {
    try { await cloudinary.uploader.destroy(publicId); } catch (e) { console.error(e); }
  } else if (STORAGE_MODE === 's3' && s3Client) {
    try {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      await s3Client.send(new DeleteObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: publicId
      }));
    } catch (e) { console.error(e); }
  } else {
    const filepath = path.join(localUploadsDir, publicId);
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  }
}

module.exports = { processAndStoreImage, deleteImage, STORAGE_MODE };