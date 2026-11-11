FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S -g 10001 manicule && adduser -S -D -H -u 10001 -G manicule manicule
WORKDIR /app
COPY --chown=10001:10001 services/api/target/manicule-api.jar app.jar
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
