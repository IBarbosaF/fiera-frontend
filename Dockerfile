FROM node:20-alpine AS build
WORKDIR /fiera-app-frontend
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

FROM node:20-alpine
WORKDIR /fiera-app-frontend
RUN npm i -g http-server
COPY --from=build /fiera-app-frontend/dist /fiera-app-frontend/dist
EXPOSE 4200
CMD ["http-server", "dist/fiera-frontend/browser", "-p", "4200", "-c-1", "--proxy", "http://localhost:4200?"]