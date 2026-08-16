# syntax=docker/dockerfile:1

# --- Stage 1: build the React frontend ---
FROM node:24-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# --- Stage 2: build the Spring Boot backend, embedding the frontend's dist output ---
FROM eclipse-temurin:25-jdk AS backend-builder
WORKDIR /app/backend
COPY backend/gradlew backend/settings.gradle backend/build.gradle ./
COPY backend/gradle ./gradle
RUN chmod +x ./gradlew && ./gradlew --version
COPY backend/config ./config
COPY backend/src ./src
COPY --from=frontend-builder /app/frontend/dist ./src/main/resources/static
RUN ./gradlew bootJar --no-daemon

# --- Stage 3: minimal runtime image ---
FROM eclipse-temurin:25-jre
COPY --from=backend-builder /app/backend/build/libs/*.jar /app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app.jar"]
