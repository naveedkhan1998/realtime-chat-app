# Use a lightweight Node.js image
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and yarn.lock to leverage Docker layer caching
COPY package.json ./

# Install dependencies
RUN npm i

# Copy the rest of the application code
COPY . .

# Set environment variables for development
ENV NODE_ENV=development

# Expose the port Vite uses
EXPOSE 5173

# Enable polling for file changes (useful in Docker)
ENV CHOKIDAR_USEPOLLING=true

# Start the Vite development server
CMD ["npm","run", "dev","--", "--host"]
