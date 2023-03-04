import { Storage } from '@google-cloud/storage';
import { format } from 'util';

export const uploadImage = (file: Express.Multer.File, title: string) => new Promise((resolve, reject) => {
    const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
    const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);
    if (bucket) {
        const { buffer } = file;

        // Create a new blob in the bucket and upload the file data.
        const currentDate = new Date();
        const blob = bucket.file(`${currentDate.getFullYear()}/${title.replace(/ /g, '_')}__${currentDate.toISOString()}.jpg`);
        const blobStream = blob.createWriteStream();

        blobStream.on('error', err => {
            reject(`unable to upload: ${err.name} - ${err.message}`);
        });

        blobStream.on('finish', () => {
            // The public URL can be used to directly access the file via HTTP.
            const publicUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );
            resolve(publicUrl);
        });

        blobStream.end(buffer);
    }
});