import { Storage } from '@google-cloud/storage';

export const uploadFile = async (filePath: string, destinationFilename: string) => {
    const storage = new Storage({ projectId: process.env.GOOGLE_PROJECT_ID });

    const bucket = storage.bucket(process.env.GOOGLE_STORAGE_BUCKET_NAME);
    if (bucket) {
        try {
            const uploadResponse = await bucket.upload(filePath, { destination: destinationFilename });
            if (uploadResponse) {
                return true;
            }
        }
        catch (err) {
            return false;
        }
    }

    return false;
}
