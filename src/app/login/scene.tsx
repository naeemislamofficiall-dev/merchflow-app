"use client";

import { useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";

type V3 = [number, number, number];

// ---------- deterministic noise (render-e Math.random nei) ----------
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeTex(
  w: number,
  h: number,
  draw: (c: CanvasRenderingContext2D, w: number, h: number) => void,
  repeat: [number, number] = [1, 1]
) {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d")!;
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 8;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- procedural texture ----------
function useTextures() {
  return useMemo(() => {
    // suta: gola gola pech (ring)
    const thread = makeTex(64, 256, (c, w, h) => {
      const r = rng(7);
      for (let y = 0; y < h; y++) {
        const v = 150 + 90 * Math.sin((y * Math.PI * 2) / 5) + (r() - 0.5) * 24;
        c.fillStyle = `rgb(${v},${v},${v})`;
        c.fillRect(0, y, w, 1);
      }
      c.strokeStyle = "rgba(0,0,0,0.12)";
      for (let x = 0; x < w; x += 4) {
        c.beginPath();
        c.moveTo(x, 0);
        c.lineTo(x + 6, h);
        c.stroke();
      }
    });

    // kapor-er bune (twill)
    const weave = (rx: number, ry: number) =>
      makeTex(
        128,
        128,
        (c, w, h) => {
          const r = rng(21);
          for (let gy = 0; gy < h / 4; gy++) {
            for (let gx = 0; gx < w / 4; gx++) {
              const over = (gx + gy) % 4 < 2;
              const v = (over ? 232 : 176) + (r() - 0.5) * 22;
              c.fillStyle = `rgb(${v},${v},${v})`;
              c.fillRect(gx * 4, gy * 4, 4, 4);
              c.fillStyle = "rgba(0,0,0,0.18)";
              c.fillRect(gx * 4, gy * 4 + 3, 4, 1);
            }
          }
        },
        [rx, ry]
      );

    // thimble-er chhoto gorto (bump)
    const dimples = makeTex(
      128,
      128,
      (c, w, h) => {
        c.fillStyle = "#ffffff";
        c.fillRect(0, 0, w, h);
        c.fillStyle = "#4b5563";
        for (let row = 0; row < 8; row++) {
          for (let col = 0; col < 8; col++) {
            c.beginPath();
            c.arc(col * 16 + (row % 2 ? 8 : 0) + 4, row * 16 + 8, 3.2, 0, Math.PI * 2);
            c.fill();
          }
        }
      },
      [6, 2]
    );

    // cardboard
    const cardboard = makeTex(128, 128, (c, w, h) => {
      const r = rng(5);
      c.fillStyle = "#c79f6c";
      c.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x++) {
        c.fillStyle = `rgba(90,55,20,${0.06 + 0.05 * Math.sin(x * 1.3)})`;
        c.fillRect(x, 0, 1, h);
      }
      for (let i = 0; i < 700; i++) {
        c.fillStyle = `rgba(255,240,210,${r() * 0.25})`;
        c.fillRect(r() * w, r() * h, 1.5, 1.5);
      }
    });

    // roll-er matha (spiral)
    const spiral = makeTex(256, 256, (c, w, h) => {
      c.fillStyle = "#1e3a8a";
      c.fillRect(0, 0, w, h);
      const turns = 16;
      const k = 120 / (Math.PI * 2 * turns);
      for (const [col, lw, off] of [
        ["#3b82f6", 4, 0],
        ["#93c5fd", 1.5, 1.2],
      ] as const) {
        c.strokeStyle = col;
        c.lineWidth = lw;
        c.beginPath();
        for (let t = 0; t < Math.PI * 2 * turns; t += 0.05) {
          const r = 4 + t * k;
          const x = w / 2 + r * Math.cos(t + off);
          const y = h / 2 + r * Math.sin(t + off);
          if (t === 0) c.moveTo(x, y);
          else c.lineTo(x, y);
        }
        c.stroke();
      }
    });

    return {
      thread,
      dimples,
      cardboard,
      spiral,
      rollWeave: weave(5, 2),
      clothA: weave(26, 9),
      clothB: weave(22, 8),
    };
  }, []);
}

type Tex = ReturnType<typeof useTextures>;

// ---------- chalok: bhaasha + ghurano ----------
function Float({
  position,
  phase = 0,
  speed = 1,
  spin = 0.3,
  amp = 0.25,
  scale = 1,
  calm,
  children,
}: {
  position: V3;
  phase?: number;
  speed?: number;
  spin?: number;
  amp?: number;
  scale?: number;
  calm: boolean;
  children: ReactNode;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = calm ? 0 : state.clock.elapsedTime;
    g.position.y = position[1] + Math.sin(t * speed + phase) * amp;
    g.rotation.y = t * spin + phase;
    g.rotation.x = Math.sin(t * speed * 0.7 + phase) * 0.3;
  });
  return (
    <group ref={ref} position={position} scale={scale}>
      {children}
    </group>
  );
}

// ---------- 3D object ----------
function Spool({ tx }: { tx: Tex }) {
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.46, 0.46, 0.92, 64]} />
        <meshPhysicalMaterial
          color="#2f6bff"
          map={tx.thread}
          bumpMap={tx.thread}
          bumpScale={2}
          roughness={0.6}
          sheen={1}
          sheenColor="#93c5fd"
        />
      </mesh>
      {[-0.5, 0.5].map((y) => (
        <mesh key={y} position={[0, y, 0]} castShadow>
          <cylinderGeometry args={[0.74, 0.74, 0.08, 64]} />
          <meshPhysicalMaterial color="#f4f6fb" roughness={0.35} clearcoat={0.8} clearcoatRoughness={0.2} />
        </mesh>
      ))}
      <mesh position={[0, 0.55, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 0.06, 32]} />
        <meshStandardMaterial color="#dbe3f1" roughness={0.4} />
      </mesh>
    </group>
  );
}

function Button() {
  const geo = useMemo(() => {
    const pts = [
      [0, -0.09],
      [0.66, -0.09],
      [0.72, -0.04],
      [0.72, 0.05],
      [0.66, 0.09],
      [0.52, 0.09],
      [0.46, 0.04],
      [0, 0.04],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 72);
  }, []);
  const holes: [number, number][] = [
    [-0.16, -0.16],
    [0.16, -0.16],
    [-0.16, 0.16],
    [0.16, 0.16],
  ];
  return (
    <group rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={geo} castShadow>
        <meshPhysicalMaterial
          color="#4f8cff"
          roughness={0.28}
          clearcoat={1}
          clearcoatRoughness={0.12}
          side={THREE.DoubleSide}
        />
      </mesh>
      {holes.map(([x, z]) => (
        <group key={`${x}${z}`} position={[x, 0.045, z]}>
          <mesh>
            <cylinderGeometry args={[0.065, 0.065, 0.03, 24]} />
            <meshStandardMaterial color="#0b1e4f" roughness={0.8} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.075, 0.016, 10, 24]} />
            <meshPhysicalMaterial color="#9ec1ff" roughness={0.25} clearcoat={1} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FabricRoll({ tx }: { tx: Tex }) {
  return (
    <group rotation={[0, 0, Math.PI / 2]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.6, 0.6, 1.8, 64]} />
        <meshPhysicalMaterial
          attach="material-0"
          color="#3b82f6"
          map={tx.rollWeave}
          bumpMap={tx.rollWeave}
          bumpScale={1.5}
          roughness={0.9}
          sheen={1}
          sheenColor="#bfdbfe"
        />
        <meshStandardMaterial attach="material-1" map={tx.spiral} roughness={0.85} />
        <meshStandardMaterial attach="material-2" map={tx.spiral} roughness={0.85} />
      </mesh>
      <mesh castShadow>
        <cylinderGeometry args={[0.12, 0.12, 1.95, 24]} />
        <meshStandardMaterial color="#d6c6a8" roughness={0.8} />
      </mesh>
    </group>
  );
}

function Carton({ tx }: { tx: Tex }) {
  return (
    <group>
      <mesh castShadow>
        <boxGeometry args={[1.1, 0.85, 1.1]} />
        <meshStandardMaterial map={tx.cardboard} bumpMap={tx.cardboard} bumpScale={1.2} roughness={0.85} />
      </mesh>
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.862, 1.12]} />
        <meshPhysicalMaterial color="#f3f4f6" roughness={0.3} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, -0.05, 0.556]}>
        <planeGeometry args={[0.5, 0.34]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
    </group>
  );
}

function Thimble({ tx }: { tx: Tex }) {
  const geo = useMemo(() => {
    const pts = [
      [0.46, -0.42],
      [0.56, -0.42],
      [0.58, -0.36],
      [0.5, -0.1],
      [0.46, 0.1],
      [0.4, 0.28],
      [0.26, 0.4],
      [0.12, 0.44],
      [0, 0.45],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 64);
  }, []);
  return (
    <mesh geometry={geo} castShadow>
      <meshPhysicalMaterial
        color="#8fb4ff"
        metalness={0.75}
        roughness={0.28}
        clearcoat={0.5}
        bumpMap={tx.dimples}
        bumpScale={3}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

function Pearl() {
  return (
    <mesh castShadow>
      <sphereGeometry args={[0.11, 32, 24]} />
      <meshPhysicalMaterial color="#e6efff" roughness={0.15} metalness={0.1} clearcoat={1} />
    </mesh>
  );
}

// ---------- norom kapor-er dheu ----------
function Cloth({
  position,
  color,
  map,
  speed,
  calm,
}: {
  position: V3;
  color: string;
  map: THREE.Texture;
  speed: number;
  calm: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  useFrame((state) => {
    const m = mesh.current;
    if (!m) return;
    const t = calm ? 0 : state.clock.elapsedTime * speed;
    const pos = m.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      pos.setZ(i, Math.sin(x * 0.45 + t) * 0.32 + Math.cos(y * 0.9 + t * 0.7) * 0.2);
    }
    pos.needsUpdate = true;
    m.geometry.computeVertexNormals();
  });
  return (
    <mesh ref={mesh} position={position} rotation={[-1.2, 0, 0]} receiveShadow>
      <planeGeometry args={[32, 10, 90, 34]} />
      <meshPhysicalMaterial
        color={color}
        map={map}
        bumpMap={map}
        bumpScale={0.6}
        roughness={0.85}
        sheen={1}
        sheenColor="#ffffff"
        sheenRoughness={0.5}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ---------- scene ----------
function World({ calm }: { calm: boolean }) {
  const root = useRef<THREE.Group>(null);
  const width = useThree((s) => s.viewport.width);
  const gl = useThree((s) => s.gl);
  const fit = Math.min(1, width / 13);
  const tx = useTextures();

  // soft studio-style reflection light
  const env = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const tex = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return tex;
  }, [gl]);

  // mouse-er dike poro scene halka ghure
  useFrame((state) => {
    const g = root.current;
    if (!g) return;
    g.rotation.y += (state.pointer.x * 0.16 - g.rotation.y) * 0.05;
    g.rotation.x += (-state.pointer.y * 0.08 - g.rotation.x) * 0.05;
  });

  return (
    <>
      <primitive object={env} attach="environment" />
      <fog attach="fog" args={["#eaf2ff", 13, 32]} />

      <group ref={root}>
        <Cloth position={[0, -4.7, -3.2]} color="#a9c8ff" map={tx.clothA} speed={0.7} calm={calm} />
        <Cloth position={[0, -4.2, -5]} color="#cfe0ff" map={tx.clothB} speed={0.5} calm={calm} />

        <group scale={fit}>
          <Float position={[-4.6, 1.8, 0]} phase={0} speed={0.9} spin={0.3} scale={0.85} calm={calm}>
            <Spool tx={tx} />
          </Float>
          <Float position={[-3.3, -1.5, 1]} phase={1.2} speed={1.1} spin={0.4} scale={0.9} calm={calm}>
            <Button />
          </Float>
          <Float position={[-5.7, -0.4, -1]} phase={2} speed={0.8} spin={0.3} scale={0.85} calm={calm}>
            <Thimble tx={tx} />
          </Float>
          <Float position={[4.7, 1.5, 0]} phase={0.8} speed={0.9} spin={0.25} scale={0.85} calm={calm}>
            <FabricRoll tx={tx} />
          </Float>
          <Float position={[3.5, -1.7, 1]} phase={2.4} speed={1} spin={0.35} scale={0.85} calm={calm}>
            <Carton tx={tx} />
          </Float>
          <Float position={[5.7, -0.2, -1]} phase={3.5} speed={1.2} spin={0.5} scale={0.5} calm={calm}>
            <Button />
          </Float>

          <Float position={[-2.6, 2.7, -1]} phase={1} speed={1.4} spin={0} amp={0.3} calm={calm}>
            <Pearl />
          </Float>
          <Float position={[2.8, 2.9, -1]} phase={2} speed={1.3} spin={0} amp={0.3} calm={calm}>
            <Pearl />
          </Float>
          <Float position={[0, -2.8, -1]} phase={1.7} speed={1.5} spin={0} amp={0.25} calm={calm}>
            <Pearl />
          </Float>
        </group>
      </group>
    </>
  );
}

export default function Scene() {
  const calm = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 0, 9], fov: 45 }}
      gl={{ antialias: true, alpha: true, toneMappingExposure: 0.85 }}
      scene={{ environmentIntensity: 0.45 }}
      eventSource={document.body}
      eventPrefix="client"
    >
      <ambientLight intensity={0.12} />
      <directionalLight
        position={[5, 7, 6]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0005}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-far={40}
      />
      <directionalLight position={[-6, -2, 4]} intensity={0.7} color="#93c5fd" />
      <World calm={calm} />
    </Canvas>
  );
}
