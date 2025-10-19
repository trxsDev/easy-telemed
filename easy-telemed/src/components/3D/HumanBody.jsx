import React, {
  forwardRef,
  Suspense,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useLoader } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";

const EPSILON = 0.008;

const REGIONS = [
  { id: "head", label: "Head" },
  { id: "chest", label: "Chest" },
  { id: "leftArm", label: "Left Arm" },
  { id: "rightArm", label: "Right Arm" },
  { id: "leftLeg", label: "Left Leg" },
  { id: "rightLeg", label: "Right Leg" },
];

const REGION_LABELS = REGIONS.reduce((acc, region) => {
  acc[region.id] = region.label;
  return acc;
}, {});

function ensureOverlayStyles() {
  if (typeof document === "undefined") return;
  if (document.getElementById("human-body-overlay-style")) return;
  const style = document.createElement("style");
  style.id = "human-body-overlay-style";
  style.textContent = `
    .human-body-marker {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid #7cc7ff;
      background: rgba(124,199,255,.25);
      transform: translate(-50%, -50%);
      box-shadow: 0 0 10px rgba(124,199,255,.45);
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);
}

const defaultModelUrl = (() => {
  const viteBase =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.BASE_URL;
  const base = viteBase && viteBase !== "/" ? viteBase.replace(/\/?$/, "/") : "/";
  return `${base}HumanBody.obj`;
})();

function computeRegions(bounds) {
  if (!bounds) return [];
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  bounds.getSize(size);
  bounds.getCenter(center);

  const headHeight = size.y * 0.18;
  const torsoHeight = size.y * 0.3;
  const legsHeight = size.y - headHeight - torsoHeight;
  const width = size.x;
  const depth = size.z;

  return [
    {
      id: "head",
      label: REGION_LABELS.head,
      position: [center.x, bounds.max.y - headHeight / 2, center.z],
      args: [width * 0.48, headHeight, depth],
    },
    {
      id: "chest",
      label: REGION_LABELS.chest,
      position: [center.x, bounds.max.y - headHeight - torsoHeight / 2, center.z],
      args: [width * 0.6, torsoHeight, depth],
    },
    {
      id: "leftArm",
      label: REGION_LABELS.leftArm,
      position: [
        bounds.min.x + width * 0.2,
        bounds.max.y - headHeight - torsoHeight * 0.2,
        center.z,
      ],
      args: [width * 0.35, torsoHeight * 0.8, depth * 0.9],
    },
    {
      id: "rightArm",
      label: REGION_LABELS.rightArm,
      position: [
        bounds.max.x - width * 0.2,
        bounds.max.y - headHeight - torsoHeight * 0.2,
        center.z,
      ],
      args: [width * 0.35, torsoHeight * 0.8, depth * 0.9],
    },
    {
      id: "leftLeg",
      label: REGION_LABELS.leftLeg,
      position: [center.x - width * 0.15, bounds.min.y + legsHeight / 2, center.z],
      args: [width * 0.35, legsHeight * 0.9, depth],
    },
    {
      id: "rightLeg",
      label: REGION_LABELS.rightLeg,
      position: [center.x + width * 0.15, bounds.min.y + legsHeight / 2, center.z],
      args: [width * 0.35, legsHeight * 0.9, depth],
    },
  ];
}

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

function computeMarkers(prev, id, position) {
  const next = prev.filter((marker) => marker.id !== id);
  next.push({ id, position });
  return next;
}

function toArray(vec3) {
  return [vec3.x, vec3.y, vec3.z];
}

const Model = forwardRef(function Model({ url, onReady }, ref) {
  const object = useLoader(OBJLoader, url);

  useEffect(() => {
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        if (!(child.material instanceof THREE.MeshStandardMaterial)) {
          child.material = new THREE.MeshStandardMaterial({
            color: new THREE.Color("#d6d6d6"),
            metalness: 0.05,
            roughness: 0.85,
          });
        }
      }
    });

    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    const normalizedBox = new THREE.Box3().setFromObject(object);
    onReady?.(normalizedBox);
  }, [object, onReady]);

  useImperativeHandle(
    ref,
    () => ({
      object,
    }),
    [object]
  );

  return <primitive object={object} />;
});

function useRegionMarkers(modelRef) {
  const [markers, setMarkers] = useState([]);

  const addMarker = useCallback(
    (id, event, fallback) => {
      const mesh = modelRef.current?.object;
      const ray =
        event && event.ray && typeof event.ray.intersectObject === "function"
          ? event.ray
          : null;
      if (mesh && ray) {
        const hits = ray.intersectObject(mesh, true);
        if (hits && hits.length) {
          const intersection = hits[0];
          const point = intersection.point.clone();
          if (intersection.face) {
            const normal = intersection.face.normal
              .clone()
              .transformDirection(intersection.object.matrixWorld)
              .normalize();
            point.addScaledVector(normal, EPSILON);
          }
          setMarkers((prev) => computeMarkers(prev, id, toArray(point)));
          return;
        }
      }

      if (fallback) {
        const point = Array.isArray(fallback)
          ? new THREE.Vector3().fromArray(fallback)
          : fallback.clone();
        setMarkers((prev) => computeMarkers(prev, id, toArray(point)));
        return;
      }

      if (event?.point) {
        const point = event.point.clone();
        setMarkers((prev) => computeMarkers(prev, id, toArray(point)));
      }
    },
    [modelRef]
  );

  const removeMarker = useCallback((id) => {
    setMarkers((prev) => prev.filter((marker) => marker.id !== id));
  }, []);

  const syncWithSelection = useCallback((selectionSet) => {
    setMarkers((prev) => prev.filter((marker) => selectionSet.has(marker.id)));
  }, []);

  return { markers, addMarker, removeMarker, syncWithSelection };
}

function HumanBody({
  onBodyPartSelect,
  selectedParts = [],
  modelUrl,
  height = 580,
}) {
  ensureOverlayStyles();

  const [selection, setSelection] = useState(() => new Set(selectedParts));
  const [bounds, setBounds] = useState(null);
  const [rotationDeg, setRotationDeg] = useState(0);
  const rotationRad = useMemo(
    () => (rotationDeg * Math.PI) / 180,
    [rotationDeg]
  );
  const modelRef = useRef(null);
  const { markers, addMarker, removeMarker, syncWithSelection } = useRegionMarkers(modelRef);

  useEffect(() => {
    const next = new Set(selectedParts || []);
    setSelection(next);
    syncWithSelection(next);
  }, [selectedParts, syncWithSelection]);

  const emitSelection = useCallback(
    (next) => {
      onBodyPartSelect?.(Array.from(next));
    },
    [onBodyPartSelect]
  );

  const rotatePosition = useCallback(
    (position) => {
      if (!position) return undefined;
      const vec = Array.isArray(position)
        ? new THREE.Vector3().fromArray(position)
        : position.clone();
      vec.applyAxisAngle(new THREE.Vector3(0, 1, 0), rotationRad);
      return vec;
    },
    [rotationRad]
  );

  const toggleRegion = useCallback(
    (id, event, fallbackPosition) => {
      setSelection((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
          removeMarker(id);
        } else {
          next.add(id);
          if (event || fallbackPosition) {
            addMarker(id, event, rotatePosition(fallbackPosition));
          }
        }
        emitSelection(next);
        return next;
      });
    },
    [addMarker, emitSelection, removeMarker, rotatePosition]
  );

  const activeSet = selection;
  const regionData = useMemo(
    () => (bounds ? computeRegions(bounds) : []),
    [bounds]
  );

  const markerElements = markers
    .filter((marker) => activeSet.has(marker.id))
    .map((marker) => (
      <Html key={marker.id} position={marker.position} transform={false}>
        <div
          className="human-body-marker"
          title={REGION_LABELS[marker.id] || marker.id}
        />
      </Html>
    ));

  const urlToLoad = modelUrl || defaultModelUrl;

  useEffect(() => {
    if (!bounds || !selection.size) return;
    const regionMap = new Map(
      regionData.map((region) => [region.id, rotatePosition(region.position)])
    );
    selection.forEach((id) => {
      if (!regionMap.has(id)) return;
      if (!markers.some((marker) => marker.id === id)) {
        addMarker(id, undefined, regionMap.get(id));
      }
    });
  }, [bounds, regionData, selection, markers, addMarker, rotatePosition]);

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        background: "transparent",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "8px 12px",
          borderRadius: 12,
          background: "rgba(15,22,45,0.65)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
          color: "#fff",
          pointerEvents: "auto",
          zIndex: 2,
        }}
      >
        <span style={{ fontSize: 12, fontWeight: 600 }}>หมุนโมเดล</span>
        <input
          type="range"
          min="-180"
          max="180"
          value={rotationDeg}
          onChange={(event) => setRotationDeg(Number(event.target.value))}
          style={{ width: 140 }}
        />
        <span style={{ fontSize: 12, minWidth: 40, textAlign: "right" }}>
          {rotationDeg}°
        </span>
      </div>

      <ModelErrorBoundary>
        <Canvas
          camera={{ position: [0, 1.6, 3.4], fov: 45 }}
          shadows
          gl={{ antialias: true, alpha: true }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <ambientLight intensity={0.7} />
            <directionalLight position={[5, 6, 4]} intensity={0.85} castShadow />
            <pointLight position={[-4, 3, 2]} intensity={0.4} />
            <group rotation={[0, rotationRad, 0]}>
              <Model ref={modelRef} url={urlToLoad} onReady={setBounds} />
              {bounds && (
                <Regions bounds={bounds} onPick={(id, event) => toggleRegion(id, event)} />
              )}
              {markerElements}
            </group>
            <OrbitControls
              makeDefault
              enableDamping
              dampingFactor={0.08}
              minPolarAngle={Math.PI / 2}
              maxPolarAngle={Math.PI / 2}
            />
          </Suspense>
        </Canvas>
      </ModelErrorBoundary>

      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          right: 10,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          justifyContent: "center",
          pointerEvents: "auto",
        }}
      >
        {REGIONS.map((region) => {
          const active = activeSet.has(region.id);
          const disabled = !bounds && !active;
          return (
            <button
              type="button"
              key={region.id}
              disabled={disabled}
              onClick={() => {
                if (disabled) return;
                if (active) {
                  toggleRegion(region.id);
                } else if (bounds) {
                  const match = regionData.find((r) => r.id === region.id);
                  toggleRegion(region.id, undefined, match?.position);
                } else {
                  toggleRegion(region.id);
                }
              }}
              style={{
                padding: "6px 12px",
                borderRadius: 14,
                border: "none",
                backgroundColor: active ? "#3558ff" : "rgba(255,255,255,0.88)",
                color: active ? "#fff" : "#1c1c1c",
                fontSize: 12,
                fontWeight: 600,
                cursor: disabled ? "not-allowed" : "pointer",
                transition: "all .2s ease",
                boxShadow: "0 4px 12px rgba(17,24,39,0.15)",
                opacity: disabled ? 0.6 : 1,
              }}
            >
              {region.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Regions({ bounds, onPick }) {
  const regions = computeRegions(bounds);
  return (
    <group>
      {regions.map(({ id, position, args }) => (
        <mesh
          key={id}
          position={position}
          onPointerDown={(event) => {
            event.stopPropagation();
            onPick(id, event);
          }}
          onPointerOver={(event) => {
            event.stopPropagation();
            if (typeof document !== "undefined") document.body.style.cursor = "pointer";
          }}
          onPointerOut={() => {
            if (typeof document !== "undefined") document.body.style.cursor = "default";
          }}
        >
          <boxGeometry args={args} />
          <meshBasicMaterial transparent opacity={0.001} color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

export default HumanBody;
