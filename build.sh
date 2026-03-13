#!/usr/bin/env bash

pip install poetry
poetry install

poetry run python manage.py migrate
poetry run python manage.py collectstatic --noinput