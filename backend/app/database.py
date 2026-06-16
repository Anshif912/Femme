import sqlite3
import json
import os
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from app.config import settings

# Initialize Firebase if enabled
firebase_app = None
db_firestore = None
db_realtime = None

if settings.USE_FIREBASE:
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore, db as realtime_db
        
        if settings.FIREBASE_CREDENTIALS_PATH:
            cred = credentials.Certificate(settings.FIREBASE_CREDENTIALS_PATH)
            firebase_app = firebase_admin.initialize_app(cred, {
                'databaseURL': settings.FIREBASE_DATABASE_URL
            })
        else:
            firebase_app = firebase_admin.initialize_app(options={
                'databaseURL': settings.FIREBASE_DATABASE_URL
            })
        db_firestore = firestore.client()
        db_realtime = realtime_db
        print("Firebase Admin SDK initialized successfully.")
    except Exception as e:
        print(f"Error initializing Firebase Admin SDK: {e}. Falling back to SQLite.")
        settings.USE_FIREBASE = False

# SQLite database path
DB_PATH = settings.DATABASE_URL.replace("sqlite:///", "")

def get_sqlite_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_sqlite_db():
    if settings.USE_FIREBASE:
        return
        
    conn = get_sqlite_conn()
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        phone TEXT PRIMARY KEY,
        name TEXT,
        created_at TEXT,
        settings TEXT, -- JSON settings
        profile TEXT   -- JSON profile info (medical, emergency cards)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS contacts (
        id TEXT PRIMARY KEY,
        user_phone TEXT,
        name TEXT,
        phone TEXT,
        priority INTEGER,
        created_at TEXT,
        FOREIGN KEY(user_phone) REFERENCES users(phone)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS journeys (
        id TEXT PRIMARY KEY,
        user_phone TEXT,
        cab_number TEXT,
        provider TEXT,
        pickup_lat REAL,
        pickup_lng REAL,
        pickup_address TEXT,
        dest_lat REAL,
        dest_lng REAL,
        dest_address TEXT,
        start_time TEXT,
        end_time TEXT,
        status TEXT, -- active, completed, emergency, cancelled
        expected_route_json TEXT,
        current_lat REAL,
        current_lng REAL,
        safe_arrival_notified INTEGER DEFAULT 0,
        FOREIGN KEY(user_phone) REFERENCES users(phone)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS evidence_capsules (
        id TEXT PRIMARY KEY,
        journey_id TEXT,
        user_phone TEXT,
        timestamp TEXT,
        latitude REAL,
        longitude REAL,
        speed REAL,
        speed_history_json TEXT,
        motion_anomaly INTEGER,
        audio_anomaly INTEGER,
        route_deviation INTEGER,
        raw_audio_features_json TEXT,
        integrity_hash TEXT,
        locked INTEGER DEFAULT 0,
        FOREIGN KEY(journey_id) REFERENCES journeys(id)
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS safe_zones (
        id TEXT PRIMARY KEY,
        user_phone TEXT,
        name TEXT,
        type TEXT, -- police, hospital, metro, petrol, shop, other
        latitude REAL,
        longitude REAL,
        description TEXT,
        created_at TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS unsafe_zones (
        id TEXT PRIMARY KEY,
        user_phone TEXT,
        description TEXT,
        latitude REAL,
        longitude REAL,
        radius REAL,
        reported_at TEXT,
        cab_plate TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS cab_reports (
        id TEXT PRIMARY KEY,
        user_phone TEXT,
        cab_number TEXT,
        provider TEXT,
        rating INTEGER,
        review TEXT,
        tags_json TEXT,
        reported_at TEXT
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS otp_log (
        phone TEXT PRIMARY KEY,
        otp TEXT,
        expires_at TEXT,
        verified INTEGER DEFAULT 0
    )
    """)
    
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS emergency_alerts (
        id TEXT PRIMARY KEY,
        journey_id TEXT,
        contact_name TEXT,
        contact_phone TEXT,
        sms_status TEXT,
        call_status TEXT,
        acknowledged INTEGER DEFAULT 0,
        timestamp TEXT,
        FOREIGN KEY(journey_id) REFERENCES journeys(id)
    )
    """)
    
    conn.commit()
    conn.close()
    print("Local SQLite Database schemas initialized.")

class DBService:
    @staticmethod
    def get_user(phone: str) -> Optional[Dict]:
        if settings.USE_FIREBASE:
            doc = db_firestore.collection("users").document(phone).get()
            return doc.to_dict() if doc.exists else None
        
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM users WHERE phone = ?", (phone,)).fetchone()
        conn.close()
        if row:
            res = dict(row)
            res["settings"] = json.loads(res["settings"]) if res["settings"] else {}
            res["profile"] = json.loads(res["profile"]) if res["profile"] else {}
            return res
        return None

    @staticmethod
    def create_user(phone: str, name: str = "") -> Dict:
        now = datetime.utcnow().isoformat()
        default_settings = {
            "route_deviation_threshold": settings.ROUTE_DEVIATION_THRESHOLD_METERS,
            "unusual_stop_threshold": settings.UNUSUAL_STOP_THRESHOLD_SECONDS,
            "audio_distress_threshold": settings.AUDIO_DISTRESS_THRESHOLD_DB,
            "no_response_timeout": settings.NO_RESPONSE_TIMEOUT_SECONDS,
            "auto_delete_hours": 24,
            "shake_sensitivity": 12.0,
            "siren_enabled": True
        }
        default_profile = {
            "medical_info": "",
            "emergency_card": "",
            "blood_group": "",
            "primary_cab_preference": "Uber"
        }
        
        if settings.USE_FIREBASE:
            user_ref = db_firestore.collection("users").document(phone)
            user_data = {
                "phone": phone,
                "name": name,
                "created_at": now,
                "settings": default_settings,
                "profile": default_profile
            }
            user_ref.set(user_data)
            return user_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT OR IGNORE INTO users (phone, name, created_at, settings, profile) VALUES (?, ?, ?, ?, ?)",
            (phone, name, now, json.dumps(default_settings), json.dumps(default_profile))
        )
        conn.commit()
        conn.close()
        return DBService.get_user(phone)

    @staticmethod
    def update_user_profile(phone: str, profile_data: Dict) -> Dict:
        if settings.USE_FIREBASE:
            db_firestore.collection("users").document(phone).update({"profile": profile_data})
            return DBService.get_user(phone)
            
        conn = get_sqlite_conn()
        conn.execute("UPDATE users SET profile = ? WHERE phone = ?", (json.dumps(profile_data), phone))
        conn.commit()
        conn.close()
        return DBService.get_user(phone)

    @staticmethod
    def update_user_settings(phone: str, settings_data: Dict) -> Dict:
        if settings.USE_FIREBASE:
            db_firestore.collection("users").document(phone).update({"settings": settings_data})
            return DBService.get_user(phone)
            
        conn = get_sqlite_conn()
        conn.execute("UPDATE users SET settings = ? WHERE phone = ?", (json.dumps(settings_data), phone))
        conn.commit()
        conn.close()
        return DBService.get_user(phone)

    @staticmethod
    def get_contacts(phone: str) -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("users").document(phone).collection("contacts").order_by("priority").get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM contacts WHERE user_phone = ? ORDER BY priority ASC", (phone,)).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def add_contact(user_phone: str, contact_data: Dict) -> Dict:
        cid = hashlib.md5(f"{user_phone}_{contact_data['phone']}_{time.time()}".encode()).hexdigest()
        contact_data["id"] = cid
        contact_data["created_at"] = datetime.utcnow().isoformat()
        
        if settings.USE_FIREBASE:
            db_firestore.collection("users").document(user_phone).collection("contacts").document(cid).set(contact_data)
            return contact_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT INTO contacts (id, user_phone, name, phone, priority, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (cid, user_phone, contact_data["name"], contact_data["phone"], contact_data.get("priority", 1), contact_data["created_at"])
        )
        conn.commit()
        conn.close()
        return contact_data

    @staticmethod
    def update_contact(user_phone: str, contact_id: str, contact_data: Dict) -> Dict:
        if settings.USE_FIREBASE:
            db_firestore.collection("users").document(user_phone).collection("contacts").document(contact_id).update(contact_data)
            return contact_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "UPDATE contacts SET name = ?, phone = ?, priority = ? WHERE user_phone = ? AND id = ?",
            (contact_data["name"], contact_data["phone"], contact_data.get("priority", 1), user_phone, contact_id)
        )
        conn.commit()
        conn.close()
        contact_data["id"] = contact_id
        return contact_data

    @staticmethod
    def delete_contact(user_phone: str, contact_id: str):
        if settings.USE_FIREBASE:
            db_firestore.collection("users").document(user_phone).collection("contacts").document(contact_id).delete()
            return
            
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM contacts WHERE user_phone = ? AND id = ?", (user_phone, contact_id))
        conn.commit()
        conn.close()

    @staticmethod
    def create_journey(user_phone: str, journey_data: Dict) -> Dict:
        jid = hashlib.md5(f"{user_phone}_{journey_data['cab_number']}_{time.time()}".encode()).hexdigest()
        journey_data["id"] = jid
        journey_data["user_phone"] = user_phone
        journey_data["start_time"] = datetime.utcnow().isoformat()
        journey_data["end_time"] = None
        journey_data["status"] = "active"
        journey_data["current_lat"] = journey_data["pickup_lat"]
        journey_data["current_lng"] = journey_data["pickup_lng"]
        journey_data["safe_arrival_notified"] = 0
        
        # Save to database
        if settings.USE_FIREBASE:
            db_firestore.collection("journeys").document(jid).set(journey_data)
            # update user's active journey reference
            db_firestore.collection("users").document(user_phone).update({"active_journey_id": jid})
            return journey_data
            
        conn = get_sqlite_conn()
        conn.execute(
            """
            INSERT INTO journeys (
                id, user_phone, cab_number, provider, pickup_lat, pickup_lng, pickup_address,
                dest_lat, dest_lng, dest_address, start_time, end_time, status, expected_route_json,
                current_lat, current_lng, safe_arrival_notified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                jid, user_phone, journey_data["cab_number"], journey_data["provider"],
                journey_data["pickup_lat"], journey_data["pickup_lng"], journey_data["pickup_address"],
                journey_data["dest_lat"], journey_data["dest_lng"], journey_data["dest_address"],
                journey_data["start_time"], journey_data["end_time"], journey_data["status"],
                json.dumps(journey_data.get("expected_route", [])),
                journey_data["current_lat"], journey_data["current_lng"], journey_data["safe_arrival_notified"]
            )
        )
        conn.commit()
        conn.close()
        return journey_data

    @staticmethod
    def get_active_journey(user_phone: str) -> Optional[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("journeys").where("user_phone", "==", user_phone).where("status", "in", ["active", "emergency"]).limit(1).get()
            return docs[0].to_dict() if docs else None
            
        conn = get_sqlite_conn()
        row = conn.execute(
            "SELECT * FROM journeys WHERE user_phone = ? AND status IN ('active', 'emergency') LIMIT 1",
            (user_phone,)
        ).fetchone()
        conn.close()
        if row:
            res = dict(row)
            res["expected_route"] = json.loads(res["expected_route_json"]) if res["expected_route_json"] else []
            return res
        return None

    @staticmethod
    def get_journey(journey_id: str) -> Optional[Dict]:
        if settings.USE_FIREBASE:
            doc = db_firestore.collection("journeys").document(journey_id).get()
            return doc.to_dict() if doc.exists else None
            
        conn = get_sqlite_conn()
        row = conn.execute("SELECT * FROM journeys WHERE id = ?", (journey_id,)).fetchone()
        conn.close()
        if row:
            res = dict(row)
            res["expected_route"] = json.loads(res["expected_route_json"]) if res["expected_route_json"] else []
            return res
        return None

    @staticmethod
    def update_journey(journey_id: str, updates: Dict) -> Dict:
        if settings.USE_FIREBASE:
            db_firestore.collection("journeys").document(journey_id).update(updates)
            return DBService.get_journey(journey_id)
            
        conn = get_sqlite_conn()
        set_clauses = []
        params = []
        for k, v in updates.items():
            if k == "expected_route":
                set_clauses.append("expected_route_json = ?")
                params.append(json.dumps(v))
            else:
                set_clauses.append(f"{k} = ?")
                params.append(v)
        params.append(journey_id)
        conn.execute(f"UPDATE journeys SET {', '.join(set_clauses)} WHERE id = ?", params)
        conn.commit()
        conn.close()
        return DBService.get_journey(journey_id)

    @staticmethod
    def get_user_journeys(user_phone: str) -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("journeys").where("user_phone", "==", user_phone).order_by("start_time", direction=firestore.Query.DESCENDING).get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM journeys WHERE user_phone = ? ORDER BY start_time DESC", (user_phone,)).fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            d["expected_route"] = json.loads(d["expected_route_json"]) if d["expected_route_json"] else []
            res.append(d)
        return res

    @staticmethod
    def create_capsule(capsule_data: Dict) -> Dict:
        cid = hashlib.md5(f"{capsule_data['journey_id']}_{capsule_data['timestamp']}".encode()).hexdigest()
        capsule_data["id"] = cid
        
        # Calculate SHA-256 integrity hash
        hash_payload = f"{capsule_data['journey_id']}_{capsule_data['timestamp']}_{capsule_data['latitude']}_{capsule_data['longitude']}_{capsule_data['speed']}"
        capsule_data["integrity_hash"] = hashlib.sha256(hash_payload.encode()).hexdigest()
        
        if settings.USE_FIREBASE:
            db_firestore.collection("evidence_capsules").document(cid).set(capsule_data)
            return capsule_data
            
        conn = get_sqlite_conn()
        conn.execute(
            """
            INSERT INTO evidence_capsules (
                id, journey_id, user_phone, timestamp, latitude, longitude, speed, speed_history_json,
                motion_anomaly, audio_anomaly, route_deviation, raw_audio_features_json, integrity_hash, locked
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                cid, capsule_data["journey_id"], capsule_data["user_phone"], capsule_data["timestamp"],
                capsule_data["latitude"], capsule_data["longitude"], capsule_data["speed"],
                json.dumps(capsule_data.get("speed_history", [])),
                1 if capsule_data.get("motion_anomaly") else 0,
                1 if capsule_data.get("audio_anomaly") else 0,
                1 if capsule_data.get("route_deviation") else 0,
                json.dumps(capsule_data.get("raw_audio_features", {})),
                capsule_data["integrity_hash"],
                1 if capsule_data.get("locked") else 0
            )
        )
        conn.commit()
        conn.close()
        return capsule_data

    @staticmethod
    def get_capsules(journey_id: str) -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("evidence_capsules").where("journey_id", "==", journey_id).order_by("timestamp").get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM evidence_capsules WHERE journey_id = ? ORDER BY timestamp ASC", (journey_id,)).fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            d["speed_history"] = json.loads(d["speed_history_json"]) if d["speed_history_json"] else []
            d["raw_audio_features"] = json.loads(d["raw_audio_features_json"]) if d["raw_audio_features_json"] else {}
            res.append(d)
        return res

    @staticmethod
    def lock_evidence(journey_id: str):
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("evidence_capsules").where("journey_id", "==", journey_id).get()
            for doc in docs:
                doc.reference.update({"locked": True})
            return
            
        conn = get_sqlite_conn()
        conn.execute("UPDATE evidence_capsules SET locked = 1 WHERE journey_id = ?", (journey_id,))
        conn.commit()
        conn.close()

    @staticmethod
    def delete_unsafe_capsules_older_than_24h():
        cutoff = (datetime.utcnow() - timedelta(hours=24)).isoformat()
        
        if settings.USE_FIREBASE:
            # Firestore query limitations: we delete capsules belonging to completed/cancelled journeys
            # For simplicity in simulator, query older than cutoff and unlocked
            docs = db_firestore.collection("evidence_capsules").where("timestamp", "<", cutoff).where("locked", "==", False).get()
            for doc in docs:
                doc.reference.delete()
            return
            
        conn = get_sqlite_conn()
        conn.execute("DELETE FROM evidence_capsules WHERE timestamp < ? AND locked = 0", (cutoff,))
        conn.commit()
        conn.close()

    @staticmethod
    def get_safe_zones() -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("safe_zones").get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM safe_zones").fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def create_safe_zone(user_phone: str, zone_data: Dict) -> Dict:
        zid = hashlib.md5(f"sz_{zone_data['name']}_{time.time()}".encode()).hexdigest()
        zone_data["id"] = zid
        zone_data["user_phone"] = user_phone
        zone_data["created_at"] = datetime.utcnow().isoformat()
        
        if settings.USE_FIREBASE:
            db_firestore.collection("safe_zones").document(zid).set(zone_data)
            return zone_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT INTO safe_zones (id, user_phone, name, type, latitude, longitude, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (zid, user_phone, zone_data["name"], zone_data["type"], zone_data["latitude"], zone_data["longitude"], zone_data["description"], zone_data["created_at"])
        )
        conn.commit()
        conn.close()
        return zone_data

    @staticmethod
    def get_unsafe_zones() -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("unsafe_zones").get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM unsafe_zones").fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def create_unsafe_zone(user_phone: str, zone_data: Dict) -> Dict:
        uzid = hashlib.md5(f"uz_{zone_data['description'][:10]}_{time.time()}".encode()).hexdigest()
        zone_data["id"] = uzid
        zone_data["user_phone"] = user_phone
        zone_data["reported_at"] = datetime.utcnow().isoformat()
        
        if settings.USE_FIREBASE:
            db_firestore.collection("unsafe_zones").document(uzid).set(zone_data)
            return zone_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT INTO unsafe_zones (id, user_phone, description, latitude, longitude, radius, reported_at, cab_plate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (uzid, user_phone, zone_data["description"], zone_data["latitude"], zone_data["longitude"], zone_data.get("radius", 200.0), zone_data["reported_at"], zone_data.get("cab_plate", ""))
        )
        conn.commit()
        conn.close()
        return zone_data

    @staticmethod
    def get_cab_reports(cab_number: str) -> List[Dict]:
        clean_cab = cab_number.replace(" ", "").upper()
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("cab_reports").where("cab_number", "==", clean_cab).get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM cab_reports WHERE cab_number = ?", (clean_cab,)).fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d["tags_json"]) if d["tags_json"] else []
            res.append(d)
        return res

    @staticmethod
    def get_all_cab_reports() -> List[Dict]:
        if settings.USE_FIREBASE:
            docs = db_firestore.collection("cab_reports").get()
            return [doc.to_dict() for doc in docs]
            
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM cab_reports ORDER BY reported_at DESC").fetchall()
        conn.close()
        res = []
        for r in rows:
            d = dict(r)
            d["tags"] = json.loads(d["tags_json"]) if d["tags_json"] else []
            res.append(d)
        return res

    @staticmethod
    def create_cab_report(user_phone: str, report_data: Dict) -> Dict:
        rid = hashlib.md5(f"cr_{report_data['cab_number']}_{time.time()}".encode()).hexdigest()
        report_data["id"] = rid
        report_data["user_phone"] = user_phone
        report_data["reported_at"] = datetime.utcnow().isoformat()
        report_data["cab_number"] = report_data["cab_number"].replace(" ", "").upper()
        
        if settings.USE_FIREBASE:
            db_firestore.collection("cab_reports").document(rid).set(report_data)
            return report_data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT INTO cab_reports (id, user_phone, cab_number, provider, rating, review, tags_json, reported_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (rid, user_phone, report_data["cab_number"], report_data["provider"], report_data["rating"], report_data["review"], json.dumps(report_data.get("tags", [])), report_data["reported_at"])
        )
        conn.commit()
        conn.close()
        
        # Also log an unsafe zone if rating is <= 2 to trigger visual markers!
        if report_data["rating"] <= 2 and report_data.get("latitude") and report_data.get("longitude"):
            DBService.create_unsafe_zone(user_phone, {
                "description": f"Unsafe cab alert (Plate: {report_data['cab_number']}): {report_data['review']}",
                "latitude": report_data["latitude"],
                "longitude": report_data["longitude"],
                "radius": 150.0,
                "cab_plate": report_data["cab_number"]
            })
            
        return report_data

    # OTP log methods
    @staticmethod
    def create_otp(phone: str, otp: str, expires_at: datetime) -> Dict:
        if settings.USE_FIREBASE:
            # We store OTP in firestore for fallback verification
            ref = db_firestore.collection("otp_log").document(phone)
            data = {"phone": phone, "otp": otp, "expires_at": expires_at.isoformat(), "verified": False}
            ref.set(data)
            return data
            
        conn = get_sqlite_conn()
        conn.execute(
            "INSERT OR REPLACE INTO otp_log (phone, otp, expires_at, verified) VALUES (?, ?, ?, ?)",
            (phone, otp, expires_at.isoformat(), 0)
        )
        conn.commit()
        conn.close()
        return {"phone": phone, "otp": otp, "expires_at": expires_at.isoformat(), "verified": False}

    @staticmethod
    def verify_otp(phone: str, otp: str) -> bool:
        now = datetime.utcnow().isoformat()
        if settings.USE_FIREBASE:
            doc_ref = db_firestore.collection("otp_log").document(phone)
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                if data["otp"] == otp and data["expires_at"] > now and not data["verified"]:
                    doc_ref.update({"verified": True})
                    return True
            return False
            
        conn = get_sqlite_conn()
        row = conn.execute(
            "SELECT * FROM otp_log WHERE phone = ? AND otp = ? AND expires_at > ? AND verified = 0",
            (phone, otp, now)
        ).fetchone()
        
        if row:
            conn.execute("UPDATE otp_log SET verified = 1 WHERE phone = ?", (phone,))
            conn.commit()
            conn.close()
            return True
        conn.close()
        return False

    @staticmethod
    def create_emergency_alert(journey_id: str, contact_name: str, contact_phone: str, sms_status: str, call_status: str) -> Dict:
        aid = hashlib.md5(f"{journey_id}_{contact_phone}_{time.time()}".encode()).hexdigest()
        now = datetime.utcnow().isoformat()
        alert_data = {
            "id": aid,
            "journey_id": journey_id,
            "contact_name": contact_name,
            "contact_phone": contact_phone,
            "sms_status": sms_status,
            "call_status": call_status,
            "acknowledged": 0,
            "timestamp": now
        }
        
        conn = get_sqlite_conn()
        conn.execute(
            """
            INSERT INTO emergency_alerts (
                id, journey_id, contact_name, contact_phone, sms_status, call_status, acknowledged, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (aid, journey_id, contact_name, contact_phone, sms_status, call_status, 0, now)
        )
        conn.commit()
        conn.close()
        return alert_data

    @staticmethod
    def get_emergency_alerts(journey_id: str) -> List[Dict]:
        conn = get_sqlite_conn()
        rows = conn.execute("SELECT * FROM emergency_alerts WHERE journey_id = ?", (journey_id,)).fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def update_emergency_alert(alert_id: str, updates: Dict) -> Optional[Dict]:
        conn = get_sqlite_conn()
        set_clauses = []
        params = []
        for k, v in updates.items():
            set_clauses.append(f"{k} = ?")
            params.append(v)
        params.append(alert_id)
        
        conn.execute(f"UPDATE emergency_alerts SET {', '.join(set_clauses)} WHERE id = ?", params)
        conn.commit()
        
        row = conn.execute("SELECT * FROM emergency_alerts WHERE id = ?", (alert_id,)).fetchone()
        conn.close()
        return dict(row) if row else None
