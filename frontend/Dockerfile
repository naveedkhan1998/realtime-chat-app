# Use an official Node.js image as a base
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose the development port (Vite usually runs on 5173 by default)
EXPOSE 5173

# Start the React app in development mode
CMD ["npm", "run", "dev", "--", "--host"]
