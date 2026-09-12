from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ============================================================
# Models
# ============================================================
class Teacher(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama: str = ""
    nip: str = ""
    mata_pelajaran: str = ""
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class TeacherUpdate(BaseModel):
    nama: str
    nip: str
    mata_pelajaran: str


class Student(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama: str
    kelas: int  # 1..6
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class StudentCreate(BaseModel):
    nama: str
    kelas: int


class Category(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nama: str
    urutan: int = 0
    is_default: bool = False


class CategoryCreate(BaseModel):
    nama: str
    urutan: Optional[int] = 0


class Grade(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    student_id: str
    category_id: str
    nilai: float
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class GradeCreate(BaseModel):
    student_id: str
    category_id: str
    nilai: float


class GradeUpdate(BaseModel):
    nilai: float


# ============================================================
# Helpers
# ============================================================
PROJ = {"_id": 0}


async def ensure_defaults():
    # Teacher: kosongkan secara default
    if not await db.teacher.find_one({}, PROJ):
        await db.teacher.insert_one(Teacher(
            nama="",
            nip="",
            mata_pelajaran="",
        ).model_dump())

    # Categories default: Bab 1-10 + Quiz + UTS + US
    count = await db.categories.count_documents({})
    if count == 0:
        defaults = [f"Bab {i}" for i in range(1, 11)] + ["Quiz", "UTS", "US"]
        docs = [Category(nama=n, urutan=i, is_default=True).model_dump() for i, n in enumerate(defaults)]
        await db.categories.insert_many(docs)


# ============================================================
# Routes: Teacher
# ============================================================
@api_router.get("/teacher", response_model=Teacher)
async def get_teacher():
    doc = await db.teacher.find_one({}, PROJ)
    if not doc:
        await ensure_defaults()
        doc = await db.teacher.find_one({}, PROJ)
    return Teacher(**doc)


@api_router.put("/teacher", response_model=Teacher)
async def update_teacher(data: TeacherUpdate):
    doc = await db.teacher.find_one({}, PROJ)
    if not doc:
        obj = Teacher(**data.model_dump())
        await db.teacher.insert_one(obj.model_dump())
        return obj
    now = datetime.now(timezone.utc).isoformat()
    await db.teacher.update_one(
        {"id": doc["id"]},
        {"$set": {**data.model_dump(), "updated_at": now}},
    )
    updated = await db.teacher.find_one({"id": doc["id"]}, PROJ)
    return Teacher(**updated)


# ============================================================
# Routes: Students
# ============================================================
@api_router.get("/students", response_model=List[Student])
async def list_students(kelas: Optional[int] = None):
    q = {}
    if kelas is not None:
        q["kelas"] = kelas
    docs = await db.students.find(q, PROJ).to_list(2000)
    docs.sort(key=lambda d: (d.get("kelas", 0), d.get("nama", "")))
    return [Student(**d) for d in docs]


@api_router.post("/students", response_model=Student)
async def create_student(data: StudentCreate):
    if data.kelas < 1 or data.kelas > 6:
        raise HTTPException(400, "Kelas harus 1..6")
    obj = Student(**data.model_dump())
    await db.students.insert_one(obj.model_dump())
    return obj


@api_router.put("/students/{sid}", response_model=Student)
async def update_student(sid: str, data: StudentCreate):
    if data.kelas < 1 or data.kelas > 6:
        raise HTTPException(400, "Kelas harus 1..6")
    res = await db.students.update_one({"id": sid}, {"$set": data.model_dump()})
    if res.matched_count == 0:
        raise HTTPException(404, "Siswa tidak ditemukan")
    doc = await db.students.find_one({"id": sid}, PROJ)
    return Student(**doc)


@api_router.delete("/students/{sid}")
async def delete_student(sid: str):
    await db.grades.delete_many({"student_id": sid})
    res = await db.students.delete_one({"id": sid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Siswa tidak ditemukan")
    return {"ok": True}


# ============================================================
# Routes: Categories
# ============================================================
@api_router.get("/categories", response_model=List[Category])
async def list_categories():
    docs = await db.categories.find({}, PROJ).to_list(2000)
    docs.sort(key=lambda d: d.get("urutan", 0))
    return [Category(**d) for d in docs]


@api_router.post("/categories", response_model=Category)
async def create_category(data: CategoryCreate):
    max_ord_doc = await db.categories.find_one({}, PROJ, sort=[("urutan", -1)])
    urutan = data.urutan or ((max_ord_doc["urutan"] + 1) if max_ord_doc else 0)
    obj = Category(nama=data.nama, urutan=urutan, is_default=False)
    await db.categories.insert_one(obj.model_dump())
    return obj


@api_router.put("/categories/{cid}", response_model=Category)
async def update_category(cid: str, data: CategoryCreate):
    update = {"nama": data.nama}
    if data.urutan is not None:
        update["urutan"] = data.urutan
    res = await db.categories.update_one({"id": cid}, {"$set": update})
    if res.matched_count == 0:
        raise HTTPException(404, "Kategori tidak ditemukan")
    doc = await db.categories.find_one({"id": cid}, PROJ)
    return Category(**doc)


@api_router.delete("/categories/{cid}")
async def delete_category(cid: str):
    await db.grades.delete_many({"category_id": cid})
    res = await db.categories.delete_one({"id": cid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Kategori tidak ditemukan")
    return {"ok": True}


# ============================================================
# Routes: Grades
# ============================================================
@api_router.get("/grades", response_model=List[Grade])
async def list_grades(student_id: Optional[str] = None, kelas: Optional[int] = None):
    q = {}
    if student_id:
        q["student_id"] = student_id
    if kelas is not None:
        # Filter grades by class - get students first
        student_docs = await db.students.find({"kelas": kelas}, PROJ).to_list(2000)
        ids = [s["id"] for s in student_docs]
        q["student_id"] = {"$in": ids}
    docs = await db.grades.find(q, PROJ).to_list(20000)
    return [Grade(**d) for d in docs]


@api_router.post("/grades", response_model=Grade)
async def create_or_update_grade(data: GradeCreate):
    if data.nilai < 0 or data.nilai > 100:
        raise HTTPException(400, "Nilai harus 0..100")
    # upsert by (student_id, category_id)
    existing = await db.grades.find_one(
        {"student_id": data.student_id, "category_id": data.category_id}, PROJ
    )
    now = datetime.now(timezone.utc).isoformat()
    if existing:
        await db.grades.update_one(
            {"id": existing["id"]},
            {"$set": {"nilai": data.nilai, "updated_at": now}},
        )
        doc = await db.grades.find_one({"id": existing["id"]}, PROJ)
        return Grade(**doc)
    obj = Grade(**data.model_dump())
    await db.grades.insert_one(obj.model_dump())
    return obj


@api_router.put("/grades/{gid}", response_model=Grade)
async def update_grade(gid: str, data: GradeUpdate):
    if data.nilai < 0 or data.nilai > 100:
        raise HTTPException(400, "Nilai harus 0..100")
    now = datetime.now(timezone.utc).isoformat()
    res = await db.grades.update_one(
        {"id": gid}, {"$set": {"nilai": data.nilai, "updated_at": now}}
    )
    if res.matched_count == 0:
        raise HTTPException(404, "Nilai tidak ditemukan")
    doc = await db.grades.find_one({"id": gid}, PROJ)
    return Grade(**doc)


@api_router.delete("/grades/{gid}")
async def delete_grade(gid: str):
    res = await db.grades.delete_one({"id": gid})
    if res.deleted_count == 0:
        raise HTTPException(404, "Nilai tidak ditemukan")
    return {"ok": True}


# ============================================================
# Stats
# ============================================================
@api_router.get("/stats")
async def get_stats():
    total_students = await db.students.count_documents({})
    kelas_aktif = len(await db.students.distinct("kelas"))
    total_grades = await db.grades.count_documents({})
    total_categories = await db.categories.count_documents({})
    return {
        "total_students": total_students,
        "kelas_aktif": kelas_aktif,
        "total_grades": total_grades,
        "total_categories": total_categories,
    }


@api_router.post("/init")
async def init_defaults():
    await ensure_defaults()
    return {"ok": True}


@api_router.get("/")
async def root():
    return {"message": "Sistem Manajemen Nilai Siswa API"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("startup")
async def on_startup():
    try:
        await ensure_defaults()
        logger.info("Defaults ensured")
    except Exception as e:
        logger.exception("Failed to ensure defaults: %s", e)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
