export type Groupings = '' | "nomophobia" | "digital_edits" | "storage" | "mug_dish_glass" | "merica" | "wallabies";

export interface IArtwork {
    _id?: string;
    title: string;
    year: string;
    media: string;
    image: string;
    isHomePage?: boolean;
    price: string;
    arrangement?: number;
    grouping?: Array<Groupings>;
    buyerID?: string;
    saleDate?: string;
    taxStatus?: string;
    salePrice?: string;
    saleRevenue?: string;
    isNFS?: boolean;
};

export const validateArtwork = (artwork: IArtwork, isNew: boolean): IArtwork | null => {
    const isNewOrHasImage = artwork.image || isNew;
    if (isNewOrHasImage && artwork.media && artwork.price && artwork.title && artwork.year) {
        return null;
    }

    return {
        image: artwork.image,
        media: artwork.media,
        price: artwork.price,
        title: artwork.title,
        year: artwork.year
    }
};
