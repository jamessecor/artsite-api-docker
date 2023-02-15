import express from 'express';
import { Storage } from '@google-cloud/storage';
import Multer from 'multer';
import { format } from 'util';
import { authenticateRequest } from '../models/authentication';


export const register = (app: express.Application) => {
    const multer = Multer({
        storage: Multer.memoryStorage(),
        limits: {
            fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
        },
    });

    app.all('/api/storage*', (req, res, next) => {
        const isAuthed = authenticateRequest(req.headers.authorization ?? '');
        if (isAuthed) {
            next();
        } else {
            res.status(401).send();
        }
    });

    app.post('/api/storage/upload', multer.single('file'), async (req, res, next) => {
        if (!req.file) {
            res.status(400).send('No file uploaded.');
            return;
        }

        const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });
        const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);
        if (bucket) {
            try {
                // Create a new blob in the bucket and upload the file data.
                const blob = bucket.file(req.file.originalname);
                const blobStream = blob.createWriteStream();

                blobStream.on('error', err => {
                    next(err);
                });

                blobStream.on('finish', () => {
                    // The public URL can be used to directly access the file via HTTP.
                    const publicUrl = format(
                        `https://storage.cloud.google.com/${bucket.name}/${blob.name}`
                    );
                    res.status(200).send({ publicUrl });
                });

                blobStream.end(req.file.buffer);
            }
            catch (err) {
                res.status(400).send(err.toString())
            }
        }
    });
}
