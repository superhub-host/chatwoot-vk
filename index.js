import { processVkMessage } from './chatwoot.js'
import { vk } from './vk.js'

vk.updates.on('message_new', context => {
    if (!context.isUser || !context.isFromUser) return
    processVkMessage(context.message).then()
})

await Promise.all([
    vk.updates.start(),
])
