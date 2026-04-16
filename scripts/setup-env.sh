if [ ! -f ".env" ] && [ -f ".env.example" ]; then
  echo "Creating .env from .env.example..."
  cp .env.example .env
fi
