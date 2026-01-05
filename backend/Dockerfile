FROM node:20-alpine

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN mkdir -p /app/data

EXPOSE 9000

CMD ["npm", "start"]
