import express from 'express';
import { getHashedPassword } from '../models/authentication';

export const register = (app: express.Application) => {
    app.post('/api/passwords/hash', async (req, res) => {
        const hashed = await getHashedPassword(req.body?.password);
        res.status(200).send({ hash: hashed });
    });
};