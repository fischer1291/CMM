#!/bin/bash

echo "🚀 Building development version of Wanna yap?..."
echo "This will create: Wanna yap? (Dev) with bundle ID: com.schly21.kontaktlisteapp.dev"
echo ""

eas build --profile development --platform ios

echo ""
echo "✅ Development build completed!"
echo "📱 Install this version alongside your production app from TestFlight"