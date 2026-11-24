
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Sparkles,
  Coffee,
  LogIn,
  LogOut,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Stethoscope,
  House,
  Search,
  ChevronDown,
  Check,
} from "lucide-react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "./App.css";

const MEMBERS = [
  "Aisha Nurrezkina Mumtaza",
  "Latifah Putri Ramadhani",
  "Nazhwa Rahma Putri",
];

const COLLECTION = "attendance";

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const docId = (name, date) => `${slug(name)}_${date}`;

const todayKey = () => {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatDate = (value) =>
  new Date(`${value}T12:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatTime = (value) => value || "—";

const nowHHMM = () =>
  new Date().toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

/* =========================================
   CUSTOM DROPDOWN MAGANGHUB
========================================= */

function CustomDropdown({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(
    (option) => option.value === value
  );

  useEffect(() => {
    function handleOutsideClick(event) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <div
      ref={dropdownRef}
      className={`custom-dropdown ${open ? "is-open" : ""} ${
        disabled ? "is-disabled" : ""
      }`}
    >
      <button
        id={id}
        type="button"
        className="custom-dropdown-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((previous) => !previous)}
      >
        <span className={!value ? "placeholder" : ""}>
          {selectedOption?.label || placeholder}
        </span>

        <ChevronDown size={17} className="dropdown-chevron" />
      </button>

      {open && !disabled && (
        <div className="custom-dropdown-menu" role="listbox">
          {options.map((option) => (
            <button
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`custom-dropdown-option ${
                value === option.value ? "selected" : ""
              }`}
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={16} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* =========================================
   APLIKASI MAGANGHUB
========================================= */

function App() {
  const [now, setNow] = useState(new Date());
  const [tab, setTab] = useState("absen");

  const [selectedName, setSelectedName] = useState("");
  const [status, setStatus] = useState("");
  const [note, setNote] = useState("");

  const [month, setMonth] = useState(todayKey().slice(0, 7));
  const [filterName, setFilterName] = useState("Semua");
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [records, setRecords] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  const [pickedDate, setPickedDate] = useState("");
  const [manualIn, setManualIn] = useState("");
  const [manualOut, setManualOut] = useState("");
  const [showManualIn, setShowManualIn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mengambil data absensi dari Firebase.
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, COLLECTION),
      (snap) => {
        setRecords(snap.docs.map((d) => d.data()));
        setLoaded(true);
        setLoadError("");
      },
      (err) => {
        console.error(err);
        setLoadError(
          "Data tidak bisa dimuat. Cek internet, konfigurasi Firebase, dan Rules."
        );
        setLoaded(true);
      }
    );

    return unsub;
  }, []);

  const today = todayKey();
  const date = pickedDate || today;
  const isToday = date === today;
  const dateText = formatDate(date);

  const clock = now.toLocaleTimeString("id-ID", {
    hour12: false,
  });

  const myRecord = records.find(
    (r) => r.name === selectedName && r.date === date
  );

  const activeStatus = myRecord ? myRecord.status : status;
  const isHadir = activeStatus === "Hadir";
  const isAbsence = ["Izin", "Sakit", "Alfa"].includes(activeStatus);

  const todayRecords = records.filter((r) => r.date === today);

  const monthRecords = useMemo(() => {
    return records
      .filter((r) => r.date.startsWith(month))
      .filter(
        (r) => filterName === "Semua" || r.name === filterName
      )
      .filter((r) =>
        `${r.name} ${r.status} ${r.date}`
          .toLowerCase()
          .includes(search.toLowerCase())
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [records, month, filterName, search]);

  const stats = useMemo(() => {
    const list = records
      .filter((r) => r.date.startsWith(month))
      .filter(
        (r) => filterName === "Semua" || r.name === filterName
      );

    return {
      hadir: list.filter((r) => r.status === "Hadir").length,
      izin: list.filter((r) => r.status === "Izin").length,
      sakit: list.filter((r) => r.status === "Sakit").length,
      alfa: list.filter((r) => r.status === "Alfa").length,
    };
  }, [records, month, filterName]);

  function showMessage(text) {
    setMessage(text);
    setTimeout(() => setMessage(""), 2800);
  }

  function resetForm() {
    setStatus("");
    setNote("");
    setManualIn("");
    setManualOut("");
    setShowManualIn(false);
  }

  function changeName(name) {
    setSelectedName(name);
    resetForm();
  }

  function changeDate(value) {
    setPickedDate(value && value > today ? today : value);
    resetForm();
  }

  async function save(task, okText) {
    setSaving(true);

    try {
      await task();
      showMessage(okText);
    } catch (error) {
      console.error(error);
      showMessage("Gagal menyimpan. Cek internet lalu coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  // Absen masuk otomatis hari ini.
  function checkIn() {
    if (!selectedName) {
      showMessage("Silakan pilih nama terlebih dahulu.");
      return;
    }

    if (myRecord) {
      showMessage("Catatan absensi untuk tanggal ini sudah ada.");
      return;
    }

    const id = docId(selectedName, today);

    save(
      () =>
        setDoc(doc(db, COLLECTION, id), {
          id,
          name: selectedName,
          date: today,
          status: "Hadir",
          checkIn: nowHHMM(),
          checkOut: "",
          note: "",
        }),
      `Absen masuk berhasil dicatat untuk ${selectedName}.`
    );
  }

  // Absen keluar otomatis hari ini.
  function checkOut() {
    if (
      !myRecord ||
      myRecord.status !== "Hadir" ||
      !myRecord.checkIn
    ) {
      showMessage("Catat jam masuk terlebih dahulu.");
      return;
    }

    if (myRecord.checkOut) {
      showMessage("Jam pulang sudah tercatat.");
      return;
    }

    const ok = window.confirm(
      "Yakin ingin absen keluar sekarang? Jam pulang tidak bisa diubah melalui tombol ini."
    );

    if (!ok) return;

    save(
      () =>
        updateDoc(doc(db, COLLECTION, myRecord.id), {
          checkOut: nowHHMM(),
        }),
      "Absen keluar berhasil dicatat."
    );
  }

  // Simpan status Izin, Sakit, atau Alfa.
  function saveAbsence() {
    if (!selectedName || !isAbsence) return;

    if (myRecord) {
      showMessage("Catatan absensi untuk tanggal ini sudah ada.");
      return;
    }

    const id = docId(selectedName, date);

    save(
      async () => {
        await setDoc(doc(db, COLLECTION, id), {
          id,
          name: selectedName,
          date,
          status,
          checkIn: "",
          checkOut: "",
          note: note.trim().slice(0, 200),
        });

        setNote("");
      },
      `Status ${status} berhasil dicatat.`
    );
  }

  // Mengisi jam masuk hari ini secara manual.
  function saveManualInToday() {
    if (!selectedName) {
      return showMessage("Silakan pilih nama terlebih dahulu.");
    }

    if (myRecord) {
      return showMessage("Catatan hari ini sudah ada.");
    }

    if (!manualIn) {
      return showMessage("Isi jam masuk terlebih dahulu.");
    }

    if (manualIn > nowHHMM()) {
      return showMessage("Jam masuk tidak boleh melebihi waktu sekarang.");
    }

    const id = docId(selectedName, today);

    save(
      async () => {
        await setDoc(doc(db, COLLECTION, id), {
          id,
          name: selectedName,
          date: today,
          status: "Hadir",
          checkIn: manualIn,
          checkOut: "",
          note: "",
        });

        setManualIn("");
        setShowManualIn(false);
      },
      "Jam masuk berhasil disimpan."
    );
  }

  // Mengisi jam keluar hari ini secara manual.
  function saveManualOutToday() {
    if (!selectedName) {
      return showMessage("Silakan pilih nama terlebih dahulu.");
    }

    if (
      !myRecord ||
      myRecord.status !== "Hadir" ||
      !myRecord.checkIn
    ) {
      return showMessage("Catatan jam masuk tidak ditemukan.");
    }

    if (myRecord.checkOut) {
      return showMessage("Jam keluar sudah tercatat.");
    }

    if (!manualOut) {
      return showMessage("Isi jam keluar terlebih dahulu.");
    }

    if (manualOut <= myRecord.checkIn) {
      return showMessage("Jam keluar harus setelah jam masuk.");
    }

    if (manualOut > nowHHMM()) {
      return showMessage(
        "Jam keluar tidak boleh melebihi waktu sekarang."
      );
    }

    save(
      async () => {
        await updateDoc(doc(db, COLLECTION, myRecord.id), {
          checkOut: manualOut,
        });

        setManualOut("");
        setShowManualIn(false);
      },
      "Jam keluar berhasil disimpan."
    );
  }

  // Mengisi absensi Hadir untuk tanggal lampau.
  function saveManualHadir() {
    if (!selectedName) {
      return showMessage("Silakan pilih nama terlebih dahulu.");
    }

    if (!myRecord) {
      if (!manualIn) {
        return showMessage("Isi jam masuk terlebih dahulu.");
      }

      if (manualOut && manualOut <= manualIn) {
        return showMessage("Jam keluar harus setelah jam masuk.");
      }

      const id = docId(selectedName, date);

      save(
        async () => {
          await setDoc(doc(db, COLLECTION, id), {
            id,
            name: selectedName,
            date,
            status: "Hadir",
            checkIn: manualIn,
            checkOut: manualOut || "",
            note: "",
          });

          setManualIn("");
          setManualOut("");
        },
        "Absen berhasil disimpan."
      );
    } else {
      if (!manualOut) {
        return showMessage("Isi jam keluar terlebih dahulu.");
      }

      if (manualOut <= myRecord.checkIn) {
        return showMessage("Jam keluar harus setelah jam masuk.");
      }

      save(
        async () => {
          await updateDoc(doc(db, COLLECTION, myRecord.id), {
            checkOut: manualOut,
          });

          setManualOut("");
        },
        "Jam keluar berhasil disimpan."
      );
    }
  }

  // Ekspor rekap ke Excel.
  function exportExcel() {
    const rows = monthRecords.map((r) => ({
      Nama: r.name,
      Hari: formatDate(r.date).split(",")[0],
      Tanggal: r.date,
      Status: r.status,
      "Jam Masuk": r.checkIn || "-",
      "Jam Keluar": r.checkOut || "-",
      Keterangan: r.note || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Rekap Absensi");
    XLSX.writeFile(wb, `Rekap-MagangHub-${month}.xlsx`);
  }

  // Ekspor rekap ke PDF.
  function exportPDF() {
    const pdf = new jsPDF();

    pdf.setFontSize(18);
    pdf.text("Absensi MagangHub", 14, 18);

    pdf.setFontSize(10);
    pdf.text(`Rekap bulan: ${month}`, 14, 26);

    autoTable(pdf, {
      startY: 32,
      head: [[
        "Nama",
        "Tanggal",
        "Status",
        "Masuk",
        "Keluar",
        "Keterangan",
      ]],
      body: monthRecords.map((r) => [
        r.name,
        r.date,
        r.status,
        r.checkIn || "-",
        r.checkOut || "-",
        r.note || "-",
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [190, 120, 170] },
    });

    pdf.save(`Rekap-MagangHub-${month}.pdf`);
  }

  const statusIcon = {
    Hadir: <CheckCircle2 size={15} />,
    Izin: <House size={15} />,
    Sakit: <Stethoscope size={15} />,
    Alfa: <Coffee size={15} />,
  };

  const nameOptions = MEMBERS.map((name) => ({
    value: name,
    label: name,
  }));

  const statusOptions = [
    { value: "Hadir", label: "Hadir" },
    { value: "Izin", label: "Izin" },
    { value: "Sakit", label: "Sakit" },
    { value: "Alfa", label: "Alfa" },
  ];

  return (
    <main className="app-shell">
      {/* HEADER */}
      <header className="topbar">
        <a className="brand" href="#top">
  <span>
    Magang<span className="brand-accent">Hub</span>
  </span>
</a>

        <span className="top-chip">
          <span className="live-dot" />
          BKHIT Kepulauan Riau
        </span>
      </header>

      {/* HERO */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="eyebrow">SISTEM ABSENSI MAGANG</span>

          <h1>
            Absensi <span>MagangHub</span>
          </h1>

          <p>
            Catat kehadiran dan pantau aktivitas magang
            dalam satu tempat.
          </p>
        </div>

        <div className="hero-decoration" aria-hidden="true">
          <div className="deco-circle">
            <CalendarDays size={38} strokeWidth={1.5} />
          </div>
        </div>
      </section>

      {/* NAVIGASI */}
      <nav className="tabs">
        <button
          className={tab === "absen" ? "tab active" : "tab"}
          onClick={() => setTab("absen")}
        >
          <LogIn size={17} />
          Absensi
        </button>

        <button
          className={tab === "rekap" ? "tab active" : "tab"}
          onClick={() => setTab("rekap")}
        >
          <ClipboardList size={17} />
          Rekap Bulanan
        </button>
      </nav>

      {message && (
  <div className="toast">
    <CheckCircle2 size={17} />
    {message}
  </div>
)}

      {tab === "absen" ? (
        <>
          {/* FORM ABSENSI */}
          <section className="attendance-card panel">
            <div className="date-pill">
              <CalendarDays size={15} />
              {dateText}
            </div>

            {loadError && (
              <p className="hint" style={{ color: "#b0506f" }}>
                {loadError}
              </p>
            )}

            {!loaded && !loadError && (
              <p className="hint">Memuat data…</p>
            )}

            {/* PILIH NAMA */}
            <div className="field">
              <label htmlFor="member">Nama</label>

              <CustomDropdown
                id="member"
                value={selectedName}
                onChange={changeName}
                options={nameOptions}
                placeholder="Pilih nama untuk melanjutkan"
              />
            </div>

            {/* PILIH TANGGAL */}
            <div className="field" style={{ marginTop: 14 }}>
              <label htmlFor="date">Tanggal</label>

              <input
                id="date"
                type="date"
                value={date}
                max={today}
                onChange={(e) => changeDate(e.target.value)}
              />

              <p className="hint">
                {isToday
                  ? "Pilih tanggal sebelumnya jika ingin melengkapi absensi yang terlewat."
                  : "Absensi tanggal sebelumnya dapat diisi dengan jam manual."}
              </p>
            </div>

            {/* PILIH STATUS KEHADIRAN */}
            <div
              className="field status-field"
              style={{ marginTop: 14 }}
            >
              <label htmlFor="status">Status kehadiran</label>

              <CustomDropdown
                id="status"
                value={activeStatus}
                onChange={setStatus}
                options={statusOptions}
                placeholder="Pilih status kehadiran"
                disabled={!selectedName || Boolean(myRecord)}
              />
            </div>

            {!selectedName && (
              <p className="clock-caption selection-hint">
                Pilih nama untuk melanjutkan.
              </p>
            )}

            {selectedName && !activeStatus && (
              <p className="clock-caption selection-hint">
                Silakan pilih status kehadiran.
              </p>
            )}

            {/* STATUS HADIR HARI INI */}
            {selectedName && isHadir && isToday && (
              <>
                <div className="digital-clock" style={{ marginTop: 22 }}>
                  {clock}
                </div>

                <p className="clock-caption">
                  Pantau Kehadiran Anda
                </p>

                <div className="clock-status">
                  {myRecord ? (
                    <>
                      <span className="status-badge">
                        <CheckCircle2 size={15} />
                        Hadir
                      </span>

                      <p>
                        Masuk {myRecord.checkIn}
                        {myRecord.checkOut
                          ? ` · Pulang ${myRecord.checkOut}`
                          : ""}
                      </p>
                    </>
                  ) : (
                    <span className="status-badge muted">
                      Belum absen masuk hari ini
                    </span>
                  )}
                </div>

                <div className="action-row">
                  <button
                    className="action-button masuk"
                    onClick={checkIn}
                    disabled={
                      !loaded || saving || Boolean(myRecord)
                    }
                  >
                    <LogIn size={19} />
                    Absen Masuk
                  </button>

                  <button
                    className="action-button keluar"
                    onClick={checkOut}
                    disabled={
                      !loaded ||
                      saving ||
                      !myRecord ||
                      myRecord.status !== "Hadir" ||
                      !myRecord.checkIn ||
                      Boolean(myRecord.checkOut)
                    }
                  >
                    <LogOut size={19} />
                    Absen Keluar
                  </button>
                </div>

                {/* LINK JAM MASUK / JAM KELUAR MANUAL */}
                {(!myRecord ||
                  (myRecord.status === "Hadir" &&
                    myRecord.checkIn &&
                    !myRecord.checkOut)) && (
                  <div className="manual-attendance">
                    {!showManualIn ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                          setManualIn("");
                          setManualOut("");
                          setShowManualIn(true);
                        }}
                      >
                        {!myRecord
                          ? "Terlambat absen masuk? Isi jam masuk manual"
                          : "Terlambat absen keluar? Isi jam keluar manual"}
                      </button>
                    ) : (
                      <div className="manual-in">
                        <div className="field">
                          <label htmlFor="manualTime">
                            {!myRecord ? "Jam masuk" : "Jam keluar"}
                          </label>

                          <input
                            id="manualTime"
                            type="time"
                            value={!myRecord ? manualIn : manualOut}
                            onChange={(e) =>
                              !myRecord
                                ? setManualIn(e.target.value)
                                : setManualOut(e.target.value)
                            }
                          />
                        </div>

                        <button
                          type="button"
                          className="absence-button"
                          onClick={
                            !myRecord
                              ? saveManualInToday
                              : saveManualOutToday
                          }
                          disabled={!loaded || saving}
                        >
                          <CheckCircle2 size={16} />
                          Simpan {!myRecord ? "jam masuk" : "jam keluar"}
                        </button>

                        <button
                          type="button"
                          className="manual-cancel"
                          onClick={() => {
                            setShowManualIn(false);
                            setManualIn("");
                            setManualOut("");
                          }}
                        >
                          Batal
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            
{/* STATUS HADIR TANGGAL LAMPAU */}
{selectedName && isHadir && !isToday && (
  <div style={{ marginTop: 22 }}>
    {myRecord && (
      <p className="hint" style={{ marginBottom: 10 }}>
        Absen sudah tercatat. Isi jam keluar jika belum tersedia.
      </p>
    )}

    <div className="time-row">
      <div className="field">
        <label htmlFor="tin">Jam masuk</label>
        <input
          id="tin"
          type="time"
          value={myRecord ? myRecord.checkIn || "" : manualIn}
          onChange={(e) => setManualIn(e.target.value)}
          disabled={Boolean(myRecord)}
          required
        />
      </div>

      <div className="field">
        <label htmlFor="tout">Jam keluar</label>
        <input
          id="tout"
          type="time"
          value={myRecord ? manualOut || myRecord.checkOut || "" : manualOut}
          onChange={(e) => setManualOut(e.target.value)}
          required
        />
      </div>
    </div>

    <button
      className="absence-button"
      style={{ width: "100%", marginTop: 12 }}
      onClick={saveManualHadir}
      disabled={
        !loaded ||
        saving ||
        (!myRecord && (!manualIn || !manualOut)) ||
        (Boolean(myRecord) && !manualOut)
      }
    >
      <CheckCircle2 size={16} />
      Simpan Absen
    </button>
  </div>
)}


            {/* STATUS IZIN, SAKIT, ALFA */}
            {selectedName && isAbsence && (
              myRecord ? (
                <div
                  className="clock-status"
                  style={{ marginTop: 22 }}
                >
                  <span className="status-badge">
                    {statusIcon[myRecord.status]}
                    {myRecord.status}
                  </span>

                  <p>
                    Catatan absensi sudah tersimpan
                    {myRecord.note ? `: ${myRecord.note}` : "."}
                  </p>
                </div>
              ) : (
                <div
                  className="absence-area single"
                  style={{ marginTop: 22 }}
                >
                  <div className="field">
                    <label htmlFor="note">
                      Keterangan (opsional)
                    </label>

                    <input
                      id="note"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Tulis keterangan singkat..."
                      maxLength={200}
                    />
                  </div>

                  <button
                    className="absence-button"
                    onClick={saveAbsence}
                    disabled={!loaded || saving}
                  >
                    {statusIcon[activeStatus]}
                    Simpan Status
                  </button>
                </div>
              )
            )}
          </section>

          {/* ABSENSI HARI INI */}
          <section className="panel today-panel">
            <div className="section-heading">
              <div>
                <span className="section-kicker">
                  REKAP KEHADIRAN HARIAN
                </span>

                <h2>Absensi hari ini</h2>
              </div>

              <span className="count-pill">
                {todayRecords.length} catatan
              </span>
            </div>

            {todayRecords.length ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nama</th>
                      <th>Status</th>
                      <th>Masuk</th>
                      <th>Keluar</th>
                    </tr>
                  </thead>

                  <tbody>
                    {todayRecords.map((r) => (
                      <tr key={r.id}>
                        <td className="name-cell">{r.name}</td>

                        <td>
                          <span
                            className={`mini-status ${r.status.toLowerCase()}`}
                          >
                            {r.status}
                          </span>
                        </td>

                        <td>{formatTime(r.checkIn)}</td>
                        <td>{formatTime(r.checkOut)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <span className="empty-icon">
                  <Coffee size={24} />
                </span>

                <p>Belum ada catatan absensi hari ini.</p>
                <span>Catatan kehadiran akan muncul di sini.</span>
              </div>
            )}
          </section>
        </>
      ) : (
        /* REKAP BULANAN */
        <section className="panel recap-panel">
          <div className="section-heading">
            <div>
              <span className="section-kicker">
                REKAP KEHADIRAN
              </span>

              <h2>Rekap bulanan</h2>

              <p className="muted-text">
                Ringkasan kehadiran peserta magang.
              </p>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card pink-stat">
              <span>Hadir</span>
              <strong>{stats.hadir}</strong>
              <CheckCircle2 size={20} />
            </div>

            <div className="stat-card lilac-stat">
              <span>Izin</span>
              <strong>{stats.izin}</strong>
              <House size={20} />
            </div>

            <div className="stat-card peach-stat">
              <span>Sakit</span>
              <strong>{stats.sakit}</strong>
              <Stethoscope size={20} />
            </div>

            <div className="stat-card blue-stat">
              <span>Alfa</span>
              <strong>{stats.alfa}</strong>
              <Coffee size={20} />
            </div>
          </div>

          <div className="filters">
            <div className="field">
              <label htmlFor="month">Bulan</label>

              <input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>

            <div className="field">
              <label htmlFor="filterName">Nama</label>

              <select
                id="filterName"
                value={filterName}
                onChange={(e) => setFilterName(e.target.value)}
              >
                <option>Semua</option>

                {MEMBERS.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="field search-field">
              <label htmlFor="search">Cari catatan</label>

              <div className="search-box">
                <Search size={16} />

                <input
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nama atau status..."
                />
              </div>
            </div>
          </div>

          <div className="export-row">
            <span>{monthRecords.length} catatan ditemukan</span>

            <div className="export-buttons">
              <button
                onClick={exportExcel}
                className="export-button excel"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>

              <button
                onClick={exportPDF}
                className="export-button pdf"
              >
                <FileText size={16} />
                PDF
              </button>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Tanggal</th>
                  <th>Status</th>
                  <th>Masuk</th>
                  <th>Keluar</th>
                  <th>Keterangan</th>
                </tr>
              </thead>

              <tbody>
                {monthRecords.map((r) => (
                  <tr key={r.id}>
                    <td className="name-cell">{r.name}</td>
                    <td>{r.date}</td>

                    <td>
                      <span
                        className={`mini-status ${r.status.toLowerCase()}`}
                      >
                        {r.status}
                      </span>
                    </td>

                    <td>{formatTime(r.checkIn)}</td>
                    <td>{formatTime(r.checkOut)}</td>
                    <td>{r.note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {!monthRecords.length && (
              <div className="empty-state">
                <span className="empty-icon">
                  <CalendarDays size={24} />
                </span>

                <p>Belum ada catatan di bulan ini.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="footer">
        <span>© 2026 MagangHub. All rights reserved.</span>
      </footer>
    </main>
  );
}

export default App;
