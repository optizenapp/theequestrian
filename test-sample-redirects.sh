#!/bin/bash
# test-sample-redirects.sh

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing redirects on: $BASE_URL"
echo ""

# Test sample redirects
test_redirect() {
  local from=$1
  local expected=$2
  
  local response=$(curl -s -I -w "%{http_code}" -o /dev/null "$BASE_URL$from")
  local location=$(curl -s -I "$BASE_URL$from" | grep -i "location:" | cut -d' ' -f2 | tr -d '\r')
  
  if [ "$response" = "301" ] && [ "$location" = "$expected" ]; then
    echo "✅ $from → $location"
  else
    echo "❌ $from → $location (expected: $expected, got: $response)"
  fi
}

# Test redirects
test_redirect "/collections/saddles" "/horse/saddles"
test_redirect "/collections/breeches" "/clothing/womens/breeches"
test_redirect "/collections/stirrups" "/horse/tack/stirrups"
test_redirect "/collections/footwear" "/clothing/footwear"
test_redirect "/collections/gifts" "/accessories/gifts"
test_redirect "/collections/horse-rugs" "/horse/rugs"
test_redirect "/collections/body-protectors" "/rider/body-protectors"
test_redirect "/collections/horse-boots" "/horse/boots"
test_redirect "/collections/luggage" "/rider/luggage"
test_redirect "/collections/birds" "/pet/bird"

echo ""
echo "✅ Testing complete!"
