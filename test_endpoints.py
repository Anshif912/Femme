import asyncio
import httpx

BASE_URL = "http://127.0.0.1:8000/api/v1"

async def test_health():
    async with httpx.AsyncClient() as client:
        r = await client.get(f"{BASE_URL}/health")
        print('Health:', r.status_code, r.json())

async def test_forward_geocode():
    async with httpx.AsyncClient() as client:
        payload = {"address": "Bangalore"}
        r = await client.post(f"{BASE_URL}/geocode/forward", json=payload)
        print('Forward geocode:', r.status_code, r.json())

async def test_safety_route():
    async with httpx.AsyncClient() as client:
        payload = {"origin": {"lat": 12.9716, "lng": 77.5946}, "destination": {"lat": 12.9352, "lng": 77.6101}}
        r = await client.post(f"{BASE_URL}/route/safety", json=payload)
        print('Safety route:', r.status_code, r.json())

async def main():
    await test_health()
    await test_forward_geocode()
    await test_safety_route()

if __name__ == "__main__":
    asyncio.run(main())
