import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';

const imageSizes = [450, 2500];

export const uploadImages = (buffer: Buffer, title: string) => new Promise<Map<number, string>>(async (resolve, reject) => {
    try {
        const imagesMap = new Map<number, string>();
        try {
            const originalBuffer = buffer;
            imagesMap.set(1, await uploadImage(originalBuffer, `${title}_original`));
        }
        catch (e) {
            imagesMap.set(1, e.message);
        }

        for (const imageSize of imageSizes) {
            try {
                const imageBuffer = await sharp(buffer).resize(imageSize).toBuffer();
                imagesMap.set(imageSize, await uploadImage(imageBuffer, `${title}_${imageSize}`));
            }
            catch (e) {
                imagesMap.set(imageSize, e.message);
            }
        };
        resolve(imagesMap);
    }
    catch (err) {
        const errMap = new Map<number, string>();
        errMap.set(-1, err.message);
        reject(errMap);
    }
});

export const uploadImage = (buffer: Buffer, title: string) => new Promise<string>((resolve, reject) => {
    try {
        const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
        const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);
        if (bucket) {
            // Create a new blob in the bucket and upload the file data.
            const currentDate = new Date();
            const folder = process.env.TESTING ?? null ? 'testing' : currentDate.getFullYear();
            const blob = bucket.file(`${folder}/${title.toLocaleLowerCase().replace(/ /g, '-')}_${currentDate.toISOString()}.jpg`);
            const blobStream = blob.createWriteStream();

            blobStream.on('error', err => {
                reject(`unable to upload: ${err.name} - ${err.message}`);
            });

            blobStream.on('finish', () => {
                // The public URL can be used to directly access the file via HTTP.
                resolve(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
            });

            blobStream.end(buffer);
        }
    }
    catch (error) {
        resolve(error.message);
    }
});