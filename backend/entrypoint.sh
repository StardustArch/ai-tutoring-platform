#!/bin/sh
set -e

echo "⏳ Running database migrations..."
npx prisma migrate deploy

echo "🌱 Populando banco..."
npx tsx prisma/seed.ts

echo "🚀 Starting NestJS dev server..."
exec npm run start:prod
