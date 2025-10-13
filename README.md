# Social Media Abuse Dashboard
A dashboard for monitoring abuse on social media platforms


## What is everything?

- `backend`: java spring boot backend of the dashboard
- `frontend`: react.js frontend of the a dashboard

The `backend` and `frontend` are usually built into a single docker container.

## Development

In order to launch the main app, you need to:
- Git clone this repository
- Copy the sample `application.yml` file from the project root directory to the `./backend` directory. This file defines things
  like people/elastic index/default dates you'll be launching the app with
- Go to `./backend` and run `./mvnw spring-boot:run`
- Go to `./frontend` and run `npm install`, then `npm start`
- App should be available at `localhost:3000` (unless port changed)

## Deployment
Depending on the version of docker compose you have installed one of the following
commands should allow you to build the single container (you can build it without
using compose as long as you specify the correct tag etc.)

### Compose v1 with docker 18.0.9 or above
```
COMPOSE_DOCKER_CLI_BUILD=1 DOCKER_BUILDKIT=1 docker-compose build
```

### Using standalone buildkit
```
docker-buildx bake -f docker-compose.yml
```

### Using Compose v2
```
docker compose build
```

Once built the container can be used in the normal fashion
