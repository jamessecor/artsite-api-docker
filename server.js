require('dotenv').config();
const express = require("express");
const cors = require('cors');
const app = express();

const artworkRoutes = require('./routes/artworks');
const emailRoutes = require('./routes/email');

app.use(cors());
app.use(express.json());
// app.use(expres.urlencoded());
app.use(express.static('public'));

app.get("/api/status", (req, res) => {
    res.status(200).send({ message: process.env.DB_CONNECTIONSTRING }) // TODO: remove this env var
});

// Artworks
app.get('/api/artworks', artworkRoutes.find);
app.delete('/api/artworks', artworkRoutes.delete);
app.post('/api/artworks', artworkRoutes.post);

// Email
app.post("/api/email", emailRoutes.sendEmail);

// start the Express server
app.listen(process.env.SERVER_PORT, () => {
});