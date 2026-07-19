import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type AnimKind = 'flip' | 'tear'

export interface AnimPageInfo {
  kind: AnimKind
  /** data URL da textura (frente ou única) */
  tex: string
  /** data URL do verso (só no flip) */
  backTex?: string
}

interface NotepadSceneProps {
  /** dispara a animação quando muda; null = idle */
  anim: (AnimPageInfo & { seq: number }) | null
  /** notifica o pai com o alinhamento atual da folha (coordenadas de tela) */
  onLayout?: (rect: { left: number; top: number; width: number; height: number }) => void
}

/* ---------- dimensões do caderno (unidades da cena) ---------- */
const W = 10 // largura da folha
const H = 13.4 // altura da folha
const T = 0.05 // espessura de uma folha
const STACK = 8 // folhas da pilha embaixo
const BACK_T = 0.28 // espessura da contracapa
const RINGS = 13
const RING_R = 0.42 // raio de cada argola
const TUBE_R = 0.048 // raio do arame

/* ---------- cores ---------- */
const PAPER = 0x2e303d
const PAPER_SIDE = 0x1e1f28
const COVER = 0x1b1c25
const DESK = 0x14151d

/** curvatura da página durante o giro (x = distância do eixo das argolas) */
function pageBend(x: number, angle: number): number {
  const k = Math.max(0, Math.sin(Math.min(angle, Math.PI)))
  const s = x / W
  return k * (0.5 * s * s + 0.12 * s)
}

/** aplica a transformação da página (rotação no eixo Z + curvatura) num vértice */
function deformVertex(v: THREE.Vector3, angle: number) {
  const r = angle < 0 ? -1 : 1
  const a = Math.abs(angle)
  v.z += r * pageBend(v.x, a)
  const c = Math.cos(a)
  const s = Math.sin(a)
  const y = v.y * c - v.z * s
  const z = v.y * s + v.z * c
  v.y = y
  v.z = z
}

function makeCanvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const g = c.getContext('2d')!
  draw(g)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

/** textura do verso da folha: pauta espelhada */
function blankBackTexture(): THREE.Texture {
  return makeCanvasTex(256, 340, (g) => {
    g.fillStyle = '#262734'
    g.fillRect(0, 0, 256, 340)
    g.strokeStyle = 'rgba(98,114,164,0.3)'
    g.lineWidth = 1
    for (let y = 34; y < 340; y += 22) {
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(256, y)
      g.stroke()
    }
    g.strokeStyle = 'rgba(255,121,198,0.25)'
    g.beginPath()
    g.moveTo(232, 0)
    g.lineTo(232, 340)
    g.stroke()
  })
}

export default function NotepadScene({ anim, onLayout }: NotepadSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    pagePivot: THREE.Group
    frontMesh: THREE.Mesh | null
    backMesh: THREE.Mesh | null
    anim: { kind: AnimKind; t: number; dur: number } | null
    clock: THREE.Clock
    raf: number
    destroyed: boolean
  } | null>(null)

  /* ================= cena ================= */
  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    // pixelRatio 1: essencial para WebGL por software (swiftshader)
    renderer.setPixelRatio(1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.15
    renderer.domElement.style.position = 'absolute'
    renderer.domElement.style.inset = '0'
    renderer.domElement.style.pointerEvents = 'none'
    host.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(34, 1, 1, 120)
    camera.position.set(0, 15.5, 8.8)
    camera.lookAt(0, 0.4, 0)

    /* ---------- luzes ---------- */
    const amb = new THREE.AmbientLight(0x9aa3c0, 0.55)
    scene.add(amb)
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(6, 14, 7)
    key.castShadow = true
    key.shadow.mapSize.set(512, 512)
    key.shadow.camera.left = -10
    key.shadow.camera.right = 10
    key.shadow.camera.top = 10
    key.shadow.camera.bottom = -10
    key.shadow.bias = -0.0004
    scene.add(key)
    const fill = new THREE.DirectionalLight(0x8be9fd, 0.25)
    fill.position.set(-7, 8, -4)
    scene.add(fill)
    const rim = new THREE.PointLight(0xbd93f9, 0.55, 40)
    rim.position.set(-4, 6, -6)
    scene.add(rim)

    /* ---------- mesa ---------- */
    const deskMat = new THREE.MeshStandardMaterial({ color: DESK, roughness: 0.95 })
    const desk = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), deskMat)
    desk.rotation.x = -Math.PI / 2
    desk.position.y = -0.75
    desk.receiveShadow = true
    scene.add(desk)

    /* ---------- grupo do caderno ---------- */
    const pad = new THREE.Group()
    pad.rotation.y = Math.PI // espiral no topo (borda distante)
    scene.add(pad)

    /* contracapa */
    const coverMat = new THREE.MeshStandardMaterial({ color: COVER, roughness: 0.85 })
    const cover = new THREE.Mesh(
      new THREE.BoxGeometry(W + 0.5, BACK_T, H + 0.45),
      coverMat,
    )
    cover.position.set(0, -0.12 - BACK_T / 2, -0.12)
    cover.castShadow = true
    cover.receiveShadow = true
    pad.add(cover)

    /* pilha de folhas */
    const sideMat = new THREE.MeshStandardMaterial({ color: PAPER_SIDE, roughness: 0.9 })
    const topMat = new THREE.MeshStandardMaterial({ color: PAPER, roughness: 0.92 })
    for (let i = 0; i < STACK; i++) {
      const sheet = new THREE.Mesh(
        new THREE.BoxGeometry(W, T, H),
        [sideMat, sideMat, topMat, sideMat, sideMat, sideMat],
      )
      sheet.position.set(
        (i % 2 === 0 ? 1 : -1) * 0.018 * i,
        -T / 2 - i * T * 1.02,
        (i % 3 - 1) * 0.03,
      )
      sheet.rotation.y = (i % 2 === 0 ? 1 : -1) * 0.0012 * i
      sheet.castShadow = true
      sheet.receiveShadow = true
      pad.add(sheet)
    }

    /* furos na folha de cima (discos escuros) */
    const holeMat = new THREE.MeshBasicMaterial({ color: 0x17181f })
    const holeGeo = new THREE.CircleGeometry(0.085, 20)
    for (let i = 0; i < RINGS; i++) {
      const x = -W / 2 + 0.55 + (i * (W - 1.1)) / (RINGS - 1)
      const hole = new THREE.Mesh(holeGeo, holeMat)
      hole.rotation.x = -Math.PI / 2
      hole.position.set(x, 0.004, H / 2 - 0.42)
      pad.add(hole)
    }

    /* ---------- espiral metálica real ---------- */
    const metal = new THREE.MeshStandardMaterial({
      color: 0xd9dfe9,
      metalness: 0.95,
      roughness: 0.28,
    })
    const holeZ = H / 2 - 0.42
    const ringCy = RING_R * 0.6 // centro da argola (acima da folha)
    const ringCz = holeZ + 0.3 // centro (levemente para trás do furo)
    for (let i = 0; i < RINGS; i++) {
      const x = -W / 2 + 0.55 + (i * (W - 1.1)) / (RINGS - 1)
      // hélice: começa no furo (y≈0, z=holeZ) e enrola para cima e para trás
      const pts: THREE.Vector3[] = []
      const turns = 1.65
      const steps = 64
      for (let s = 0; s <= steps; s++) {
        const t = s / steps
        const ang = t * turns * Math.PI * 2
        const r = RING_R - t * 0.04
        pts.push(
          new THREE.Vector3(
            x + t * 0.16,
            ringCy - Math.sin(ang) * r,
            ringCz - Math.cos(ang) * r,
          ),
        )
      }
      const curve = new THREE.CatmullRomCurve3(pts)
      const ring = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, TUBE_R, 8), metal)
      ring.castShadow = true
      pad.add(ring)
    }

    /* ---------- pivô da página animada ---------- */
    const pagePivot = new THREE.Group()
    pagePivot.position.set(0, T + 0.004, H / 2 - 0.42)
    pad.add(pagePivot)

    const state = {
      renderer,
      scene,
      camera,
      pagePivot,
      frontMesh: null as THREE.Mesh | null,
      backMesh: null as THREE.Mesh | null,
      anim: null as { kind: AnimKind; t: number; dur: number } | null,
      clock: new THREE.Clock(),
      raf: 0,
      destroyed: false,
    }
    stateRef.current = state

    /* ---------- helpers de página animada ---------- */
    const buildPage = (info: AnimPageInfo) => {
      // frente
      const tex = new THREE.TextureLoader().load(info.tex)
      tex.colorSpace = THREE.SRGBColorSpace
      const geo = new THREE.PlaneGeometry(W, H, 64, 4)
      geo.rotateX(-Math.PI / 2)
      geo.translate(0, 0, -H / 2)
      const mat = new THREE.MeshStandardMaterial({
        map: tex,
        side: THREE.FrontSide,
        roughness: 0.9,
        transparent: true,
      })
      const front = new THREE.Mesh(geo, mat)
      front.castShadow = true
      pagePivot.add(front)
      state.frontMesh = front

      // verso (flip) — textura enviada ou pauta em branco
      const backSrc = info.backTex
      const backTex = backSrc
        ? new THREE.TextureLoader().load(backSrc)
        : blankBackTexture()
      backTex.colorSpace = THREE.SRGBColorSpace
      const bgeo = new THREE.PlaneGeometry(W, H, 64, 4)
      bgeo.rotateX(Math.PI / 2)
      bgeo.translate(0, 0.001, -H / 2)
      const bmat = new THREE.MeshStandardMaterial({
        map: backTex,
        side: THREE.FrontSide,
        roughness: 0.95,
        transparent: true,
      })
      const back = new THREE.Mesh(bgeo, bmat)
      pagePivot.add(back)
      state.backMesh = back
    }

    const clearPage = () => {
      for (const m of [state.frontMesh, state.backMesh]) {
        if (!m) continue
        pagePivot.remove(m)
        m.geometry.dispose()
        const mt = m.material as THREE.MeshStandardMaterial
        mt.map?.dispose()
        mt.dispose()
      }
      state.frontMesh = null
      state.backMesh = null
      pagePivot.rotation.set(0, 0, 0)
      pagePivot.position.y = T + 0.004
    }

    const deform = (angle: number) => {
      for (const m of [state.frontMesh, state.backMesh]) {
        if (!m) continue
        const pos = m.geometry.attributes.position as THREE.BufferAttribute
        const base = (m.geometry.userData.base ??
          (m.geometry.userData.base = pos.array.slice())) as Float32Array
        const v = new THREE.Vector3()
        for (let i = 0; i < pos.count; i++) {
          v.set(base[i * 3], base[i * 3 + 1], base[i * 3 + 2])
          deformVertex(v, angle)
          pos.setXYZ(i, v.x, v.y, v.z)
        }
        pos.needsUpdate = true
        m.geometry.computeVertexNormals()
      }
    }

    ;(state as unknown as { buildPage: typeof buildPage }).buildPage = buildPage
    ;(state as unknown as { clearPage: typeof clearPage }).clearPage = clearPage
    ;(state as unknown as { deform: typeof deform }).deform = deform

    /* ---------- resize + layout ---------- */
    const layout = () => {
      const wpx = host.clientWidth
      const hpx = host.clientHeight
      if (wpx === 0 || hpx === 0) return
      renderer.setSize(wpx, hpx)
      camera.aspect = wpx / hpx

      // garante que o caderno (W × H, deitado) caiba no frustum
      const vFit =
        (H / 2 + 1.2) / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
      const hFit =
        (W / 2 + 0.8) /
        (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect)
      const dist = Math.max(vFit, hFit) * 1.02
      const dir = new THREE.Vector3(0, 0.87, 0.49).normalize()
      camera.position.copy(dir.multiplyScalar(dist))
      camera.position.y += 0.4
      camera.lookAt(0, 0.4, 0)
      camera.updateProjectionMatrix()

      // projeta o retângulo da folha para coordenadas de tela (para o editor DOM)
      // (o grupo está rotacionado 180°: as 4 quinas são projetadas e combinadas)
      if (onLayout) {
        const corners = [
          new THREE.Vector3(-W / 2, T, H / 2 - 0.42),
          new THREE.Vector3(W / 2, T, H / 2 - 0.42),
          new THREE.Vector3(-W / 2, T, -H / 2),
          new THREE.Vector3(W / 2, T, -H / 2),
        ]
        let minX = Infinity,
          minY = Infinity,
          maxX = -Infinity,
          maxY = -Infinity
        for (const c of corners) {
          const p = c.clone().project(camera)
          const sx = ((p.x + 1) / 2) * wpx
          const sy = ((1 - p.y) / 2) * hpx
          minX = Math.min(minX, sx)
          maxX = Math.max(maxX, sx)
          minY = Math.min(minY, sy)
          maxY = Math.max(maxY, sy)
        }
        onLayout({ left: minX, top: minY, width: maxX - minX, height: maxY - minY })
      }
    }
    layout()
    const ro = new ResizeObserver(() => {
      needsRender = true
      layout()
    })
    ro.observe(host)
    // fallback: fullscreen por classe CSS não dispara ResizeObserver
    let lastW = host.clientWidth
    let lastH = host.clientHeight
    const poll = window.setInterval(() => {
      if (host.clientWidth !== lastW || host.clientHeight !== lastH) {
        lastW = host.clientWidth
        lastH = host.clientHeight
        needsRender = true
        layout()
      }
    }, 250)

    /* ---------- loop: renderiza só quando necessário ---------- */
    let needsRender = true
    const loop = () => {
      if (state.destroyed) return
      state.raf = requestAnimationFrame(loop)
      if (!state.anim && !needsRender) return
      const dt = Math.min(state.clock.getDelta(), 0.05)

      if (state.anim) {
        const a = state.anim
        a.t += dt
        const p = Math.min(a.t / a.dur, 1)
        if (a.kind === 'flip') {
          // ease com leve aceleração
          const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
          deform(-Math.PI * e)
          pagePivot.position.y = T + 0.004 + Math.sin(e * Math.PI) * 0.35
          if (p >= 1) {
            clearPage()
            state.anim = null
            needsRender = true
          }
        } else {
          // tear: sacode e voa
          const shake = p < 0.3 ? Math.sin(p * 60) * 0.035 * (1 - p / 0.3) : 0
          const fly = Math.max(0, (p - 0.3) / 0.7)
          const fe = fly * fly
          pagePivot.rotation.z = shake + fe * 0.9
          pagePivot.position.y = T + 0.004 + fe * 26
          const fade = 1 - Math.max(0, (p - 0.75) / 0.25)
          for (const m of [state.frontMesh, state.backMesh]) {
            if (m) (m.material as THREE.MeshStandardMaterial).opacity = fade
          }
          if (p >= 1) {
            clearPage()
            state.anim = null
            needsRender = true
          }
        }
      }

      renderer.render(scene, camera)
      needsRender = false
    }
    state.raf = requestAnimationFrame(loop)

    return () => {
      state.destroyed = true
      cancelAnimationFrame(state.raf)
      window.clearInterval(poll)
      ro.disconnect()
      clearPage()
      renderer.dispose()
      host.removeChild(renderer.domElement)
      stateRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ================= disparo de animações ================= */
  useEffect(() => {
    const s = stateRef.current as
      | (NonNullable<typeof stateRef.current> & {
          buildPage: (info: AnimPageInfo) => void
        })
      | null
    if (!s || !anim || s.anim) return
    s.buildPage(anim)
    s.anim = { kind: anim.kind, t: 0, dur: anim.kind === 'flip' ? 1.05 : 1.1 }
  }, [anim])

  return <div ref={hostRef} className="absolute inset-0 overflow-hidden" aria-hidden />
}
