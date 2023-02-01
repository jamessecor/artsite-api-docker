const { MongoClient } = require('mongodb');
const client = new MongoClient(process.env.CONNECTIONSTRING);

const artworksCollection = 'artworks';

exports.post = (async (req, res) => {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(artworksCollection);

    const insert = await collection.insertMany(req.body);

    if (insert) {
        res.status(200).send({ message: "inserted successfully" });
    } else {
        res.status(400).send({ message: 'failed to insert' });
    }
});

exports.delete = (async (req, res) => {
    await client.connect();
    const db = client.db(process.env.DB_NAME);
    const collection = db.collection(artworksCollection);

    const remove = await collection.deleteMany(req.body);

    if (remove) {
        res.status(200).send({ message: "deleted successfully" });
    } else {
        res.status(400).send({ message: 'failed to delete' });
    }
});

exports.find = (async (req, res) => {
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
});