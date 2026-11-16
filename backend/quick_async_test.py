import sys, asyncio
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

# Fix Windows ProactorEventLoop hang with anyio/starlette
asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import httpx
from app.main import app

async def test_api():
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.get("/api/v1/centres")
        print("Centres GET status:", res.status_code)
        print("Centres count:", len(res.json()))

        login_res = await ac.post("/api/v1/auth/login", json={
            "phone": "9876543210",
            "password": "Farmer@123"
        })
        print("Login status:", login_res.status_code)
        print("User name:", login_res.json().get("name"))

if __name__ == "__main__":
    asyncio.run(test_api())
