import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const signIn = (async (username: string, password: string) => {
    if (!(username && password)) {
        return false;
    }

    const passwordCompareResult = await bcrypt.compare(password, process.env.API_PASSWORD_HASH);

    if (passwordCompareResult) {
        return jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1800s' });
    }

    return false;
});

export const authenticateRequest = ((token: string) => {
    if (token == null) return false;

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return false;
    }
});
