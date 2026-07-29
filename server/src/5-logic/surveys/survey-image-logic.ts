import crypto from 'crypto';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { AppError } from '../../2-utils/app-error';

const uploadRoot = path.resolve(__dirname, '../../../public-uploads/surveys');

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

type UploadedSurveyImage = {
  buffer: Buffer;
  mimetype: string;
};

function hasValidImageSignature(document: UploadedSurveyImage): boolean {
  const { buffer, mimetype } = document;
  if (mimetype === 'image/jpeg') {
    return buffer.length >= 3 && buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  }
  if (mimetype === 'image/png') {
    return (
      buffer.length >= 8 &&
      buffer
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    );
  }
  if (mimetype === 'image/webp') {
    return (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return false;
}

/**
 * שומר תמונת סקר בתיקייה מקומית ציבורית ומחזיר URL יחסי להצגה.
 * תמונות סקר אינן רגישות (בניגוד לת.ז.) ולכן מוגשות כ-static.
 */
export async function saveSurveyImage(file: UploadedSurveyImage): Promise<string> {
  const extension = extensionByMimeType[file.mimetype];
  if (!extension) {
    throw new AppError('יש להעלות תמונה מסוג JPG, PNG או WEBP', 400);
  }
  if (!hasValidImageSignature(file)) {
    throw new AppError('תוכן הקובץ אינו תמונה תקינה', 400);
  }
  if (file.buffer.length > 5 * 1024 * 1024) {
    throw new AppError('גודל התמונה יכול להיות עד 5MB', 400);
  }

  await mkdir(uploadRoot, { recursive: true });
  const fileName = `${crypto.randomUUID()}${extension}`;
  const absolutePath = path.join(uploadRoot, fileName);
  await writeFile(absolutePath, file.buffer, { mode: 0o644 });

  return `/uploads/surveys/${fileName}`;
}
