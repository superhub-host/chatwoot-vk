import ChatwootClient from '@chatwoot/node'
import { vk } from './vk.js'

export const chatwootAccountId = Number(process.env.CHATWOOT_ACCOUNT_ID)
export const chatwootInboxId = Number(process.env.CHATWOOT_INBOX_ID)

export const chatwoot = new ChatwootClient({
    config: {
        host: process.env.CHATWOOT_HOST,
        apiAccessToken: process.env.CHATWOOT_ACCESS_TOKEN,
    },
})

export async function getOrCreateChatwootContact(userId) {
    const contact = await findChatwootContact(userId)
    if (!contact) return await createChatwootContact(userId)
    return contact
}

async function findChatwootContact(externalId) {
    const { data } = await chatwoot.contacts(chatwootAccountId).search(externalId)

    if (!data.payload || data.payload.length === 0) return null
    return data.payload.filter(contact => typeof getChatwootContactInbox(contact) !== 'undefined')
        .sort((a, b) => b.id - a.id)[0]
}

function getChatwootContactInbox(contact) {
    return contact['contact_inboxes'].find(contactInbox => contactInbox['inbox'].id === chatwootInboxId)
}

async function createChatwootContact(externalId) {
    const [ user ] = await vk.api.users.get({
        user_ids: [ externalId ],
        fields: [ 'photo_100', 'screen_name' ]
    })

    const { data } = await chatwoot.contacts(chatwootAccountId).create({
        inbox_id: chatwootInboxId,
        name: `${ user.first_name } ${ user.last_name }`,
        avatar_url: user.photo_100,
        identifier: externalId,
    })

    return data.payload['contact']
}

export async function getOrCreateChatwootConversation(contact) {
    const conversation = await findChatwootConversation(contact)
    if (!conversation) return await createChatwootConversation(contact)
    return conversation
}

async function findChatwootConversation(contact) {
    const { data } = await chatwoot.contacts(chatwootAccountId).getConversationsByContactId(contact.id)
    if (!data.payload || data.payload.length === 0) return null
    return data.payload.filter(conversation => conversation['inbox_id'] === chatwootInboxId)
        .sort((a, b) => b.id - a.id)[0]
}

async function createChatwootConversation(contact) {
    const inbox = getChatwootContactInbox(contact)
    const { data } = await chatwoot.conversations(chatwootAccountId).create({
        source_id: inbox.source_id,
    })
    return data
}

export async function processChatwootMessage(data) {
    if (!data.content && data.attachments.length === 0) {
        console.log(`Invalid content for message without attachments: ${ data.content }`)
        return
    }

    const conversation = data['conversation']
    const contactInbox = conversation['contact_inbox']
    const { data: contactResponse } = await chatwoot.contacts(chatwootAccountId).show(contactInbox.contact_id)

    if (!contactResponse.payload) {
        console.log(`Unable to fetch contact for conversation ${ conversation.id }`)
        return
    }

    const { payload: contact } = contactResponse

    const attachments = []
    if (data.attachments) {
        for (const attachment of data.attachments) {
            attachments.push(await processAttachment(attachment))
        }
    }

    await vk.api.messages.send({
        user_id: contact.identifier,
        message: data.content ?? '',
        attachment: attachments.map(a => a.toString()).join(','),
        random_id: Math.floor(Math.random() * Math.pow(10, 100)),
    })
}

async function processAttachment(attachment) {
    switch (attachment['file_type']) {
        case 'image':
             return await vk.upload.messagePhoto({
                source: {
                    value: attachment['data_url']
                }
            })
        default:
            console.warn(`Skipping attachment with unsupported type: ${ attachment['file_type'] }`)
            break
    }
}
