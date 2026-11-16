import os
import logging
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.database import engine, Base
from app.api import auth, centres, crops, slots, bookings, queue, procurement, payments, analytics, notifications
from app.services.websocket_hub import ws_hub

# Configure root logger
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("KisanSlot")

# Auto-create all database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="KisanSlot: Production-Grade Procurement Slot Booking & Real-Time Queue Management System",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount REST Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(centres.router, prefix=settings.API_V1_PREFIX)
app.include_router(crops.router, prefix=settings.API_V1_PREFIX)
app.include_router(slots.router, prefix=settings.API_V1_PREFIX)
app.include_router(bookings.router, prefix=settings.API_V1_PREFIX)
app.include_router(queue.router, prefix=settings.API_V1_PREFIX)
app.include_router(procurement.router, prefix=settings.API_V1_PREFIX)
app.include_router(payments.router, prefix=settings.API_V1_PREFIX)
app.include_router(analytics.router, prefix=settings.API_V1_PREFIX)
app.include_router(notifications.router, prefix=settings.API_V1_PREFIX)

@app.get("/")
def root():
    return {
        "app": "KisanSlot Production API",
        "version": "1.0.0",
        "status": "healthy",
        "docs": "/docs",
        "realtime_ws": "/ws"
    }

@app.get("/health")
@app.get(f"{settings.API_V1_PREFIX}/health")
def health_check():
    return {
        "status": "healthy",
        "db": "connected",
        "service": "kisanslot-api"
    }

# ----------------- Real-Time WebSocket Endpoints ----------------- #

@app.websocket("/ws/centres/{centre_id}")
async def websocket_centre_queue(websocket: WebSocket, centre_id: int):
    await ws_hub.connect_centre(centre_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect_centre(centre_id, websocket)
        logger.info(f"Client disconnected from Centre #{centre_id} queue WS")

@app.websocket("/ws/farmers/{farmer_id}")
async def websocket_farmer_queue(websocket: WebSocket, farmer_id: int):
    await ws_hub.connect_farmer(farmer_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect_farmer(farmer_id, websocket)
        logger.info(f"Farmer #{farmer_id} disconnected from private WS")

@app.websocket("/ws/global")
async def websocket_global(websocket: WebSocket):
    await ws_hub.connect_global(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_hub.disconnect_global(websocket)
