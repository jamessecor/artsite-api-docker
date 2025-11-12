import { Model, model, Schema } from "mongoose";

export type Groupings = '' | "nomophobia" | "digital_edits" | "storage" | "mug_dish_glass" | "merica" | "wallabies";

interface ILike {
    timestamp: string;
    amount: string;
}

export interface IImage {
    size: number;
    url: string;
}

export interface IArtwork {
    title: string;
    year: string;
    media: string;
    height: number;
    width: number;
    images: Array<IImage>;
    likes?: Array<ILike>;
    isHomePage?: boolean;
    price: string;
    arrangement?: string;
    grouping?: Array<Groupings>;
    buyerID?: string;
    buyerName?: string;
    buyerEmail?: string;
    buyerPhone?: string;
    saleDate?: Date;
    taxStatus?: string;
    salePrice?: string;
    saleRevenue?: string;
    isNFS?: string;
    location?: string;
}

interface IArtworkMethods {
    totalLikes: () => number;
}

type ArtworkModel = Model<IArtwork, {}, IArtworkMethods>;

const artworkSchema = new Schema<IArtwork, ArtworkModel, IArtworkMethods>({
    title: { type: String, required: true, index: 'text' },
    year: { type: String, required: true },
    media: { type: String, required: true },
    height: { type: Number, required: true },
    width: { type: Number, required: true },
    images: [{
        size: Number,
        url: String
    }],
    likes: [{
        timestamp: Date,
        amount: Number
    }],
    isHomePage: Boolean,
    price: String,
    arrangement: Number,
    grouping: Array<Groupings>,
    buyerID: String,
    buyerName: String,
    buyerEmail: String,
    buyerPhone: String,
    saleDate: Date,
    taxStatus: String,
    salePrice: String,
    saleRevenue: String,
    isNFS: String,
    location: String,
});

artworkSchema.method('totalLikes', function totalLikes() {
    return this.likes ? this.likes.reduce((partialSum, like) => partialSum + parseInt(like.amount, 10), 0) : 0
});

export const Artwork = model<IArtwork, ArtworkModel>('Artwork', artworkSchema);


// export const validateArtwork = (artwork: IArtwork, isNew: boolean): IArtwork | null => {
//     const isNewOrHasImage = artwork.images || isNew;
//     if (isNewOrHasImage && artwork.media && artwork.price && artwork.title && artwork.year) {
//         return null;
//     }

//     return {
//         images: artwork.images,
//         media: artwork.media,
//         price: artwork.price,
//         title: artwork.title,
//         year: artwork.year
//     }
// };
