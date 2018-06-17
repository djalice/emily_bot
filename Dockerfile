FROM node:8.11.3-slim

ENV TZ=Asia/Tokyo

WORKDIR /emily

COPY ./package.json ./

RUN npm install

COPY . ./

CMD ["npm",  "run",  "start"]

