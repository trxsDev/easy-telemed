import React, { useRef, useState, useMemo, Suspense, useEffect, useCallback } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import * as THREE from "three";

/** ---------- Loading UI ---------- */
function LoadingFallback() {
  return (
    <div
      style={{
        inset: 0,
        position: "absolute",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "#fff",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          border: "4px solid rgba(255,255,255,0.35)",
          borderTop: "4px solid #fff",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}
      />
      <div style={{ opacity: 0.9 }}>Loading 3D Model…</div>
      <style>{`
        @keyframes spin { 0% { transform: rotate(0deg) } 100% { transform: rotate(360deg) } }
      `}</style>
    </div>
  );
}

/** ---------- Error Boundary ---------- */
class ModelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err, info) {
    console.error("3D Model Error:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            inset: 0,
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            color: "#333",
            flexDirection: "column",
            textAlign: "center",
            padding: 20,
            gap: 8,
          }}
        >
          <div style={{ fontSize: 48 }}>🤖</div>
          <div>Could not load 3D model.</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>
            Please check if the model file exists and is accessible.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/** ---------- Utilities ---------- */
function resolveModelUrl(defaultFile = "HumanBody.obj") {
  // Vite
  const viteBase =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL;
  if (viteBase) return viteBase.replace(/\/?$/, "/") + defaultFile;

  // Fallback root
  return "/" + defaultFile;
}

/** ---------- Human Model ---------- */
function HumanModel({
  onPartClick,
  selectedParts = [],
  onHoverChange,
  modelUrl,
}) {
  const modelRef = useRef();

  // Load OBJ model (suspends inside <Canvas>)
  const url = modelUrl || resolveModelUrl("HumanBody.obj");
  const obj = useLoader(OBJLoader, url);

  // Slow rotation (optional)
  useFrame(() => {
    if (modelRef.current) modelRef.current.rotation.y += 0.003;
  });

  // Create base material ONE TIME per mesh; dispose on unmount (prevent leaks)
  useEffect(() => {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.isMesh) {
        if (!child.userData.baseMat) {
          const mat = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
          });
          child.material = mat;
          child.userData.baseMat = mat;
          // Performance hints
          child.castShadow = false;
          child.receiveShadow = false;
        }
      }
    });
    return () => {
      obj.traverse((child) => {
        if (child.isMesh && child.userData?.baseMat) {
          child.userData.baseMat.dispose();
        }
      });
    };
  }, [obj]);

  // Highlight selection (only change color/emissive; do not recreate materials)
  useEffect(() => {
    if (!obj) return;
    obj.traverse((child) => {
      if (!child.isMesh) return;
      const partName = (child.name || "").toLowerCase();
      const isSelected = selectedParts.some((p) => {
        const q = p.toLowerCase();
        return partName.includes(q) || q.includes(partName);
      });
      const mat = child.material;
      if (!mat) return;
      if (isSelected) {
        mat.color.set(0xff6b6b);
        mat.emissive.set(0x220000);
      } else {
        mat.color.set(0xffffff);
        mat.emissive.set(0x000000);
      }
    });
  }, [obj, selectedParts]);

  // Robust name mapping (case-insensitive, substring-friendly)
  const mapping = useMemo(
    () => ({
      head: "head",
      skull: "head",
      face: "head",
      chest: "chest",
      torso: "chest",
      body: "chest",
      arm_left: "leftArm",
      left_arm: "leftArm",
      l_arm: "leftArm",
      arm_right: "rightArm",
      right_arm: "rightArm",
      r_arm: "rightArm",
      leg_left: "leftLeg",
      left_leg: "leftLeg",
      l_leg: "leftLeg",
      leg_right: "rightLeg",
      right_leg: "rightLeg",
      r_leg: "rightLeg",
    }),
    []
  );

  const handleClick = (e) => {
    e.stopPropagation();
    const name = (e.object?.name || "").toLowerCase();
    const hit = Object.keys(mapping).find((k) => name.includes(k));
    onPartClick && onPartClick(hit ? mapping[hit] : "body");
  };

  const handleOver = (e) => {
    e.stopPropagation();
    onHoverChange && onHoverChange(true);
  };
  const handleOut = (e) => {
    e.stopPropagation();
    onHoverChange && onHoverChange(false);
  };

  if (!obj) return null;
  return (
    <primitive
      ref={modelRef}
      object={obj}
      scale={[2, 2, 2]}
      position={[0, -1, 0]}
      onClick={handleClick}
      onPointerOver={handleOver}
      onPointerOut={handleOut}
    />
  );
}

/** ---------- Main Component ---------- */
function HumanBody({
  onBodyPartSelect,
  selectedParts = [],
  height = 400,
  modelUrl, // optional: override model path
}) {
  const [clickedParts, setClickedParts] = useState([]);
  const [hovering, setHovering] = useState(false);
  const [webglLost, setWebglLost] = useState(false);
  const [canvasKey, setCanvasKey] = useState(0);
  const removeGlListenersRef = useRef(() => {});

  const handlePartClick = (part) => {
    const next = clickedParts.includes(part)
      ? clickedParts.filter((p) => p !== part)
      : [...clickedParts, part];
    setClickedParts(next);
    onBodyPartSelect && onBodyPartSelect(next);
  };

  // dedupe selections
  const allSelectedParts = useMemo(
    () => Array.from(new Set([...selectedParts, ...clickedParts])),
    [selectedParts, clickedParts]
  );

  const quickParts = [
    "head",
    "chest",
    "leftArm",
    "rightArm",
    "leftLeg",
    "rightLeg",
  ];

  useEffect(() => {
    return () => {
      try {
        removeGlListenersRef.current?.();
      } catch (_) {}
    };
  }, []);

  const handleWebglRetry = useCallback(() => {
    setWebglLost(false);
    setCanvasKey((prev) => prev + 1);
  }, []);

  return (
    <div
      style={{
        width: "100%",
        height,
        position: "relative",
        borderRadius: 16,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        cursor: hovering ? "pointer" : "auto",
      }}
    >
      {!webglLost ? (
        <ModelErrorBoundary>
          <Canvas
            key={canvasKey}
            camera={{ position: [0, 2, 6], fov: 60 }}
            dpr={[1, 2]}
            gl={{ antialias: true, powerPreference: "high-performance" }}
            onCreated={({ gl }) => {
              const canvas = gl?.domElement;
              if (!canvas) return;
              const handleContextLost = (event) => {
                event?.preventDefault?.();
                setWebglLost(true);
              };
              const handleContextRestored = () => {
                setWebglLost(false);
              };
              canvas.addEventListener("webglcontextlost", handleContextLost, false);
              canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
              removeGlListenersRef.current = () => {
                canvas.removeEventListener("webglcontextlost", handleContextLost, false);
                canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
              };
            }}
          >
            <Suspense fallback={<LoadingFallback />}>
              {/* Lights */}
              <ambientLight intensity={0.7} />
              <directionalLight position={[10, 10, 5]} intensity={1} />
              <pointLight position={[-10, -10, -5]} intensity={0.5} />
              <pointLight position={[5, 5, 5]} intensity={0.3} />

              {/* Model */}
              <HumanModel
                onPartClick={handlePartClick}
                selectedParts={allSelectedParts}
                onHoverChange={setHovering}
                modelUrl={modelUrl}
              />

              {/* Controls */}
              <OrbitControls
                enableZoom
                enablePan
                enableRotate
                maxDistance={12}
                minDistance={3}
              />
            </Suspense>
          </Canvas>
        </ModelErrorBoundary>
      ) : (
        <div
          style={{
            inset: 0,
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            padding: 20,
            textAlign: "center",
            background: "rgba(0,0,0,0.45)",
          }}
        >
          <div style={{ fontSize: 42 }}>🖥️</div>
          <div>WebGL context lost. ปิดการแสดงผล 3D ชั่วคราวเพื่อให้ระบบเสถียรขึ้น</div>
          <button
            onClick={handleWebglRetry}
            style={{
              background: "rgba(255,255,255,0.9)",
              color: "#333",
              borderRadius: 20,
              border: "none",
              padding: "8px 16px",
              fontWeight: 600,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
            }}
          >
            ลองโหลดใหม่
          </button>
        </div>
      )}

      {/* Selected chips / quick selectors */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          right: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        {quickParts.map((part) => {
          const active = allSelectedParts.includes(part);
          return (
            <button
              key={part}
              style={{
                padding: "6px 10px",
                borderRadius: 14,
                border: "none",
                backgroundColor: active ? "#ff6b6b" : "rgba(255,255,255,0.9)",
                color: active ? "white" : "#333",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                transition: "all .2s ease",
                boxShadow: "0 1px 4px rgba(0,0,0,.25)",
              }}
              onClick={() => handlePartClick(part)}
            >
              {part.replace(/([A-Z])/g, " $1").trim()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default HumanBody;
