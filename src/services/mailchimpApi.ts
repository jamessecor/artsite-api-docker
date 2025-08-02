import client from '@mailchimp/mailchimp_marketing';

export enum EmailDestinationEnum {
    Personal,
    TheFront
}

const mailchimpFrontAPIKey = process.env.MAILCHIMP_FRONT_API_KEY ?? '';
const mailchimpFrontDataServer = process.env.MAILCHIMP_FRONT_DATA_SERVER ?? '';
const mailchimpFrontListId = process.env.MAILCHIMP_FRONT_LIST_ID ?? '';

const mailchimpPersonalAPIKey = process.env.MAILCHIMP_PERSONAL_API_KEY ?? '';
const mailchimpPersonalDataServer = process.env.MAILCHIMP_PERSONAL_DATA_SERVER ?? '';
const mailchimpPersonalListId = process.env.MAILCHIMP_PERSONAL_LIST_ID ?? '';

export const addContact = async (emailAddress: string, emailDestination: EmailDestinationEnum) => {
    switch (emailDestination) {
        case EmailDestinationEnum.Personal:
            addContactToList(emailAddress, mailchimpPersonalAPIKey, mailchimpPersonalDataServer, mailchimpPersonalListId);
            break;
        case EmailDestinationEnum.TheFront:
            addContactToList(emailAddress, mailchimpFrontAPIKey, mailchimpFrontDataServer, mailchimpFrontListId);
            break;
        default:
            break;
    }
}

const addContactToList = async (emailAddress: string, apiKey: string, dataServer: string, listId: string) => {
    client.setConfig({
        apiKey: apiKey,
        server: dataServer
    });

    const response = await client.lists.addListMember(listId, {
        email_address: emailAddress,
        status: "subscribed",
    });
}