#!/bin/sh
set -e

ADMIN_EMAIL="${PB_ADMIN_EMAIL:-admin@hsk1.app}"
ADMIN_PASS="${PB_ADMIN_PASSWORD:-${APP_PASSWORD}}"
STUDENT_EMAIL="student@hsk1.app"
STUDENT_PASS="${APP_PASSWORD}"
PB_BASE="http://localhost:7433"

# Start PocketBase in background
/pb/pocketbase serve --http=0.0.0.0:7433 --automigrate &
PB_PID=$!

# Wait until healthy
echo "==> Waiting for PocketBase..."
until curl -sf "${PB_BASE}/api/health" > /dev/null 2>&1; do sleep 1; done
echo "==> PocketBase ready"

if [ ! -f /pb/pb_data/.bootstrapped ]; then
  echo "==> First run — bootstrapping..."

  # Create first admin (only works when no admin exists yet)
  curl -sf -X POST "${PB_BASE}/api/admins" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg e "$ADMIN_EMAIL" --arg p "$ADMIN_PASS" '{email:$e,password:$p}')" \
    > /dev/null && echo "==> Admin created" || echo "==> Admin already exists"

  # Get admin token
  TOKEN=$(curl -sf -X POST "${PB_BASE}/api/admins/auth-with-password" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg i "$ADMIN_EMAIL" --arg p "$ADMIN_PASS" '{identity:$i,password:$p}')" \
    | jq -r '.token')

  AUTH="Authorization: $TOKEN"

  # Create word_progress collection
  curl -sf -X POST "${PB_BASE}/api/collections" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d '{
      "name":"word_progress","type":"base",
      "schema":[
        {"name":"user_id","type":"text","required":true,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"word","type":"text","required":true,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"seen","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"correct","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"wrong","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"last_seen","type":"number","required":false,"system":false,"options":{"min":null,"max":null,"noDecimal":true}},
        {"name":"srs_due","type":"number","required":false,"system":false,"options":{"min":null,"max":null,"noDecimal":true}},
        {"name":"srs_interval","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":false}},
        {"name":"srs_ease","type":"number","required":false,"system":false,"options":{"min":1,"max":3,"noDecimal":false}}
      ],
      "indexes":["CREATE UNIQUE INDEX idx_word_user ON word_progress (user_id, word)"]
    }' > /dev/null && echo "==> word_progress created" || echo "==> word_progress already exists"

  # Create syllable_progress collection
  curl -sf -X POST "${PB_BASE}/api/collections" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d '{
      "name":"syllable_progress","type":"base",
      "schema":[
        {"name":"user_id","type":"text","required":true,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"key","type":"text","required":true,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"seen","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"correct","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"wrong","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}}
      ],
      "indexes":["CREATE UNIQUE INDEX idx_syl_user ON syllable_progress (user_id, key)"]
    }' > /dev/null && echo "==> syllable_progress created" || echo "==> syllable_progress already exists"

  # Create drill_sessions collection
  curl -sf -X POST "${PB_BASE}/api/collections" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d '{
      "name":"drill_sessions","type":"base",
      "schema":[
        {"name":"user_id","type":"text","required":true,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"drill","type":"text","required":false,"system":false,"options":{"min":null,"max":null,"pattern":""}},
        {"name":"score","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"total","type":"number","required":false,"system":false,"options":{"min":0,"max":null,"noDecimal":true}},
        {"name":"at","type":"number","required":false,"system":false,"options":{"min":null,"max":null,"noDecimal":true}}
      ]
    }' > /dev/null && echo "==> drill_sessions created" || echo "==> drill_sessions already exists"

  # Create student user
  curl -sf -X POST "${PB_BASE}/api/collections/users/records" \
    -H "Content-Type: application/json" -H "$AUTH" \
    -d "$(jq -n --arg e "$STUDENT_EMAIL" --arg p "$STUDENT_PASS" \
      '{email:$e,password:$p,passwordConfirm:$p,name:"Student",emailVisibility:false}')" \
    > /dev/null && echo "==> Student user created" || echo "==> Student user already exists"

  touch /pb/pb_data/.bootstrapped
  echo "==> Bootstrap complete"
fi

echo "==> PocketBase running (PID $PB_PID)"
wait $PB_PID
