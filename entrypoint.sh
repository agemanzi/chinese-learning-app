#!/bin/sh
mkdir -p /app/data
exec gunicorn --bind 0.0.0.0:7432 --workers 2 --timeout 60 server:app
