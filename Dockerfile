# syntax=docker/dockerfile:experimental

# This builds the react.js frontend in a temporary container
# https://mherman.org/blog/dockerizing-a-react-app/
FROM node:18.16.0-slim as frontend
WORKDIR /app
ENV PATH /app/node_modules/.bin:$PATH
COPY ./frontend/package.json ./
COPY ./frontend/package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
        npm set cache /root/.npm && npm ci --legacy-peer-deps
RUN npm install react-scripts@5.0.1 -g
RUN npm install --legacy-peer-deps caniuse-lite && npx update-browserslist-db@latest
COPY ./frontend/public ./public
COPY ./frontend/tsconfig.json ./
COPY ./frontend/src ./src
RUN npm run build



#This builds the Spring Boot backend in a temporary container
# https://spring.io/guides/topicals/spring-boot-docker
FROM azul/zulu-openjdk-debian:8-latest as backend
WORKDIR /workspace/app

COPY ./backend/mvnw .
COPY ./backend/.mvn .mvn
COPY ./backend/pom.xml .
COPY ./backend/src src

RUN  --mount=type=cache,target=/root/.m2 ./mvnw install -DskipTests
RUN mkdir -p target/dependency && (cd target/dependency; jar -xf ../*.jar)



# This unpacks the spring backend into a new simplified container
FROM azul/zulu-openjdk-debian:8-latest
VOLUME /tmp
ARG DEPENDENCY=/workspace/app/target/dependency
COPY --from=backend ${DEPENDENCY}/BOOT-INF/lib /app/lib
COPY --from=backend ${DEPENDENCY}/META-INF /app/META-INF
COPY --from=backend ${DEPENDENCY}/BOOT-INF/classes /app
# and then copies the react.js UI into the static folder
COPY --from=frontend /app/build /app/static

ENTRYPOINT ["java","-cp",".:app:app/lib/*","uk.ac.gate.twitter.dashboard.ConversationApplication"]
