import { VK } from 'vk-io'
import {
    chatwoot, chatwootAccountId,
    getOrCreateChatwootContact,
    getOrCreateChatwootConversation,
    processChatwootAttachment,
    sendMessage,
} from './chatwoot.js'

export const vk = new VK({
    token: process.env.VK_ACCESS_TOKEN,
})

export async function processVkMessage(message) {
    const externalId = message.from_id
    const contact = await getOrCreateChatwootContact(externalId)
    const conversation = await getOrCreateChatwootConversation(contact)

    const attachments = []
    for (const attachment of message.attachments) {
        const processedAttachment = await processChatwootAttachment(attachment)
        attachments.push(processedAttachment)
    }

    const { data } = await sendMessage(conversation.id, {
        content: message.text,
        message_type: 'incoming',
    }, attachments)

    return data
}

export async function processVkAttachment(attachment) {
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

export async function processVkTypingState(userId, state) {
    const contact = await getOrCreateChatwootContact(userId)
    const conversation = await getOrCreateChatwootConversation(contact)
    await chatwoot.conversations(chatwootAccountId).toggleTyping(conversation.id, state ? 'on' : 'off')
}
