import express from 'express';
import { authenticateRequest } from '../models/authentication';
import { MongoClient } from 'mongodb';
import { uploadFile } from '../models/storage';

const artworksCollection = 'artworks';

export const register = (app: express.Application) => {
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

    app.post('/api/artworks/upload-image', async (req, res) => {
        const filePath = req.body?.filePath as string;
        const destinationFilename = req.body?.destinationFilename as string;

        if (filePath && destinationFilename) {
            const upload = await uploadFile(filePath, destinationFilename);
            if (upload) {
                res.status(202).send({ message: `Successfully uploaded ${filePath} to ${destinationFilename}` });
            } else {
                res.status(400).send({ message: `Unable to upload ${filePath} to ${destinationFilename}` });
            }
        } else {
            res.status(404).send({ message: 'Request must specify filePath and destinationFilename' });
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