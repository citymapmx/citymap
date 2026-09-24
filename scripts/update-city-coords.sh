#!/bin/bash

BASE="https://dpkjxhjkzdlkvyotoeai.supabase.co/rest/v1/cities"
KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRwa2p4aGpremRsa3Z5b3RvZWFpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA0MzYzNTAsImV4cCI6MjA5NjAxMjM1MH0.R6ZoNQHKP-DDA4F8phgolf82AEOTII-mLUlWc3DWHyE"

patch() {
  slug=$1; lat=$2; lng=$3
  curl -s -o /dev/null -w "%{http_code}" -X PATCH "$BASE?slug=eq.$slug" \
    -H "apikey: $KEY" \
    -H "Authorization: Bearer $KEY" \
    -H "Content-Type: application/json" \
    -d "{\"lat\": $lat, \"lng\": $lng}"
  echo " → $slug ($lat, $lng)"
}

patch "cancun"          21.1619  -86.8515
patch "ciudad-de-mexico" 19.4326  -99.1332
patch "compostela"      21.2340  -104.9000
patch "guadalajara"     20.6597  -103.3496
patch "los-angeles"     34.0522  -118.2437
patch "madrid"          40.4168   -3.7038
patch "magdalena"       20.9100  -104.1200
patch "mazatlan"        23.2494  -106.4111
patch "merida"          20.9674   -89.5926
patch "monterrey"       25.6866  -100.3161
patch "nuevo-vallarta"  20.7090  -105.2967
patch "paris"           48.8566    2.3522
patch "playa-del-carmen" 20.6296  -87.0739
patch "puerto-vallarta" 20.6534  -105.2253
patch "tepic"           21.5042  -104.8944
patch "tlaquepaque"     20.6422  -103.3118
patch "xalisco"         21.4400  -104.9100
patch "zapopan"         20.7200  -103.3900

echo "¡Listo! Coordenadas actualizadas."
