// app/mainapp/playback/exports/components/Exports.jsx
// Playback › Exports. Lists the route-playback exports created this session — a
// recorded video of the playback and a CSV of the target's coordinates +
// incidents. Play the video inline; download either file. Exports are session-only
// (a page reload clears them), so re-export from Route Playback if needed.
"use client";

import { useEffect, useState } from "react";
import styles from "./exports.module.css";
import { subscribeExports, removeExport } from "../../../lib/exportsStore.js";

function fmtDate(d) {
  try { return new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d || "—"; }
}
function fmtStamp(iso) { try { return new Date(iso).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return ""; } }

export default function Exports() {
  const [rows, setRows] = useState([]);
  const [play, setPlay] = useState(null); // { url, name }

  useEffect(() => subscribeExports(setRows), []);

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.title}>Exports</div>
        <div className={styles.sub}>Route playback exports — video and spreadsheet</div>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>{["EXPORT", "DEVICE", "PLAYBACK DATE", "DURATION", "DISTANCE", "FILES", "STATUS", ""].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.length ? rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <div className={styles.expId}>{r.id}</div>
                  <div className={styles.expTime}>{fmtStamp(r.createdAt)}</div>
                </td>
                <td className={styles.device}>{r.device}</td>
                <td>{fmtDate(r.date)}</td>
                <td>{r.durationMin != null ? `${r.durationMin} min` : "—"}</td>
                <td>{r.distanceKm != null ? `${r.distanceKm} km` : "—"}</td>
                <td>
                  <div className={styles.files}>
                    {r.video
                      ? <button type="button" className={styles.fileBtn} onClick={() => setPlay(r.video)}><i className="ti ti-player-play" /> Play</button>
                      : <span className={styles.preparing}>—</span>}
                    {r.video ? <a className={styles.fileBtn} href={r.video.url} download={r.video.name}><i className="ti ti-download" /> Video</a> : null}
                    {r.csv ? <a className={styles.fileBtn} href={r.csv.url} download={r.csv.name}><i className="ti ti-file-spreadsheet" /> CSV</a> : null}
                  </div>
                  {r.incidents ? <div className={styles.incTag}>{r.incidents} incident{r.incidents === 1 ? "" : "s"}</div> : null}
                </td>
                <td><span className={styles.ready}>Ready</span></td>
                <td><button type="button" className={styles.del} title="Remove" onClick={() => removeExport(r.id)}><i className="ti ti-trash" /></button></td>
              </tr>
            )) : (
              <tr><td className={styles.empty} colSpan={8}>
                No exports yet. Open <a href="/mainapp/playbackmap">Route Playback</a>, pick a device + date, then click <b>Export video + CSV</b>.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {play && (
        <div className={styles.overlay} onClick={() => setPlay(null)}>
          <div className={styles.player} onClick={(e) => e.stopPropagation()}>
            <div className={styles.playerHead}>
              <span className={styles.playerName}>{play.name}</span>
              <button type="button" className={styles.playerX} onClick={() => setPlay(null)}><i className="ti ti-x" /></button>
            </div>
            <video className={styles.video} src={play.url} controls autoPlay playsInline />
            <div className={styles.playerFoot}>
              <a className={styles.dl} href={play.url} download={play.name}><i className="ti ti-download" /> Download video</a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
