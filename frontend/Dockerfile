# ---------- Estágio de Build ----------
FROM node:18-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Compila o projeto React usando o Vite
RUN npm run build

# ---------- Estágio de Servidor Nginx ----------
FROM nginx:alpine

# Removemos a configuração default do Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copiamos os ficheiros compilados do React para a pasta html do Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# A porta 80 e 443 já estão abertas nativamente na imagem do nginx
EXPOSE 80
EXPOSE 443

CMD ["nginx", "-g", "daemon off;"]