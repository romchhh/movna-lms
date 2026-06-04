#!/bin/bash
cd "$(dirname "$0")"
source myenv/bin/activate
nohup uvicorn app.main:app --reload --host 0.0.0.0 --port 8000 > /dev/null 2>&1 &
echo "Backend started"
