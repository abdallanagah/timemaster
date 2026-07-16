FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy application files
COPY . .

# Change ownership of the app directory to the Hugging Face default non-root user (UID 1000)
RUN chown -R 1000:1000 /usr/src/app

# Switch to the non-root user
USER 1000

# Expose Hugging Face default application port
ENV PORT=7860
EXPOSE 7860

# Start server node script
CMD [ "node", "server.js" ]
