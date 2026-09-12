#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Tambahkan dan bedakan input nilai dan rekap nilai sesuai mata pelajaran.
  Input: kelas → siswa → mata pelajaran → jenis nilai → angka.
  Aksi cepat nilai otomatis mengikuti kelas dan mapel jadwal berlangsung.
  Ganti aksi cepat Lihat Rekap menjadi Input Absensi dengan kelas otomatis.
  Semua data tetap offline; tanpa jadwal aktif pilih manual (disetujui pengguna).
frontend:
  - task: "Nilai per mata pelajaran, pemeliharaan nilai lama, rekap dan ekspor terfilter"
    implemented: true
    working: true
    file: "frontend/src/local-store.ts; frontend/src/components/grade-input-form.tsx; frontend/app/(tabs)/rekap.tsx"
    stuck_count: 0
    priority: high
    needs_retesting: false
    status_history:
      - working: NA
        agent: main
        comment: "Upsert siswa+mapel+jenis; normalisasi case/spasi; legacy terpisah tanpa migrasi destruktif. Input penuh, filter rekap, edit sel dan ekspor menyertakan mapel."
      - working: true
        agent: main
        comment: "Iteration3 mayoritas lulus; perbaikan status disabled edit kosong telah diverifikasi screenshot UI (blank, 101, malformed, 0, cancel/reset). Lihat iteration_3_retest.json. Excel terverifikasi; native share masih perlu perangkat nyata."
  - task: "Aksi cepat nilai dan absensi berdasarkan jadwal aktif"
    implemented: true
    working: true
    file: "frontend/app/input-cepat.tsx; frontend/app/kehadiran.tsx; frontend/app/(tabs)/home.tsx"
    stuck_count: 0
    priority: high
    needs_retesting: false
    status_history:
      - working: NA
        agent: main
        comment: "Quick input memakai route tersendiri agar tab Input tetap manual. Absensi cepat otomatis hari ini+kelas. Jadwal selanjutnya tidak dipakai; fallback manual. Live re-resolve dengan timer/focus/AppState. Write lock untuk tap absensi cepat."
      - working: true
        agent: testing
        comment: "Lulus iteration_3: mapel/kelas otomatis, fallback manual, perpindahan konteks, persistensi offline dan viewport mobile."
metadata:
  created_by: main_agent
  version: "1.0"
  test_sequence: 3
  run_ui: true
test_plan:
  current_focus:
    - "Isolasi mapel pada input, upsert, edit rekap, agregat dan ekspor"
    - "Quick actions jadwal berlangsung vs selanjutnya/selesai; pergantian jadwal dan kelas"
    - "Offline persistensi, legacy tidak hilang, validasi 0..100, absensi lintas siswa"
  stuck_tasks: []
  test_all: false
  test_priority: high_first
agent_communication:
  - agent: main
    message: "Temuan edit-save iteration3 telah diperbaiki dan self-retest lulus. Tidak ada kode aplikasi diubah testing agent (hanya report). Tidak ada bug fungsional tersisa yang ditemukan. Native PDF/print/share perlu validasi di perangkat."
  - agent: main
    message: "Uji frontend saja; backend tidak digunakan. Kredensial tidak diperlukan, lihat memory/test_credentials.md. Gunakan isolated browser storage. Jadwal kelas mendukung 4/Kelas 4/Kelas 4A→tingkat 4 dengan keterangan rombel. Nilai lama tanpa mapel hanya di opsi Nilai lama; tidak dapat membuat nilai tanpa mapel baru. Uji pembuatan mapel manual ketika daftar kosong dan pilihan + Mata pelajaran lain."