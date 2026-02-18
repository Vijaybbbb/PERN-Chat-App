FROM node:18-alpine
WORKDIR /app
COPY ["User Microservice/package*.json", "./"]
RUN npm install --production
COPY ["User Microservice/", "./"]
COPY ["Common Microservice/", "../Common Microservice/"]
EXPOSE 3001
CMD ["node", "app.js"]