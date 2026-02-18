FROM node:18-alpine
WORKDIR /app
COPY ["Database Microservice/package*.json", "./"]
RUN npm install --production
COPY ["Database Microservice/", "./"]
COPY ["Common Microservice/", "../Common Microservice/"]
EXPOSE 3003
CMD ["node", "app.js"]