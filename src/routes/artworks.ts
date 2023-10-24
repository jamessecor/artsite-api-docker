import express from 'express';
import Multer from 'multer';
import { authenticateRequest } from '../models/authentication';
import { MongoClient, ObjectId } from 'mongodb';
import { uploadImages } from '../models/storage';
import { formatArtworksResponse, formatRequest, IArtwork, IArtworkResponse, validateArtwork } from '../models/artwork';

export const artworksCollection = process.env.TESTING ?? null ? 'test-upload' : 'artworks';

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

        const newArtwork = req.body as IArtwork;
        const artworkValidationResult = validateArtwork(newArtwork, true);
        if (artworkValidationResult) {
            res.status(400).send({ artworkValidationResult });
            return;
        }

        try {
            // Upload file and thumbnail
            const { buffer } = req.file;
            const imagesMap = await uploadImages(buffer, newArtwork.title);
            newArtwork.images = Object.fromEntries(imagesMap);

            // Update data
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const formattedNewArtwork = formatRequest(newArtwork);
            const update = await collection.insertOne(formattedNewArtwork);
            if (update) {
                res.status(200).send({
                    message: "inserted successfully",
                    images: newArtwork.images,
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
            res.status(404).send({ error: err, message });
        }
    });

    app.put('/api/artworks/:id', multer.single('file'), async (req, res, next) => {
        // Update data
        try {
            if (req.file) {
                // Upload file and thumbnail
                const { buffer } = req.file;
                const imagesMap = await uploadImages(buffer, req.body.title);
                req.body.images = Object.fromEntries(imagesMap);
            }

            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const formattedRequest = formatRequest(req.body);
            const update = await collection.updateOne({ _id: new ObjectId(req.params.id) }, { $set: formattedRequest });
            if (update) {
                res.status(200).send({
                    message: `updated ${formattedRequest.title} successfully`,
                    images: formattedRequest.images,
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

    /**
     * MIGRATION: this fixed the issue where images were being stored in an array instead of an object
     *
    app.post('/api/artworks/fix-images', async (req, res, next) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const result = await collection.find({ images: { $type: "array" } }).toArray();
            const artworkResult = result as unknown as Array<IArtworkResponse>;

            const updatedArtworks = artworkResult.map((artwork) => {
                const updatedImagesMap = new Map();
                updatedImagesMap.set(1, artwork.images[1]);

                if (artwork.images[450]) {
                    updatedImagesMap.set(450, artwork.images[450]);
                }

                if (artwork.images[2500]) {
                    updatedImagesMap.set(2500, artwork.images[2500]);
                }

                return {
                    ...artwork,
                    images: Object.fromEntries(updatedImagesMap)
                };
            });

            const updateMap = new Map();
            let updateCount = 0;
            for (let i = 0; i < updatedArtworks.length; i++) {
                const a = updatedArtworks[i];
                console.log('a', a.images, new ObjectId(a._id));
                const update = await collection.updateOne({ _id: a._id }, { $set: { images: a.images } });
                console.log('update', update);
                if (update) {
                    updateMap.set(i, a.images);
                    updateCount += update.modifiedCount;
                }
            }

            res.status(200).send({ results: { updateCount: updateCount, data: Object.fromEntries(updateMap) } });
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });
    */

    // Delete all likes
    app.delete('/api/artworks/likes', async (req, res) => {
        try {
            const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
            await client.connect();
            const db = client.db(process.env.DB_NAME);
            const collection = db.collection(artworksCollection);

            const removeLikesResult = collection.updateMany({ likes: { $exists: true } }, { $set: { likes: undefined } });
            if (removeLikesResult) {
                res.status(200).send({ message: "deleted successfully" });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    // Delete artworks by query
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