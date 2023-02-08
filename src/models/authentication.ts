import jwt from 'jsonwebtoken';

export const signIn = ((username: string, password: string) => {
    console.log(username, password, process.env.API_PASSWORD_HASH, process.env.API_USERNAME);
    if (!(username && password)) {
        return false;
    }

    const passwordHash = password; // TODO: hash that password!
    if (!(username === process.env.API_USERNAME && passwordHash === process.env.API_PASSWORD_HASH)) {
        return false;
    }

    return jwt.sign({ username: username, password: password }, process.env.JWT_SECRET, { expiresIn: '1800s' });
});

export const authenticateRequest = ((token: string) => {
    if (token == null) return false;

    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        return false;
    }
});