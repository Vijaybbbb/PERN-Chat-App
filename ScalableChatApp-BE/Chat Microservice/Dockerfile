FROM node:18-alpine
WORKDIR /app
COPY ["Chat Microservice/package*.json", "./"]
RUN npm install --production
COPY ["Chat Microservice/", "./"]
COPY ["Common Microservice/", "../Common Microservice/"]
EXPOSE 3002
CMD ["node", "app.js"]