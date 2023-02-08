import express from 'express';
import emailjs from '@emailjs/nodejs';

const serviceId = process.env.EMAILJS_SERVICE_ID ?? '';
const templateId = process.env.EMAILJS_TEMPLATE_ID ?? '';
const publicKey = process.env.EMAILJS_PUBLIC_KEY ?? '';
const privateKey = process.env.EMAILJS_PRIVATE_KEY ?? '';

export const register = (app: express.Application) => {
    app.post("/api/email", async (req, res, next) => {
        const templateParams = {
            firstname: req.body.firstname,
            lastname: req.body.lastname,
            email: req.body.email,
            message: req.body.message
        };

        try {
            const response = await emailjs.send(
                serviceId,
                templateId,
                templateParams,
                {
                    publicKey,
                    privateKey
                });

            if (response) {
                res.status(200).send({ message: `Successfully sent email to ${templateParams.firstname} ${templateParams.lastname}, ${templateParams.email}` });
            }
        }
        catch (error) {
            if (error) {
                res.status(400).send({ message: 'failed to send email' })
            }
        }
    });
}