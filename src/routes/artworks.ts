import express from 'express';
import { Storage } from '@google-cloud/storage';
import Multer from 'multer';
import { format } from 'util';
import { authenticateRequest } from '../models/authentication';
import { MongoClient, ObjectId } from 'mongodb';

const artworksCollection = 'artworks';

export const register = (app: express.Application) => {
    const multer = Multer({
        storage: Multer.memoryStorage(),
        limits: {
            fileSize: 5 * 1024 * 1024, // no larger than 5mb, you can change as needed.
        },
    });

    app.all('/api/artworks*', (req, res, next) => {
        if (req.method.toString() === 'GET') {
            next();
        } else {
            const isAuthed = authenticateRequest(req.headers.authorization ?? '');

            if (isAuthed) {
                next();
            } else {
                res.status(401).send();
            }
        }
    });

    app.get('/api/artworks', async (req, res) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            let result = [];
            const query = req.body ? req.body.s : null;
            if (query) {
                const queryRegex = new RegExp(query, "i");
                result = await collection.find({
                    $or: [{ media: { $regex: queryRegex } }, { price: { $regex: queryRegex } }, { title: { $regex: queryRegex } }]
                }).toArray();
            } else {
                result = await collection.find().toArray();
            }

            res.status(200).send({ results: result });
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    app.post('/api/artworks', async (req, res) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const insert = await collection.insertMany(req.body);

            if (insert) {
                res.status(200).send({ message: "inserted successfully" });
            } else {
                res.status(400).send({ message: 'failed to insert' });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    app.put('/api/artworks/:id', multer.single('file'), async (req, res, next) => {
        // Upload file
        if (req.file) {
            
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
                        req.body.image = publicUrl;
                    });

                    blobStream.end(req.file.buffer);
                }
                catch (err) {
                    res.status(400).send(err.toString())
                }
            }

        }

        // Update data
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const update = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: req.body });
            if (update) {
                res.status(200).send({ message: "updated successfully" });
            } else {
                res.status(400).send({ message: 'failed to update' });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    app.delete('/api/artworks', async (req, res) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const remove = await collection.deleteMany(req.body);

            if (remove) {
                res.status(200).send({ message: "deleted successfully" });
            } else {
                res.status(400).send({ message: 'failed to delete' });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });
}