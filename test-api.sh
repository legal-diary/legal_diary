#!/bin/bash

# Your API base URL
BASE_URL="http://localhost:3000"
TOKEN="da819187d9f0b85e3487811"  # This appears to be your token from the logs
CASE_ID="cmik8fnca0003qwj0cy0qd8px"  # Your test case ID

echo "=== Testing Re-analyze API ==="
echo "Endpoint: POST $BASE_URL/api/cases/$CASE_ID/ai/reanalyze"
echo "Token: $TOKEN"
echo ""

curl -X POST "$BASE_URL/api/cases/$CASE_ID/ai/reanalyze" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -v 2>&1
