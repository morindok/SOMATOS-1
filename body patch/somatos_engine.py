"""
SOMATOS-1: Complete Multi-Scale Human Anatomical & Physiological Engine
Covers from subatomic/atomic to whole organism inside a sealed 3D isolated chamber.
Provides comprehensive somatosensory proprioception telemetry and motor actuation for AI agents.
"""

import math
import json
import time
from typing import Dict, List, Any, Optional, Tuple

# ==============================================================================
# 1. ATOMIC SCALE (مقیاس اتمی) - ~10⁻¹⁰ m (~1 Ångström)
# ==============================================================================
# Standard 70 kg reference human contains approximately 7.0 × 10²⁷ atoms.
# 99% of mass consists of just 6 elements: O, C, H, N, Ca, P.

ATOMIC_ELEMENTS: Dict[str, Dict[str, Any]] = {
    "O": {
        "name_en": "Oxygen",
        "name_fa": "اکسیژن",
        "atomic_number": 8,
        "mass_percent": 65.0,
        "atomic_percent": 24.0,
        "atom_count_approx": 1.61e27,
        "atomic_weight_u": 15.999,
        "covalent_radius_pm": 66,
        "van_der_waals_radius_pm": 152,
        "electronegativity_pauling": 3.44,
        "valence_electrons": 6,
        "common_oxidation_states": [-2, -1],
        "biological_role_fa": "پذیرنده نهایی الکترون در زنجیره انتقال الکترون میتوکندری، سازنده اصلی مولکول آب (H2O)، کربوهیدرات‌ها، چربی‌ها و پروتئین‌ها",
        "biological_role_en": "Terminal electron acceptor in mitochondrial respiration; primary constituent of water, carbohydrates, lipids, and nucleic acids.",
        "quantum_vibrational_freq_cm1": 3657.0  # O-H stretch
    },
    "C": {
        "name_en": "Carbon",
        "name_fa": "کربن",
        "atomic_number": 6,
        "mass_percent": 18.5,
        "atomic_percent": 12.0,
        "atom_count_approx": 7.22e26,
        "atomic_weight_u": 12.011,
        "covalent_radius_pm": 76,
        "van_der_waals_radius_pm": 170,
        "electronegativity_pauling": 2.55,
        "valence_electrons": 4,
        "common_oxidation_states": [-4, -2, 0, +2, +4],
        "biological_role_fa": "اسکلت ساختاری تمام مولکول‌های زیستی آلی؛ تشکیل زنجیره‌ها و حلقه‌های پایدار کربنی با هیبریداسیون‌های sp3، sp2 و sp",
        "biological_role_en": "Structural backbone of all organic biomolecules; forms stable catenated bonds via sp3, sp2, and sp orbital hybridization.",
        "quantum_vibrational_freq_cm1": 2960.0  # C-H stretch
    },
    "H": {
        "name_en": "Hydrogen",
        "name_fa": "هیدروژن",
        "atomic_number": 1,
        "mass_percent": 9.5,
        "atomic_percent": 62.0,
        "atom_count_approx": 4.22e27,
        "atomic_weight_u": 1.008,
        "covalent_radius_pm": 31,
        "van_der_waals_radius_pm": 120,
        "electronegativity_pauling": 2.20,
        "valence_electrons": 1,
        "common_oxidation_states": [+1, -1],
        "biological_role_fa": "بیشترین تعداد اتم در بدن (۶۲٪)؛ تشکیل پیوندهای هیدروژنی در DNA و پروتئین‌ها، گرادیان پروتونی در تولید ATP",
        "biological_role_en": "Most abundant atom by number (62%); forms hydrogen bonds critical for DNA base pairing and proton-motive force across inner mitochondrial membrane.",
        "quantum_vibrational_freq_cm1": 3400.0
    },
    "N": {
        "name_en": "Nitrogen",
        "name_fa": "نیتروژن",
        "atomic_number": 7,
        "mass_percent": 3.2,
        "atomic_percent": 1.1,
        "atom_count_approx": 1.62e26,
        "atomic_weight_u": 14.007,
        "covalent_radius_pm": 71,
        "van_der_waals_radius_pm": 155,
        "electronegativity_pauling": 3.04,
        "valence_electrons": 5,
        "common_oxidation_states": [-3, +3, +5],
        "biological_role_fa": "سازنده گروه‌های آمین در اسیدهای آمینه، بازهای پورین و پیریمیدین در DNA و RNA، پورفیرین هموگلوبین و نیتریک اکسید (NO)",
        "biological_role_en": "Essential for amino acids, purine/pyrimidine nitrogenous bases in DNA/RNA, heme porphyrin ring, and nitric oxide vascular signaling.",
        "quantum_vibrational_freq_cm1": 3300.0  # N-H stretch
    },
    "Ca": {
        "name_en": "Calcium",
        "name_fa": "کلسیم",
        "atomic_number": 20,
        "mass_percent": 1.5,
        "atomic_percent": 0.22,
        "atom_count_approx": 2.50e25,
        "atomic_weight_u": 40.078,
        "covalent_radius_pm": 176,
        "van_der_waals_radius_pm": 231,
        "electronegativity_pauling": 1.00,
        "valence_electrons": 2,
        "common_oxidation_states": [+2],
        "biological_role_fa": "۹۹٪ در استخوان‌ها و دندان‌ها به صورت هیدروکسی‌آپاتیت؛ پیام‌رسان ثانویه حیاتی در انقباض عضلانی، رهایش وزیکول‌های سیناپسی و انعقاد خون",
        "biological_role_en": "99% stored in hydroxyapatite crystals in skeleton; key secondary messenger triggering muscle cross-bridge cycling and neurotransmitter exocytosis.",
        "quantum_vibrational_freq_cm1": 450.0
    },
    "P": {
        "name_en": "Phosphorus",
        "name_fa": "فسفر",
        "atomic_number": 15,
        "mass_percent": 1.0,
        "atomic_percent": 0.22,
        "atom_count_approx": 1.30e25,
        "atomic_weight_u": 30.974,
        "covalent_radius_pm": 107,
        "van_der_waals_radius_pm": 180,
        "electronegativity_pauling": 2.19,
        "valence_electrons": 5,
        "common_oxidation_states": [+5],
        "biological_role_fa": "اسکلت فسفودی‌استر اسیدهای نوکلئیک، پیوندهای پرانرژی فسفوانیدرید ATP، فسفولیپیدهای غشای سلولی و سیستم بافر فسفات خون",
        "biological_role_en": "Phosphodiester backbone of DNA/RNA, high-energy phosphoanhydride bonds in ATP/ADP, membrane phospholipids, and acid-base buffer.",
        "quantum_vibrational_freq_cm1": 1100.0  # P=O stretch
    },
    "K": {
        "name_en": "Potassium",
        "name_fa": "پتاسیم",
        "atomic_number": 19,
        "mass_percent": 0.4,
        "atomic_percent": 0.03,
        "atom_count_approx": 4.5e24,
        "atomic_weight_u": 39.098,
        "covalent_radius_pm": 203,
        "van_der_waals_radius_pm": 275,
        "electronegativity_pauling": 0.82,
        "valence_electrons": 1,
        "common_oxidation_states": [+1],
        "biological_role_fa": "کاتیون اصلی داخل سلولی (~140 mM)؛ تعیین پتانسیل استراحت غشای نورون‌ها و سلول‌های عضلانی قلبی از طریق کانال‌های K⁺",
        "biological_role_en": "Primary intracellular cation (~140 mM); dictates resting membrane potential (-70 mV) via potassium leak channels and Na+/K+-ATPase.",
        "quantum_vibrational_freq_cm1": 300.0
    },
    "Na": {
        "name_en": "Sodium",
        "name_fa": "سدیم",
        "atomic_number": 11,
        "mass_percent": 0.2,
        "atomic_percent": 0.03,
        "atom_count_approx": 2.1e24,
        "atomic_weight_u": 22.990,
        "covalent_radius_pm": 166,
        "van_der_waals_radius_pm": 227,
        "electronegativity_pauling": 0.93,
        "valence_electrons": 1,
        "common_oxidation_states": [+1],
        "biological_role_fa": "کاتیون اصلی خارج سلولی (~142 mM)؛ ایجاد فاز صعودی پتانسیل عمل در سلول‌های عصبی و عضلانی از طریق کانال‌های ولتاژی سدیم",
        "biological_role_en": "Primary extracellular cation (~142 mM); drives depolarization phase of action potentials through voltage-gated Na+ channels.",
        "quantum_vibrational_freq_cm1": 320.0
    },
    "Cl": {
        "name_en": "Chlorine",
        "name_fa": "کلر",
        "atomic_number": 17,
        "mass_percent": 0.2,
        "atomic_percent": 0.03,
        "atom_count_approx": 2.0e24,
        "atomic_weight_u": 35.45,
        "covalent_radius_pm": 102,
        "van_der_waals_radius_pm": 175,
        "electronegativity_pauling": 3.16,
        "valence_electrons": 7,
        "common_oxidation_states": [-1],
        "biological_role_fa": "آنیون اصلی خارج سلولی (~103 mM)؛ موازنه اسمزی، اسید کلریدریک معده (HCl) و هایپرپلاریزاسیون بازدارنده سیناپسی (کانال GABA)",
        "biological_role_en": "Major extracellular anion (~103 mM); maintains osmotic pressure, gastric HCl secretion, and inhibitory postsynaptic currents via GABA_A receptors.",
        "quantum_vibrational_freq_cm1": 460.0
    },
    "S": {
        "name_en": "Sulfur",
        "name_fa": "گوگرد",
        "atomic_number": 16,
        "mass_percent": 0.25,
        "atomic_percent": 0.03,
        "atom_count_approx": 1.4e24,
        "atomic_weight_u": 32.06,
        "covalent_radius_pm": 105,
        "van_der_waals_radius_pm": 180,
        "electronegativity_pauling": 2.58,
        "valence_electrons": 6,
        "common_oxidation_states": [-2, +4, +6],
        "biological_role_fa": "سازنده اسیدهای آمینه متیونین و سیستئین؛ پیوندهای دی‌سولفیدی (S-S) تثبیت‌کننده ساختار سوم پروتئین‌ها و آنتی‌اکسیدان گلوتاتیون",
        "biological_role_en": "Present in methionine and cysteine; forms covalent disulfide cross-links (-S-S-) in tertiary protein folds and antioxidant glutathione.",
        "quantum_vibrational_freq_cm1": 500.0  # S-S stretch
    },
    "Mg": {
        "name_en": "Magnesium",
        "name_fa": "منیزیم",
        "atomic_number": 12,
        "mass_percent": 0.05,
        "atomic_percent": 0.01,
        "atom_count_approx": 8.7e23,
        "atomic_weight_u": 24.305,
        "covalent_radius_pm": 141,
        "van_der_waals_radius_pm": 173,
        "electronegativity_pauling": 1.31,
        "valence_electrons": 2,
        "common_oxidation_states": [+2],
        "biological_role_fa": "کوآنزیم بیش از ۳۰۰ واکنش آنزیمی؛ اتصال و پایدارسازی ساختار ATP (کمپلکس Mg-ATP²⁻) و ریبوزوم‌ها",
        "biological_role_en": "Essential cofactor for >300 enzymatic reactions; chelates polyphosphate backbone of ATP (Mg-ATP complex) and stabilizes ribosome subunits.",
        "quantum_vibrational_freq_cm1": 360.0
    },
    "Fe": {
        "name_en": "Iron",
        "name_fa": "آهن",
        "atomic_number": 26,
        "mass_percent": 0.006,
        "atomic_percent": 0.0003,
        "atom_count_approx": 4.5e22,
        "atomic_weight_u": 55.845,
        "covalent_radius_pm": 132,
        "van_der_waals_radius_pm": 204,
        "electronegativity_pauling": 1.83,
        "valence_electrons": 8,
        "common_oxidation_states": [+2, +3],
        "biological_role_fa": "هسته فعال گروه هِم در هموگلوبین و میوگلوبین برای انتقال O2؛ کاتالیزور اکسیداسیون-احیا در سیتوکروم‌های میتوکندری",
        "biological_role_en": "Catalytic center of heme group in hemoglobin and myoglobin for O2 transport; redox electron shuttle in mitochondrial cytochromes.",
        "quantum_vibrational_freq_cm1": 410.0
    }
}


# ==============================================================================
# 2. MOLECULAR SCALE (مقیاس مولکولی) - 10⁻⁹ to 10⁻⁸ m (1 to 10 nm)
# ==============================================================================

MOLECULAR_STRUCTURES: Dict[str, Dict[str, Any]] = {
    "H2O": {
        "name_en": "Water",
        "name_fa": "آب",
        "formula": "H₂O",
        "molecular_mass_da": 18.015,
        "body_fraction_mass": 0.60,
        "total_volume_liters": 42.0,
        "geometry": "Bent (104.5° bond angle)",
        "dipole_moment_debye": 1.85,
        "dielectric_constant": 78.4,
        "description_fa": "حلال زیستی بنیادی؛ تشکیل شبکه پیوندهای هیدروژنی، واسطه کلیه واکنش‌های بیوشیمیایی و پایداری آنتروپی غشاها",
        "description_en": "Fundamental biological solvent; forms tetrahedral hydrogen bond network, mediates biochemical transport, enzymatic hydrolysis, and thermal buffering."
    },
    "ATP": {
        "name_en": "Adenosine Triphosphate",
        "name_fa": "آدنوزین تری‌فسفات",
        "formula": "C₁₀H₁₆N₅O₁₃P₃",
        "molecular_mass_da": 507.18,
        "intracellular_conc_mm": 5.0,
        "free_energy_hydrolysis_kj_mol": -30.5,
        "daily_turnover_kg": 65.0,
        "description_fa": "واحد اصلی تبادل انرژی شیمیایی در سلول؛ هیدرولیز پیوند فسفوانیدرید ترمینال نیروی محرکه پمپ‌های یونی و انقباض عضلانی را فراهم می‌کند",
        "description_en": "Universal cellular energy currency; terminal phosphoanhydride bond cleavage (ATP -> ADP + Pi) drives active ion transport, biosynthetic work, and mechanical cross-bridge cycling."
    },
    "DNA": {
        "name_en": "Deoxyribonucleic Acid",
        "name_fa": "دئوکسی‌ریبونوکلئیک اسید",
        "conformation": "B-DNA right-handed double helix",
        "base_pairs_per_cell": 3.2e9,
        "helix_diameter_nm": 2.0,
        "helix_pitch_nm": 3.4,
        "base_pair_rise_nm": 0.34,
        "total_length_per_cell_m": 2.0,
        "chromosome_count": 46,
        "description_fa": "حامل اطلاعات ژنتیکی انسان در ۲۳ جفت کروموزوم؛ پیوندهای هیدروژنی بین A=T (دو پیوند) و G≡C (سه پیوند) ساختار مارپیچ دوگانه را پایدار می‌سازد",
        "description_en": "Human genetic blueprint encoded across 23 chromosome pairs; canonical Watson-Crick hydrogen bonding (A=T and G≡C) stabilized by base-stacking interactions."
    },
    "Hemoglobin": {
        "name_en": "Hemoglobin A (HbA)",
        "name_fa": "هموگلوبین",
        "quaternary_structure": "Heterotetramer (α₂β₂)",
        "molecular_mass_da": 64500.0,
        "heme_groups_count": 4,
        "cooperativity_hill_coeff": 2.8,
        "p50_o2_mmhg": 26.6,
        "description_fa": "پروتئین ناقل گازهای تنفسی درون گلبول‌های قرمز؛ هر مولکول با ۴ یون Fe²⁺ توانایی حمل ۴ مولکول O₂ با خاصیت آلوستریک تعاونی دارد",
        "description_en": "Tetrameric allosteric metalloprotein in red blood cells; binds up to 4 oxygen molecules cooperatively to heme Fe(II) with sigmoidal saturation dynamics."
    },
    "Collagen_Type_I": {
        "name_en": "Collagen Type I",
        "name_fa": "کلاژن تیپ یک",
        "structure": "Right-handed triple helix of three α chains (Gly-X-Y)",
        "molecular_mass_da": 300000.0,
        "length_nm": 300.0,
        "diameter_nm": 1.5,
        "tensile_strength_mpa": 120.0,
        "description_fa": "فراوان‌ترین پروتئین بدن (۲۵٪ کل پروتئین‌ها)؛ ایجاد استحکام کششی در پوست، تاندون‌ها، فاشیا و ماتریکس استخوان",
        "description_en": "Most abundant protein in the human body; high tensile strength triple helix providing mechanical scaffold for skin, tendons, bone matrix, and fascia."
    },
    "Actin_Myosin": {
        "name_en": "Actomyosin Complex",
        "name_fa": "کمپلکس اکتین-میوزین",
        "structure": "Interdigitating thin F-actin filaments and thick myosin II heads",
        "sarcomere_unit_length_um": 2.2,
        "force_per_crossbridge_pn": 4.0,
        "stroke_distance_nm": 10.0,
        "description_fa": "ماشین نانومکانیکی انقباض عضلانی؛ لغزش رشته‌های اکتین و میوزین با مصرف ATP و آزادسازی کلسیم از شبکه سارکوپلاسمی",
        "description_en": "Nanomechanical motor assembly of muscle contraction; ATP-powered cross-bridge power stroke sliding actin filaments past myosin thick filaments."
    },
    "Phospholipid_Bilayer": {
        "name_en": "Phospholipid Bilayer Membrane",
        "name_fa": "دو لایه فسفولیپیدی غشا",
        "thickness_nm": 4.0,
        "composition": "Phosphatidylcholine, phosphatidylethanolamine, sphingomyelin, cholesterol",
        "dielectric_breakdown_mv": 200.0,
        "capacitance_uf_cm2": 1.0,
        "description_fa": "غشای دولایه لیپیدی با سرهای آب‌دوست و دم‌های آب‌گریز؛ مدل موزائیک سیال حاوی پروتئین‌های انتقال‌دهنده، کانال‌های یونی و رسپتورها",
        "description_en": "Amphipathic lipid bilayer barrier with hydrophobic interior core; fluid mosaic harboring ion channels, GPCR receptors, and active transport pumps."
    }
}


# ==============================================================================
# 3. ORGANELLE SCALE (مقیاس اندامک‌ها) - 100 nm to 10 µm
# ==============================================================================

ORGANELLES: Dict[str, Dict[str, Any]] = {
    "Nucleus": {
        "name_en": "Nucleus",
        "name_fa": "هسته سلولی",
        "diameter_um": 6.0,
        "features": ["Double nuclear membrane", "Nuclear pore complexes (NPC)", "Nucleolus", "Euchromatin & Heterochromatin"],
        "description_fa": "مرکز فرماندهی سلول؛ محصور در غشای دوگانه با منافذ هسته‌ای، جایگاه همانندسازی DNA و رونویسی mRNA",
        "description_en": "Cellular genetic control center; double-membraned with ~3000 nuclear pore complexes regulating nucleocytoplasmic transport and transcription."
    },
    "Mitochondria": {
        "name_en": "Mitochondrion",
        "name_fa": "میتوکندری",
        "length_um": 1.5,
        "diameter_um": 0.5,
        "count_per_cardiomyocyte": 5000,
        "membrane_potential_mv": -180.0,
        "atp_synthase_rotational_speed_rps": 130.0,
        "features": ["Outer membrane", "Intermembrane space", "Inner membrane cristae", "Mitochondrial matrix", "mtDNA"],
        "description_fa": "نیروگاه تنفس هوازی؛ تولید بیش از ۹۰٪ ATP با پمپ پروتون‌ها در طول زنجیره انتقال الکترون و چرخش موتور ATP سنتاز",
        "description_en": "Cellular powerhouse; creates chemiosmotic proton gradient (ΔΨ ~ 180 mV) driving F₀F₁-ATP synthase nanomotors to phosphorylate ADP."
    },
    "Endoplasmic_Reticulum": {
        "name_en": "Endoplasmic Reticulum (Rough & Smooth)",
        "name_fa": "شبکه آندوپلاسمی (زبر و صاف)",
        "surface_area_fraction": 0.5,
        "features": ["Ribosome-studded cisternae (RER)", "Tubular lipid-synthesizing network (SER)", "Sarcoplasmic reticulum Ca²⁺ store"],
        "description_fa": "شبکه گسترده غشایی؛ سنتز پروتئین‌های ترشحی در بخش زبر، سنتز لیپیدها، سم‌زدایی و ذخیره‌سازی کلسیم در بخش صاف",
        "description_en": "Extensive membranous labyrinth; RER coordinates cotranslational protein translocon entry, while SER synthesizes lipids and sequesters Ca2+."
    },
    "Golgi_Apparatus": {
        "name_en": "Golgi Apparatus",
        "name_fa": "دستگاه گلژی",
        "cisternae_count": 6,
        "features": ["Cis-Golgi network", "Medial cisternae", "Trans-Golgi network", "Clathrin-coated vesicles"],
        "description_fa": "مرکز پردازش و بسته‌بندی ماکرومولکول‌ها؛ گلیکوزیلاسیون پروتئین‌ها، نشانه‌گذاری با مانوز-۶-فسفات و ارسال وزیکولی به مقاصد درون و برون‌سلولی",
        "description_en": "Post-translational modification and trafficking depot; sorts, glycosylates, and packages proteins into secretagogue secretory vesicles."
    },
    "Lysosome": {
        "name_en": "Lysosome",
        "name_fa": "لیزوزوم",
        "diameter_nm": 300.0,
        "internal_ph": 4.8,
        "enzyme_count": 50,
        "features": ["V-type H⁺-ATPase pump", "Acid hydrolases", "LAMP-1 protective glycoproteins"],
        "description_fa": "دستگاه گوارش و بازیافت سلولی؛ محیط اسیدی مجهز به پمپ پروتون و هیدرولازهای اسیدی برای اتوفاژی و هضم باکتری‌ها و بقایای سلولی",
        "description_en": "Cellular recycling and waste-degradation organelle; maintained at pH 4.8 via V-type H+ pumps to activate acidic digestive hydrolases."
    },
    "Ribosome": {
        "name_en": "80S Eukaryotic Ribosome",
        "name_fa": "ریبوزوم ۸۰ اس",
        "mass_mda": 4.2,
        "subunits": "40S (small) + 60S (large)",
        "translation_speed_aa_s": 5.0,
        "description_fa": "کارخانه سنتز پلی‌پپتید؛ ترجمه کد ژنتیکی mRNA به زنجیره اسیدهای آمینه با کاتالیز ریبوزیم پپتیدیل ترانسفراز",
        "description_en": "Ribonucleoprotein complex translating genetic mRNA sequences into polypeptide chains at 5 amino acids per second."
    }
}


# ==============================================================================
# 4. CELLULAR SCALE (مقیاس سلولی) - 10⁻⁶ to 10⁻⁴ m (1 to 100 µm)
# ==============================================================================
# Total human cells: approximately 3.72 × 10¹³ (~37.2 trillion).

CELL_TYPES: Dict[str, Dict[str, Any]] = {
    "Erythrocyte": {
        "name_en": "Erythrocyte (Red Blood Cell)",
        "name_fa": "گلبول قرمز",
        "diameter_um": 7.8,
        "thickness_um": 2.2,
        "volume_fl": 90.0,
        "total_count_human": 2.5e13,
        "lifespan_days": 120,
        "hemoglobin_molecules_per_cell": 2.7e8,
        "features": ["Biconcave disc", "Enucleated", "Deformable spectrin-actin cytoskeleton", "Carbonic anhydrase"],
        "description_fa": "فراوان‌ترین سلول بدن (بیش از ۸۰٪ کل سلول‌ها)؛ دیسک مقعرالطرفین بدون هسته با ۲۷۰ میلیون مولکول هموگلوبین برای انتقال O2 و CO2",
        "description_en": "Enucleated biconcave disc optimized for microcapillary deformation; contains 270 million hemoglobin molecules for respiratory gas transport."
    },
    "Motor_Neuron": {
        "name_en": "Alpha Motor Neuron",
        "name_fa": "نورون حرکتی آلفا",
        "soma_diameter_um": 40.0,
        "axon_length_m": 1.0,
        "axon_diameter_um": 15.0,
        "conduction_velocity_m_s": 100.0,
        "features": ["Myelin sheath (Schwann/Oligodendrocytes)", "Nodes of Ranvier", "Axon hillock", "Neuromuscular junction"],
        "description_fa": "انتقال‌دهنده پیام‌های حرکتی از نخاع به عضلات مخطط؛ پتانسیل عمل جهشی در گره‌های رانویه با سرعت ۱۰۰ متر بر ثانیه و ترشح استیل‌کولین",
        "description_en": "Long heavily myelinated projection neuron; propagates saltatory action potentials at 100 m/s from spinal cord ventral horn to motor endplate."
    },
    "Skeletal_Myocyte": {
        "name_en": "Skeletal Muscle Fiber",
        "name_fa": "فیبر عضله اسکلتی (میوسیت)",
        "diameter_um": 50.0,
        "length_cm": 15.0,
        "features": ["Multinucleated syncytium", "Transverse (T) tubules", "Sarcoplasmic reticulum", "Sarcomeres in series"],
        "description_fa": "سلول چند هسته‌ای انقباضی؛ همگام‌سازی جفت‌شدگی تحریک-انقباض توسط لوله‌های عرضی T و رهایش سریع یون کلسیم",
        "description_en": "Multinucleated striated cylindrical cell containing thousands of parallel myofibrils executing voluntary mechanical force production."
    },
    "Cardiomyocyte": {
        "name_en": "Ventricular Cardiomyocyte",
        "name_fa": "کاردیومیوسیت بطنی",
        "length_um": 100.0,
        "diameter_um": 25.0,
        "features": ["Intercalated discs", "Connexin-43 gap junctions", "Desmosomes", "Prolonged Ca²⁺ plateau phase (300 ms)"],
        "description_fa": "سلول منشعب عضله قلب؛ ارتباط الکتریکی و مکانیکی از طریق صفحات بینابینی برای ایجاد سینسیشیوم عملکردی و انقباض موزون بطن",
        "description_en": "Branched cardiac cell coupled via intercalated discs and gap junctions, ensuring synchronized all-or-none ventricular contraction."
    },
    "Hepatocyte": {
        "name_en": "Hepatocyte",
        "name_fa": "هپاتوسیت (سلول کبدی)",
        "diameter_um": 25.0,
        "features": ["Polygonal architecture", "Canalicular bile secretion", "Cytochrome P450 enzymes", "Glycogen granules"],
        "description_fa": "سلول متابولیک کبد؛ گلوکونئوژنز، ساخت پروتئین‌های پلاسما (آلبومین)، سنتز اوره، تجزیه سموم و ترشح صفرا",
        "description_en": "Metabolic workhorse cell of the liver; performs gluconeogenesis, plasma protein synthesis, xenobiotic detoxification, and bile production."
    },
    "Osteocyte": {
        "name_en": "Osteocyte",
        "name_fa": "استئوسیت (سلول استخوانی)",
        "features": ["Lacuno-canalicular network", "Mechanosensory primary cilia", "Sclerostin secretion", "Matrix mineralization regulation"],
        "description_fa": "سلول بالغ درون ماتریکس استخوانی؛ حسگر مکانیکی تنش فشاری استخوان، تنظیم بازسازی و هموستاز کلسیم و فسفات",
        "description_en": "Differentiated bone cell embedded within mineralized lacunae; senses mechanical strain and orchestrates osteoblast/osteoclast remodeling."
    },
    "Keratinocyte": {
        "name_en": "Epidermal Keratinocyte",
        "name_fa": "کراتینوسیت پوستی",
        "features": ["Stratified layers", "Desmosome junctions", "Keratohyalin granules", "Corneocyte envelope lipid barrier"],
        "description_fa": "سلول سد دفاعی اپیدرم پوست؛ تولید پروتئین کراتین، ممانعت از تبخیر آب بدن و دفاع در برابر پاتوژن‌ها و پرتو فرابنفش",
        "description_en": "Primary cellular component of epidermis; synthesizes keratin and lipid envelope forming an impermeable environmental protection barrier."
    }
}


# ==============================================================================
# 5. TISSUE SCALE (مقیاس بافت‌ها) - 10⁻⁴ to 10⁻² m (100 µm to 1 cm)
# ==============================================================================

TISSUES: Dict[str, Dict[str, Any]] = {
    "Epithelial": {
        "name_en": "Epithelial Tissue",
        "name_fa": "بافت پوششی (اپیتلیوم)",
        "subtypes": ["Simple squamous (alveoli)", "Stratified squamous (epidermis)", "Simple columnar (intestine)", "Pseudostratified ciliated (trachea)"],
        "characteristics": "Avascular, polarized, high regenerative capacity, rests on basal lamina ECM",
        "description_fa": "پوشاننده تمام سطوح داخلی و خارجی بدن؛ تبادل گازها، ترشح مخاط و آنزیم‌ها، جذب مواد مغذی و ایجاد سد مکانیکی"
    },
    "Connective": {
        "name_en": "Connective Tissue",
        "name_fa": "بافت همبند (پیوندی)",
        "subtypes": ["Loose areolar", "Dense regular (tendon)", "Hyaline cartilage", "Compact bone", "Adipose tissue", "Blood"],
        "characteristics": "Abundant extracellular matrix (collagen, elastin, proteoglycans), fibroblasts, macrophages",
        "description_fa": "پشتیبان، اتصال‌دهنده و محافظ اندام‌ها؛ تحمل نیروهای کششی و فشاری، ذخیره انرژی در چربی و انتقال سیالات در خون"
    },
    "Muscular": {
        "name_en": "Muscular Tissue",
        "name_fa": "بافت عضلانی",
        "subtypes": ["Skeletal (voluntary, striated)", "Cardiac (involuntary, striated)", "Smooth (involuntary, visceral)"],
        "characteristics": "Excitable, contractility, extensibility, elasticity, high metabolic perfusion",
        "description_fa": "تولید نیرو و حرکت؛ ۶۵۰ عضله اسکلتی، عضله میوکارد قلب و عضلات صاف دیواره عروق، لوله گوارش و مجاری تنفسی"
    },
    "Nervous": {
        "name_en": "Nervous Tissue",
        "name_fa": "بافت عصبی",
        "subtypes": ["Gray matter (neuronal somata, synapses)", "White matter (myelinated tracts)", "Peripheral nerves", "Sensory ganglia"],
        "characteristics": "Neurons and neuroglia (astrocytes, microglia, oligodendrocytes, Schwann cells, ependymal cells)",
        "description_fa": "پردازش، هدایت و یکپارچه‌سازی سیگنال‌های الکتریکی و شیمیایی؛ کنترل آگاهانه و خودکار تمام سیستم‌های حیاتی بدن"
    }
}


# ==============================================================================
# 6. ORGAN SCALE (مقیاس اندام‌ها) - 10⁻² to 10⁻¹ m (1 cm to 30 cm)
# ==============================================================================

ORGANS: Dict[str, Dict[str, Any]] = {
    "Brain": {
        "name_en": "Brain (Encephalon)",
        "name_fa": "مغز",
        "mass_kg": 1.4,
        "volume_cm3": 1200,
        "neuron_count": 8.6e10,
        "synapse_count": 1.5e14,
        "cerebral_blood_flow_ml_min": 750.0,
        "o2_consumption_percent": 20.0,
        "glucose_consumption_g_day": 120.0,
        "lobes_and_regions": [
            "Frontal Lobe (Executive function, primary motor cortex M1, Broca speech area)",
            "Parietal Lobe (Primary somatosensory cortex S1, spatial multimodal mapping)",
            "Temporal Lobe (Primary auditory cortex, language Wernicke, hippocampus memory)",
            "Occipital Lobe (Primary visual cortex V1-V5)",
            "Limbic System (Amygdala emotion, hippocampus, cingulate gyrus)",
            "Basal Ganglia (Striatum, globus pallidus, substantia nigra dopamine pathway)",
            "Cerebellum (Motor coordination, motor learning, vestibulo-ocular reflex)",
            "Brainstem (Midbrain, Pons, Medulla oblongata autonomic cardiac/respiratory centers)"
        ],
        "center_pos_room": [0.0, 1.45, 0.0],
        "description_fa": "مرکز پردازش اطلاعات، شناخت و آگاهی؛ مصرف ۲۰٪ انرژی کل بدن، هدایت ارادی و خودکار حرکات و ثبت ادراکات حسی",
        "description_en": "Central processing and cognitive organ consuming 20% of resting metabolic energy; coordinates consciousness, motor actuation, and somatosensory perception."
    },
    "Heart": {
        "name_en": "Heart (Cor)",
        "name_fa": "قلب",
        "mass_kg": 0.31,
        "chambers": ["Right Atrium", "Right Ventricle", "Left Atrium", "Left Ventricle"],
        "valves": ["Tricuspid", "Pulmonary semilunar", "Mitral (Bicuspid)", "Aortic semilunar"],
        "pacemaker": "Sinoatrial (SA) node (intrinsic rate 60-100 bpm)",
        "conduction_system": ["SA Node", "Internodal pathways", "AV Node", "Bundle of His", "Left/Right bundle branches", "Purkinje fibers"],
        "resting_cardiac_output_l_min": 5.0,
        "stroke_volume_ml": 70.0,
        "mean_arterial_pressure_mmhg": 93.3,
        "center_pos_room": [-0.03, 1.05, 0.05],
        "description_fa": "پمپ عضلانی چهار حفره‌ای با گردش خون مضاعف؛ ضربان موزون ۷۰ بار در دقیقه، پمپاژ بیش از ۷۲۰۰ لیتر خون در روز",
        "description_en": "Four-chambered muscular dual-circuit pump generating systolic pressures; ejects ~5 L/min to sustain continuous systemic and pulmonary perfusion."
    },
    "Lungs": {
        "name_en": "Lungs (Pulmones)",
        "name_fa": "ریه‌ها",
        "mass_kg": 1.0,
        "lobes_right": 3,
        "lobes_left": 2,
        "alveoli_count": 3.0e8,
        "alveolar_surface_area_m2": 70.0,
        "blood_gas_barrier_thickness_um": 0.5,
        "resting_tidal_volume_ml": 500.0,
        "minute_ventilation_l_min": 6.0,
        "center_pos_room": [0.0, 1.05, 0.0],
        "description_fa": "اندام تبادل گازهای تنفسی؛ ۳۰۰ میلیون کیسه هوایی با مساحت ۷۰ متر مربع و ضخامت سد نیم میکرومتر برای انتشار اکسیژن و دی‌اکسید کربن",
        "description_en": "Paired respiratory gas exchange organs with 300 million alveoli providing a 70 m² interface across an ultrathin 0.5 µm blood-gas barrier."
    },
    "Liver": {
        "name_en": "Liver (Hepar)",
        "name_fa": "کبد",
        "mass_kg": 1.5,
        "lobes": ["Right lobe", "Left lobe", "Caudate lobe", "Quadrate lobe"],
        "couinaud_segments": 8,
        "portal_vein_blood_flow_percent": 75.0,
        "hepatic_artery_blood_flow_percent": 25.0,
        "total_blood_flow_ml_min": 1400.0,
        "center_pos_room": [0.12, 0.88, 0.04],
        "description_fa": "بزرگترین غده احشایی و کارخانه متابولیک؛ ذخیره گلیکوژن، سم‌زدایی داروها، تولید صفرا و سنتز فاکتورهای انعقادی",
        "description_en": "Largest visceral gland and metabolic clearinghouse; receives dual blood supply, coordinates gluconeogenesis, plasma protein synthesis, and detoxification."
    },
    "Kidneys": {
        "name_en": "Kidneys (Renes)",
        "name_fa": "کلیه‌ها",
        "mass_kg": 0.30,
        "nephrons_per_kidney": 1.1e6,
        "glomerular_filtration_rate_ml_min": 125.0,
        "daily_filtrate_volume_l": 180.0,
        "daily_urine_volume_l": 1.5,
        "renal_blood_flow_fraction": 0.22,
        "center_pos_room": [-0.10, 0.82, -0.08],
        "description_fa": "تنظیم‌کننده هموستاز مایعات و الکترولیت‌ها؛ تصفیه ۱۸۰ لیتر پلاسمای خون در روز توسط ۲٫۲ میلیون نفرون، تنظیم فشار خون با محور رنین-آنژیوتانسین",
        "description_en": "Paired retroperitoneal organs filtering 180 L of plasma daily across 2.2 million nephrons; precise osmoregulation, acid-base, and blood pressure control."
    },
    "Stomach": {
        "name_en": "Stomach (Gaster)",
        "name_fa": "معده",
        "volume_empty_ml": 50.0,
        "volume_distended_l": 1.5,
        "regions": ["Cardia", "Fundus", "Corpus (Body)", "Pyloric antrum", "Pyloric sphincter"],
        "gastric_ph": 1.5,
        "secretion_components": ["Hydrochloric acid (HCl)", "Pepsinogen", "Intrinsic factor", "Mucus buffer barrier"],
        "center_pos_room": [-0.08, 0.86, 0.05],
        "description_fa": "مخزن و آسیاب هضم مکانیکی و شیمیایی؛ ترشح اسید کلریدریک قوی با pH ۱٫۵ برای فعال‌سازی پپسین و دناتوره کردن پروتئین‌ها",
        "description_en": "J-shaped muscular digestive reservoir; churns food into chyme while secreting hydrochloric acid (pH 1.5) and proteolytic pepsinogen."
    },
    "Pancreas": {
        "name_en": "Pancreas",
        "name_fa": "لوزالمعده (پانکراس)",
        "mass_kg": 0.08,
        "endocrine_islets_langerhans_count": 1.0e6,
        "hormones": ["Insulin (Beta cells)", "Glucagon (Alpha cells)", "Somatostatin (Delta cells)"],
        "exocrine_enzymes": ["Trypsinogen", "Chymotrypsinogen", "Amylase", "Lipase", "Bicarbonate HCO3-"],
        "center_pos_room": [-0.02, 0.80, -0.02],
        "description_fa": "غده دوگانه درون‌ریز و برون‌ریز؛ ترشح انسولین و گلوکاگون برای تنظیم دقیق قند خون و ترشح آنزیم‌های گوارشی و بی‌کربنات به دوازدهه",
        "description_en": "Dual endocrine-exocrine gland; regulates glycemic homeostasis via insulin/glucagon and secretes pancreatic digestive enzymes into duodenum."
    },
    "Spleen": {
        "name_en": "Spleen (Lien)",
        "name_fa": "طحال",
        "mass_kg": 0.15,
        "compartments": ["Red pulp (RBC mechanical filtration & iron recycling)", "White pulp (PALS & lymphoid follicles)"],
        "center_pos_room": [-0.18, 0.88, -0.02],
        "description_fa": "بزرگترین عضو لنفاوی بدن؛ غربالگری مکانیکی و تخریب گلبول‌های قرمز فرسوده، ذخیره پلاکت‌ها و پاسخ ایمنی در برابر باکتری‌های کپسول‌دار",
        "description_en": "Largest secondary lymphoid organ; filters senescent erythrocytes in splenic sinusoids and mounts antibody responses to encapsulated pathogens."
    },
    "Intestines": {
        "name_en": "Gastrointestinal Intestinal Tract",
        "name_fa": "روده‌ها (باریک و بزرگ)",
        "small_intestine_length_m": 6.0,
        "large_intestine_length_m": 1.5,
        "absorptive_surface_area_m2": 32.0,
        "segments": ["Duodenum", "Jejunum", "Ileum", "Cecum", "Appendix", "Colon (Ascending, Transverse, Descending, Sigmoid)", "Rectum"],
        "microbiome_bacterial_cells": 3.8e13,
        "center_pos_room": [0.0, 0.65, 0.05],
        "description_fa": "مسیر جذب مواد مغذی و آب؛ پرزها و میکروویلی‌های روده باریک با مساحت ۳۲ متر مربع و کلونی ۳۸ تریلیون باکتری همزیست در روده بزرگ",
        "description_en": "Nutrient breakdown and absorptive tract featuring mucosal villi and microvilli, coupled with 38 trillion symbiotic microbiome flora."
    },
    "Skin": {
        "name_en": "Integument (Skin)",
        "name_fa": "پوست (دستگاه پوششی)",
        "mass_kg": 4.5,
        "surface_area_m2": 1.85,
        "layers": ["Epidermis (Stratum corneum, lucidum, granulosum, spinosum, basale)", "Dermis (Papillary and Reticular)", "Hypodermis (Subcutaneous adipose)"],
        "mechanoreceptors_count": 5.0e6,
        "sweat_glands_eccrine_count": 3.0e6,
        "description_fa": "بزرگترین اندام حسی و محافظ بدن؛ مجهز به ۵ میلیون گیرنده مکانیکی، تنظیم حرارت با ۳ میلیون غده عرق و سد در برابر محیط ایزوله",
        "description_en": "Largest sensory and protective organ; provides barrier defense, sensory tactile reception via 5 million mechanoreceptors, and thermoregulatory sweating."
    }
}


# ==============================================================================
# 7. ORGAN SYSTEM SCALE (مقیاس دستگاه‌های بدن) - ۱۰ دستگاه اصلی
# ==============================================================================

ORGAN_SYSTEMS: Dict[str, Dict[str, Any]] = {
    "Skeletal": {
        "name_en": "Skeletal System",
        "name_fa": "دستگاه اسکلتی",
        "bones_count": 206,
        "axial_skeleton_bones": 80,
        "appendicular_skeleton_bones": 126,
        "joint_articulations_count": 360,
        "calcium_reservoir_percent": 99.0,
        "description_fa": "داربست سخت مکانیکی و اهرم‌های حرکتی؛ محافظت از مغز، نخاع و قفسه سینه، خونسازی در مغز استخوان و ذخیره کلسیم",
        "description_en": "Rigid structural framework of 206 articulated bones providing kinematic levers, vital organ protection, hematopoiesis, and mineral storage."
    },
    "Muscular": {
        "name_en": "Muscular System",
        "name_fa": "دستگاه عضلانی",
        "skeletal_muscles_count": 650,
        "body_mass_percent": 42.0,
        "total_motor_units_approx": 300000,
        "description_fa": "موتورهای محرک اسکلت؛ ۶۵۰ عضله مخطط برای وضعیت ایستاده، راه‌رفتن، حرکات ظریف انگشتان، بیان چهره و تولید گرما",
        "description_en": "Actuation network of 650 skeletal muscles generating biomechanical torques, maintaining posture, producing expressive gestures, and shivering thermogenesis."
    },
    "Nervous": {
        "name_en": "Nervous System (CNS & PNS)",
        "name_fa": "دستگاه عصبی (مرکزی و محیطی)",
        "cranial_nerves_pairs": 12,
        "spinal_nerves_pairs": 31,
        "autonomic_divisions": ["Sympathetic (fight-or-flight)", "Parasympathetic (rest-and-digest)", "Enteric (gut brain)"],
        "description_fa": "شبکه فرماندهی و مخابرات فوق‌سریع بدن؛ ارسال پتانسیل‌های عمل، هماهنگی عضلانی، دریافت تمام حس‌های پیکری و پاسخ خودمختار",
        "description_en": "High-speed electro-chemical communication network orchestrating sensorimotor loops, reflexes, autonomic homeostasis, and cognition."
    },
    "Cardiovascular": {
        "name_en": "Cardiovascular (Circulatory) System",
        "name_fa": "دستگاه گردش خون",
        "total_blood_volume_l": 5.2,
        "total_vascular_length_km": 100000.0,
        "systemic_capillaries_count": 1.0e10,
        "blood_components": "Erythrocytes (45%), Plasma (55%), Leukocytes & Platelets (<1%)",
        "description_fa": "شبکه انتقال ۱۰۰ هزار کیلومتری رگ‌ها؛ خون‌رسانی پیوسته، تحویل اکسیژن و گلوکز به بافت‌ها و دفع دی‌اکسید کربن و اوره",
        "description_en": "Convective transport network spanning 100,000 km of vessels distributing oxygen, fuel substrates, hormones, and immune surveillance."
    },
    "Respiratory": {
        "name_en": "Respiratory System",
        "name_fa": "دستگاه تنفس",
        "components": ["Nasal cavity", "Pharynx", "Larynx", "Trachea", "Bronchial tree", "Alveoli", "Diaphragm & Intercostal muscles"],
        "normal_respiratory_rate_bpm": 14.0,
        "resting_o2_consumption_ml_min": 250.0,
        "resting_co2_production_ml_min": 200.0,
        "respiratory_quotient": 0.8,
        "description_fa": "سیستم تهویه ریوی و هموستاز اسید-باز؛ انقباض دیافراگم، ورود هوای اتاق ایزوله، اکسیژن‌گیری خون و بازدم دی‌اکسید کربن",
        "description_en": "Ventilatory exchange apparatus matching alveolar ventilation to cellular metabolic demand and systemic acid-base pH regulation."
    },
    "Digestive": {
        "name_en": "Digestive System",
        "name_fa": "دستگاه گوارش",
        "total_tract_length_m": 9.0,
        "functions": ["Ingestion", "Mechanical churning", "Chemical enzymatic digestion", "Absorption", "Defecation"],
        "description_fa": "سیستم هضم و جذب مواد؛ تجزیه پروتئین‌ها، کربوهیدرات‌ها و چربی‌ها به واحدهای ساختاری مونومری برای بازسازی بافت‌ها و سوخت",
        "description_en": "Continuous alimentary canal orchestrating enzymatic hydrolysis of macromolecules into absorbable metabolic building blocks."
    },
    "Endocrine": {
        "name_en": "Endocrine System",
        "name_fa": "دستگاه غدد درون‌ریز",
        "glands": ["Pituitary", "Thyroid", "Parathyroid", "Adrenals", "Pancreatic islets", "Gonads", "Pineal"],
        "key_hormones": ["Thyroxine (T4/T3 metabolic rate)", "Cortisol (stress)", "Epinephrine", "Aldosterone", "ADH (water balance)", "Insulin"],
        "description_fa": "سیستم پیام‌رسانی شیمیایی بلندمدت؛ ترشح هورمون‌ها به جریان خون برای تنظیم متابولیسم پایه، قند خون، تعادل آب و الکترولیت‌ها",
        "description_en": "Humoral signaling network secreting blood-borne hormones to modulate basal metabolic rate, stress adaptation, and fluid osmolarity."
    },
    "Immune_Lymphatic": {
        "name_en": "Immune and Lymphatic System",
        "name_fa": "دستگاه ایمنی و لنفاوی",
        "lymph_nodes_count": 600,
        "lymph_flow_l_day": 3.0,
        "cells": ["T-lymphocytes", "B-lymphocytes", "NK cells", "Macrophages", "Dendritic cells", "Neutrophils"],
        "description_fa": "سیستم نظارت ایمنی و بازگردانی مایع میان‌بافتی؛ شناسایی پاتوژن‌ها، حذف سلول‌های جهش‌یافته و حفظ پاکیزگی بیولوژیک",
        "description_en": "Surveillance and fluid return architecture maintaining interstitial fluid balance and mounting cellular/humoral pathogen defense."
    },
    "Urinary_Renal": {
        "name_en": "Urinary (Renal) System",
        "name_fa": "دستگاه دفع ادرار (کلیوی)",
        "components": ["Two Kidneys", "Two Ureters", "Urinary Bladder", "Urethra"],
        "plasma_clearance_l_day": 180.0,
        "description_fa": "دفع مواد زائد نیتروژن‌دار و تنظیم تعادل آب، یون‌ها (Na⁺, K⁺, Ca²⁺, H⁺, HCO₃⁻) و فشار اسمزی خون",
        "description_en": "Excretory filtration apparatus clearing nitrogenous urea, adjusting extracellular volume, and regulating electrolyte equilibria."
    },
    "Integumentary": {
        "name_en": "Integumentary System",
        "name_fa": "دستگاه پوششی",
        "structures": ["Epidermis", "Dermis", "Subcutaneous tissue", "Hair follicles", "Sebaceous glands", "Sudoriferous glands", "Nails"],
        "description_fa": "سپر محافظ فیزیکی، شیمیایی و حرارتی بدن در محیط بسته ایزوله؛ تنظیم دفع گرما از طریق تعریق و پرفیوژن عروق جلدی",
        "description_en": "External interface sustaining physical barrier containment, cutaneous thermoregulatory heat flux, and tactile interaction."
    }
}


# ==============================================================================
# 8. THE ISOLATED 3D CHAMBER (اتاق ایزوله سه‌بعدی بدون ورودی و خروجی)
# ==============================================================================
# Dimensions: 4.0 m (width, X) × 4.0 m (depth, Z) × 3.2 m (height, Y)
# Room center at (0.0, 0.0, 0.0); Floor at Y = -1.6 m; Ceiling at Y = +1.6 m
# Perfectly sealed: Flux_in = 0, Flux_out = 0 (Adiabatic, hermetic, impermeable)

class Isolated3DChamber:
    def __init__(self, width: float = 4.0, depth: float = 4.0, height: float = 3.2):
        self.width_m = width
        self.depth_m = depth
        self.height_m = height
        self.volume_m3 = width * depth * height  # 51.2 m³ = 51,200 Liters
        self.volume_liters = self.volume_m3 * 1000.0

        # Boundary conditions: Strictly ZERO flux
        self.flux_in_matter = 0.0
        self.flux_out_matter = 0.0
        self.flux_in_energy = 0.0
        self.flux_out_energy = 0.0

        # Atmospheric thermodynamic state
        self.temperature_c = 22.0  # Initial room temp: 22.0 °C
        self.temperature_k = self.temperature_c + 273.15
        self.pressure_kpa = 101.325  # Standard 1 atm
        self.relative_humidity_pct = 45.0

        # Gas molar inventory (Initial sea-level air)
        # PV = nRT -> n = (101325 * 51.2) / (8.314 * 295.15) ≈ 2114.5 moles of gas
        self.total_moles_gas = (self.pressure_kpa * 1000.0 * self.volume_m3) / (8.31446 * self.temperature_k)

        # Molar fractions
        self.o2_fraction = 0.2095   # 20.95% O2
        self.co2_fraction = 0.0004  # 0.04% (400 ppm) CO2
        self.n2_fraction = 0.7808   # 78.08% N2
        self.ar_fraction = 0.0093   # 0.93% Argon

        self.o2_liters = self.volume_liters * self.o2_fraction
        self.co2_liters = self.volume_liters * self.co2_fraction

        # Air thermal capacitance: C_air = m * c_p ≈ (51.2 * 1.2 kg/m³) * 1005 J/kg·K ≈ 61747 J/K
        self.heat_capacity_j_k = (self.volume_m3 * 1.204) * 1005.0

        # Cumulative exchanges inside the closed boundary
        self.cumulative_o2_consumed_liters = 0.0
        self.cumulative_co2_produced_liters = 0.0
        self.cumulative_heat_added_joules = 0.0
        self.elapsed_simulation_seconds = 0.0

    def step_interaction(self, dt_seconds: float, metabolic_watts: float, vo2_ml_min: float, vco2_ml_min: float, perspiration_g_hr: float):
        """Update the isolated closed room state based on human internal life-support."""
        self.elapsed_simulation_seconds += dt_seconds
        dt_minutes = dt_seconds / 60.0
        dt_hours = dt_seconds / 3600.0

        # Metabolic O2 consumption & CO2 production
        delta_o2_liters = (vo2_ml_min / 1000.0) * dt_minutes
        delta_co2_liters = (vco2_ml_min / 1000.0) * dt_minutes

        self.o2_liters = max(0.0, self.o2_liters - delta_o2_liters)
        self.co2_liters += delta_co2_liters

        self.o2_fraction = self.o2_liters / self.volume_liters
        self.co2_fraction = self.co2_liters / self.volume_liters

        self.cumulative_o2_consumed_liters += delta_o2_liters
        self.cumulative_co2_produced_liters += delta_co2_liters

        # Sensible heat dissipated from body to isolated room (Q = P * dt)
        heat_joules = metabolic_watts * dt_seconds
        self.cumulative_heat_added_joules += heat_joules
        delta_t_c = heat_joules / self.heat_capacity_j_k
        self.temperature_c += delta_t_c
        self.temperature_k = self.temperature_c + 273.15

        # Humidity shift from insensible perspiration
        water_added_g = perspiration_g_hr * dt_hours
        # Saturation vapor pressure at current room temp (Tetens formula)
        p_sat_kpa = 0.61078 * math.exp((17.27 * self.temperature_c) / (self.temperature_c + 237.3))
        max_water_g = (p_sat_kpa * 1000.0 * self.volume_m3) / (461.5 * self.temperature_k) * 1000.0
        self.relative_humidity_pct = min(100.0, self.relative_humidity_pct + (water_added_g / max_water_g) * 100.0)

    def get_status_dict(self) -> Dict[str, Any]:
        return {
            "room_dimensions_m": {"width_x": self.width_m, "depth_z": self.depth_m, "height_y": self.height_m},
            "volume_m3": round(self.volume_m3, 2),
            "boundary_conditions": {
                "isolation": "HERMETIC_ADIABATIC_SEALED",
                "flux_in": "ZERO (0.0 J/s, 0.0 mol/s)",
                "flux_out": "ZERO (0.0 J/s, 0.0 mol/s)",
                "external_openings": "NONE (NO DOORS, NO WINDOWS, NO DUCTS)"
            },
            "atmosphere": {
                "temperature_c": round(self.temperature_c, 2),
                "pressure_kpa": round(self.pressure_kpa, 2),
                "relative_humidity_pct": round(self.relative_humidity_pct, 1),
                "o2_percent": round(self.o2_fraction * 100.0, 3),
                "co2_ppm": round(self.co2_fraction * 1e6, 1),
                "co2_percent": round(self.co2_fraction * 100.0, 4),
                "n2_percent": round(self.n2_fraction * 100.0, 2),
                "o2_remaining_liters": round(self.o2_liters, 1),
                "co2_accumulated_liters": round(self.co2_liters, 1)
            },
            "thermodynamics": {
                "cumulative_heat_joules": round(self.cumulative_heat_added_joules, 1),
                "elapsed_time_seconds": round(self.elapsed_simulation_seconds, 1)
            }
        }


# ==============================================================================
# 9. SOMATOSENSORY & PROPRIOCEPTION SENSORY TELEMETRY ("حس کامل بدن برای AI")
# ==============================================================================

class SomatosensoryProprioception:
    """
    Simulates afferent neuro-sensory signals enabling an AI agent to feel:
    - Proprioception: Joint articulation angles, velocities, muscle lengths.
    - Kinesthesia & Force: Muscle spindle stretch, Golgi tendon tension.
    - Tactile & Mechanoreception: Touch pressure, texture, shear on skin dermatomes.
    - Nociception: Pain signal intensity per anatomical region.
    - Thermoception: Skin surface and core body temperatures.
    - Vestibular: Linear acceleration (gravity 1g), angular rotational velocity.
    - Interoception & Vitals: Heart rate, blood pressure, SpO2, blood glucose, pH, ATP reserves.
    """
    def __init__(self):
        # 3D Joint kinematic angles (degrees)
        self.joints: Dict[str, Dict[str, Any]] = {
            # Neck & Head
            "neck_flexion": {"angle_deg": 0.0, "min": -30.0, "max": 60.0, "unit": "deg", "group": "axial"},
            "neck_rotation": {"angle_deg": 0.0, "min": -75.0, "max": 75.0, "unit": "deg", "group": "axial"},
            "neck_lateral_tilt": {"angle_deg": 0.0, "min": -40.0, "max": 40.0, "unit": "deg", "group": "axial"},

            # Eyes & Gaze
            "eye_gaze_azimuth": {"angle_deg": 0.0, "min": -35.0, "max": 35.0, "unit": "deg", "group": "sensory_head"},
            "eye_gaze_elevation": {"angle_deg": 0.0, "min": -25.0, "max": 25.0, "unit": "deg", "group": "sensory_head"},
            "eyelid_open_left": {"angle_deg": 100.0, "min": 0.0, "max": 100.0, "unit": "percent", "group": "facial"},
            "eyelid_open_right": {"angle_deg": 100.0, "min": 0.0, "max": 100.0, "unit": "percent", "group": "facial"},
            "jaw_depression": {"angle_deg": 0.0, "min": 0.0, "max": 35.0, "unit": "deg", "group": "facial"},

            # Spine & Torso
            "spine_flexion": {"angle_deg": 0.0, "min": -25.0, "max": 80.0, "unit": "deg", "group": "axial"},
            "spine_rotation": {"angle_deg": 0.0, "min": -45.0, "max": 45.0, "unit": "deg", "group": "axial"},
            "spine_lateral_flexion": {"angle_deg": 0.0, "min": -35.0, "max": 35.0, "unit": "deg", "group": "axial"},

            # Left Upper Limb
            "left_shoulder_flexion": {"angle_deg": 10.0, "min": -50.0, "max": 170.0, "unit": "deg", "group": "upper_limb"},
            "left_shoulder_abduction": {"angle_deg": 15.0, "min": 0.0, "max": 170.0, "unit": "deg", "group": "upper_limb"},
            "left_shoulder_rotation": {"angle_deg": 0.0, "min": -70.0, "max": 90.0, "unit": "deg", "group": "upper_limb"},
            "left_elbow_flexion": {"angle_deg": 15.0, "min": 0.0, "max": 145.0, "unit": "deg", "group": "upper_limb"},
            "left_forearm_pronation": {"angle_deg": 0.0, "min": -85.0, "max": 85.0, "unit": "deg", "group": "upper_limb"},
            "left_wrist_flexion": {"angle_deg": 0.0, "min": -70.0, "max": 80.0, "unit": "deg", "group": "upper_limb"},
            "left_hand_grip": {"angle_deg": 10.0, "min": 0.0, "max": 100.0, "unit": "percent", "group": "distal_hand"},

            # Right Upper Limb
            "right_shoulder_flexion": {"angle_deg": 10.0, "min": -50.0, "max": 170.0, "unit": "deg", "group": "upper_limb"},
            "right_shoulder_abduction": {"angle_deg": 15.0, "min": 0.0, "max": 170.0, "unit": "deg", "group": "upper_limb"},
            "right_shoulder_rotation": {"angle_deg": 0.0, "min": -70.0, "max": 90.0, "unit": "deg", "group": "upper_limb"},
            "right_elbow_flexion": {"angle_deg": 15.0, "min": 0.0, "max": 145.0, "unit": "deg", "group": "upper_limb"},
            "right_forearm_pronation": {"angle_deg": 0.0, "min": -85.0, "max": 85.0, "unit": "deg", "group": "upper_limb"},
            "right_wrist_flexion": {"angle_deg": 0.0, "min": -70.0, "max": 80.0, "unit": "deg", "group": "upper_limb"},
            "right_hand_grip": {"angle_deg": 10.0, "min": 0.0, "max": 100.0, "unit": "percent", "group": "distal_hand"},

            # Left Lower Limb
            "left_hip_flexion": {"angle_deg": 0.0, "min": -15.0, "max": 120.0, "unit": "deg", "group": "lower_limb"},
            "left_hip_abduction": {"angle_deg": 5.0, "min": -20.0, "max": 45.0, "unit": "deg", "group": "lower_limb"},
            "left_knee_flexion": {"angle_deg": 0.0, "min": 0.0, "max": 140.0, "unit": "deg", "group": "lower_limb"},
            "left_ankle_dorsiflexion": {"angle_deg": 0.0, "min": -45.0, "max": 20.0, "unit": "deg", "group": "lower_limb"},

            # Right Lower Limb
            "right_hip_flexion": {"angle_deg": 0.0, "min": -15.0, "max": 120.0, "unit": "deg", "group": "lower_limb"},
            "right_hip_abduction": {"angle_deg": 5.0, "min": -20.0, "max": 45.0, "unit": "deg", "group": "lower_limb"},
            "right_knee_flexion": {"angle_deg": 0.0, "min": 0.0, "max": 140.0, "unit": "deg", "group": "lower_limb"},
            "right_ankle_dorsiflexion": {"angle_deg": 0.0, "min": -45.0, "max": 20.0, "unit": "deg", "group": "lower_limb"}
        }

        # Facial Expression Action Units (FACS)
        self.facial_action_units: Dict[str, float] = {
            "AU01_inner_brow_raiser": 0.0,  # Frontalis pars medialis
            "AU02_outer_brow_raiser": 0.0,  # Frontalis pars lateralis
            "AU04_brow_lowerer": 0.0,       # Corrugator supercilii
            "AU06_cheek_raiser": 0.0,       # Orbicularis oculi pars orbitalis
            "AU12_lip_corner_puller": 0.0,  # Zygomaticus major (Smile)
            "AU15_lip_corner_depressor": 0.0, # Depressor anguli oris (Frown)
            "AU25_lips_part": 0.0,          # Depressor labii / mentalis
            "AU26_jaw_drop": 0.0            # Masseter relaxation
        }

        # Skeletal Muscle Tension and Spindle Stretch (Normalized 0.0 - 1.0)
        self.muscle_tensions: Dict[str, float] = {
            "biceps_brachii_left": 0.08,
            "biceps_brachii_right": 0.08,
            "triceps_brachii_left": 0.06,
            "triceps_brachii_right": 0.06,
            "quadriceps_femoris_left": 0.25,  # Anti-gravity postural tone
            "quadriceps_femoris_right": 0.25,
            "gastrocnemius_left": 0.20,
            "gastrocnemius_right": 0.20,
            "erector_spinae": 0.30,           # Axial spine stabilization
            "diaphragm": 0.40,                # Rhythmic respiratory drive
            "pectoralis_major": 0.05,
            "trapezius": 0.12,
            "zygomaticus_major": 0.02
        }

        # Tactile & Cutaneous Mechanoreception (Pressure in kPa across dermatomes)
        self.tactile_dermatomes: Dict[str, Dict[str, Any]] = {
            "cranial_scalp": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 33.5},
            "facial_t_zone": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 33.8},
            "palmar_surface_left": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 31.5},
            "palmar_surface_right": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 31.5},
            "plantar_sole_left": {"pressure_kpa": 48.5, "contact": True, "temperature_c": 29.5},   # Standing on floor
            "plantar_sole_right": {"pressure_kpa": 48.5, "contact": True, "temperature_c": 29.5},  # Standing on floor
            "chest_anterior": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 34.2},
            "back_dorsal": {"pressure_kpa": 0.0, "contact": False, "temperature_c": 34.0}
        }

        # Nociception (Pain Intensity 0.0 - 1.0)
        self.nociceptive_signals: Dict[str, float] = {
            "cranial_head": 0.0,
            "chest_cardiac": 0.0,
            "visceral_abdomen": 0.0,
            "musculoskeletal_spine": 0.0,
            "left_arm": 0.0,
            "right_arm": 0.0,
            "left_leg": 0.0,
            "right_leg": 0.0
        }

        # Vestibular System (Inner Ear Semicircular Canals & Otoliths)
        self.vestibular = {
            "gravity_vector_g": [0.0, -1.0, 0.0],  # Standard 1g pointing downward
            "linear_acceleration_m_s2": [0.0, 0.0, 0.0],
            "angular_velocity_deg_s": {"pitch": 0.0, "yaw": 0.0, "roll": 0.0},
            "equilibrium_state": "STABLE_UPRIGHT_BIPEDAL"
        }

        # Interoception & Autonomic Physiology
        self.vitals = {
            "heart_rate_bpm": 72.0,
            "cardiac_output_l_min": 5.04,
            "stroke_volume_ml": 70.0,
            "blood_pressure_systolic_mmhg": 118.0,
            "blood_pressure_diastolic_mmhg": 78.0,
            "mean_arterial_pressure_mmhg": 91.3,
            "respiratory_rate_bpm": 14.0,
            "tidal_volume_ml": 500.0,
            "oxygen_saturation_spo2_pct": 98.5,
            "arterial_pao2_mmhg": 95.0,
            "arterial_paco2_mmhg": 40.0,
            "arterial_blood_ph": 7.41,
            "blood_glucose_mg_dl": 92.0,
            "cellular_atp_pool_pct": 99.2,
            "core_body_temperature_c": 37.05,
            "skin_mean_temperature_c": 33.2,
            "basal_metabolic_rate_watts": 78.5,
            "autonomic_sympathetic_tone": 0.25,   # (0.0 to 1.0)
            "autonomic_parasympathetic_tone": 0.75 # High vagal tone at rest
        }

    def get_full_feeling_telemetry(self) -> Dict[str, Any]:
        """Returns the full neuro-sensory stream of internal bodily perception."""
        return {
            "proprioception": {
                "description_fa": "حس عمقی مفاصل و موقعیت سه‌بعدی اندام‌ها در اتاق ایزوله",
                "joints": self.joints,
                "facial_action_units": self.facial_action_units,
                "muscle_tensions": self.muscle_tensions
            },
            "tactile_and_cutaneous": {
                "description_fa": "حس لامسه، فشار تماسی درماتوم‌های پوست و اصطکاک با کف اتاق",
                "dermatomes": self.tactile_dermatomes
            },
            "vestibular_equilibrium": {
                "description_fa": "حس تعادل، جاذبه ۱جی به سمت کف اتاق، شتاب خطی و سرعت زاویه‌ای گوش داخلی",
                "telemetry": self.vestibular
            },
            "nociception_pain": {
                "description_fa": "سیگنال‌های درد بافتی (تمام نواحی نرمال و فاقد درد)",
                "signals": self.nociceptive_signals,
                "overall_pain_level": max(self.nociceptive_signals.values())
            },
            "thermoception": {
                "description_fa": "دمای مرکزی هسته بدن و دمای سطحی پوست",
                "core_temp_c": self.vitals["core_body_temperature_c"],
                "skin_temp_c": self.vitals["skin_mean_temperature_c"]
            },
            "interoception_autonomic": {
                "description_fa": "علائم حیاتی درونی، همودینامیک گردش خون، تنفس و بیوانرژتیک ATP",
                "vitals": self.vitals
            }
        }


# ==============================================================================
# 10. COMPLETE HUMAN BODY INTEGRATED MODEL (کل سیستم بدن در اتاق ایزوله)
# ==============================================================================

class SomatosHumanBody:
    """
    Complete scientific simulation of a 1.78m, 70kg human organism
    positioned in the center of an isolated 3D chamber.
    """
    def __init__(self):
        self.height_m = 1.78
        self.mass_kg = 70.0
        self.center_of_mass_room = [0.0, 0.0, 0.0]  # Standing centered in 4x4x3.2 chamber
        self.chamber = Isolated3DChamber()
        self.sensory = SomatosensoryProprioception()

        # Multi-scale hierarchy references
        self.atomic = ATOMIC_ELEMENTS
        self.molecular = MOLECULAR_STRUCTURES
        self.organelles = ORGANELLES
        self.cells = CELL_TYPES
        self.tissues = TISSUES
        self.organs = ORGANS
        self.systems = ORGAN_SYSTEMS

    def actuate_joint(self, joint_name: str, target_angle_deg: float) -> Tuple[bool, str]:
        """Move any skeletal joint within biological anatomical constraints."""
        if joint_name not in self.sensory.joints:
            available = list(self.sensory.joints.keys())
            return False, f"Unknown joint '{joint_name}'. Available: {available}"

        j = self.sensory.joints[joint_name]
        min_deg = j["min"]
        max_deg = j["max"]

        clamped = max(min_deg, min(max_deg, float(target_angle_deg)))
        j["angle_deg"] = clamped

        # Update dependent muscle tension
        if "elbow" in joint_name:
            t = (clamped - min_deg) / (max_deg - min_deg)
            side = "left" if "left" in joint_name else "right"
            self.sensory.muscle_tensions[f"biceps_brachii_{side}"] = 0.05 + 0.45 * t
            self.sensory.muscle_tensions[f"triceps_brachii_{side}"] = 0.05 + 0.20 * (1.0 - t)
        elif "knee" in joint_name:
            t = (clamped - min_deg) / (max_deg - min_deg)
            side = "left" if "left" in joint_name else "right"
            self.sensory.muscle_tensions[f"quadriceps_femoris_{side}"] = 0.25 + 0.50 * t

        return True, f"Joint '{joint_name}' moved to {clamped:.1f}{j['unit']} (Range: {min_deg} to {max_deg})"

    def actuate_facial_expression(self, expression_type: str, intensity: float = 1.0) -> Tuple[bool, str]:
        """Actuate realistic facial expressions using Facial Action Coding System (FACS)."""
        intensity = max(0.0, min(1.0, float(intensity)))
        exp = expression_type.lower()

        if exp in ["smile", "لبخند", "happy"]:
            self.sensory.facial_action_units["AU12_lip_corner_puller"] = 0.85 * intensity
            self.sensory.facial_action_units["AU06_cheek_raiser"] = 0.60 * intensity
            self.sensory.facial_action_units["AU25_lips_part"] = 0.30 * intensity
            self.sensory.facial_action_units["AU15_lip_corner_depressor"] = 0.0
            return True, f"Facial expression set to SMILE (intensity {intensity:.2f})"

        elif exp in ["frown", "اخم", "sad"]:
            self.sensory.facial_action_units["AU15_lip_corner_depressor"] = 0.80 * intensity
            self.sensory.facial_action_units["AU04_brow_lowerer"] = 0.70 * intensity
            self.sensory.facial_action_units["AU12_lip_corner_puller"] = 0.0
            return True, f"Facial expression set to FROWN (intensity {intensity:.2f})"

        elif exp in ["surprise", "تعجب"]:
            self.sensory.facial_action_units["AU01_inner_brow_raiser"] = 0.90 * intensity
            self.sensory.facial_action_units["AU02_outer_brow_raiser"] = 0.85 * intensity
            self.sensory.facial_action_units["AU26_jaw_drop"] = 0.75 * intensity
            return True, f"Facial expression set to SURPRISE (intensity {intensity:.2f})"

        elif exp in ["neutral", "خنثی", "reset"]:
            for k in self.sensory.facial_action_units:
                self.sensory.facial_action_units[k] = 0.0
            return True, "Facial expression reset to NEUTRAL"

        elif exp in ["blink", "پلک"]:
            self.sensory.joints["eyelid_open_left"]["angle_deg"] = 0.0
            self.sensory.joints["eyelid_open_right"]["angle_deg"] = 0.0
            return True, "Blink executed (eyelids closed)"

        else:
            return False, f"Unknown expression '{expression_type}'. Choose from: smile, frown, surprise, neutral, blink"

    def actuate_eye_gaze(self, azimuth_deg: float, elevation_deg: float) -> Tuple[bool, str]:
        """Direct eye orientation in 3D space."""
        az = max(-35.0, min(35.0, float(azimuth_deg)))
        el = max(-25.0, min(25.0, float(elevation_deg)))
        self.sensory.joints["eye_gaze_azimuth"]["angle_deg"] = az
        self.sensory.joints["eye_gaze_elevation"]["angle_deg"] = el
        return True, f"Eye gaze directed to Azimuth {az:.1f}°, Elevation {el:.1f}°"

    def actuate_respiration(self, target_bpm: float) -> Tuple[bool, str]:
        """Voluntarily adjust breathing pace."""
        rate = max(4.0, min(40.0, float(target_bpm)))
        self.sensory.vitals["respiratory_rate_bpm"] = rate
        # Hyperventilation vs hypoventilation effects
        if rate > 22.0:
            self.sensory.vitals["arterial_paco2_mmhg"] = max(25.0, 40.0 - (rate - 22.0) * 0.8)
            self.sensory.vitals["arterial_blood_ph"] = min(7.55, 7.41 + (rate - 22.0) * 0.007)
        elif rate < 10.0:
            self.sensory.vitals["arterial_paco2_mmhg"] = min(55.0, 40.0 + (10.0 - rate) * 1.5)
            self.sensory.vitals["arterial_blood_ph"] = max(7.30, 7.41 - (10.0 - rate) * 0.01)
        else:
            self.sensory.vitals["arterial_paco2_mmhg"] = 40.0
            self.sensory.vitals["arterial_blood_ph"] = 7.41
        return True, f"Respiration rate set to {rate:.1f} breaths/min"

    def step(self, dt_seconds: float = 1.0) -> Dict[str, Any]:
        """Advance physiological time and update coupled isolated chamber physics."""
        # Calculate dynamic bio-energetics
        bmr = self.sensory.vitals["basal_metabolic_rate_watts"]
        # Muscular activity adds to heat output
        muscle_work_watts = sum(self.sensory.muscle_tensions.values()) * 15.0
        total_watts = bmr + muscle_work_watts

        # O2 consumption: ~250 mL/min baseline, scaled with work
        vo2_ml_min = 250.0 * (total_watts / 78.5)
        # RQ = 0.82
        vco2_ml_min = vo2_ml_min * 0.82
        perspiration_g_hr = 40.0 + (total_watts - 78.5) * 0.5

        # Update isolated chamber state
        self.chamber.step_interaction(dt_seconds, total_watts, vo2_ml_min, vco2_ml_min, perspiration_g_hr)

        # Dynamic cardiac adjustments based on chamber O2 & CO2
        co2_ppm = self.chamber.co2_fraction * 1e6
        if co2_ppm > 2000.0:  # Mild hypercapnic autonomic response
            excess_co2 = (co2_ppm - 2000.0) / 1000.0
            self.sensory.vitals["heart_rate_bpm"] = min(120.0, 72.0 + excess_co2 * 3.0)
            self.sensory.vitals["respiratory_rate_bpm"] = min(28.0, 14.0 + excess_co2 * 1.2)

        if self.chamber.o2_fraction < 0.18:  # Hypoxic chemoreceptor trigger
            hypoxia_factor = (0.18 - self.chamber.o2_fraction) * 100.0
            self.sensory.vitals["oxygen_saturation_spo2_pct"] = max(80.0, 98.5 - hypoxia_factor * 1.5)
            self.sensory.vitals["heart_rate_bpm"] = min(140.0, self.sensory.vitals["heart_rate_bpm"] + hypoxia_factor * 4.0)

        return {
            "step_dt_seconds": dt_seconds,
            "chamber_atmosphere": self.chamber.get_status_dict()["atmosphere"],
            "vitals": self.sensory.vitals
        }

    def query_scale(self, scale: str, target: Optional[str] = None) -> Dict[str, Any]:
        """Access any anatomical or physical scale from micro to macro."""
        s = scale.lower().strip()

        if s in ["atom", "atomic", "اتم"]:
            if target:
                key = target.strip().upper()
                # Also support full names
                for k, v in self.atomic.items():
                    if key in [k.upper(), v["name_en"].upper(), v["name_fa"]]:
                        return {"scale": "atomic", "query": target, "data": v}
                return {"error": f"Element '{target}' not found. Available: {list(self.atomic.keys())}"}
            return {"scale": "atomic", "total_elements_cataloged": len(self.atomic), "elements": self.atomic}

        elif s in ["molecule", "molecular", "مولکول"]:
            if target:
                key = target.strip()
                for k, v in self.molecular.items():
                    if key.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "molecular", "query": target, "data": v}
                return {"error": f"Molecule '{target}' not found. Available: {list(self.molecular.keys())}"}
            return {"scale": "molecular", "molecules": self.molecular}

        elif s in ["organelle", "اندامک"]:
            if target:
                for k, v in self.organelles.items():
                    if target.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "organelle", "query": target, "data": v}
                return {"error": f"Organelle '{target}' not found. Available: {list(self.organelles.keys())}"}
            return {"scale": "organelle", "organelles": self.organelles}

        elif s in ["cell", "cellular", "سلول"]:
            if target:
                for k, v in self.cells.items():
                    if target.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "cellular", "query": target, "data": v}
                return {"error": f"Cell type '{target}' not found. Available: {list(self.cells.keys())}"}
            return {"scale": "cellular", "cells": self.cells}

        elif s in ["tissue", "بافت"]:
            if target:
                for k, v in self.tissues.items():
                    if target.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "tissue", "query": target, "data": v}
                return {"error": f"Tissue '{target}' not found. Available: {list(self.tissues.keys())}"}
            return {"scale": "tissue", "tissues": self.tissues}

        elif s in ["organ", "اندام"]:
            if target:
                for k, v in self.organs.items():
                    if target.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "organ", "query": target, "data": v}
                return {"error": f"Organ '{target}' not found. Available: {list(self.organs.keys())}"}
            return {"scale": "organ", "organs": self.organs}

        elif s in ["system", "دستگاه"]:
            if target:
                for k, v in self.systems.items():
                    if target.lower() in [k.lower(), v["name_en"].lower(), v["name_fa"].lower()]:
                        return {"scale": "system", "query": target, "data": v}
                return {"error": f"System '{target}' not found. Available: {list(self.systems.keys())}"}
            return {"scale": "system", "systems": self.systems}

        elif s in ["chamber", "room", "اتاق"]:
            return {"scale": "isolated_chamber", "data": self.chamber.get_status_dict()}

        elif s in ["macro", "organism", "body", "بدن"]:
            return {
                "scale": "macro_organism",
                "height_m": self.height_m,
                "mass_kg": self.mass_kg,
                "center_pos_chamber": self.center_of_mass_room,
                "posture": "BIPEDAL_ANATOMICAL_STANDING",
                "isolation_chamber": self.chamber.get_status_dict()
            }

        else:
            return {
                "error": f"Unknown scale '{scale}'. Choose: atom, molecule, organelle, cell, tissue, organ, system, chamber, macro"
            }
