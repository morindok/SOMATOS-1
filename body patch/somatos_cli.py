#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SOMATOS-1 Unified Command-Line Interface (CLI)
A comprehensive console API and terminal control center for the 3D human body simulation.
Allows AI agents and users to feel bodily sensations, actuate joints/face/vitals,
query multi-scale biology from atom to organ, and inspect the isolated chamber.
"""

import sys
import os
import argparse
import json
from typing import Optional, Dict, Any, List
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.columns import Columns
from rich.text import Text
from rich import box

from somatos_engine import SomatosHumanBody
from opencode_bridge import OpenCodeBodyBridge

console = Console()

def render_banner():
    banner_text = Text(
        "╔══════════════════════════════════════════════════════════════════════════════╗\n"
        "║   SOMATOS-1 : 3D HUMAN BODY & ISOLATED CHAMBER CONSOLE API & BRIDGE          ║\n"
        "║   از اتم تا ارگانیسم کامل انسان در اتاق ایزوله سه‌بعدی | پل هوش مصنوعی opencode.ai    ║\n"
        "╚══════════════════════════════════════════════════════════════════════════════╝",
        style="bold cyan"
    )
    console.print(banner_text)

def cmd_status(bridge: OpenCodeBodyBridge):
    render_banner()
    body = bridge.body
    chamber = body.chamber.get_status_dict()
    vitals = body.sensory.vitals

    # General Info
    info_table = Table(title="مشخصات کلان ارگانیسم و وضعیت اتاق ایزوله (Macro Status)", box=box.ROUNDED, style="bright_blue")
    info_table.add_column("پارامتر (Metric)", style="bold white")
    info_table.add_column("مقدار عددی (Value)", style="green")
    info_table.add_column("توضیحات علمی (Scientific Basis)", style="yellow")

    info_table.add_row("ارتفاع قد (Height)", f"{body.height_m} m", "قد استاندارد انسان بالغ (آناتومیک)")
    info_table.add_row("جرم کل بدن (Body Mass)", f"{body.mass_kg} kg", "مرد استاندارد فیزیولوژیک ۷۰ کیلوگرم")
    info_table.add_row("موقعیت در اتاق (3D Position)", f"{body.center_of_mass_room} (X, Y, Z)", "ایستاده در مرکز ثقل اتاق ایزوله")
    info_table.add_row("ابعاد اتاق ایزوله (Chamber)", f"{chamber['room_dimensions_m']['width_x']}m x {chamber['room_dimensions_m']['depth_z']}m x {chamber['room_dimensions_m']['height_y']}m", f"حجم کل: {chamber['volume_m3']} m³ (۵۱,۲۰۰ لیتر)")
    info_table.add_row("شرایط مرزی اتاق (Boundary)", "FLUX_IN = 0, FLUX_OUT = 0", "کاملاً بسته، آدیاباتیک، بدون در و پنجره")
    info_table.add_row("دمای اتاق ایزوله (Temp)", f"{chamber['atmosphere']['temperature_c']} °C", "گرمایش ناشی از تابش متابولیک بدن")
    info_table.add_row("غلظت اکسیژن اتاق (O₂)", f"{chamber['atmosphere']['o2_percent']} %", f"باقیمانده: {chamber['atmosphere']['o2_remaining_liters']} L")
    info_table.add_row("غلظت دی‌اکسید کربن (CO₂)", f"{chamber['atmosphere']['co2_ppm']} ppm ({chamber['atmosphere']['co2_percent']}%)", "تجمع گاز بازدمی در محفظه بدون تهویه")
    info_table.add_row("رطوبت نسبی اتاق (Humidity)", f"{chamber['atmosphere']['relative_humidity_pct']} %", "تجمع تعریق نامحسوس پوستی")
    console.print(info_table)

    # Vitals Panel
    vit_table = Table(title="علائم حیاتی و هموستاز فیزیولوژیک (Vital Telemetry)", box=box.ROUNDED, style="magenta")
    vit_table.add_column("شاخص حیاتی", style="bold white")
    vit_table.add_column("مقدار فعلی", style="cyan")
    vit_table.add_column("محدوده فیزیولوژیک مرجع", style="dim")

    vit_table.add_row("ضربان قلب (Heart Rate)", f"{vitals['heart_rate_bpm']} BPM", "60 - 100 BPM")
    vit_table.add_row("فشار خون (Blood Pressure)", f"{vitals['blood_pressure_systolic_mmhg']:.0f} / {vitals['blood_pressure_diastolic_mmhg']:.0f} mmHg", "120 / 80 mmHg")
    vit_table.add_row("اشباع اکسیژن شریانی (SpO₂)", f"{vitals['oxygen_saturation_spo2_pct']} %", "95 - 100 %")
    vit_table.add_row("نرخ تنفس (Respiration)", f"{vitals['respiratory_rate_bpm']} breaths/min", "12 - 20 BPM")
    vit_table.add_row("دمای هسته مرکزی بدن (Core Temp)", f"{vitals['core_body_temperature_c']} °C", "36.5 - 37.5 °C")
    vit_table.add_row("pH خون شریانی (Arterial pH)", f"{vitals['arterial_blood_ph']:.2f}", "7.35 - 7.45")
    vit_table.add_row("قند خون (Blood Glucose)", f"{vitals['blood_glucose_mg_dl']} mg/dL", "70 - 100 mg/dL")
    vit_table.add_row("ذخیره سلولی ATP (Energy Pool)", f"{vitals['cellular_atp_pool_pct']} %", "> 95 %")
    vit_table.add_row("نرخ متابولیسم پایه (BMR)", f"{vitals['basal_metabolic_rate_watts']} Watts", "75 - 85 Watts")
    console.print(vit_table)

def cmd_feel(bridge: OpenCodeBodyBridge, channel: str = "all"):
    render_banner()
    feeling = bridge.feel(channel)

    if channel == "all":
        subj = feeling["subjective_state_fa"]
        console.print(Panel(subj, title="ادراک ذهنی هوش مصنوعی از وجود بدن خود (Subjective Bodily Awareness)", style="bold green", box=box.DOUBLE))

        # Proprioception table
        prop = feeling["body_feeling"]["proprioception"]
        j_table = Table(title="حس عمقی مفاصل و موقعیت اندام‌ها (Proprioceptive Joint Angles)", box=box.ROUNDED, style="cyan")
        j_table.add_column("مفصل (Joint)", style="bold white")
        j_table.add_column("زاویه فعلی (Angle)", style="green")
        j_table.add_column("دامنه مجاز آناتومیک (ROM)", style="dim")
        j_table.add_column("گروه کینماتیک", style="yellow")

        for k, v in list(prop["joints"].items())[:14]:  # Show representative joints
            j_table.add_row(k, f"{v['angle_deg']:.1f} {v['unit']}", f"[{v['min']} to {v['max']}]", v["group"])
        console.print(j_table)

        # Facial action units
        f_table = Table(title="حس و بیان چهره (Facial Action Coding System - FACS)", box=box.ROUNDED, style="yellow")
        f_table.add_column("واحد عمل چهره (Action Unit)", style="bold white")
        f_table.add_column("شدت انقباض عضلانی (Intensity 0-1)", style="cyan")
        for k, val in prop["facial_action_units"].items():
            bar = "█" * int(val * 20) + "░" * (20 - int(val * 20))
            f_table.add_row(k, f"{val:.2f}  [{bar}]")
        console.print(f_table)

        # Tactile Dermatomes
        t_table = Table(title="حس لامسه و فشار گیرنده‌های مکانیکی پوست (Cutaneous Mechanoreception)", box=box.ROUNDED, style="bright_magenta")
        t_table.add_column("درماتوم پوستی (Dermatome)", style="bold white")
        t_table.add_column("فشار تماسی (Pressure)", style="green")
        t_table.add_column("تماس فیزیکی", style="cyan")
        t_table.add_column("دمای موضعی پوست", style="yellow")

        for d_name, d_val in feeling["body_feeling"]["tactile_and_cutaneous"]["dermatomes"].items():
            contact_str = "بله (تماس با کف اتاق)" if d_val["contact"] else "خیر (در تماس با هوا)"
            t_table.add_row(d_name, f"{d_val['pressure_kpa']:.1f} kPa", contact_str, f"{d_val['temperature_c']} °C")
        console.print(t_table)

        # Vestibular & Nociception summary
        vest = feeling["body_feeling"]["vestibular_equilibrium"]["telemetry"]
        vest_text = f"بردارهای شتاب گرانشی: {vest['gravity_vector_g']} (1G به سمت کف اتاق)\nوضعیت پایداری: {vest['equilibrium_state']}\nسرعت زاویه‌ای گوش داخلی: {vest['angular_velocity_deg_s']}"
        console.print(Panel(vest_text, title="سیستم دهلیزی گوش داخلی و حس تعادل (Vestibular Equilibrium)", style="bright_blue"))

    else:
        console.print_json(json.dumps(feeling, ensure_ascii=False))

def cmd_move(bridge: OpenCodeBodyBridge, args):
    if args.joint:
        if args.angle is None:
            console.print("[red]Error: Please specify --angle <degrees> when moving a joint.[/red]")
            return
        res = bridge.actuate("joint", joint=args.joint, angle=args.angle)
        console.print(f"[bold green]✓ {res['executed_commands'][0]['message']}[/bold green]")

    elif args.face:
        intensity = args.intensity if args.intensity is not None else 1.0
        res = bridge.actuate("face", emotion=args.face, intensity=intensity)
        console.print(f"[bold green]✓ {res['executed_commands'][0]['message']}[/bold green]")

    elif args.gaze:
        az, el = args.gaze
        res = bridge.actuate("gaze", azimuth=az, elevation=el)
        console.print(f"[bold green]✓ {res['executed_commands'][0]['message']}[/bold green]")

    elif args.breathe:
        res = bridge.actuate("respiration", rate_bpm=args.breathe)
        console.print(f"[bold green]✓ {res['executed_commands'][0]['message']}[/bold green]")

    else:
        console.print("[yellow]Specify a move action: --joint <name> --angle <deg>, --face <emotion>, --gaze <az> <el>, or --breathe <bpm>[/yellow]")

def cmd_query(bridge: OpenCodeBodyBridge, scale: str, target: Optional[str] = None):
    render_banner()
    res = bridge.query_multiscale(scale, target)
    if "error" in res:
        console.print(f"[bold red]Error:[/bold red] {res['error']}")
        return

    q_table = Table(title=f"پایگاه داده مقیاس زیستی: {scale.upper()} {f'[{target}]' if target else ''}", box=box.ROUNDED, style="cyan")
    q_table.add_column("ویژگی (Property)", style="bold white")
    q_table.add_column("مقدار / شرح علمی", style="yellow")

    data = res.get("data", res)
    if isinstance(data, dict):
        for k, v in data.items():
            if isinstance(v, (dict, list)):
                q_table.add_row(k, json.dumps(v, ensure_ascii=False, indent=2))
            else:
                q_table.add_row(k, str(v))
    console.print(q_table)

def cmd_step(bridge: OpenCodeBodyBridge, seconds: float):
    res = bridge.step_simulation(seconds)
    console.print(f"[bold green]✓ Simulation stepped {seconds} seconds forward inside isolated chamber.[/bold green]")
    ch = res["chamber_atmosphere"]
    console.print(f"  Chamber Temp: {ch['temperature_c']} °C | O₂: {ch['o2_percent']}% | CO₂: {ch['co2_ppm']} ppm")

def cmd_patch_info():
    render_banner()
    patch_zip = "somatos_realistic_human_patch.zip"
    exists = os.path.exists(patch_zip)
    size_mb = os.path.getsize(patch_zip) / (1024 * 1024) if exists else 0.0

    table = Table(title="اطلاعات فایل پچ گرافیک واقع‌گرایانه چهره و بدن انسان (Patch Package)", box=box.ROUNDED, style="green")
    table.add_column("آیتم", style="bold white")
    table.add_column("وضعیت / مقدار", style="cyan")

    table.add_row("نام فایل پچ", patch_zip)
    table.add_row("وضعیت در ریشه پروژه", "موجود و آماده دانلود ✓" if exists else "ناموجود")
    table.add_row("حجم پچ", f"{size_mb:.2f} MB")
    table.add_row("مدل سه‌بعدی چهره (Head Mesh)", "assets/mesh/human_head_realistic.obj (1944 راس، توپولوژی کامل چهره، چشم و لب)")
    table.add_row("مدل سه‌بعدی بدن (Body Mesh)", "assets/mesh/human_body_realistic.obj (مقیاس ۱:۱ قد ۱٫۷۸ متر)")
    table.add_row("بافت واقع‌گرایانه چهره (Face Texture)", "assets/textures/realistic_face_albedo.png (کیفیت بالا با جزئیات منافذ پوست و لب)")
    table.add_row("بافت واقع‌گرایانه چشم (Eye Iris)", "assets/textures/realistic_eye_iris.png (عنبیه ماکرو با مویرگ‌های صلبیه)")
    table.add_row("بافت درمیس پوست بدن (Skin Texture)", "assets/textures/realistic_skin_dermis.png (بافت سلولی اپیدرم)")
    table.add_row("دیواره اتاق ایزوله (Chamber Texture)", "assets/textures/isolated_chamber_wall.png (پانل‌های آکوستیک بدون ورودی)")
    table.add_row("اسکریپت نصب و اعمال پچ", "python apply_patch.py")
    console.print(table)

def main():
    parser = argparse.ArgumentParser(description="SOMATOS-1 Unified CLI & API")
    subparsers = parser.add_subparsers(dest="subcommand", help="Available subcommands")

    # status
    subparsers.add_parser("status", help="Show whole body and chamber status")

    # feel
    p_feel = subparsers.add_parser("feel", help="Inspect what the AI feels in the body")
    p_feel.add_argument("--channel", default="all", choices=["all", "proprioception", "tactile_and_cutaneous", "vestibular_equilibrium", "nociception_pain", "thermoception", "interoception_autonomic", "chamber"])

    # move
    p_move = subparsers.add_parser("move", help="Actuate joints, facial expressions, or vitals")
    p_move.add_argument("--joint", type=str, help="Joint name (e.g. right_elbow_flexion, neck_rotation)")
    p_move.add_argument("--angle", type=float, help="Target angle in degrees")
    p_move.add_argument("--face", type=str, help="Facial expression (smile, frown, surprise, neutral, blink)")
    p_move.add_argument("--intensity", type=float, default=1.0, help="Expression intensity (0.0 to 1.0)")
    p_move.add_argument("--gaze", type=float, nargs=2, metavar=("AZIMUTH", "ELEVATION"), help="Gaze direction in degrees")
    p_move.add_argument("--breathe", type=float, help="Respiration rate in breaths/min")

    # query
    p_query = subparsers.add_parser("query", help="Query biological hierarchy from micro to macro")
    p_query.add_argument("--scale", required=True, choices=["atom", "molecule", "organelle", "cell", "tissue", "organ", "system", "chamber", "macro"])
    p_query.add_argument("--target", type=str, help="Target element, molecule, organ, or cell name")

    # step
    p_step = subparsers.add_parser("step", help="Advance simulation time")
    p_step.add_argument("--seconds", type=float, default=1.0, help="Seconds to advance")

    # reset
    subparsers.add_parser("reset", help="Reset body to default basal baseline")

    # patch
    subparsers.add_parser("patch", help="View realistic graphics patch status and package info")

    # bridge
    subparsers.add_parser("bridge", help="Run OpenCode.ai agent loop test")

    # api
    p_api = subparsers.add_parser("api", help="Execute JSON-RPC payload")
    p_api.add_argument("--json", required=True, help="JSON-RPC payload string")

    args = parser.parse_args()

    bridge = OpenCodeBodyBridge()

    if args.subcommand == "status":
        cmd_status(bridge)
    elif args.subcommand == "feel":
        cmd_feel(bridge, args.channel)
    elif args.subcommand == "move":
        cmd_move(bridge, args)
    elif args.subcommand == "query":
        cmd_query(bridge, args.scale, args.target)
    elif args.subcommand == "step":
        cmd_step(bridge, args.seconds)
    elif args.subcommand == "reset":
        if os.path.exists(".somatos_state.json"):
            os.remove(".somatos_state.json")
        bridge = OpenCodeBodyBridge()
        console.print("[bold green]✓ Body state reset to resting baseline.[/bold green]")
    elif args.subcommand == "patch":
        cmd_patch_info()
    elif args.subcommand == "bridge":
        bridge.run_agent_demonstration()
    elif args.subcommand == "api":
        print(bridge.process_json_rpc(args.json))
    else:
        cmd_status(bridge)

if __name__ == "__main__":
    main()
