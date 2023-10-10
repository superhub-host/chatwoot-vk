import { processChatwootMessage } from './chatwoot.js'
import { processVkMessage, processVkTypingState, vk } from './vk.js'
import express from 'express'
import * as Sentry from '@sentry/node'
import '@sentry/tracing'

Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
})

const bindPort = 8080

vk.updates.on('message_new', context => {
    if (!context.isUser || !context.isFromUser) return
    processVkMessage(context.message).then().catch(Sentry.captureException)
})

vk.updates.on('message_typing_state', context => {
    if (!context.isUser) return
    processVkTypingState(context.fromId, context.isTyping).then().catch(Sentry.captureException)
})

async function handleChatwootWebhook() {
    const app = express()
    app.use(express.json())

    app.post('/', (req, res) => {
        if (req.body.event === 'message_created' && req.body.message_type === 'outgoing') {
            processChatwootMessage(req.body).catch(Sentry.captureException)
        }

        res.sendStatus(200)
    })

    await app.listen(bindPort)
}

await Promise.all([
    vk.updates.start(),
    handleChatwootWebhook(),
]).catch(Sentry.captureException)
