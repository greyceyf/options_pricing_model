#use lightweight python image
FROM python:3.12-slim

#install uv for fast package management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

#sets working directory
WORKDIR /app

#first copy dependency files for caching layers
COPY pyproject.toml .
COPY uv.lock .

#install dependencies, system installs into the system python which avoids venv complexity in docker
RUN uv sync --frozen --no-dev

#copy the rest of the application
COPY . .

#expose api port
EXPOSE 8000

#command to run the application
CMD ["uv", "run", "uvicorn", "src.exotic_lab.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
