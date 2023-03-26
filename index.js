import { processChatwootMessage } from './chatwoot.js'
import { processVkMessage, vk } from './vk.js'
import express from 'express'

const bindPort = 8080

vk.updates.on('message_new', context => {
    if (!context.isUser || !context.isFromUser) return
    processVkMessage(context.message).then()
})

async function handleChatwootWebhook() {
    const app = express()
    app.use(express.json())

    app.post('/', (req, res) => {
        if (req.body.event === 'message_created' && req.body.message_type === 'outgoing') {
            processChatwootMessage(req.body)
        }

        res.sendStatus(200)
    })

    await app.listen(bindPort)
}

await Promise.all([
    vk.updates.start(),
    handleChatwootWebhook(),
])
