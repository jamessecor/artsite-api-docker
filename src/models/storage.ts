import { Storage } from '@google-cloud/storage';
import sharp from 'sharp';
import { IImage } from './artwork';

const imageSizes = [450, 2500];

export const uploadImages = (buffer: Buffer, title: string) => new Promise<Array<IImage>>(async (resolve, reject) => {
    try {
        const images = new Array<IImage>();
        try {
            const originalBuffer = buffer;
            images.push({
                size: 1,
                url: await uploadImage(originalBuffer, `${title}_original`)
            });
        }
        catch (e) {
            images.push({
                size: 1,
                url: e.message
            });
        }

        for (const imageSize of imageSizes) {
            try {
                const imageBuffer = await sharp(buffer).resize(imageSize).toBuffer();
                images.push({
                    size: imageSize,
                    url: await uploadImage(imageBuffer, `${title}_${imageSize}`)
                });
            }
            catch (e) {
                images.push({
                    size: imageSize,
                    url: e.message
                });
            }
        };
        resolve(images);
    }
    catch (err) {
        const errMap = new Array<IImage>();
        errMap.push({
            size: -1,
            url: err.message
        });
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