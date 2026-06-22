const multer = require('multer');
const path = require('path');

const storage = multer.memoryStorage();

// Accept only PDF and any image format, max 5 MB
const fileFilter = (req, file, cb) => {
  const isPdf = file.mimetype === 'application/pdf';
  const isImage = file.mimetype.startsWith('image/');
  if (isPdf || isImage) {
    cb(null, true);
  } else {
    cb(new Error('Formato file non supportato: carica un PDF o un\'immagine'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

module.exports = upload;
