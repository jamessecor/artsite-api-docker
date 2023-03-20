import express from 'express';
import Multer from 'multer';
import { authenticateRequest } from '../models/authentication';
import { MongoClient, ObjectId } from 'mongodb';
import { uploadImage } from '../models/storage';
import { formatArtworksResponse, formatRequest, IArtworkResponse, validateArtwork } from '../models/artwork';

export const artworksCollection = 'test';

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
        } else if (/\/api\/artworks\/[0-9a-z]+\/likes/i.test(req.url)) {
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

            res.status(200).send({ results: formatArtworksResponse(result as unknown as Array<IArtworkResponse>) });
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    // inserts a new artwork
    app.post('/api/artworks', multer.single('file'), async (req, res) => {
        if (!req.file) {
            res.status(400).send({ message: 'bad request: no file present' });
            return;
        }

        const newArtwork = req.body;
        const artworkValidationResult = validateArtwork(newArtwork, true);
        if (artworkValidationResult) {
            res.status(400).send({ artworkValidationResult });
            return;
        }

        // Upload file
        const fileUrl = await uploadImage(req.file, req.body.title);
        newArtwork.image = fileUrl;

        // Update data
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const formattedNewArtwork = formatRequest(newArtwork);
            const update = await collection.insertOne(formattedNewArtwork);
            if (update) {
                res.status(200).send({
                    message: "inserted successfully",
                    image: req.body.image,
                    _id: update.insertedId
                });
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
            const fileUrl = await uploadImage(req.file, req.body.title);
            req.body.image = fileUrl;
        }

        // Update data
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const formattedRequest = formatRequest(req.body);
            const update = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: formattedRequest });
            if (update) {
                res.status(200).send({
                    message: `updated ${formattedRequest.title} successfully`,
                    image: formattedRequest.image,
                    _id: req.params.id
                });
            } else {
                res.status(400).send({ message: `failed to update ${formattedRequest.title}` });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    // Update likes
    app.put('/api/artworks/:id/likes', async (req, res) => {
        if (!(req.body.timestamp && req.body.amount)) {
            res.status(400).send({ error: 'Missing timestamp or amount' });
            return;
        }
        // Update artwork likes
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);
            const artwork = await collection.findOne({ _id: new ObjectId(req.params.id) });
            
            const likes = artwork.likes ?? [];            
            const like = {
                timestamp: req.body.timestamp,
                amount: req.body.amount
            };
            const updatedLikes = [...likes, like];
            
            const update = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: { likes: updatedLikes } });
            if (update) {
                res.status(200).send({
                    message: `updated ${artwork.title} successfully`,
                    likes: updatedLikes,
                    totalLikes: updatedLikes.reduce((partialSum, thisLike) => partialSum + thisLike.amount, 0),
                    _id: req.params.id
                });
            } else {
                res.status(400).send({ message: `failed to update ${artwork.title}` });
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

    app.delete('/api/artworks/:id', async (req, res) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const remove = await collection.deleteOne({ _id: new ObjectId(req.params.id) });

            if (remove) {
                res.status(200).send({
                    message: "deleted successfully",
                    _id: req.params.id
                });
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