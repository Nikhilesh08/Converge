FROM node:20-alpine

WORKDIR /app

COPY backend/package.json ./backend/package.json

RUN npm install --prefix backend --omit=dev

COPY backend ./backend

WORKDIR /app/backend

ENV NODE_ENV=production
EXPOSE 5001

CMD ["npm", "run", "start"]
