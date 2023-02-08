FROM node:12.18.1 as base

ENV NODE_ENV=production

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

RUN npm install --production

COPY . .

RUN npm run build

ADD ./dist .

FROM base as production

EXPOSE 8080

CMD [ "node", "." ]