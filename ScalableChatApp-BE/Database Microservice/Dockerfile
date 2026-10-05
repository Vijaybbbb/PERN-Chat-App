FROM node:22-alpine
WORKDIR /app
COPY ["Database Microservice/package*.json", "./"]
COPY ["Common Microservice/package*.json", "/tmp/common/"]
RUN npm install --production
RUN cd /tmp/common && npm install --production && cp -a node_modules/. /app/node_modules/
COPY ["Database Microservice/", "./"]
COPY ["Common Microservice/", "/Common Microservice/"]
RUN ln -s /app/node_modules "/Common Microservice/node_modules"
EXPOSE 3003
CMD ["node", "app.js"]
