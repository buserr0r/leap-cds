FROM node:12

# Create app directory
WORKDIR /usr/src/app

# Copy package dependencies
COPY package*.json ./

# Install app dependencies
RUN npm install

# Copy app source
COPY . .

#Expose default port according to server.js
EXPOSE 3000

CMD [ "node", "server.js" ]