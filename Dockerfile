FROM node:8.11.3-slim

WORKDIR /emily

COPY ./package.json ./

RUN npm install

COPY . ./

CMD ["npm",  "run",  "start"]

