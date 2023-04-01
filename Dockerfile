FROM node:latest

ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

RUN npm run build

EXPOSE 8080

CMD [ "node", "dist/index.js" ]