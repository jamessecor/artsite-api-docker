import express from 'express';
import Multer from 'multer';
import { authenticateRequest } from '../models/authentication';
import { uploadImages } from '../models/storage';
import { Artwork } from '../models/artwork';
import { connect } from 'mongoose';

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
            const year = req.query.year;
            const grouping = req.query.grouping;
            const isHomePage = req.query.isHomePage;
            const search = req.query.search;

            await connect(process.env.DB_CONNECTIONSTRING_V2);

            const artworksQuery = Artwork.find();
            if (year) {
                artworksQuery.where('year').equals(year);
            }

            if (grouping) {
                artworksQuery.where('grouping').equals(grouping);
            }

            if (isHomePage === 'true') {
                artworksQuery.where('isHomePage').equals(true);
            }

            if (search) {
                const regex = new RegExp(`.*${search}.*`, 'i');
                artworksQuery.where({
                    $or: [
                        { title: { $regex: regex } },
                        { year: { $regex: regex } },
                        { media: { $regex: regex } }
                    ]
                });
            }

            artworksQuery.sort('arrangement');

            const artworks = await artworksQuery;
            res.status(200).send(artworks);
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    app.get('/api/artworks/meta-data', async (req, res) => {
        try {
            await connect(process.env.DB_CONNECTIONSTRING_V2);

            const artworks = await Artwork.find().sort({ year: 'desc' }).select('grouping year');
            const response = {
                groupings: [...new Set(artworks.flatMap((artwork) => artwork.grouping))],
                years: [...new Set(artworks.map((artwork) => artwork.year))]
            }
            res.status(200).send(response);
        }
        catch (err) {
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

        try {
            const newArtwork = new Artwork(req.body);
            // Upload file and thumbnail
            const { buffer } = req.file;
            const images = await uploadImages(buffer, newArtwork.title);
            newArtwork.images = images;

            await connect(process.env.DB_CONNECTIONSTRING_V2);
            const update = await newArtwork.save();

            if (update) {
                res.status(200).send({
                    message: "inserted successfully",
                    artwork: update
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
        try {
            if (req.file) {
                const { buffer } = req.file;
                const images = await uploadImages(buffer, req.body.title);
                req.body.images = images;
            }

            await connect(process.env.DB_CONNECTIONSTRING_V2);
            const update = await Artwork.updateOne({ _id: req.params.id }, req.body);
            if (update) {
                res.status(200).send({
                    message: `updated ${req.body.title} successfully`,
                    artwork: {
                        ...req.body,
                        _id: req.params.id
                    }
                });
            } else {
                res.status(400).send({ message: `failed to update ${req.body.title}` });
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
            await connect(process.env.DB_CONNECTIONSTRING_V2);
            const artwork = await Artwork.findById(req.params.id);
            const likes = artwork.likes ?? [];
            const like = {
                timestamp: req.body.timestamp,
                amount: req.body.amount
            };
            const updatedLikes = [...likes, like];

            const update = await Artwork.updateOne({ _id: req.params.id }, { likes: updatedLikes });
            if (update) {
                res.status(200).send({
                    message: `updated ${artwork.title} successfully`,
                    artwork: artwork
                });
            } else {
                res.status(400).send({ message: `failed to update ${req.body.title}` });
            }
        } catch (err) {
            let message = 'unknown error';
            if (err instanceof Error) {
                message = err.message;
            }
            res.status(400).send({ error: err, message });
        }
    });

    // Delete all likes
    // app.delete('/api/artworks/likes', async (req, res) => {
    //     try {
    //         const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
    //         await client.connect();
    //         const db = client.db(process.env.DB_NAME);
    //         const collection = db.collection(artworksCollection);

    //         const removeLikesResult = collection.updateMany({ likes: { $exists: true } }, { $set: { likes: undefined } });
    //         if (removeLikesResult) {
    //             res.status(200).send({ message: "deleted successfully" });
    //         }
    //     } catch (err) {
    //         let message = 'unknown error';
    //         if (err instanceof Error) {
    //             message = err.message;
    //         }
    //         res.status(400).send({ error: err, message });
    //     }
    // });

    // // Delete artworks by query
    // app.delete('/api/artworks', async (req, res) => {
    //     try {
    //         const client = new MongoClient(process.env.DB_CONNECTIONSTRING ?? '');
    //         await client.connect();
    //         const db = client.db(process.env.DB_NAME);
    //         const collection = db.collection(artworksCollection);

    //         const remove = await collection.deleteMany(req.body);

    //         if (remove) {
    //             res.status(200).send({ message: "deleted successfully" });
    //         } else {
    //             res.status(400).send({ message: 'failed to delete' });
    //         }
    //     } catch (err) {
    //         let message = 'unknown error';
    //         if (err instanceof Error) {
    //             message = err.message;
    //         }
    //         res.status(400).send({ error: err, message });
    //     }
    // });

    app.delete('/api/artworks/:id', async (req, res) => {
        try {
            await connect(process.env.DB_CONNECTIONSTRING_V2);
            const remove = await Artwork.deleteOne({ _id: req.params.id });

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