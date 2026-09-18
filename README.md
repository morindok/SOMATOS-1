# SOMATOS-1

> **Subjective Embodiment & Multi-modal Organ & Tissue Anatomy Simulation — v1**
> *A sealed-chamber embodied-AI human: living 3D body, real-time vitals, STDP brain, genome, limbic system — all in one URL, zero external dependencies.*

---

## 🧬 What This Is

SOMATOS-1 is a **scientifically-grounded embodied AI platform**. It simulates a complete human body — from atoms to organs — in a sealed 7×4.2×7 m chamber with no doors or windows. An external AI agent (LLM, script, opencode) connects via a single API key and can:

- **Move** any of 16 joints in 3D space
- **Feel** its own heart rate, breathing, temperature, blood oxygen, pain
- **Think** — trigger neural activity in real brain-region simulations
- **Edit its genome** — read DNA bases, mutate positions, apply CRISPR edits
- **Grow phenotypic traits** — horns, muscle mass, etc. emerge over time
- **Change mood** — set valence/arousal; the body responds with posture, vitals, sleep pressure
- **Sleep / wake** — circadian rhythm gates arousal and recovery

The body is **not a visualisation**. It has:
- A beating heart (animated mesh, pulse-linked to BPM)
- Breathing lungs (diaphragm excursion, respiratory rate)
- A spiking-neuron brain (8 600 Izhikevich neurons, STDP learning)
- A limbic system (pain, hunger, thirst, sleep drive, cortisol, adrenaline)
- A genome (26 chromosomes, protein-authentic gene names, in-silico mutation engine)
- Circadian oscillation (sinusoidal melatonin curve keyed to wall-clock time)

Every state change ripples through the whole system. Raise heart rate → skin flushes red. Induce pain → adrenal spike → sleep is interrupted. Feed the body → hunger drops → valence rises.

---

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                       BROWSER — React 19 + Three.js               │
│                                                                    │
│  ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐  │
│  │  BodyViewport   │   │ EmbodimentHUD   │   │   AiBridge      │  │
│  │                 │   │                 │   │                 │  │
│  │  humanBuilder   │   │  limbic.ts      │   │  bridge.js      │  │
│  │  roomBuilder    │   │  brain.ts       │   │  store.js       │  │
│  │  (Three.js 3D)  │   │  metabolism.ts  │   │  (async queue)  │  │
│  └────────┬────────┘   └────────┬────────┘   └────────┬────────┘  │
│           │                     │                     │            │
│           └─────────────────────┼─────────────────────┘            │
│                                 │                                  │
│                          State refs (vitals, body, audio)          │
└─────────────────────────────────┼──────────────────────────────────┘
                                  │  HTTP / WebSocket
                                  ▼
                    Node.js dev server (Vite plugin)
                    ┌─────────────────────────────────┐
                    │  api/                           │
                    │    bridge.js  — command router  │
                    │    store.js   — JSON file DB    │
                    │    core/brainCore.js            │
                    │    core/genomeCore.js           │
                    │    body-parts.js  joints.js     │
                    │    vitals.js  sense.js  keys.js │
                    └─────────────────────────────────┘
                                  │
                                  ▼
                    data/db.json  (auto-seeded on first boot)
```

---

## Scientific Foundations — How Each System Works

### 1. Skeleton & Articulation (humanBuilder.ts)

**Realism source:** *Gray's Anatomy* anatomical position conventions.

- **206 bones** modelled as grouped meshes. Each bone group has a `part_id` matching the anatomy database.
- **16 skeletal joints** with real Range-of-Motion (ROM) limits per joint:

| Joint | X (flex/ext) | Y (lateral bend) | Z (rotation) |
|-------|-------------|------------------|-------------|
| Neck | ±40° | ±70° | ±30° |
| Spine Thoracic | ±25° | ±30° | ±20° |
| Spine Lumbar | ±20° | ±20° | ±15° |
| Shoulder L/R | ±180° | ±90° | ±90° |
| Elbow L/R | −150°…0° | 0° | ±10° |
| Wrist L/R | ±70° | ±25° | ±20° |
| Hip L/R | ±180° | ±90° | ±90° |
| Knee L/R | −150°…0° | 0° | ±10° |
| Ankle L/R | ±45° | ±30° | ±30° |

- **Muscle model** (simplified Hill-type): each joint tracks
  - `a` — activation level 0…1 (set by motor impulses or keyboard)
  - `f` — local fatigue 0…0.7 (accumulates during sustained contraction)
  - `hy` — hypertrophy 0…1 (long-term adaptation, persists across sessions)
  - `vx, vy, vz` — angular velocity (rad/s), used for inertial damping

### 2. Brain Simulation (brain.ts — Izhikevich spiking network)

**Mathematical basis:** Izhikevich (2003) "Emergent Behaviour in Neural Networks"

Each neuron is governed by two difference equations, integrated at 0.5 ms timestep (`DT = 0.5`):

```
v' = 0.04v² + 5v + 140 − u + I
u' = a(bv − u)
```

On spike (`v ≥ 30 mV`):
```
v ← c
u ← u + d
```

**Parameter regimes** (80% excitatory / 20% inhibitory — matching real cortex):

| Type | Fraction | a | b | c | d | Neurotransmitter |
|------|----------|---|---|---|---|----------------|
| Regular spiking (RS) | 80% | 0.02 | 0.2 | −65 + 15r² | 8 − 6r² | Glutamate (excitatory) |
| Fast spiking (FS) | 20% | 0.02 + 0.08r | 0.25 − 0.05r | −65 | 2 | GABA (inhibitory) |

where `r = Math.random()`.

**Scale:** 8 600 simulated neurons × 30 synapses each = ~258 000 synapses. Represents the full 86 billion human brain at **1 : 10 000 000** scale. Every simulated neuron carries a `total_neurons` field (= `86 000 000 000 / 8 600 ≈ 10 000 000`) so downstream tools can resolve real-world magnitudes.

**STDP (Spike-Timing-Dependent Plasticity):**
```
Δw = +A+ · exp(−Δt / τ)    if Δt = t_post − t_pre > 0    (LTP)
Δw = −A− · exp( Δt / τ)    if Δt < 0                     (LTD)
```
- `A+ = 0.8`, `A− = 0.4`, `τ = 20 ms`
- Weight clamped to `[0.05, 2.0]`
- Only excitatory→excitatory synapses learn (inhibitory weights are fixed)
- Homeostatic rate-control (`TARGET_RATE_HZ = 3 Hz`) prevents seizure-like runaway potentiation

**EEG band extraction** uses the Goertzel algorithm on the spike-rate ring buffer (1024 samples at 1 kHz):
- Alpha: 10 Hz  → calm wakefulness
- Beta:  22 Hz  → active thinking
- Gamma: 40 Hz → binding / attention
- Delta: 3 Hz  → deep sleep

**Motor pools:** 16 pools of 300 neurons each (indices 8 200–8 600). When a pool fires ≥ 18 spikes in a window, it emits a `MotorImpulse { pool, strength }` → the body translates this into a joint angle change. Refractory period: 2 s per joint, 2.2 s global — produces rare, lifelike twitches instead of tremor.

### 3. Limbic System (limbic.ts)

**Theoretical basis:** Panksepp's affective neuroscience + homeostatic drive theory.

| Variable | Range | Dynamics |
|----------|-------|----------|
| `valence` | −1 … +1 | Distress ↔ Content; drifts toward comfort buffer |
| `arousal` | 0 … 1 | Calm ↔ Agitated; driven by pain, adrenaline, sleep pressure |
| `pain` | 0 … 1 | Nociceptor volley; decays at 0.02/s; strong pain > 0.3 wakes the body |
| `hunger` | 0 … 1 | Grows at 1/1500 s⁻¹ (~25 min to satiation) |
| `thirst` | 0 … 1 | Grows at 1/900 s⁻¹ (~15 min to satiation) |
| `sleepPressure` | 0 … 1 | Grows at 1/2400 s⁻¹ (~40 min); recovers while asleep (τ = 45 s) |
| `adrenaline` | 0 … 1 | Fast-acting; surges with pain, arousal; decays at 0.05/s |
| `cortisol` | 0 … 1 | Slow-acting; rises with sustained distress (> 30 s); decays at 0.005/s |

**Mood labels** (computed from valence + arousal quadrants):
```
valence >  0.2, arousal < 0.4 → آرام (calm)
valence >  0.2, arousal > 0.4 → شاد (happy)
valence < −0.2, arousal < 0.4 → دلتنگ (melancholic)
valence < −0.2, arousal > 0.4 → پریشان (distressed)
pain > 0.3                           → رنجور (in pain)
asleep                             → خواب (sleeping)
```

**Feed / drink** reduce hunger/thirst by 0.45 / 0.5 and add to the comfort buffer (+0.08 / +0.05). The comfort buffer decays at 0.01/s and lifts valence.

**Soothe** reduces pain by 35% and adds +0.15 to comfort buffer (endogenous opioid model).

### 4. Circadian Rhythm (metabolism.ts)

**Model:** Sinusoidal melatonin proxy keyed to local wall-clock time.

```
illumination(t) = 0.5 × (1 − sin(2π × (hour − 6) / 24))
```

- Max at ~04:00 (dark), min at ~16:00 (bright)
- Produces four named phases: `روز` (day), `غروب` (dusk), `شب` (night), `سحر` (dawn)
- Dark phase increases slow-wave neural drive (`baseI + circadianDark × 2.8`) — simulates increased delta activity at night
- Sleep is only possible when `sleepPressure > 0.12` and it's dark

### 5. Genome Engine (genomeCore.js)

**Architecture:** Virtual GRCh38 addressing — no real FASTA file. Genes are synthetic but named after real human genes.

- **26 chromosomes** (22 autosomes + X + Y + mitochondrial pseudo-chr)
- **6 gene families**: structural (KRT, COL), metabolic (HBB, GLUC), regulatory (TP53, INS), neural (GRN, SNAP), morphogenetic (SHH, BMP), horn/keratin (KRTHORN1, KRTHORN2)
- **10 phenotypic traits** controlled by gene expression modules

**CRISPR simulation:**
```javascript
// Example: HBB codon 6, CCT → GTT (sickle-cell variant)
{ gene: "HBB", codon: 6, aa: "V" }
// Result: mutation logged, trait "sickle_risk" toggles if homozygous
```

**Mutation tracking:** Every base change is logged to `genome_mutations` table with chromosome, position, from-base, to-base, timestamp. Mutations persist across sessions (stored in `db.json`).

**Trait expression:** Setting `express("horns")` triggers `computeGrowth()` which advances horn length based on expression-age (time since trait was first activated). Growth is time-based, not instantaneous — simulating real developmental kinetics.

### 6. Anatomy Database (anatomy.ts)

**288 parts** across **14 organ systems** and **6 hierarchical layers**:

| Layer | Scale | Examples |
|-------|-------|----------|
| atom | ~10⁻¹⁰ m | O, C, H, N, Ca, P |
| molecule | 10⁻⁹ – 10⁻⁸ m | H₂O, hemoglobin, collagen, ATP, glucose, DNA |
| cell | 10⁻⁶ – 10⁻⁴ m | neuron, erythrocyte, leukocyte, myocyte, osteocyte, hepatocyte, alveolar, nephron |
| tissue | 10⁻⁴ – 10⁻² m | epithelial, connective, muscle, nervous |
| organ | 10⁻² – 10⁻¹ m | heart, brain, lung, liver, kidney... |
| system / body | 10⁻¹ – 10⁰ m | whole organism view |

Nomenclature follows **Terminologia Anatomica** (Federative Committee on Anatomical Terminology). FA/EN bilingual labels for all 288 parts.

### 7. Vital Signs Physiology (vitals.js)

Simulated feedback loop:

```
heart_rate  ← modulated by: adrenaline × 0.3 + arousal × 0.2 + pain × 0.5
breath_rate ← coupled to heart (respiratory sinus arrhythmia): BR ≈ HR × 0.18
spo2        ← 98% baseline; drops if breath_rate < 8 or > 28
bp_systolic ← 120 + adrenaline × 15 + pain × 10
bp_diastolic← 80  + adrenaline × 8  + pain ×  5
temp_c      ← 37.0°C; ±0.3°C swing with exertion; returns to 37.0 at rest
```

Sampled every **20 seconds** into `vital_signs` table (persistent history).

---

## Command Reference (35 commands)

All commands flow through an **async queue**: `POST /api/bridge` → `{id, status: "queued"}` → poll `GET /api/bridge?action=result&id=N`.

### Movement
| Command | Args | Effect |
|---------|------|--------|
| `move` | `{joint, x, y, z}` | Set absolute joint angle (degrees) |
| `pose` | `{name}` | Load named pose (`wave`, `salute`, `reach`, `stand`) |
| `motor` | `{impulses: [{joint, dx, dy, dz, strength}]}` | Send motor program to spinal cord |
| `joints` | `{}` | Return all 16 joint angles + ROM |

### Perception
| Command | Args | Effect |
|---------|------|--------|
| `sense` | `{channel?}` | Full body state summary; optional `vision`/`auditory`/`tactile` |
| `heartbeat` | `{}` | Current BPM + rhythm regularity |
| `breath` | `{rate?, depth?}` | Get or set respiration rate + tidal volume |
| `vision` | `{}` | Field-of-view description (chamber dimensions, lighting) |
| `speak` | `{text}` | Vocalise — animates jaw + records audio if mic active |

### Homeostasis
| Command | Args | Effect |
|---------|------|--------|
| `vitals` | `{hr?, br?}` | Get or set heart/breath rates |
| `metabolism` | `{}` | Full metabolic summary (temp, SpO₂, BP, load) |
| `pain` | `{severity}` | Apply nociceptive input (0–1); triggers adrenaline |
| `soothe` | `{}` | Endogenous opioid release; reduces pain 35%, lifts valence |
| `feed` | `{}` | Reduce hunger by 45% |
| `drink` | `{}` | Reduce thirst by 50% |
| `sleep` | `{--force?}` | Enter sleep (requires sleepPressure > 12%) |
| `wake` | `{}` | Arousal burst; ends sleep state |

### Mood & Affect
| Command | Args | Effect |
|---------|------|--------|
| `mood` | `{valence, arousal}` | Set emotional state; body posture/vitals adapt |
| `feel` | `{}` | Full limbic state report |
| `comfort` | `{}` | Same as soothe |

### Neuro
| Command | Args | Effect |
|---------|------|--------|
| `brain` | `{}` | Neuron count, EEG bands, active regions |
| `neurons` | `{index, count}` | Sample neurons by global index (spaced 1 000 000 007 apart) |
| `think` | `{region}` | Simulate regional activity cascade (frontal → thalamus → parietal) |
| `memory` | `{}` | STDP learning stats: LTP/LTD counts, mean synaptic weight |

### Genome
| Command | Args | Effect |
|---------|------|--------|
| `genome` | `{action?, ...}` | Summary; or `mutate`, `read`, `express`, `growth` |
| `read` | `{chromosome, start, len}` | Read DNA bases (virtual GRCh38) |
| `base` | `{chromosome, pos}` | Single base at position |
| `mutate` | `{chromosome, position, base}` | Point mutation; logged to db |
| `crispr` | `{gene, codon, aa}` | In-silico CRISPR edit; logs mutation |
| `express` | `{trait}` | Activate phenotypic trait (horns, etc.) |
| `traits` | `{}` | List active traits + mutation count |
| `growth` | `{trait}` | Advance growth of expressed trait |
| `genes` | `{}` | Gene catalog with functions |

### Navigation
| Command | Args | Effect |
|---------|------|--------|
| `parts` | `{}` | Full 288-part inventory |
| `scan` | `{}` | Scan all visible parts with system breakdown |
| `get` | `{part}` | Detail card for one part (description FA/EN, latin name) |
| `layer` | `{name}` | Switch zoom scale (`atom`/`molecule`/`cell`/`tissue`/`organ`/`body`) |
| `system` | `{name}` | Show/hide an organ system in the 3D view |
| `scale` | `{}` | Report current zoom level |

---

## AI Agent Integration

On first boot, the server generates one API key (SHA-256 hashed, stored in `data/db.json` and `data/AGENT_KEY.txt`). Use it to connect any external process:

```python
import requests, time

KEY  = "som_a2e522cb137ba58434a2011e69536b66f6b93d13f0eb7b2f"
BASE = "http://localhost:5173"
H    = {"X-API-Key": KEY, "Content-Type": "application/json"}

def act(cmd, args={}):
    r = requests.post(f"{BASE}/api/bridge", json={"command": cmd, "args": args}, headers=H)
    d = r.json()
    for _ in range(30):
        j = requests.get(f"{BASE}/api/bridge?action=result&id={d['id']}", headers=H).json()
        if j.get("status") != "queued":
            return j
        time.sleep(0.5)
    return d

# Example: feel the body, then move, then think
print(act("feel"))
print(act("move", {"joint": "shoulder_R", "x": -90, "y": 0, "z": 0}))
print(act("think", {"region": "ctx_frontal"}))
print(act("genome", {"action": "read", "chromosome": "chr11", "start": 5225464, "len": 60}))
```

The body polls the bridge inbox every **2 seconds** and auto-executes commands when `bridgeOn` is enabled in the UI. The full Python snippet is also displayed inside the app's **پل هوش مصنوعی خارجی** panel.

---

## Directory Structure

```
SOMATOS-1/
├── src/
│   ├── App.tsx                 # Main orchestrator (state, effects, layout)
│   ├── main.tsx                # React entry point
│   ├── components/
│   │   ├── BodyViewport.tsx    # Three.js canvas + OrbitControls + picking
│   │   ├── EmbodimentHUD.tsx   # Live vitals / EEG / limbic display
│   │   ├── AiBridge.tsx        # External API key management + command inbox
│   │   ├── ApiConsole.tsx      # Command log + manual command sender
│   │   ├── BrainPanel.tsx      # Static brain stat cards
│   │   ├── VitalsPanel.tsx     # Heart rate / breath sliders
│   │   └── Panels.tsx          # LayerRail, SystemToggles, DetailPanel
│   ├── lib/
│   │   ├── brain.ts            # Izhikevich spiking network + STDP
│   │   ├── limbic.ts           # Affective neuroscience model
│   │   ├── metabolism.ts       # Circadian + metabolic homeostasis
│   │   └── bodyApi.ts          # Browser-side command executor
│   ├── three/
│   │   ├── humanBuilder.ts     # 991-line skeleton + muscle + skin builder
│   │   └── roomBuilder.ts      # Isolated chamber mesh
│   └── data/
│       └── anatomy.ts          # 288-part anatomical inventory (FA/EN)
├── api/
│   ├── store.js                # JSON file store (9 tables, auto-seeds)
│   ├── bridge.js               # Command router + async queue
│   ├── core/
│   │   ├── brainCore.js        # Server-side brain simulation
│   │   └── genomeCore.js       # Virtual genome engine
│   ├── body-parts.js           # GET/POST anatomy inventory
│   ├── vitals.js               # Vital signs endpoint
│   ├── sense.js                # Sensory event logging
│   ├── joints.js               # Joint pose management
│   ├── keys.js                 # API key CRUD
│   ├── brain.js                # Brain state endpoint
│   ├── genome.js               # Genome endpoint
│   └── commands.js             # Command audit log
├── data/
│   └── db.json                 # Auto-created persistent database
├── body patch/                 # Mesh generation + documentation tools
├── scripts/
│   └── seed.mjs                # Manual DB seeding script
├── public/
│   └── textures/               # Face, skin, eye, chamber wall textures
├── package.json
├── vite.config.ts              # Vite + dev API middleware
├── vite-api-dev.js             # Express-like API proxy for dev server
└── README.md                   # This file
```

---

## Technology Stack

| Layer | Tool | Version |
|-------|------|---------|
| Framework | React | 19.2 |
| Language | TypeScript | 5.9 (strict) |
| Build | Vite | 7.3 |
| 3D Engine | Three.js | 0.186 |
| Styling | Tailwind CSS | 4.2 |
| Animation | Framer Motion | 12.35 |
| Icons | Lucide React | 0.577 |
| Fonts | Vazirmatn (FA), JetBrains Mono (code) | @fontsource 5.3 |
| Storage | Native Node `fs` → JSON | — |

No Supabase, no PostgreSQL, no external API calls. Everything runs locally.

---

## Design Philosophy

1. **Sealed chamber** — No door, no window, no external input. The body only knows what the agent feeds it through the API. True embodiment requires isolation.

2. **Self-contained** — `npm install && npm run dev` boots the entire system: database, genome, brain, body. Zero configuration.

3. **Scientifically-grounded but accessible** — Real equations (Izhikevich, STDP, Hill muscle), real anatomy (Terminologia Anatomica), real gene names — but everything is interactive and visualised in real-time 3D.

4. **Embodied AI first** — The body is not a display. It *lives*: heart beats, lungs breathe, neurons learn, horns grow, pain fades, mood shifts. An agent doesn't observe a simulation — it inhabits a subject.

---

## References & Citations

- Izhikevich, E. M. (2003). *Simple model of spiking neurons*. IEEE Trans. Neural Networks, 14(6), 1569–1572.
- Bi, G. Q., & Poo, M. M. (1998). *Synaptic modifications by correlated activity: Hebbian post-synaptic expression of pre-synaptic long-term potentiation and depression*. Neuron, 21(1), 79–96.
- Panksepp, J. (2011). *The basic emotional circuits of the brain*. Neuron, 71(1), 15–25.
- Federative Committee on Anatomical Terminology (1998). *Terminologia Anatomica*. Thieme.
- Netter, F. H. (2019). *Atlas of Human Anatomy* (7th ed.). Elsevier.
- GRCh38.p14 — Genome Reference Consortium human build 38.1.

---

## License

MIT — built for exploration, not commerce.
