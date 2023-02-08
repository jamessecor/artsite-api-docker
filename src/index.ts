import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import * as artworkRoutes from './routes/artworks';
import * as emailRoutes from './routes/email';


const app = express();

app.use(cors());
app.use(express.json());
// app.use(expres.urlencoded());
app.use(express.static('public'));

app.get("/api/status", (_, res) => {
    res.status(200).send({ message: "running ok" })
});

app.use((req, res, next) => {
    req.setTimeout(0);
    next();
})

artworkRoutes.register(app);
emailRoutes.register(app);

// start the Express server
app.listen(process.env.SERVER_PORT);