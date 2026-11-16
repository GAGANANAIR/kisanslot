import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.database import SessionLocal
from app.models import Centre, Crop, User
from app.services.allocator import SlotAllocationService

def main():
    print("Testing DB connection...")
    db = SessionLocal()
    centres = db.query(Centre).all()
    print(f"Centres count: {len(centres)}")
    for c in centres:
        print(f" - Centre: {c.name} ({c.district})")

    crops = db.query(Crop).all()
    print(f"Crops count: {len(crops)}")

    users = db.query(User).all()
    print(f"Users count: {len(users)}")

    print("Testing smart slot allocation...")
    recs = SlotAllocationService.recommend_slots(db, centres[0].id, crops[0].id, 25.0)
    print(f"Found {len(recs)} recommended slots. Top recommendation:")
    if recs:
        print(f"  Slot ID: {recs[0]['id']} | Window: {recs[0]['start_time']}-{recs[0]['end_time']} | Load: {recs[0]['load_percentage']}% | Reason: {recs[0]['recommended_reason']}")
    db.close()
    print("SUCCESS: Core database and allocator verified!")

if __name__ == "__main__":
    main()
