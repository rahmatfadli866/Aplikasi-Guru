"""Backend tests for Sistem Manajemen Nilai Siswa"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://report-card-21.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Init/Seed ----------
def test_init_idempotent(client):
    r1 = client.post(f"{API}/init")
    assert r1.status_code == 200
    r2 = client.post(f"{API}/init")
    assert r2.status_code == 200


# ---------- Teacher ----------
def test_get_teacher_default(client):
    r = client.get(f"{API}/teacher")
    assert r.status_code == 200
    d = r.json()
    assert d["nama"] and d["nip"] and d["mata_pelajaran"]


def test_update_teacher(client):
    orig = client.get(f"{API}/teacher").json()
    payload = {"nama": "TEST_Ibu Test", "nip": "999999", "mata_pelajaran": "TEST_IPA"}
    r = client.put(f"{API}/teacher", json=payload)
    assert r.status_code == 200
    d = r.json()
    assert d["nama"] == payload["nama"]
    # verify via GET
    g = client.get(f"{API}/teacher").json()
    assert g["nama"] == payload["nama"]
    # restore
    client.put(f"{API}/teacher", json={"nama": orig["nama"], "nip": orig["nip"], "mata_pelajaran": orig["mata_pelajaran"]})


# ---------- Categories ----------
def test_categories_default_13(client):
    r = client.get(f"{API}/categories")
    assert r.status_code == 200
    cats = r.json()
    names = [c["nama"] for c in cats]
    for i in range(1, 11):
        assert f"Bab {i}" in names
    for n in ["Quiz", "UTS", "US"]:
        assert n in names
    assert len(cats) >= 13


def test_category_crud(client):
    r = client.post(f"{API}/categories", json={"nama": "TEST_Kategori", "urutan": 100})
    assert r.status_code == 200
    cid = r.json()["id"]
    # update
    r2 = client.put(f"{API}/categories/{cid}", json={"nama": "TEST_KategoriUpd", "urutan": 101})
    assert r2.status_code == 200
    assert r2.json()["nama"] == "TEST_KategoriUpd"
    # delete
    r3 = client.delete(f"{API}/categories/{cid}")
    assert r3.status_code == 200


# ---------- Students ----------
def test_list_students(client):
    r = client.get(f"{API}/students")
    assert r.status_code == 200
    assert len(r.json()) >= 14


def test_list_students_filter_kelas(client):
    r = client.get(f"{API}/students", params={"kelas": 1})
    assert r.status_code == 200
    for s in r.json():
        assert s["kelas"] == 1


def test_student_crud_and_kelas_validation(client):
    # invalid kelas
    r_bad = client.post(f"{API}/students", json={"nama": "TEST_X", "kelas": 7})
    assert r_bad.status_code == 400
    # valid
    r = client.post(f"{API}/students", json={"nama": "TEST_Siswa", "kelas": 3})
    assert r.status_code == 200
    sid = r.json()["id"]
    # update valid
    r2 = client.put(f"{API}/students/{sid}", json={"nama": "TEST_SiswaUpd", "kelas": 4})
    assert r2.status_code == 200
    assert r2.json()["kelas"] == 4
    # update invalid kelas
    r3 = client.put(f"{API}/students/{sid}", json={"nama": "TEST_X", "kelas": 0})
    assert r3.status_code == 400
    # delete
    r4 = client.delete(f"{API}/students/{sid}")
    assert r4.status_code == 200
    # verify 404
    r5 = client.delete(f"{API}/students/{sid}")
    assert r5.status_code == 404


# ---------- Grades ----------
def test_grade_upsert_and_validation(client):
    # get a student and category
    s = client.get(f"{API}/students").json()[0]
    c = client.get(f"{API}/categories").json()[0]
    # invalid nilai
    r_bad = client.post(f"{API}/grades", json={"student_id": s["id"], "category_id": c["id"], "nilai": 150})
    assert r_bad.status_code == 400
    # valid upsert
    r = client.post(f"{API}/grades", json={"student_id": s["id"], "category_id": c["id"], "nilai": 80})
    assert r.status_code == 200
    gid = r.json()["id"]
    assert r.json()["nilai"] == 80
    # upsert same pair => same id
    r2 = client.post(f"{API}/grades", json={"student_id": s["id"], "category_id": c["id"], "nilai": 90})
    assert r2.status_code == 200
    assert r2.json()["id"] == gid
    assert r2.json()["nilai"] == 90
    # PUT
    r3 = client.put(f"{API}/grades/{gid}", json={"nilai": 75})
    assert r3.status_code == 200
    assert r3.json()["nilai"] == 75
    # PUT invalid
    r4 = client.put(f"{API}/grades/{gid}", json={"nilai": -1})
    assert r4.status_code == 400


def test_list_grades_filter_kelas(client):
    r = client.get(f"{API}/grades", params={"kelas": 1})
    assert r.status_code == 200
    grades = r.json()
    # all grades must belong to students of kelas 1
    students = {s["id"] for s in client.get(f"{API}/students", params={"kelas": 1}).json()}
    for g in grades:
        assert g["student_id"] in students


# ---------- Stats ----------
def test_stats(client):
    r = client.get(f"{API}/stats")
    assert r.status_code == 200
    d = r.json()
    assert d["total_students"] >= 14
    assert d["kelas_aktif"] >= 1
    assert d["total_grades"] >= 0
    assert d["total_categories"] >= 13
