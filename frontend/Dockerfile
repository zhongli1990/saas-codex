FROM node:20-slim

WORKDIR /app

COPY package.json /app/package.json
RUN npm install

COPY tailwind.config.js /app/tailwind.config.js
COPY postcss.config.js /app/postcss.config.js
COPY next.config.mjs /app/next.config.mjs
COPY tsconfig.json /app/tsconfig.json
COPY src /app/src

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]
