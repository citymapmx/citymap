import { useState, useRef, useCallback } from "react";
import { cloudUpload, cloudUploadPDF } from "../lib/supabase.js";
import imageCompression from 'browser-image-compression';
import Icon from "./ui/Icon.jsx";
import Cropper from 'react-easy-crop';
import { getCroppedImg } from "../lib/cropImage.js";

export default function Uploader({ onDone, label = "Subir foto", accept = "image/*", aspect = null, multiple = false, avatarMode = false }) {
  const [pct, setPct] = useState(-1); 
  const [err, setErr] = useState(""); 
  const ref = useRef();

  const [imageSrc, setImageSrc] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [originalFile, setOriginalFile] = useState(null);

  const onCropComplete = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleFileChange = (filesList) => {
    if (!filesList || filesList.length === 0) return;
    setErr("");
    
    const files = Array.from(filesList);

    if (!multiple) {
      const file = files[0];
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      if (aspect && !isPdf && file.type.startsWith("image/")) {
        setOriginalFile(file);
        const reader = new FileReader();
        reader.addEventListener('load', () => setImageSrc(reader.result));
        reader.readAsDataURL(file);
      } else {
        goUpload(file);
      }
    } else {
      files.forEach(f => goUpload(f));
    }
  };

  const handleCropConfirm = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error("Canvas error");
      const croppedFile = new File([croppedBlob], originalFile.name, { type: 'image/jpeg' });
      setImageSrc(null);
      goUpload(croppedFile);
    } catch (e) {
      setErr("Error al recortar la imagen");
      setImageSrc(null);
    }
  };

  const goUpload = async file => { 
    if (!file) return; 
    setPct(0); 
    try { 
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      let fileToUpload = file;

      if (!isPdf && file.type.startsWith("image/")) {
        const options = avatarMode ? {
          maxSizeMB: 0.1,
          maxWidthOrHeight: 300,
          useWebWorker: true,
          initialQuality: 0.8,
          fileType: 'image/webp'
        } : {
          maxSizeMB: 4,
          maxWidthOrHeight: 2500,
          useWebWorker: true,
          initialQuality: 0.95,
          fileType: 'image/webp'
        };
        try {
          fileToUpload = await imageCompression(file, options);
        } catch (error) {
          console.warn("Compression error, uploading original", error);
        }
      }

      const url = isPdf ? await cloudUploadPDF(fileToUpload, setPct) : await cloudUpload(fileToUpload, setPct); 
      onDone(url); 
    } catch (e) { 
      setErr(e.message); 
    } finally { 
      setPct(-1); 
    } 
  };

  return (
    <div>
      <input ref={ref} type="file" accept={accept} multiple={multiple} style={{ display: "none" }} onChange={e => handleFileChange(e.target.files)} />
      
      {imageSrc ? (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 999999, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div style={{ width: "100%", maxWidth: 500, background: "#111", borderRadius: 16, overflow: "hidden", display: "flex", flexDirection: "column", height: "70vh", maxHeight: 600 }}>
            <div style={{ position: "relative", flex: 1 }}>
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={aspect}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            <div style={{ padding: "16px", background: "#111", display: "flex", gap: 10, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <div style={{ color: "#aaa", fontSize: 13, width: "100%", textAlign: "center", marginBottom: 4 }}>Arrastra la imagen o haz zoom</div>
              <button onClick={() => setImageSrc(null)} style={{ flex: 1, background: "transparent", color: "#fff", border: "1px solid #333", padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Cancelar</button>
              <button onClick={handleCropConfirm} style={{ flex: 1, background: "#1A7A5E", color: "#fff", border: "none", padding: "12px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>Aceptar y Subir</button>
            </div>
          </div>
        </div>
      ) : pct >= 0 ? (
        <div style={{ border: "1.5px solid #1A7A5E", borderRadius: 10, padding: 14, textAlign: "center", background: "#EAF4F0" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1A7A5E", marginBottom: 6 }}>Subiendo {pct}%</div>
          <div style={{ height: 4, background: "#E4E8E4", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: "#1A7A5E", transition: "width .3s", borderRadius: 2 }} />
          </div>
        </div>
      ) : (
        <div 
          onClick={() => ref.current.click()} 
          onDrop={e => { e.preventDefault(); handleFileChange(e.dataTransfer.files[0]); }} 
          onDragOver={e => e.preventDefault()} 
          style={{ border: "1.5px dashed #E4E8E4", borderRadius: 10, padding: "14px", textAlign: "center", cursor: "pointer" }} 
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#1A7A5E"; e.currentTarget.style.background = "#EAF4F0"; }} 
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#E4E8E4"; e.currentTarget.style.background = "transparent"; }}
        >
          <Icon name="image" size={20} color="#5A6872" />
          <div style={{ fontSize: 13, fontWeight: 600, color: "#0F1A14", marginTop: 6 }}>{label}</div>
          <div style={{ fontSize: 11, color: "#5A6872", marginTop: 2 }}>Arrastra o haz clic</div>
        </div>
      )}
      {err && <div style={{ fontSize: 12, color: "#D94F3D", marginTop: 4 }}>{err}</div>}
    </div>
  );
}
