FROM node:18-alpine
WORKDIR /app
COPY ["Socket Microservice/package*.json", "./"]
RUN npm install --production
COPY ["Socket Microservice/", "./"]
COPY ["Common Microservice/", "../Common Microservice/"]
EXPOSE 3005
CMD ["node", "app.js"]