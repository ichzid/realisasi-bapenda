export default function Loading() {
  return (
    <div className="fullscreen-loader">
      <div className="fullscreen-loader-content">
        <div className="detail-loading-spinner detail-loading-spinner-xl" />
        <h2 className="loading-title">Memuat Data</h2>
        <p className="loading-subtitle">Mengambil data realisasi PAD …</p>
      </div>
    </div>
  );
}
