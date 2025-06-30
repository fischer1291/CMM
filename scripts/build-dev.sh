#!/bin/bash

echo "🚀 Building development version of Call Me Maybe..."
echo "This will create: Call Me Maybe (Dev) with bundle ID: com.schly21.kontaktlisteapp.dev"
echo ""

eas build --profile development --platform ios

echo ""
echo "✅ Development build completed!"
echo "📱 Install this version alongside your production app from TestFlight"