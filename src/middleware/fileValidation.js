const path = require('path');
const fs = require('fs');

/**
 * File type validation
 */
const allowedMimeTypes = {
  image: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'],
  video: ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
  audio: ['audio/mpeg', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/webm', 'audio/aac'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ]
};

/**
 * File size limits (in bytes)
 */
const fileSizeLimits = {
  image: 16 * 1024 * 1024,      // 16MB
  video: 100 * 1024 * 1024,     // 100MB
  audio: 16 * 1024 * 1024,      // 16MB
  document: 100 * 1024 * 1024,  // 100MB
  default: 16 * 1024 * 1024     // 16MB
};

/**
 * Validate file type
 */
const validateFileType = (file, allowedTypes) => {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  const mimeType = file.mimetype;
  const extension = path.extname(file.originalname).toLowerCase();

  // Check if mime type is allowed
  const isValidMimeType = allowedTypes.includes(mimeType);
  
  if (!isValidMimeType) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Validate file size
 */
const validateFileSize = (file, maxSize) => {
  if (!file) {
    return { valid: false, error: 'No file uploaded' };
  }

  if (file.size > maxSize) {
    const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File too large. Maximum size: ${maxSizeMB}MB, your file: ${fileSizeMB}MB`
    };
  }

  return { valid: true };
};

/**
 * Check image dimensions
 */
const validateImageDimensions = async (file, maxWidth = 4096, maxHeight = 4096) => {
  try {
    const sharp = require('sharp');
    const metadata = await sharp(file.path).metadata();

    if (metadata.width > maxWidth || metadata.height > maxHeight) {
      return {
        valid: false,
        error: `Image dimensions too large. Maximum: ${maxWidth}x${maxHeight}px, your image: ${metadata.width}x${metadata.height}px`
      };
    }

    return { valid: true, dimensions: { width: metadata.width, height: metadata.height } };
  } catch (error) {
    // Sharp not available or image corrupt
    return { valid: true }; // Skip dimension check if sharp not available
  }
};

/**
 * Validate video duration
 */
const validateVideoDuration = async (file, maxDuration = 600) => {
  try {
    const ffmpeg = require('fluent-ffmpeg');
    
    return new Promise((resolve) => {
      ffmpeg.ffprobe(file.path, (err, metadata) => {
        if (err) {
          // FFmpeg not available or video corrupt
          resolve({ valid: true }); // Skip duration check if ffmpeg not available
          return;
        }

        const duration = metadata.format.duration;
        if (duration > maxDuration) {
          resolve({
            valid: false,
            error: `Video too long. Maximum: ${maxDuration}s, your video: ${Math.round(duration)}s`
          });
        } else {
          resolve({ valid: true, duration });
        }
      });
    });
  } catch (error) {
    // FFmpeg not available
    return { valid: true }; // Skip duration check if ffmpeg not available
  }
};

/**
 * Main file validation middleware
 */
const validateFile = (type = 'image', options = {}) => {
  return async (req, res, next) => {
    try {
      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const file = req.file;
      const allowedTypes = allowedMimeTypes[type] || [];
      const maxSize = options.maxSize || fileSizeLimits[type] || fileSizeLimits.default;

      // Validate file type
      const typeValidation = validateFileType(file, allowedTypes);
      if (!typeValidation.valid) {
        // Delete uploaded file
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: typeValidation.error
        });
      }

      // Validate file size
      const sizeValidation = validateFileSize(file, maxSize);
      if (!sizeValidation.valid) {
        // Delete uploaded file
        fs.unlinkSync(file.path);
        return res.status(400).json({
          success: false,
          message: sizeValidation.error
        });
      }

      // Additional validation for images
      if (type === 'image' && options.checkDimensions !== false) {
        const dimensionValidation = await validateImageDimensions(
          file,
          options.maxWidth,
          options.maxHeight
        );
        if (!dimensionValidation.valid) {
          // Delete uploaded file
          fs.unlinkSync(file.path);
          return res.status(400).json({
            success: false,
            message: dimensionValidation.error
          });
        }
        req.imageDimensions = dimensionValidation.dimensions;
      }

      // Additional validation for videos
      if (type === 'video' && options.checkDuration !== false) {
        const durationValidation = await validateVideoDuration(
          file,
          options.maxDuration
        );
        if (!durationValidation.valid) {
          // Delete uploaded file
          fs.unlinkSync(file.path);
          return res.status(400).json({
            success: false,
            message: durationValidation.error
          });
        }
        req.videoDuration = durationValidation.duration;
      }

      next();
    } catch (error) {
      // Clean up file if exists
      if (req.file && req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          // Ignore cleanup errors
        }
      }

      res.status(500).json({
        success: false,
        message: 'File validation failed',
        error: error.message
      });
    }
  };
};

/**
 * Validate multiple files
 */
const validateFiles = (type = 'image', options = {}) => {
  return async (req, res, next) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const maxFiles = options.maxFiles || 10;
      if (req.files.length > maxFiles) {
        // Clean up uploaded files
        req.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // Ignore
          }
        });

        return res.status(400).json({
          success: false,
          message: `Too many files. Maximum: ${maxFiles}, uploaded: ${req.files.length}`
        });
      }

      const allowedTypes = allowedMimeTypes[type] || [];
      const maxSize = options.maxSize || fileSizeLimits[type] || fileSizeLimits.default;

      // Validate each file
      for (const file of req.files) {
        // Validate type
        const typeValidation = validateFileType(file, allowedTypes);
        if (!typeValidation.valid) {
          // Clean up all files
          req.files.forEach(f => {
            try {
              fs.unlinkSync(f.path);
            } catch (e) {
              // Ignore
            }
          });

          return res.status(400).json({
            success: false,
            message: `File "${file.originalname}": ${typeValidation.error}`
          });
        }

        // Validate size
        const sizeValidation = validateFileSize(file, maxSize);
        if (!sizeValidation.valid) {
          // Clean up all files
          req.files.forEach(f => {
            try {
              fs.unlinkSync(f.path);
            } catch (e) {
              // Ignore
            }
          });

          return res.status(400).json({
            success: false,
            message: `File "${file.originalname}": ${sizeValidation.error}`
          });
        }
      }

      next();
    } catch (error) {
      // Clean up files
      if (req.files) {
        req.files.forEach(file => {
          try {
            fs.unlinkSync(file.path);
          } catch (e) {
            // Ignore
          }
        });
      }

      res.status(500).json({
        success: false,
        message: 'File validation failed',
        error: error.message
      });
    }
  };
};

module.exports = {
  validateFile,
  validateFiles,
  validateFileType,
  validateFileSize,
  validateImageDimensions,
  validateVideoDuration,
  allowedMimeTypes,
  fileSizeLimits
};
