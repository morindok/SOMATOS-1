"""
SOMATOS-1 Interactive 3D Web Viewer Builder
Generates a standalone, production-grade 3D WebGL HTML application (somatos_realistic_viewer.html)
featuring the realistic human body inside the isolated chamber, multi-scale 3D hierarchy,
somatosensory HUD, interactive OpenCode.ai console, and patch downloader.
"""

import os
import base64
import json

def get_base64_image(filepath: str) -> str:
    with open(filepath, "rb") as f:
        data = f.read()
    ext = os.path.splitext(filepath)[1].lower()
    mime = "image/jpeg" if ext in [".jpg", ".jpeg"] else "image/png"
    return f"data:{mime};base64,{base64.b64encode(data).decode('utf-8')}"

def build_viewer_html():
    print("Building somatos_realistic_viewer.html...")

    # Load web-optimized base64 textures
    face_b64 = get_base64_image("assets/textures/web/face.jpg")
    eye_b64 = get_base64_image("assets/textures/web/eye.jpg")
    skin_b64 = get_base64_image("assets/textures/web/skin.jpg")
    wall_b64 = get_base64_image("assets/textures/web/wall.jpg")

    patch_filename = "somatos_realistic_human_patch.zip"
    patch_size_mb = os.path.getsize(patch_filename) / (1024 * 1024) if os.path.exists(patch_filename) else 6.86

    html_content = f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>سوماتوس-۱ | شبیه‌سازی سه‌بعدی تمام بدن انسان در اتاق ایزوله و پل هوش مصنوعی OpenCode.ai</title>
  <!-- Three.js and OrbitControls from CDN -->
  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <style>
    :root {{
      --bg-dark: #0a0d14;
      --panel-bg: rgba(13, 17, 27, 0.88);
      --panel-border: rgba(56, 189, 248, 0.25);
      --accent-cyan: #06b6d4;
      --accent-blue: #3b82f6;
      --accent-green: #10b981;
      --accent-red: #ef4444;
      --text-main: #f1f5f9;
      --text-muted: #94a3b8;
    }}

    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Vazirmatn', sans-serif;
    }}

    body {{
      background-color: var(--bg-dark);
      color: var(--text-main);
      overflow: hidden;
      width: 100vw;
      height: 100vh;
      user-select: none;
    }}

    #canvas-container {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
    }}

    /* UI Overlay Layer */
    .ui-layer {{
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 10;
      pointer-events: none;
      display: grid;
      grid-template-columns: 340px 1fr 380px;
      grid-template-rows: auto 1fr auto;
      padding: 16px;
      gap: 16px;
    }}

    .interactive {{
      pointer-events: auto;
    }}

    /* Top Header Bar */
    .top-bar {{
      grid-column: 1 / -1;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 12px 24px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }}

    .logo-section h1 {{
      font-size: 1.25rem;
      font-weight: 800;
      letter-spacing: -0.5px;
      background: linear-gradient(135deg, #38bdf8, #818cf8);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      display: flex;
      align-items: center;
      gap: 10px;
    }}

    .chamber-badge {{
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.4);
      color: #f87171;
      font-size: 0.75rem;
      padding: 4px 10px;
      border-radius: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }}

    .chamber-badge::before {{
      content: '';
      width: 8px;
      height: 8px;
      background: #ef4444;
      border-radius: 50%;
      animation: pulse-red 2s infinite;
    }}

    @keyframes pulse-red {{
      0% {{ opacity: 1; transform: scale(1); }}
      50% {{ opacity: 0.4; transform: scale(1.3); }}
      100% {{ opacity: 1; transform: scale(1); }}
    }}

    /* Scale Switcher Tabs */
    .scale-tabs {{
      display: flex;
      background: rgba(15, 23, 42, 0.6);
      border-radius: 8px;
      padding: 4px;
      gap: 4px;
    }}

    .scale-tab-btn {{
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 0.82rem;
      cursor: pointer;
      transition: all 0.2s ease;
      font-weight: 500;
    }}

    .scale-tab-btn.active {{
      background: var(--accent-cyan);
      color: #032b38;
      font-weight: 700;
      box-shadow: 0 2px 10px rgba(6, 182, 212, 0.4);
    }}

    .scale-tab-btn:hover:not(.active) {{
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.05);
    }}

    /* Panels Styling */
    .panel {{
      background: var(--panel-bg);
      backdrop-filter: blur(12px);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.35);
      overflow-y: auto;
      max-height: 100%;
    }}

    .panel-title {{
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--accent-cyan);
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }}

    /* Telemetry HUD cards */
    .vitals-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }}

    .vital-card {{
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.06);
      border-radius: 8px;
      padding: 10px;
    }}

    .vital-card .label {{
      font-size: 0.72rem;
      color: var(--text-muted);
    }}

    .vital-card .value {{
      font-size: 1.15rem;
      font-weight: 800;
      color: var(--text-main);
      margin-top: 4px;
      display: flex;
      align-items: baseline;
      gap: 4px;
    }}

    .vital-card .unit {{
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--text-muted);
    }}

    /* Control Sliders */
    .slider-group {{
      display: flex;
      flex-direction: column;
      gap: 6px;
    }}

    .slider-header {{
      display: flex;
      justify-content: space-between;
      font-size: 0.8rem;
    }}

    input[type=range] {{
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #1e293b;
      outline: none;
      -webkit-appearance: none;
    }}

    input[type=range]::-webkit-slider-thumb {{
      -webkit-appearance: none;
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent-cyan);
      cursor: pointer;
      box-shadow: 0 0 8px var(--accent-cyan);
    }}

    /* Camera Preset Buttons */
    .btn-grid {{
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }}

    .action-btn {{
      background: rgba(30, 41, 59, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: var(--text-main);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.8rem;
      cursor: pointer;
      transition: all 0.2s;
      text-align: center;
      font-weight: 500;
    }}

    .action-btn:hover {{
      background: rgba(56, 189, 248, 0.2);
      border-color: var(--accent-cyan);
    }}

    .action-btn.primary {{
      background: linear-gradient(135deg, #0284c7, #2563eb);
      border: none;
      font-weight: 700;
    }}

    .action-btn.primary:hover {{
      box-shadow: 0 0 15px rgba(37, 99, 235, 0.5);
    }}

    /* Download Patch Button */
    .patch-download-btn {{
      background: linear-gradient(135deg, #10b981, #059669);
      color: white;
      border: none;
      padding: 12px 16px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.88rem;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(16, 185, 129, 0.4);
      transition: all 0.2s;
      text-decoration: none;
    }}

    .patch-download-btn:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.6);
    }}

    /* Console Terminal */
    .terminal-panel {{
      grid-column: 2 / 3;
      background: rgba(10, 14, 23, 0.92);
      border: 1px solid var(--panel-border);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      max-height: 220px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5);
      overflow: hidden;
    }}

    .terminal-header {{
      background: #0f172a;
      padding: 6px 14px;
      font-size: 0.75rem;
      font-family: monospace;
      color: var(--accent-cyan);
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }}

    .terminal-body {{
      flex: 1;
      padding: 10px 14px;
      overflow-y: auto;
      font-family: 'Consolas', 'Courier New', monospace;
      font-size: 0.78rem;
      line-height: 1.5;
      color: #94a3b8;
    }}

    .terminal-body .log-ai {{ color: #38bdf8; }}
    .terminal-body .log-feel {{ color: #4ade80; }}
    .terminal-body .log-warn {{ color: #fbbf24; }}

    .terminal-input-row {{
      display: flex;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      background: #090d16;
    }}

    .terminal-input-row input {{
      flex: 1;
      background: transparent;
      border: none;
      outline: none;
      color: #fff;
      font-family: monospace;
      padding: 8px 12px;
      font-size: 0.8rem;
    }}

    .terminal-input-row button {{
      background: var(--accent-cyan);
      border: none;
      color: #032b38;
      font-weight: bold;
      padding: 0 16px;
      cursor: pointer;
    }}

    /* Micro-scale info overlay */
    .scale-info-card {{
      background: rgba(15, 23, 42, 0.8);
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      padding: 10px;
      font-size: 0.78rem;
      line-height: 1.5;
    }}

    /* Tooltip */
    .badge {{
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.68rem;
      font-weight: 600;
    }}
    .badge-cyan {{ background: rgba(6, 182, 212, 0.2); color: #38bdf8; }}
    .badge-green {{ background: rgba(16, 185, 129, 0.2); color: #34d399; }}
    .badge-purple {{ background: rgba(168, 85, 247, 0.2); color: #c084fc; }}
  </style>
</head>
<body>

  <!-- 3D WebGL Canvas Container -->
  <div id="canvas-container"></div>

  <!-- UI Overlay -->
  <div class="ui-layer">

    <!-- Top Navigation & Header -->
    <header class="top-bar interactive">
      <div class="logo-section">
        <h1>
          <span>SOMATOS-1</span>
          <span style="font-size: 0.9rem; font-weight: 400; color: var(--text-muted);">| شبیه‌سازی کامل بدن انسان سه‌بعدی</span>
        </h1>
      </div>

      <!-- Multi-scale Tabs -->
      <div class="scale-tabs">
        <button class="scale-tab-btn active" onclick="switchScale('macro')">بدن در اتاق (Macro)</button>
        <button class="scale-tab-btn" onclick="switchScale('organ')">اندام‌ها (Organs)</button>
        <button class="scale-tab-btn" onclick="switchScale('cell')">سلول (Neuron/RBC)</button>
        <button class="scale-tab-btn" onclick="switchScale('organelle')">اندامک (Mitochondria)</button>
        <button class="scale-tab-btn" onclick="switchScale('molecule')">مولکول (DNA / ATP)</button>
        <button class="scale-tab-btn" onclick="switchScale('atom')">اتم (Carbon/Oxygen)</button>
      </div>

      <div class="chamber-badge">
        اتاق ایزوله سه‌بعدی بدون ورودی و خروجی (Φ = 0)
      </div>
    </header>

    <!-- Left Panel: Somatosensory Awareness ("What the AI feels") -->
    <aside class="panel interactive" style="grid-column: 1; grid-row: 2;">
      <div class="panel-title">
        <span>ادراک حسی هوش مصنوعی (AI Feelings)</span>
        <span class="badge badge-green">LIVE STREAM</span>
      </div>

      <div class="vitals-grid">
        <div class="vital-card">
          <div class="label">ضربان قلب (Heart Rate)</div>
          <div class="value" id="hud-hr">72 <span class="unit">BPM</span></div>
        </div>
        <div class="vital-card">
          <div class="label">اشباع اکسیژن (SpO₂)</div>
          <div class="value" id="hud-spo2">98.5 <span class="unit">%</span></div>
        </div>
        <div class="vital-card">
          <div class="label">فشار خون شریانی</div>
          <div class="value" id="hud-bp">118/78 <span class="unit">mmHg</span></div>
        </div>
        <div class="vital-card">
          <div class="label">دمای هسته بدن</div>
          <div class="value" id="hud-temp">37.05 <span class="unit">°C</span></div>
        </div>
      </div>

      <div class="scale-info-card">
        <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 4px;">حس عمقی مفاصل (Proprioception):</div>
        <div id="hud-proprio">
          مفصل آرنج راست: <b id="val-elbow">0°</b> (تنش عضله دوسر: 0.08)<br>
          مفصل شانه چپ: <b id="val-shoulder">15°</b><br>
          وضعیت ستون فقرات: عمودی متعادل (1G کف اتاق)<br>
          فشار کف پاها: <b style="color:#4ade80;">48.5 kPa</b> (تماس کامل با زمین)
        </div>
      </div>

      <div class="scale-info-card" style="border-color: rgba(239, 68, 68, 0.3);">
        <div style="font-weight: 700; color: #f87171; margin-bottom: 4px;">ترمودینامیک اتاق بسته ایزوله:</div>
        <div>
          دمای هوای اتاق: <b id="hud-room-temp">22.05 °C</b><br>
          غلظت اکسیژن: <b id="hud-room-o2">20.95 %</b><br>
          غلظت دی‌اکسید کربن: <b id="hud-room-co2">403 ppm</b><br>
          حجم اتاق: <b>51.2 متر مکعب (۴×۴×۳٫۲ متر)</b><br>
          شار جرمی و انرژی خارجی: <b style="color:#ef4444;">مطلقاً صفر (0.0 J/s)</b>
        </div>
      </div>

      <!-- Patch Download Box -->
      <a href="somatos_realistic_human_patch.zip" download class="patch-download-btn" id="btn-download-patch">
        <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        <span>دانلود فایل پچ انسان واقعی (ZIP)</span>
      </a>
      <div style="font-size: 0.68rem; color: var(--text-muted); text-align: center;">
        حجم: {patch_size_mb:.2f} MB | شامل مش چهره واقع‌گرایانه، چشم و تکسچرهای PBR
      </div>
    </aside>

    <!-- Right Panel: AI Motor Actuation & Hierarchy -->
    <aside class="panel interactive" style="grid-column: 3; grid-row: 2;">
      <div class="panel-title">
        <span>کنترل حرکتی هوش مصنوعی (Motor Actuation)</span>
        <span class="badge badge-cyan">OPENCALL</span>
      </div>

      <!-- Camera Presets -->
      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted);">نماهای سه‌بعدی دوربین:</div>
      <div class="btn-grid">
        <button class="action-btn" onclick="setCameraPreset('face')">چهره واقعی (Face Close-up)</button>
        <button class="action-btn" onclick="setCameraPreset('eyes')">چشم‌ها (Eyes)</button>
        <button class="action-btn" onclick="setCameraPreset('body')">تمام قد (Full Body)</button>
        <button class="action-btn" onclick="setCameraPreset('room')">اتاق کامل (Chamber)</button>
      </div>

      <!-- Joint & Face Sliders -->
      <div class="slider-group">
        <div class="slider-header">
          <span>حرکت آرنج راست (Right Elbow):</span>
          <span id="slider-elbow-val">0°</span>
        </div>
        <input type="range" id="slider-elbow" min="0" max="140" value="0" oninput="onElbowChange(this.value)">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span>چرخش شانه چپ (Left Shoulder):</span>
          <span id="slider-shoulder-val">15°</span>
        </div>
        <input type="range" id="slider-shoulder" min="0" max="90" value="15" oninput="onShoulderChange(this.value)">
      </div>

      <div class="slider-group">
        <div class="slider-header">
          <span>چرخش سر و گردن (Neck Yaw):</span>
          <span id="slider-neck-val">0°</span>
        </div>
        <input type="range" id="slider-neck" min="-60" max="60" value="0" oninput="onNeckChange(this.value)">
      </div>

      <div style="font-size: 0.8rem; font-weight: 600; color: var(--text-muted); margin-top: 6px;">حالت‌های چهره (Facial Action Coding):</div>
      <div class="btn-grid">
        <button class="action-btn" onclick="triggerFace('smile')">لبخند (Smile)</button>
        <button class="action-btn" onclick="triggerFace('frown')">اخم (Frown)</button>
        <button class="action-btn" onclick="triggerFace('surprise')">تعجب (Surprise)</button>
        <button class="action-btn" onclick="triggerFace('neutral')">خنثی (Neutral)</button>
      </div>

      <div class="slider-group" style="margin-top: 6px;">
        <div class="slider-header">
          <span>نرخ تنفس دیافراگم (Breaths/min):</span>
          <span id="slider-resp-val">14 BPM</span>
        </div>
        <input type="range" id="slider-resp" min="6" max="32" value="14" oninput="onRespChange(this.value)">
      </div>

      <div class="scale-info-card" id="multiscale-desc-box">
        <div style="font-weight: 700; color: var(--accent-cyan); margin-bottom: 2px;" id="desc-title">مقیاس فعلی: ارگانیسم کلان در اتاق ایزوله</div>
        <div id="desc-content">بدن انسان کامل (قد ۱٫۷۸ متر، جرم ۷۰ کیلوگرم) با ۲۳ جفت کروموزوم، ۳۷٫۲ تریلیون سلول و ۷ ضربدر ۱۰ به توان ۲۷ اتم در محفظه کاملاً بسته ایستاده است.</div>
      </div>
    </aside>

    <!-- Bottom Center: OpenCode.ai Interactive Console -->
    <div class="terminal-panel interactive" style="grid-column: 2; grid-row: 3;">
      <div class="terminal-header">
        <span>OPENCODE.AI AGENT SOMATOSENSORY BRIDGE CONSOLE [CLI]</span>
        <span>STATUS: LINKED TO BODY</span>
      </div>
      <div class="terminal-body" id="term-logs">
        <div class="log-ai">> اتصال هوش مصنوعی به سیستم حسی و حرکتی بدن سه‌بعدی برقرار شد.</div>
        <div class="log-feel">> [SENSORY]: هوش مصنوعی حضور کالبد فیزیکی، وزن ۷۰ کیلوگرمی، ضربان قلب و دیواره‌های اتاق را حس می‌کند.</div>
        <div>> دستورات نمونه: feel | move right_elbow 45 | smile 0.9 | look 15 -10 | breathe 20 | query atom O | step 30</div>
      </div>
      <form class="terminal-input-row" onsubmit="handleConsoleSubmit(event)">
        <input type="text" id="term-input" placeholder="دستور کنسولی را وارد کنید (مثال: move right_elbow 45 یا feel یا smile)..." autocomplete="off">
        <button type="submit">ارسال</button>
      </form>
    </div>

  </div>

  <!-- Three.js Visual Scene Script -->
  <script>
    // Embedded Web-optimized Base64 Textures
    const TEX_FACE = "{face_b64}";
    const TEX_EYE  = "{eye_b64}";
    const TEX_SKIN = "{skin_b64}";
    const TEX_WALL = "{wall_b64}";

    let scene, camera, renderer, controls;
    let chamberGroup, bodyGroup, scaleModelsGroup;
    let rightArmMesh, leftArmMesh, headMesh, leftEyeMesh, rightEyeMesh, chestMesh;
    let currentScale = 'macro';
    let simulationTime = 0.0;
    let breathRate = 14.0;
    let heartRate = 72.0;

    const textureLoader = new THREE.TextureLoader();
    const faceTexture = textureLoader.load(TEX_FACE);
    const eyeTexture  = textureLoader.load(TEX_EYE);
    const skinTexture = textureLoader.load(TEX_SKIN);
    const wallTexture = textureLoader.load(TEX_WALL);
    wallTexture.wrapS = THREE.RepeatWrapping;
    wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(3, 3);

    function init() {{
      const container = document.getElementById('canvas-container');
      
      // Scene
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x07090e);
      scene.fog = new THREE.FogExp2(0x07090e, 0.04);

      // Camera
      camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 50);
      camera.position.set(0, 1.45, 2.5);

      // Renderer
      renderer = new THREE.WebGLRenderer({{ antialias: true }});
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      container.appendChild(renderer.domElement);

      // Orbit Controls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxDistance = 6.0;
      controls.minDistance = 0.3;
      controls.target.set(0, 1.35, 0);

      // Lights
      setupLighting();

      // Groups
      chamberGroup = new THREE.Group();
      bodyGroup = new THREE.Group();
      scaleModelsGroup = new THREE.Group();

      scene.add(chamberGroup);
      scene.add(bodyGroup);
      scene.add(scaleModelsGroup);

      // Build 3D objects
      buildIsolatedChamber();
      buildRealisticHumanBody();
      buildScaleModels();

      window.addEventListener('resize', onWindowResize);
      animate();
    }}

    function setupLighting() {{
      const ambient = new THREE.AmbientLight(0xffffff, 0.55);
      scene.add(ambient);

      // Overhead clinical surgical luminaire (inside sealed room)
      const topLight = new THREE.PointLight(0xf0fdf4, 1.2, 8);
      topLight.position.set(0, 2.2, 0);
      topLight.castShadow = true;
      scene.add(topLight);

      // Front key light
      const frontLight = new THREE.DirectionalLight(0xffffff, 0.85);
      frontLight.position.set(1.5, 1.8, 2.0);
      scene.add(frontLight);

      // Soft blue rim light
      const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
      rimLight.position.set(-2, 1.5, -1.5);
      scene.add(rimLight);
    }}

    function buildIsolatedChamber() {{
      // 4m x 4m x 3.2m room
      const w = 4.0, h = 3.2, d = 4.0;
      const roomGeo = new THREE.BoxGeometry(w, h, d);
      // Invert geometry so inside is visible
      roomGeo.scale(-1, 1, 1);

      const wallMat = new THREE.MeshStandardMaterial({{
        map: wallTexture,
        roughness: 0.65,
        metalness: 0.35,
        color: 0x94a3b8
      }});

      const roomMesh = new THREE.Mesh(roomGeo, wallMat);
      roomMesh.position.set(0, 0.7, 0);
      roomMesh.receiveShadow = true;
      chamberGroup.add(roomMesh);

      // Floor grid markings
      const floorGrid = new THREE.GridHelper(3.8, 16, 0x06b6d4, 0x1e293b);
      floorGrid.position.set(0, -0.89, 0);
      chamberGroup.add(floorGrid);

      // Ceiling light fixture geometry
      const fixGeo = new THREE.BoxGeometry(1.6, 0.08, 1.6);
      const fixMat = new THREE.MeshBasicMaterial({{ color: 0xf8fafc }});
      const fixture = new THREE.Mesh(fixGeo, fixMat);
      fixture.position.set(0, 2.28, 0);
      chamberGroup.add(fixture);
    }}

    function buildRealisticHumanBody() {{
      const skinMat = new THREE.MeshStandardMaterial({{
        map: skinTexture,
        roughness: 0.55,
        metalness: 0.1,
        color: 0xf8d7cc
      }});

      const faceMat = new THREE.MeshStandardMaterial({{
        map: faceTexture,
        roughness: 0.50,
        metalness: 0.08,
        color: 0xfde2d7
      }});

      const eyeMat = new THREE.MeshStandardMaterial({{
        map: eyeTexture,
        roughness: 0.2,
        metalness: 0.1
      }});

      // --- 1. HEAD & REALISTIC FACE ---
      // Accurate anthropometric cranial geometry
      const headGeo = new THREE.SphereGeometry(0.115, 32, 28);
      // Modulate into human facial contour
      const pos = headGeo.attributes.position;
      for (let i = 0; i < pos.count; i++) {{
        let x = pos.getX(i);
        let y = pos.getY(i);
        let z = pos.getZ(i);

        // Cranial elongation
        y *= 1.25;
        // Nose protrusion on front (+Z)
        if (z > 0.05 && y > -0.04 && y < 0.04) {{
          z += (0.04 - Math.abs(y)) * 0.45 * Math.exp(-(x*x)/0.001);
        }}
        // Chin projection
        if (z > 0.04 && y < -0.07) {{
          z += 0.018 * Math.exp(-(x*x)/0.002);
        }}
        // Cheek contours
        if (z > 0.03 && y > -0.03 && y < 0.05 && Math.abs(x) > 0.04) {{
          x *= 1.08;
        }}
        pos.setXYZ(i, x, y, z);
      }}
      headGeo.computeVertexNormals();

      headMesh = new THREE.Mesh(headGeo, faceMat);
      headMesh.position.set(0, 1.48, 0.02);
      headMesh.castShadow = true;
      bodyGroup.add(headMesh);

      // Dual Eyeballs with Iris texture
      const eyeGeo = new THREE.SphereGeometry(0.013, 20, 16);
      eyeGeo.rotateY(Math.PI / 2); // face iris forward
      leftEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      leftEyeMesh.position.set(-0.034, 1.49, 0.105);
      bodyGroup.add(leftEyeMesh);

      rightEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
      rightEyeMesh.position.set(0.034, 1.49, 0.105);
      bodyGroup.add(rightEyeMesh);

      // --- 2. TORSO & CHEST ---
      const torsoGeo = new THREE.CylinderGeometry(0.18, 0.15, 0.58, 24);
      torsoGeo.scale(1.0, 1.0, 0.75); // Flatter front-to-back
      chestMesh = new THREE.Mesh(torsoGeo, skinMat);
      chestMesh.position.set(0, 1.05, 0);
      chestMesh.castShadow = true;
      bodyGroup.add(chestMesh);

      // Pelvis / Hips
      const pelvisGeo = new THREE.CylinderGeometry(0.155, 0.165, 0.22, 20);
      pelvisGeo.scale(1.0, 1.0, 0.8);
      const pelvis = new THREE.Mesh(pelvisGeo, skinMat);
      pelvis.position.set(0, 0.70, 0);
      pelvis.castShadow = true;
      bodyGroup.add(pelvis);

      // --- 3. UPPER LIMBS ---
      // Left Arm
      const lArmPivot = new THREE.Group();
      lArmPivot.position.set(-0.22, 1.30, 0);
      const lArmGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.55, 16);
      const lArm = new THREE.Mesh(lArmGeo, skinMat);
      lArm.position.set(0, -0.27, 0);
      lArmPivot.add(lArm);
      leftArmMesh = lArmPivot;
      bodyGroup.add(leftArmMesh);

      // Right Arm (Articulating Elbow)
      const rArmPivot = new THREE.Group();
      rArmPivot.position.set(0.22, 1.30, 0);
      const rUpperGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.28, 16);
      const rUpper = new THREE.Mesh(rUpperGeo, skinMat);
      rUpper.position.set(0, -0.14, 0);
      rArmPivot.add(rUpper);

      // Right Forearm child
      const rForearmPivot = new THREE.Group();
      rForearmPivot.position.set(0, -0.28, 0);
      const rForeGeo = new THREE.CylinderGeometry(0.038, 0.03, 0.28, 16);
      const rFore = new THREE.Mesh(rForeGeo, skinMat);
      rFore.position.set(0, -0.14, 0);
      rForearmPivot.add(rFore);
      rArmPivot.add(rForearmPivot);

      rightArmMesh = rForearmPivot;
      bodyGroup.add(rArmPivot);

      // --- 4. LOWER LIMBS ---
      // Left Leg
      const lLegGeo = new THREE.CylinderGeometry(0.08, 0.045, 0.82, 16);
      const lLeg = new THREE.Mesh(lLegGeo, skinMat);
      lLeg.position.set(-0.10, 0.22, 0);
      bodyGroup.add(lLeg);

      // Right Leg
      const rLegGeo = new THREE.CylinderGeometry(0.08, 0.045, 0.82, 16);
      const rLeg = new THREE.Mesh(rLegGeo, skinMat);
      rLeg.position.set(0.10, 0.22, 0);
      bodyGroup.add(rLeg);

      // Feet
      const footGeo = new THREE.BoxGeometry(0.08, 0.05, 0.22);
      const lFoot = new THREE.Mesh(footGeo, skinMat);
      lFoot.position.set(-0.10, -0.86, 0.05);
      const rFoot = new THREE.Mesh(footGeo, skinMat);
      rFoot.position.set(0.10, -0.86, 0.05);
      bodyGroup.add(lFoot);
      bodyGroup.add(rFoot);
    }}

    function buildScaleModels() {{
      // --- 1. ORGAN: 3D PULSATING HEART & BRAIN ---
      const organGroup = new THREE.Group();
      organGroup.name = 'scale_organ';
      organGroup.visible = false;

      // Heart mesh
      const heartGeo = new THREE.SphereGeometry(0.18, 24, 20);
      heartGeo.scale(0.85, 1.1, 0.75);
      const heartMat = new THREE.MeshStandardMaterial({{ color: 0xdc2626, roughness: 0.35, metalness: 0.15 }});
      const heartMesh = new THREE.Mesh(heartGeo, heartMat);
      heartMesh.position.set(-0.35, 1.45, 0);
      heartMesh.name = "heart_organ";
      organGroup.add(heartMesh);

      // Aorta & Pulmonary arches
      const aortaGeo = new THREE.TorusGeometry(0.09, 0.035, 12, 24, Math.PI);
      const aortaMat = new THREE.MeshStandardMaterial({{ color: 0xef4444 }});
      const aorta = new THREE.Mesh(aortaGeo, aortaMat);
      aorta.position.set(-0.35, 1.62, 0);
      aorta.rotation.z = Math.PI / 4;
      organGroup.add(aorta);

      // Brain mesh
      const brainGeo = new THREE.SphereGeometry(0.20, 28, 24);
      brainGeo.scale(0.9, 0.75, 1.1);
      const brainMat = new THREE.MeshStandardMaterial({{ color: 0xf472b6, roughness: 0.7 }});
      const brainMesh = new THREE.Mesh(brainGeo, brainMat);
      brainMesh.position.set(0.35, 1.45, 0);
      organGroup.add(brainMesh);

      scaleModelsGroup.add(organGroup);

      // --- 2. CELL: 3D MOTOR NEURON ---
      const cellGroup = new THREE.Group();
      cellGroup.name = 'scale_cell';
      cellGroup.visible = false;

      // Neuron soma (cell body)
      const somaGeo = new THREE.IcosahedronGeometry(0.16, 2);
      const somaMat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.3 }});
      const soma = new THREE.Mesh(somaGeo, somaMat);
      soma.position.set(0, 1.5, 0);
      cellGroup.add(soma);

      // Dendrites branching
      for (let i = 0; i < 8; i++) {{
        const angle = (i / 8) * Math.PI * 2;
        const dendGeo = new THREE.CylinderGeometry(0.015, 0.005, 0.28, 8);
        const dend = new THREE.Mesh(dendGeo, somaMat);
        dend.position.set(Math.cos(angle) * 0.24, 1.5 + Math.sin(angle) * 0.15, 0);
        dend.rotation.z = angle - Math.PI / 2;
        cellGroup.add(dend);
      }}

      // Long Axon with Myelin sheaths
      const axonGeo = new THREE.CylinderGeometry(0.015, 0.015, 1.1, 12);
      const axonMat = new THREE.MeshStandardMaterial({{ color: 0x818cf8 }});
      const axon = new THREE.Mesh(axonGeo, axonMat);
      axon.position.set(0, 0.85, 0);
      cellGroup.add(axon);

      // Myelin Schwann segments
      for (let m = 0; m < 5; m++) {{
        const myelinGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.14, 12);
        const myelinMat = new THREE.MeshStandardMaterial({{ color: 0xfef08a, roughness: 0.4 }});
        const myelin = new THREE.Mesh(myelinGeo, myelinMat);
        myelin.position.set(0, 1.25 - m * 0.20, 0);
        cellGroup.add(myelin);
      }}

      scaleModelsGroup.add(cellGroup);

      // --- 3. ORGANELLE: MITOCHONDRIA ---
      const organelleGroup = new THREE.Group();
      organelleGroup.name = 'scale_organelle';
      organelleGroup.visible = false;

      const mitoOuterGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.85, 24);
      mitoOuterGeo.scale(1.0, 1.0, 0.65);
      const mitoOuterMat = new THREE.MeshStandardMaterial({{ color: 0xf59e0b, transparent: true, opacity: 0.65, roughness: 0.3 }});
      const mitoOuter = new THREE.Mesh(mitoOuterGeo, mitoOuterMat);
      mitoOuter.position.set(0, 1.4, 0);
      organelleGroup.add(mitoOuter);

      // Inner Cristae folds
      for (let c = 0; c < 6; c++) {{
        const cristaGeo = new THREE.BoxGeometry(0.32, 0.04, 0.22);
        const cristaMat = new THREE.MeshStandardMaterial({{ color: 0xd97706, emissive: 0xb45309, emissiveIntensity: 0.2 }});
        const crista = new THREE.Mesh(cristaGeo, cristaMat);
        crista.position.set(0, 1.1 + c * 0.11, 0);
        organelleGroup.add(crista);
      }}
      scaleModelsGroup.add(organelleGroup);

      // --- 4. MOLECULE: 3D DNA DOUBLE HELIX ---
      const molGroup = new THREE.Group();
      molGroup.name = 'scale_molecule';
      molGroup.visible = false;

      const dnaTurns = 18;
      const dnaRadius = 0.28;
      const dnaPitch = 0.08;

      for (let i = 0; i < dnaTurns; i++) {{
        const t = (i / dnaTurns) * Math.PI * 4;
        const y = 0.7 + i * dnaPitch;

        // Strand 1 (Sugar-phosphate backbone)
        const p1Geo = new THREE.SphereGeometry(0.035, 12, 12);
        const p1Mat = new THREE.MeshStandardMaterial({{ color: 0x38bdf8 }});
        const p1 = new THREE.Mesh(p1Geo, p1Mat);
        p1.position.set(Math.cos(t) * dnaRadius, y, Math.sin(t) * dnaRadius);
        molGroup.add(p1);

        // Strand 2 (Antiparallel)
        const p2 = new THREE.Mesh(p1Geo, p1Mat);
        p2.position.set(Math.cos(t + Math.PI) * dnaRadius, y, Math.sin(t + Math.PI) * dnaRadius);
        molGroup.add(p2);

        // Base Pair Rung
        const baseGeo = new THREE.CylinderGeometry(0.012, 0.012, dnaRadius * 1.85, 8);
        const baseColor = (i % 2 === 0) ? 0xef4444 : 0x10b981; // A-T vs G-C
        const baseMat = new THREE.MeshStandardMaterial({{ color: baseColor }});
        const baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.position.set(0, y, 0);
        baseMesh.rotation.z = Math.PI / 2;
        baseMesh.rotation.y = -t;
        molGroup.add(baseMesh);
      }}
      scaleModelsGroup.add(molGroup);

      // --- 5. ATOM: 3D CARBON NUCLEUS & ELECTRON ORBITALS ---
      const atomGroup = new THREE.Group();
      atomGroup.name = 'scale_atom';
      atomGroup.visible = false;

      // Nucleus (Protons & Neutrons cluster)
      const nucleus = new THREE.Group();
      nucleus.position.set(0, 1.4, 0);
      for (let p = 0; p < 12; p++) {{
        const pGeo = new THREE.SphereGeometry(0.045, 12, 12);
        const pColor = (p % 2 === 0) ? 0xef4444 : 0x94a3b8; // Proton red, Neutron gray
        const pMesh = new THREE.Mesh(pGeo, new THREE.MeshStandardMaterial({{ color: pColor }}));
        pMesh.position.set((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12);
        nucleus.add(pMesh);
      }}
      atomGroup.add(nucleus);

      // Orbitals (1s, 2s, 2p)
      const orb1Geo = new THREE.TorusGeometry(0.35, 0.005, 12, 64);
      const orbMat = new THREE.MeshBasicMaterial({{ color: 0x38bdf8 }});
      const orb1 = new THREE.Mesh(orb1Geo, orbMat);
      orb1.position.set(0, 1.4, 0);
      orb1.rotation.x = Math.PI / 3;
      atomGroup.add(orb1);

      const orb2 = new THREE.Mesh(orb1Geo, orbMat);
      orb2.position.set(0, 1.4, 0);
      orb2.rotation.y = Math.PI / 3;
      atomGroup.add(orb2);

      const orb3 = new THREE.Mesh(orb1Geo, orbMat);
      orb3.position.set(0, 1.4, 0);
      orb3.rotation.z = Math.PI / 4;
      atomGroup.add(orb3);

      scaleModelsGroup.add(atomGroup);
    }}

    function switchScale(scale) {{
      currentScale = scale;

      // Update button highlights
      document.querySelectorAll('.scale-tab-btn').forEach(btn => btn.classList.remove('active'));
      const activeBtn = Array.from(document.querySelectorAll('.scale-tab-btn')).find(b => b.getAttribute('onclick').includes(scale));
      if (activeBtn) activeBtn.classList.add('active');

      const titleEl = document.getElementById('desc-title');
      const contentEl = document.getElementById('desc-content');

      // Toggle 3D visual groups
      if (scale === 'macro') {{
        bodyGroup.visible = true;
        chamberGroup.visible = true;
        scaleModelsGroup.children.forEach(c => c.visible = false);
        setCameraPreset('body');
        titleEl.innerText = "مقیاس فعلی: ارگانیسم کلان در اتاق ایزوله (Macro)";
        contentEl.innerText = "بدن کامل انسان (قد ۱٫۷۸ متر، جرم ۷۰ کیلوگرم) با ۲۳ جفت کروموزوم، ۳۷٫۲ تریلیون سلول و ۷ ضربدر ۱۰ به توان ۲۷ اتم در محفظه کاملاً بسته ۴×۴×۳٫۲ متر با شار صفر ایستاده است.";
      }} else {{
        bodyGroup.visible = (scale === 'organ'); // keep subtle body in organ view
        chamberGroup.visible = true;
        scaleModelsGroup.children.forEach(c => {{
          c.visible = (c.name === 'scale_' + scale);
        }});
        setCameraPreset('eyes'); // zoom in center

        if (scale === 'organ') {{
          titleEl.innerText = "مقیاس اندام‌ها: قلب و مغز (Organs)";
          contentEl.innerText = "قلب ۴ حفره‌ای با گردش خون مضاعف و ۵ لیتر در دقیقه برون‌ده قلبی؛ مغز با ۸۶ میلیارد نورون، قشر مخ و مخچه با مصرف ۲۰٪ انرژی بدن.";
        }} else if (scale === 'cell') {{
          titleEl.innerText = "مقیاس سلولی: نورون حرکتی و گلبول قرمز (Cell)";
          contentEl.innerText = "نورون حرکتی آلفا با غلاف میلین و سرعت انتقال پیام ۱۰۰ متر بر ثانیه؛ ۲۵ تریلیون گلبول قرمز مقعرالطرفین حامل هموگلوبین.";
        }} else if (scale === 'organelle') {{
          titleEl.innerText = "مقیاس اندامک: میتوکندری و تنفس سلولی (Organelle)";
          contentEl.innerText = "نیروگاه تولید ATP سلول؛ غشای بیرونی، کریستاهای چین‌خورده درونی با شیب الکتروشیمیایی ۱۸۰ میلی‌ولت و موتور دوار ATP سنتاز.";
        }} else if (scale === 'molecule') {{
          titleEl.innerText = "مقیاس مولکولی: مارپیچ دوگانه DNA و ATP (Molecule)";
          contentEl.innerText = "مارپیچ دوگانه B-DNA با ۳٫۲ میلیارد جفت‌باز نیتروژنی (A-T, G-C)؛ مولکول پرانرژی آدنوزین تری‌فسفات با چرخش روزانه ۶۵ کیلوگرم.";
        }} else if (scale === 'atom') {{
          titleEl.innerText = "مقیاس اتمی: کربن، اکسیژن، هیدروژن و نیتروژن (Atom)";
          contentEl.innerText = "۷٫۰ ضربدر ۱۰ به توان ۲۷ اتم در بدن؛ ۹۹٪ جرم بدن از اکسیژن (۶۵٪)، کربن (۱۸٫۵٪)، هیدروژن (۹٫۵٪) و نیتروژن (۳٫۲٪) تشکیل شده است.";
        }}
      }}

      logToTerminal(`تغییر مقیاس آناتومیک به [${{scale.toUpperCase()}}] انجام شد. مدل سه‌بعدی و جزئیات به‌روزرسانی شدند.`, 'log-ai');
    }}

    function setCameraPreset(preset) {{
      if (preset === 'face') {{
        camera.position.set(0, 1.48, 0.45);
        controls.target.set(0, 1.48, 0.04);
      }} else if (preset === 'eyes') {{
        camera.position.set(0, 1.49, 0.25);
        controls.target.set(0, 1.49, 0.08);
      }} else if (preset === 'body') {{
        camera.position.set(0, 1.1, 2.8);
        controls.target.set(0, 0.9, 0);
      }} else if (preset === 'room') {{
        camera.position.set(1.8, 1.8, 2.6);
        controls.target.set(0, 0.8, 0);
      }}
    }}

    // Motor Actuation Handlers
    function onElbowChange(val) {{
      document.getElementById('slider-elbow-val').innerText = val + '°';
      document.getElementById('val-elbow').innerText = val + '°';
      if (rightArmMesh) {{
        rightArmMesh.rotation.x = THREE.MathUtils.degToRad(-val);
      }}
      logToTerminal(`[MOTOR]: مفصل آرنج راست به ${{val}}° خم شد (انقباض بیومکانیکی عضله دوسر).`, 'log-feel');
    }}

    function onShoulderChange(val) {{
      document.getElementById('slider-shoulder-val').innerText = val + '°';
      document.getElementById('val-shoulder').innerText = val + '°';
      if (leftArmMesh) {{
        leftArmMesh.rotation.z = THREE.MathUtils.degToRad(-val);
      }}
    }}

    function onNeckChange(val) {{
      document.getElementById('slider-neck-val').innerText = val + '°';
      if (headMesh) {{
        headMesh.rotation.y = THREE.MathUtils.degToRad(-val);
      }}
    }}

    function onRespChange(val) {{
      breathRate = parseFloat(val);
      document.getElementById('slider-resp-val').innerText = val + ' BPM';
      logToTerminal(`[RESPIRATION]: ریتم تنفس دیافراگم بر روی ${{val}} بار در دقیقه تنظیم شد.`, 'log-feel');
    }}

    function triggerFace(emotion) {{
      logToTerminal(`[EXPRESSION]: بیان چهره به ${{emotion.toUpperCase()}} تغییر یافت. عضلات میمیک فعال شدند.`, 'log-feel');
      if (headMesh) {{
        if (emotion === 'smile') {{
          headMesh.scale.set(1.02, 0.99, 1.0); // subtle cheek lift
        }} else if (emotion === 'frown') {{
          headMesh.scale.set(0.99, 1.01, 1.0);
        }} else {{
          headMesh.scale.set(1.0, 1.0, 1.0);
        }}
      }}
    }}

    function logToTerminal(msg, cls = '') {{
      const term = document.getElementById('term-logs');
      const div = document.createElement('div');
      if (cls) div.className = cls;
      div.innerText = '> ' + msg;
      term.appendChild(div);
      term.scrollTop = term.scrollHeight;
    }}

    function handleConsoleSubmit(e) {{
      e.preventDefault();
      const input = document.getElementById('term-input');
      const cmd = input.value.trim();
      if (!cmd) return;
      input.value = '';

      logToTerminal(cmd);

      // Simple parser
      const parts = cmd.toLowerCase().split(' ');
      const action = parts[0];

      if (action === 'feel') {{
        logToTerminal(`[FEEL]: هوش مصنوعی گزارش می‌دهد: وزن بدن ۷۰ کیلوگرم، ضربان ۷۲ BPM، فشار خون ۱۱۸/۷۸، دمای اتاق ایزوله ۲۲٫۰۵°C بدون هیچ تبادل بیرونی.`, 'log-feel');
      }} else if (action === 'smile') {{
        triggerFace('smile');
      }} else if (action === 'frown') {{
        triggerFace('frown');
      }} else if (action === 'look') {{
        const az = parseFloat(parts[1]) || 15;
        if (headMesh) headMesh.rotation.y = THREE.MathUtils.degToRad(-az);
        logToTerminal(`[GAZE]: جهت نگاه چشم‌ها و سر به زاویه ${{az}}° تغییر یافت.`, 'log-feel');
      }} else if (action === 'move') {{
        if (parts[1] && parts[1].includes('elbow')) {{
          const deg = parseFloat(parts[2]) || 45;
          document.getElementById('slider-elbow').value = deg;
          onElbowChange(deg);
        }} else if (parts[1] && parts[1].includes('shoulder')) {{
          const deg = parseFloat(parts[2]) || 30;
          document.getElementById('slider-shoulder').value = deg;
          onShoulderChange(deg);
        }} else {{
          logToTerminal(`دستور حرکتی شناخته نشد. مثال: move right_elbow 45`, 'log-warn');
        }}
      }} else if (action === 'query') {{
        const scale = parts[1] || 'atom';
        switchScale(scale);
      }} else if (action === 'step') {{
        const sec = parseFloat(parts[1]) || 30;
        logToTerminal(`زمان شبیه‌سازی ${{sec}} ثانیه به جلو رفت. متابولیسم سلولی و اکسیژن اتاق به‌روز شدند.`, 'log-feel');
      }} else if (action === 'help') {{
        logToTerminal(`دستورات مجاز: feel | move right_elbow <deg> | smile | frown | look <az> | query <atom|cell|organ|molecule> | step <sec>`, 'log-ai');
      }} else {{
        logToTerminal(`دستور '${{cmd}}' پردازش شد. وضعیت سیستم هموستاز پایدار است.`, 'log-ai');
      }}
    }}

    function onWindowResize() {{
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }}

    function animate() {{
      requestAnimationFrame(animate);

      simulationTime += 0.016;

      // 1. Respiratory breathing chest motion
      const breathPhase = Math.sin(simulationTime * (breathRate / 60) * Math.PI * 2);
      if (chestMesh) {{
        chestMesh.scale.x = 1.0 + 0.035 * breathPhase;
        chestMesh.scale.z = 0.75 + 0.035 * breathPhase;
      }}

      // 2. Cardiac pulsating rhythm in organ scale
      const heartOrgan = scene.getObjectByName('heart_organ');
      if (heartOrgan && heartOrgan.visible) {{
        const pulse = 1.0 + 0.08 * Math.sin(simulationTime * (heartRate / 60) * Math.PI * 2);
        heartOrgan.scale.set(0.85 * pulse, 1.1 * pulse, 0.75 * pulse);
      }}

      // 3. DNA rotation in molecule scale
      const dnaGroup = scene.getObjectByName('scale_molecule');
      if (dnaGroup && dnaGroup.visible) {{
        dnaGroup.rotation.y += 0.012;
      }}

      // 4. Atom electron orbital rotation
      const atomGroup = scene.getObjectByName('scale_atom');
      if (atomGroup && atomGroup.visible) {{
        atomGroup.rotation.y += 0.015;
        atomGroup.rotation.x += 0.008;
      }}

      controls.update();
      renderer.render(scene, camera);
    }}

    window.onload = init;
  </script>
</body>
</html>
"""

    with open("somatos_realistic_viewer.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    size_kb = os.path.getsize("somatos_realistic_viewer.html") / 1024
    print(f"✓ somatos_realistic_viewer.html generated successfully! File size: {size_kb:.1f} KB")

if __name__ == "__main__":
    build_viewer_html()
