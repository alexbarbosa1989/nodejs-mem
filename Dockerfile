# Install from dockerhub alpine image
FROM node:20-alpine

WORKDIR /app

USER 0

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "--expose-gc", "--trace-gc", "server.js"]