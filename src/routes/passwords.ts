import express from 'express';
import bcrypt from 'bcrypt';

export const register = (app: express.Application) => {
    app.post('/api/passwords/hash', async (req, res) => {
        const saltCount = req.body?.saltCount ?? 10;
        const hashedPassword = bcrypt.hash(req.body?.password, saltCount);
        res.status(200).send({ hash: hashedPassword });
    });
};