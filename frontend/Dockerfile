FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package.json ./frontend/package.json

RUN npm install --prefix frontend

COPY frontend ./frontend

ARG VITE_API_URL=http://localhost:5001/api
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build --prefix frontend

FROM nginx:1.27-alpine

COPY --from=builder /app/frontend/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
