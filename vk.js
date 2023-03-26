import { VK } from 'vk-io'
import { chatwoot, chatwootAccountId, getOrCreateChatwootContact, getOrCreateChatwootConversation } from './chatwoot.js'

export const vk = new VK({
    token: process.env.VK_ACCESS_TOKEN,
})

export async function processVkMessage(message) {
    const externalId = message.from_id
    const contact = await getOrCreateChatwootContact(externalId)
    const conversation = await getOrCreateChatwootConversation(contact)

    const { data } = await chatwoot.conversations(chatwootAccountId).sendMessage(conversation.id, {
        content: message.text,
        message_type: 'incoming',
    })

    return data
}
