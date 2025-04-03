# Install the app dependencies in a full UBI Node docker image
FROM registry.access.redhat.com/ubi8/nodejs-20:latest

WORKDIR /app

USER 0

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8080

CMD ["node", "server.js"]