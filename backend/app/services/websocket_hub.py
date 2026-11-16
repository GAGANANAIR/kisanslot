import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("KisanSlot.WebSocketHub")

class WebSocketHub:
    def __init__(self):
        # centre_id -> Set of WebSocket connections
        self.centre_connections: Dict[int, Set[WebSocket]] = {}
        # farmer_id -> Set of WebSocket connections
        self.farmer_connections: Dict[int, Set[WebSocket]] = {}
        # global broadcast subscribers (e.g. admin dashboards)
        self.global_connections: Set[WebSocket] = set()

    async def connect_centre(self, centre_id: int, websocket: WebSocket):
        await websocket.accept()
        if centre_id not in self.centre_connections:
            self.centre_connections[centre_id] = set()
        self.centre_connections[centre_id].add(websocket)
        logger.info(f"WebSocket connected to Centre #{centre_id}")

    def disconnect_centre(self, centre_id: int, websocket: WebSocket):
        if centre_id in self.centre_connections:
            self.centre_connections[centre_id].discard(websocket)
            if not self.centre_connections[centre_id]:
                del self.centre_connections[centre_id]

    async def connect_farmer(self, farmer_id: int, websocket: WebSocket):
        await websocket.accept()
        if farmer_id not in self.farmer_connections:
            self.farmer_connections[farmer_id] = set()
        self.farmer_connections[farmer_id].add(websocket)
        logger.info(f"WebSocket connected to Farmer #{farmer_id}")

    def disconnect_farmer(self, farmer_id: int, websocket: WebSocket):
        if farmer_id in self.farmer_connections:
            self.farmer_connections[farmer_id].discard(websocket)
            if not self.farmer_connections[farmer_id]:
                del self.farmer_connections[farmer_id]

    async def connect_global(self, websocket: WebSocket):
        await websocket.accept()
        self.global_connections.add(websocket)

    def disconnect_global(self, websocket: WebSocket):
        self.global_connections.discard(websocket)

    async def broadcast_centre_event(self, centre_id: int, event_type: str, data: Any):
        payload = json.dumps({"event": event_type, "centre_id": centre_id, "data": data})
        # Broadcast to centre subscribers
        targets = list(self.centre_connections.get(centre_id, []))
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                self.disconnect_centre(centre_id, ws)

        # Also broadcast to global admin subscribers
        for ws in list(self.global_connections):
            try:
                await ws.send_text(payload)
            except Exception:
                self.disconnect_global(ws)

    async def notify_farmer(self, farmer_id: int, event_type: str, data: Any):
        payload = json.dumps({"event": event_type, "farmer_id": farmer_id, "data": data})
        targets = list(self.farmer_connections.get(farmer_id, []))
        for ws in targets:
            try:
                await ws.send_text(payload)
            except Exception:
                self.disconnect_farmer(farmer_id, ws)

ws_hub = WebSocketHub()
