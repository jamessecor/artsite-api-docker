export type Groupings = '' | "nomophobia" | "digital_edits" | "storage" | "mug_dish_glass" | "merica" | "wallabies";

interface ILike {
    timestamp: string;
    amount: string;
}

export interface IArtwork {
    title: string;
    year: string;
    media: string;
    images: {
        [size: number]: string;
    };
    isHomePage?: string;
    price: string;
    arrangement?: string;
    grouping?: Array<Groupings>;
    buyerID?: string;
    saleDate?: string;
    taxStatus?: string;
    salePrice?: string;
    saleRevenue?: string;
    isNFS?: string;
}

export interface IArtworkResponse extends IArtwork {
    _id: string;
    likes?: Array<ILike>;
    totalLikes?: number;
};

export const formatRequest = (body: IArtwork) => {
    if (body.isNFS) {
        body.isNFS = JSON.parse(body.isNFS);
    }

    if (body.isHomePage) {
        body.isHomePage = JSON.parse(body.isHomePage);
    }

    if (body.arrangement) {
        body.arrangement = JSON.parse(body.arrangement);
    }

    return body;
};

export const formatArtworkResponse = (artwork: IArtworkResponse) => {
    return {
        ...artwork,
        totalLikes: artwork.likes ? artwork.likes.reduce((partialSum, like) => partialSum + parseInt(like.amount, 10), 0) : 0
    };
};

export const formatArtworksResponse = (artworks: Array<IArtworkResponse>) => artworks.map((artwork) => formatArtworkResponse(artwork));

export const validateArtwork = (artwork: IArtwork, isNew: boolean): IArtwork | null => {
    const isNewOrHasImage = artwork.images || isNew;
    if (isNewOrHasImage && artwork.media && artwork.price && artwork.title && artwork.year) {
        return null;
    }

    return {
        images: artwork.images,
        media: artwork.media,
        price: artwork.price,
        title: artwork.title,
        year: artwork.year
    }
};
