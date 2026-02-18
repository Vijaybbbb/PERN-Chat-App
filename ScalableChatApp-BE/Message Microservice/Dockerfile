FROM node:18-alpine
WORKDIR /app
COPY ["Message Microservice/package*.json", "./"]
RUN npm install --production
COPY ["Message Microservice/", "./"]
COPY ["Common Microservice/", "../Common Microservice/"]
EXPOSE 3004
CMD ["node", "app.js"]