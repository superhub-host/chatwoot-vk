import { VK } from 'vk-io'

export const vk = new VK({
    token: process.env.VK_ACCESS_TOKEN,
})
