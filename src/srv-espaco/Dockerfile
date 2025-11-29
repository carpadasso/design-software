# 1. Use uma imagem base oficial do Node.js
FROM node:18-alpine

# 2. Defina o diretório de trabalho dentro do contêiner
WORKDIR /app

# 3. Copie os arquivos de dependência PRIMEIRO (para cache)
COPY package*.json ./

# 4. Instale as dependências
RUN npm install

# 5. Copie o resto do código-fonte (index.js, openapi.yaml, etc.)
COPY . .

# 6. O comando para iniciar seu serviço
CMD ["node", "index.js"]