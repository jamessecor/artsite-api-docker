import express from 'express';
import { signIn } from '../models/authentication';

export const register = (app: express.Application) => {
    app.post('/api/users', async (req, res) => {
        const username = req.body?.username ?? '';
        const password = req.body?.password ?? '';
        try {
            const token = await signIn(username, password);
            if (token) {
                res.status(200).send({ token });
            } else {
                res.status(403).send({ message: 'invalid username or password' });
            }
        } catch (error) {
            res.status(403).send({ message: 'unable to login' });
        }
    });
};
