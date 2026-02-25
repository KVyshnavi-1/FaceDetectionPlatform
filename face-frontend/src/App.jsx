import React, { useEffect, useState } from "react";
import "./App.css";

const BACKEND_URL = "https://facedetectionplatform-1.onrender.com";

function safeGet(obj, keys, defaultVal = null) {
  for (const k of keys) {
    if (obj && Object.prototype.hasOwnProperty.call(obj, k)) return obj[k];
  }
  return defaultVal;
}

function formatToIST(isoString) {
  if (!isoString) return "";
  try {
    const dt = new Date(isoString);
    return dt.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState(null);
  const [processedImageUrl, setProcessedImageUrl] = useState("");
  const [history, setHistory] = useState([]);
  const [error, setError] = useState("");

  function normalizeDetection(obj) {
    if (!obj) return null;
    const id = safeGet(obj, ["id", "Id", "ID"], null);
    const file_name = safeGet(obj, ["file_name", "filename", "fileName", "file"], "unknown");
    const face_count = safeGet(obj, ["face_count", "faceCount", "faces", "face"], 0);
    const boxes = safeGet(obj, ["boxes", "box"], []);
    const timestamp = safeGet(obj, ["timestamp", "time", "created_at"], null);
    return { id, file_name, face_count, boxes, timestamp };
  }

  async function loadHistory() {
    try {
      const res = await fetch(`${BACKEND_URL}/history`);
      if (!res.ok) return;

      const data = await res.json();
      const normalized = (Array.isArray(data) ? data : []).map((item) =>
        normalizeDetection(item)
      );
      setHistory(normalized);
    } catch (err) {
      setError("Cannot load history — backend not reachable.");
    }
  }

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0] || null);
    setError("");
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError("Please select an image first.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("file", selectedFile);

      const res = await fetch(`${BACKEND_URL}/detect-faces`, {
        method: "POST",
        body: form,
      });

      if (!res.ok) {
        const tx = await res.text();
        setError(`Backend error: ${res.status} ${tx}`);
        setLoading(false);
        return;
      }

      const json = await res.json();
      const normalized = normalizeDetection(json);
      setCurrentResult(normalized);

      setProcessedImageUrl(`${BACKEND_URL}/processed-image?t=${Date.now()}`);
      await loadHistory();
    } catch (err) {
      setError("Network error — cannot reach backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-root">
      <div className="container">
        <h1 className="title">Face Detection</h1>

        {/* Upload card */}
        <section className="card">
          <div className="card-row">
            <input
              id="file"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
            />
            <button onClick={handleUpload} disabled={loading}>
              {loading ? "Detecting..." : "Detect Faces"}
            </button>
          </div>
          {error && <div className="error">{error}</div>}
        </section>

        {/* Current Result */}
        <section className="card">
          <h2 className="card-heading">Current Result</h2>

          {!currentResult && <div className="muted">No detection yet.</div>}

          {currentResult && (
            <div className="two-col">
              {/* Left side */}
              <div className="left">
                <div className="info-row">
                  <div className="label">File</div>
                  <div className="value">{currentResult.file_name}</div>
                </div>

                <div className="info-row">
                  <div className="label">Faces</div>
                  <div className="face-badge">{currentResult.face_count}</div>
                </div>

                <div className="info-row">
                  <div className="label">Time</div>
                  <div className="value">
                    {formatToIST(currentResult.timestamp) || "-"}
                  </div>
                </div>

                <div className="label">Boxes</div>
                <ul className="box-list">
                  {Array.isArray(currentResult.boxes) &&
                  currentResult.boxes.length > 0 ? (
                    currentResult.boxes.map((b, i) => (
                      <li key={i}>
                        #{i + 1}: x={safeGet(b, ["x", "X"], "?")}, y=
                        {safeGet(b, ["y", "Y"], "?")}, w=
                        {safeGet(b, ["w", "W"], "?")}, h=
                        {safeGet(b, ["h", "H"], "?")}
                      </li>
                    ))
                  ) : (
                    <li className="muted">No boxes returned</li>
                  )}
                </ul>
              </div>

              {/* Right side */}
              <div className="right">
                <div className="image-panel">
                  {processedImageUrl ? (
                    <img
                      src={processedImageUrl}
                      alt="Processed"
                      className="processed"
                    />
                  ) : (
                    <div className="muted">Processed image not available</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* History */}
        <section className="card">
          <h2 className="card-heading">History</h2>

          {history.length === 0 ? (
            <div className="muted">No history yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>File</th>
                    <th>Time (IST)</th>
                    <th>Faces</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h) => (
                    <tr key={h.id ?? Math.random()}>
                      <td>{h.id ?? "-"}</td>
                      <td>{h.file_name}</td>
                      <td>{formatToIST(h.timestamp) || "-"}</td>
                      <td>{h.face_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
