import { Storage } from '@google-cloud/storage';
import { format } from 'util';

export const uploadImage = (buffer: Buffer, title: string) => new Promise((resolve, reject) => {
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
            const publicUrl = format(
                `https://storage.googleapis.com/${bucket.name}/${blob.name}`
            );
            resolve(publicUrl);
        });

        blobStream.end(buffer);
    }
});