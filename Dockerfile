FROM node:18
WORKDIR /home/vk-chatwoot
ADD . .
CMD npm start
