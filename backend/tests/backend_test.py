"""Backend tests for Sistem Manajemen Nilai Siswa - attendance & teacher photo features."""
import os
import pytest
import requests

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', 'https://app-executor-30.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture(scope="module")
def s():
    return requests.Session()


@pytest.fixture(scope="module")
def student_ids(s):
    ids = []
    for name in ["TEST_Adi", "TEST_Budi", "TEST_Citra"]:
        r = s.post(f"{API}/students", json={"nama": name, "kelas": 1})
        assert r.status_code == 200, r.text
        ids.append(r.json()["id"])
    yield ids
    for sid in ids:
        try:
            s.delete(f"{API}/students/{sid}")
        except Exception:
            pass


class TestTeacher:
    def test_get_teacher_has_photo_path(self, s):
        r = s.get(f"{API}/teacher")
        assert r.status_code == 200
        d = r.json()
        assert "photo_path" in d
        for k in ("nama", "nip", "mata_pelajaran"):
            assert k in d

    def test_update_teacher(self, s):
        r = s.put(f"{API}/teacher", json={"nama": "TEST_Guru", "nip": "1234", "mata_pelajaran": "IPA"})
        assert r.status_code == 200
        assert r.json()["nama"] == "TEST_Guru"
        r2 = s.get(f"{API}/teacher")
        assert r2.json()["nama"] == "TEST_Guru"


class TestCategories:
    def test_defaults_seeded(self, s):
        r = s.get(f"{API}/categories")
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 13
        names = [c["nama"] for c in data]
        for n in ["Bab 1", "Bab 10", "Quiz", "UTS", "US"]:
            assert n in names


class TestStudents:
    def test_list_students(self, s, student_ids):
        r = s.get(f"{API}/students?kelas=1")
        assert r.status_code == 200
        ids = [x["id"] for x in r.json()]
        for sid in student_ids:
            assert sid in ids

    def test_invalid_kelas(self, s):
        r = s.post(f"{API}/students", json={"nama": "TEST_x", "kelas": 7})
        assert r.status_code == 400


class TestGrades:
    def test_upsert_grade(self, s, student_ids):
        cats = s.get(f"{API}/categories").json()
        cid = cats[0]["id"]
        sid = student_ids[0]
        r = s.post(f"{API}/grades", json={"student_id": sid, "category_id": cid, "nilai": 80})
        assert r.status_code == 200
        gid = r.json()["id"]
        r2 = s.post(f"{API}/grades", json={"student_id": sid, "category_id": cid, "nilai": 90})
        assert r2.status_code == 200
        assert r2.json()["id"] == gid
        assert r2.json()["nilai"] == 90


class TestAttendance:
    date = "2026-09-01"

    def test_post_invalid_status(self, s, student_ids):
        r = s.post(f"{API}/attendance", json={
            "student_id": student_ids[0], "tanggal": self.date, "status": "xxx"
        })
        assert r.status_code == 400

    def test_post_invalid_date(self, s, student_ids):
        r = s.post(f"{API}/attendance", json={
            "student_id": student_ids[0], "tanggal": "2026-9-1", "status": "hadir"
        })
        assert r.status_code == 400

    def test_upsert_attendance(self, s, student_ids):
        sid = student_ids[0]
        r1 = s.post(f"{API}/attendance", json={"student_id": sid, "tanggal": self.date, "status": "hadir"})
        assert r1.status_code == 200
        aid1 = r1.json()["id"]
        assert r1.json()["status"] == "hadir"
        r2 = s.post(f"{API}/attendance", json={"student_id": sid, "tanggal": self.date, "status": "sakit"})
        assert r2.status_code == 200
        assert r2.json()["id"] == aid1
        assert r2.json()["status"] == "sakit"

    def test_filter_by_kelas_tanggal(self, s, student_ids):
        s.post(f"{API}/attendance", json={"student_id": student_ids[1], "tanggal": self.date, "status": "izin"})
        s.post(f"{API}/attendance", json={"student_id": student_ids[2], "tanggal": self.date, "status": "alpa"})
        s.post(f"{API}/attendance", json={"student_id": student_ids[0], "tanggal": "2026-09-02", "status": "hadir"})

        r = s.get(f"{API}/attendance?kelas=1&tanggal={self.date}")
        assert r.status_code == 200
        rows = r.json()
        for row in rows:
            assert row["tanggal"] == self.date
        sids_in_result = {row["student_id"] for row in rows}
        for sid in student_ids:
            assert sid in sids_in_result

    def test_summary(self, s, student_ids):
        r = s.get(f"{API}/attendance/summary?kelas=1")
        assert r.status_code == 200
        summary = r.json()
        sid = student_ids[0]
        assert sid in summary
        row = summary[sid]
        assert row["total"] >= 2
        assert row["sakit"] >= 1
        assert row["hadir"] >= 1

    def test_delete_student_cascades_attendance(self, s):
        r = s.post(f"{API}/students", json={"nama": "TEST_Cascade", "kelas": 2})
        sid = r.json()["id"]
        s.post(f"{API}/attendance", json={"student_id": sid, "tanggal": "2026-09-03", "status": "hadir"})
        r0 = s.get(f"{API}/attendance?student_id={sid}")
        assert len(r0.json()) == 1
        s.delete(f"{API}/students/{sid}")
        r1 = s.get(f"{API}/attendance?student_id={sid}")
        assert r1.json() == []


class TestTeacherPhoto:
    def test_reject_non_image(self, s):
        r = s.post(f"{API}/teacher/photo",
                   files={"file": ("a.txt", b"hello world", "text/plain")})
        assert r.status_code == 400

    def test_upload_serve_delete(self, s):
        png = bytes.fromhex(
            "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4"
            "890000000D49444154789C63F8CF00000003010100D3D3F0090000000049454E"
            "44AE426082"
        )
        r = s.post(f"{API}/teacher/photo",
                   files={"file": ("a.png", png, "image/png")})
        if r.status_code >= 500 and ("storage" in r.text.lower() or "Gagal" in r.text):
            pytest.skip(f"object storage error: {r.text}")
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["photo_path"].startswith("sistem-nilai-siswa/uploads/teacher/")
        path = d["photo_path"]

        r2 = s.get(f"{API}/files/{path}")
        assert r2.status_code == 200
        assert r2.headers.get("content-type", "").startswith("image/")
        assert len(r2.content) == len(png)

        r3 = s.delete(f"{API}/teacher/photo")
        assert r3.status_code == 200
        assert r3.json()["photo_path"] == ""


class TestStats:
    def test_stats(self, s):
        r = s.get(f"{API}/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("total_students", "kelas_aktif", "total_grades", "total_categories"):
            assert k in d and isinstance(d[k], int)
