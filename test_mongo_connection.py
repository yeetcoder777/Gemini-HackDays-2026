
import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import dns.resolver

# Load .env
load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
print(f"Testing connection to: {MONGODB_URI.split('@')[1] if '@' in MONGODB_URI else 'hidden'}")

async def test_connection():
    try:
        # Standard connection
        client = AsyncIOMotorClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        print("Attempting to connect...")
        await client.admin.command('ping')
        print("Connection Successful!")
    except Exception as e:
        print(f"Connection Failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_connection())
