// Scientific anatomy knowledge base (FA/EN). Real anatomical data, no fiction.
// Layers: atom < molecule < cell < tissue < organ < system < body

export type LayerId = 'atom' | 'molecule' | 'cell' | 'tissue' | 'organ' | 'system' | 'body';

export interface LayerInfo {
  id: LayerId;
  index: number;
  fa: string;
  en: string;
  scale: string;
  scaleFa: string;
  descFa: string;
  descEn: string;
  examples: string[];
  examplesFa: string[];
}

export const LAYERS: LayerInfo[] = [
  {
    id: 'atom', index: 0, fa: 'اتم', en: 'Atom', scale: '~10⁻¹⁰ m', scaleFa: 'حدود یک آنگستروم',
    descFa: 'کوچک‌ترین واحد سازنده بدن. بدن انسان حدود ۷×۱۰²۷ اتم دارد؛ ۹۹٪ جرم بدن فقط از اکسیژن، کربن، هیدروژن و نیتروژن ساخته شده است.',
    descEn: 'The smallest building block. The human body holds ~7×10²⁷ atoms; 99% of body mass is oxygen, carbon, hydrogen and nitrogen.',
    examples: ['Oxygen (65% of mass)', 'Carbon (18%)', 'Hydrogen (10%)', 'Nitrogen (3%)', 'Calcium (1.4%)', 'Phosphorus (1.1%)'],
    examplesFa: ['اکسیژن (۶۵٪ جرم)', 'کربن (۱۸٪)', 'هیدروژن (۱۰٪)', 'نیتروژن (۳٪)', 'کلسیم (۱٫۴٪)', 'فسفر (۱٫۱٪)'],
  },
  {
    id: 'molecule', index: 1, fa: 'مولکول', en: 'Molecule', scale: '10⁻⁹ – 10⁻⁸ m', scaleFa: 'نانومتر',
    descFa: 'اتم‌ها مولکول‌های حیات را می‌سازند: آب (۶۰٪ وزن بدن)، پروتئین‌ها، لیپیدها، کربوهیدرات‌ها و DNA با ۳ میلیارد جفت‌باز در هر سلول.',
    descEn: 'Atoms form the molecules of life: water (60% of body weight), proteins, lipids, carbohydrates and DNA — 3 billion base pairs per cell.',
    examples: ['H₂O — water', 'Hemoglobin', 'Collagen', 'ATP', 'Glucose', 'DNA double helix'],
    examplesFa: ['آب H₂O', 'هموگلوبین', 'کلاژن', 'آدنوزین تری‌فسفات', 'گلوکز', 'مارپیچ دوگانه DNA'],
  },
  {
    id: 'cell', index: 2, fa: 'سلول', en: 'Cell', scale: '10⁻⁶ – 10⁻⁴ m', scaleFa: 'میکرومتر',
    descFa: 'واحد بنیادی حیات. بدن حدود ۳۰ تریلیون سلول انسانی در بیش از ۲۰۰ نوع دارد؛ از گلبول قرمز ۷ میکرومتری تا نورون حرکتی به طول یک متر.',
    descEn: '~30 trillion human cells in 200+ types: 7µm red blood cells up to 1 m long motor neurons.',
    examples: ['Neuron', 'Erythrocyte (RBC)', 'Myocyte', 'Osteocyte', 'Hepatocyte', 'Ovum / Sperm'],
    examplesFa: ['نورون', 'گلبول قرمز', 'سلول عضلانی', 'سلول استخوانی', 'سلول کبدی', 'تخمک / اسپرم'],
  },
  {
    id: 'tissue', index: 3, fa: 'بافت', en: 'Tissue', scale: '10⁻⁴ – 10⁻² m', scaleFa: 'دهم میلی‌متر تا سانتی‌متر',
    descFa: 'چهار بافت بنیادی: پوششی، پیوندی، عضلانی و عصبی. بافت عضلانی اسکلتی حدود ۴۰٪ وزن بدن را تشکیل می‌دهد.',
    descEn: 'Four fundamental tissues: epithelial, connective, muscular and nervous. Skeletal muscle is ~40% of body weight.',
    examples: ['Epithelium', 'Bone (osseous)', 'Cartilage', 'Blood', 'Skeletal muscle', 'Nervous tissue'],
    examplesFa: ['بافت پوششی', 'استخوان', 'غضروف', 'خون', 'عضله اسکلتی', 'بافت عصبی'],
  },
  {
    id: 'organ', index: 4, fa: 'اندام', en: 'Organ', scale: '10⁻² – 10⁻¹ m', scaleFa: 'سانتی‌متر',
    descFa: 'ساختارهای تخصص‌یافته از چند بافت. بزرگ‌ترین اندام پوست (~۲ مترمربع و ۵ کیلوگرم) و پرکارترین اندام قلب با ۱۰۰٬۰۰۰ ضربان در روز است.',
    descEn: 'Specialized multi-tissue structures. Largest: skin (~2 m², 5 kg). Hardest working: the heart, ~100,000 beats/day.',
    examples: ['Skin', 'Brain (1.4 kg)', 'Heart (300 g)', 'Lungs', 'Liver (1.5 kg)', 'Kidneys'],
    examplesFa: ['پوست', 'مغز (۱٫۴ کیلو)', 'قلب (۳۰۰ گرم)', 'ریه‌ها', 'کبد (۱٫۵ کیلو)', 'کلیه‌ها'],
  },
  {
    id: 'system', index: 5, fa: 'دستگاه بدنی', en: 'Organ system', scale: '10⁻¹ – 10⁰ m', scaleFa: 'دهم متر تا متر',
    descFa: '۱۱ دستگاه هماهنگ: عصبی با ۸۶ میلیارد نورون، گردش خون با ۱۰۰٬۰۰۰ کیلومتر رگ، اسکلتی با ۲۰۶ استخوان و عضلانی با بیش از ۶۰۰ عضله.',
    descEn: '11 coordinated systems: nervous (86B neurons), circulatory (100,000 km of vessels), skeletal (206 bones), muscular (600+ muscles).',
    examples: ['Nervous', 'Circulatory', 'Skeletal', 'Muscular', 'Respiratory', 'Digestive', 'Endocrine', 'Immune', 'Urinary', 'Reproductive', 'Integumentary'],
    examplesFa: ['عصبی', 'گردش خون', 'اسکلتی', 'عضلانی', 'تنفسی', 'گوارشی', 'درون‌ریز', 'ایمنی', 'ادراری', 'تولیدمثل', 'پوششی'],
  },
  {
    id: 'body', index: 6, fa: 'بدن کامل', en: 'Whole body', scale: '~1.7 m', scaleFa: 'حدود ۱٫۷ متر',
    descFa: 'ارگانیسم یکپارچه: قد میانگین ۱٫۷ متر، ۷۰ کیلوگرم، دمای ۳۷ درجه، ۵ لیتر خون و تعادل حیاتی (هموستاز) در اتاق ایزوله.',
    descEn: 'The integrated organism: ~1.7 m, 70 kg, 37 °C, 5 L of blood — homeostasis inside the isolation chamber.',
    examples: ['Height 170 cm', 'Mass 70 kg', '37.0 °C', '5 L blood', 'pH 7.4', 'Homeostasis'],
    examplesFa: ['قد ۱۷۰ سانتی‌متر', 'وزن ۷۰ کیلوگرم', 'دمای ۳۷ درجه', '۵ لیتر خون', 'pH خون ۷٫۴', 'هموستاز'],
  },
];

export interface BodySystem {
  id: string;
  fa: string;
  en: string;
  latin: string;
  color: number;
  descFa: string;
  descEn: string;
  stats: { fa: string; en: string }[];
}

export const SYSTEMS: BodySystem[] = [
  { id: 'skeletal', fa: 'اسکلتی', en: 'Skeletal', latin: 'Systema skeletale', color: 0xe8e4d8, descFa: '۲۰۶ استخوان، داربست بدن و محافظ اندام‌ها. اسکلت حدود ۱۵٪ وزن بدن است و مغز استخوان روزانه ۲۰۰ میلیارد گلبول قرمز می‌سازد.', descEn: '206 bones: frame, protection, mineral store. Marrow makes 200B red cells daily.', stats: [{ fa: '۲۰۶ استخوان', en: '206 bones' }, { fa: 'بلندترین: ران ۴۸cm', en: 'Longest: femur 48 cm' }, { fa: 'کوچک‌ترین: رکابی ۳mm', en: 'Smallest: stapes 3 mm' }] },
  { id: 'muscular', fa: 'عضلانی', en: 'Muscular', latin: 'Systema musculare', color: 0xb8352f, descFa: 'بیش از ۶۰۰ عضله اسکلتی؛ ۴۰٪ وزن بدن. قوی‌ترین عضله جونده (ماستر) و بزرگ‌ترین سرینی بزرگ است.', descEn: '600+ skeletal muscles; 40% of body mass. Strongest: masseter. Largest: gluteus maximus.', stats: [{ fa: '۶۰۰+ عضله', en: '600+ muscles' }, { fa: '۴۰٪ وزن بدن', en: '40% of mass' }, { fa: 'بزرگ‌ترین: سرینی', en: 'Largest: gluteus' }] },
  { id: 'nervous', fa: 'عصبی', en: 'Nervous', latin: 'Systema nervosum', color: 0xf2c230, descFa: 'مغز ۸۶ میلیارد نورون و نخاع ۳۱ جفت عصب نخاعی دارد. سرعت پیام عصبی تا ۱۲۰ متر بر ثانیه می‌رسد.', descEn: 'Brain: 86B neurons. Spinal cord: 31 nerve pairs. Signal speed up to 120 m/s.', stats: [{ fa: '۸۶ میلیارد نورون', en: '86B neurons' }, { fa: '۱۲ جفت عصب مغزی', en: '12 cranial nerves' }, { fa: 'سرعت: ۱۲۰ m/s', en: 'Speed: 120 m/s' }] },
  { id: 'circulatory', fa: 'گردش خون', en: 'Circulatory', latin: 'Systema cardiovasculare', color: 0xd92038, descFa: 'قلب روزانه ۷۵۰۰ لیتر خون پمپ می‌کند. شبکه رگ‌ها ۱۰۰٬۰۰۰ کیلومتر است؛ خون کل بدن را در ~۶۰ ثانیه دور می‌زند.', descEn: 'Heart pumps 7,500 L/day through 100,000 km of vessels; full circuit in ~60 s.', stats: [{ fa: '۱۰۰٬۰۰۰ km رگ', en: '100,000 km vessels' }, { fa: '۵ لیتر خون', en: '5 L blood' }, { fa: '۷۲ bpm استراحت', en: '72 bpm resting' }] },
  { id: 'respiratory', fa: 'تنفسی', en: 'Respiratory', latin: 'Systema respiratorium', color: 0x7fb6c9, descFa: 'دو ریه با ۳۰۰ میلیون آلوئول و سطح تبادل ۷۰ مترمربع. هر روز ~۲۰٬۰۰۰ دم و بازدم انجام می‌شود.', descEn: 'Two lungs, 300M alveoli, 70 m² exchange surface. ~20,000 breaths/day.', stats: [{ fa: '۳۰۰M آلوئول', en: '300M alveoli' }, { fa: 'ظرفیت ۶ لیتر', en: '6 L capacity' }, { fa: '۱۶ تنفس/دقیقه', en: '16 breaths/min' }] },
  { id: 'digestive', fa: 'گوارشی', en: 'Digestive', latin: 'Systema digestorium', color: 0xd98a4b, descFa: 'لوله گوارش ~۹ متر از دهان تا مقعد. کبد بزرگ‌ترین اندام داخلی (۱٫۵ کیلو) با ۵۰۰ عملکرد متفاوت است.', descEn: '~9 m GI tract, mouth to anus. Liver: largest internal organ (1.5 kg), 500+ functions.', stats: [{ fa: '۹ متر لوله گوارش', en: '9 m GI tract' }, { fa: 'کبد ۱٫۵ kg', en: 'Liver 1.5 kg' }, { fa: '۲ لیتر بزاق/روز', en: '2 L saliva/day' }] },
  { id: 'endocrine', fa: 'درون‌ریز', en: 'Endocrine', latin: 'Systema endocrinum', color: 0x9b59b6, descFa: 'غدد بدون مجرا که هورمون به خون می‌ریزند. هیپوفیز (۰٫۵ گرم) فرمانده غدد و تیروئید تنظیم‌کننده متابولیسم است.', descEn: 'Ductless hormone glands. Pituitary (0.5 g) is the master gland; thyroid sets metabolism.', stats: [{ fa: '۸ غده اصلی', en: '8 major glands' }, { fa: '۵۰+ هورمون', en: '50+ hormones' }, { fa: 'هیپوفیز ۰٫۵ g', en: 'Pituitary 0.5 g' }] },
  { id: 'urinary', fa: 'ادراری', en: 'Urinary', latin: 'Systema urinarium', color: 0xc9a227, descFa: 'دو کلیه روزانه ۱۸۰ لیتر خون را پالایش و ۱٫۵ لیتر ادرار تولید می‌کنند؛ هر کلیه یک میلیون نفرون دارد.', descEn: 'Kidneys filter 180 L of blood daily into 1.5 L urine; 1M nephrons per kidney.', stats: [{ fa: '۱۸۰ لیتر پالایش/روز', en: '180 L filtered/day' }, { fa: '۱ میلیون نفرون', en: '1M nephrons' }, { fa: 'مثانه ۵۰۰ ml', en: 'Bladder 500 ml' }] },
  { id: 'immune', fa: 'ایمنی و لنفاوی', en: 'Immune & Lymphatic', latin: 'Systema lymphaticum', color: 0x4caf7d, descFa: 'طحال، تیموس و ۶۰۰ گره لنفاوی بدن را نگهبانی می‌کنند. روزانه میلیاردها لنفوسیت علیه عوامل بیماری‌زا بسیج می‌شوند.', descEn: 'Spleen, thymus and 600 lymph nodes guard the body; billions of lymphocytes mobilized daily.', stats: [{ fa: '۶۰۰ گره لنفاوی', en: '600 lymph nodes' }, { fa: 'طحال ۱۵۰ g', en: 'Spleen 150 g' }, { fa: '۲×۱۰¹² لنفوسیت', en: '2×10¹² lymphocytes' }] },
  { id: 'integumentary', fa: 'پوششی (پوست)', en: 'Integumentary', latin: 'Systema integumentarium', color: 0xd9a07a, descFa: 'بزرگ‌ترین اندام: ۲ مترمربع و ۵ کیلوگرم. هر دقیقه ۳۰٬۰۰۰ سلول پوستی می‌ریزند و روزانه ۱ لیتر عرق دفع می‌شود.', descEn: 'Largest organ: 2 m², 5 kg. 30,000 skin cells shed per minute.', stats: [{ fa: '۲ m² مساحت', en: '2 m² area' }, { fa: '۵ kg وزن', en: '5 kg mass' }, { fa: '۲ میلیون غده عرق', en: '2M sweat glands' }] },
];

export interface AnatomicalPart {
  part_id: string;
  name_fa: string;
  name_en: string;
  latin: string;
  system: string;
  layer: string;
  parent_id: string | null;
  movable: boolean;
  description_fa: string;
  description_en: string;
}

// Skeleton — real bones, grouped. Counts reflect true human osteology.
const SKULL = ['Frontal', 'Parietal L', 'Parietal R', 'Temporal L', 'Temporal R', 'Occipital', 'Sphenoid', 'Ethmoid', 'Zygomatic L', 'Zygomatic R', 'Maxilla L', 'Maxilla R', 'Nasal L', 'Nasal R', 'Mandible', 'Vomer', 'Palatine L', 'Palatine R', 'Lacrimal L', 'Lacrimal R', 'Inferior nasal concha L', 'Inferior nasal concha R'];
const SKULL_FA = ['پیشانی', 'آهیانه چپ', 'آهیانه راست', 'گیجگاهی چپ', 'گیجگاهی راست', 'پس‌سری', 'پروانه‌ای', 'غربالی', 'گونه چپ', 'گونه راست', 'فک بالا چپ', 'فک بالا راست', 'بینی چپ', 'بینی راست', 'فک پایین', 'تیغه بینی', 'کامی چپ', 'کامی راست', 'اشکی چپ', 'اشکی راست', 'شاخک تحتانی چپ', 'شاخک تحتانی راست'];
const VERTEBRAE = ['C1 Atlas', 'C2 Axis', 'C3', 'C4', 'C5', 'C6', 'C7', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12', 'L1', 'L2', 'L3', 'L4', 'L5', 'Sacrum', 'Coccyx'];
const VERTEBRAE_FA = ['اطلس', 'آکسیس', 'مهره گردنی ۳', 'مهره گردنی ۴', 'مهره گردنی ۵', 'مهره گردنی ۶', 'مهره گردنی ۷', 'مهره سینه‌ای ۱', 'مهره سینه‌ای ۲', 'مهره سینه‌ای ۳', 'مهره سینه‌ای ۴', 'مهره سینه‌ای ۵', 'مهره سینه‌ای ۶', 'مهره سینه‌ای ۷', 'مهره سینه‌ای ۸', 'مهره سینه‌ای ۹', 'مهره سینه‌ای ۱۰', 'مهره سینه‌ای ۱۱', 'مهره سینه‌ای ۱۲', 'مهره کمری ۱', 'مهره کمری ۲', 'مهره کمری ۳', 'مهره کمری ۴', 'مهره کمری ۵', 'استخوان خاجی', 'دنبالچه'];

function buildParts(): AnatomicalPart[] {
  const parts: AnatomicalPart[] = [];
  const push = (p: AnatomicalPart) => parts.push(p);

  // Skull
  SKULL.forEach((en, i) => {
    push({ part_id: 'bone_skull_' + i, name_fa: 'استخوان ' + SKULL_FA[i], name_en: en + ' bone', latin: 'Os ' + en.replace(/ .*/, ''), system: 'skeletal', layer: 'organ', parent_id: 'region_head', movable: en === 'Mandible', description_fa: 'بخشی از جمجمه؛ محافظ مغز و ساختار صورت.', description_en: 'Part of the skull; protects the brain, shapes the face.' });
  });
  push({ part_id: 'bone_hyoid', name_fa: 'استخوان لامی', name_en: 'Hyoid bone', latin: 'Os hyoideum', system: 'skeletal', layer: 'organ', parent_id: 'region_neck', movable: true, description_fa: 'تنها استخوان بدون مفصل مستقیم؛ لنگر زبان و حنجره.', description_en: 'Only bone with no direct joint; anchors tongue and larynx.' });
  ['Malleus L', 'Malleus R', 'Incus L', 'Incus R', 'Stapes L', 'Stapes R'].forEach((en, i) => {
    push({ part_id: 'bone_ear_' + i, name_fa: 'استخوانچه گوش: ' + (['چکشی چپ', 'چکشی راست', 'سندانی چپ', 'سندانی راست', 'رکابی چپ', 'رکابی راست'] as string[])[i], name_en: en + ' (ossicle)', latin: 'Ossicula auditus', system: 'skeletal', layer: 'organ', parent_id: 'region_head', movable: true, description_fa: 'کوچک‌ترین استخوان‌های بدن؛ انتقال ارتعاش صوت.', description_en: 'Smallest bones; transmit sound vibration.' });
  });
  VERTEBRAE.forEach((en, i) => {
    push({ part_id: 'bone_vert_' + i, name_fa: VERTEBRAE_FA[i], name_en: en + (en.startsWith('C') || en.startsWith('T') || en.startsWith('L') || en === 'Sacrum' || en === 'Coccyx' ? '' : ' vertebra'), latin: 'Vertebra', system: 'skeletal', layer: 'organ', parent_id: 'region_spine', movable: !['Sacrum', 'Coccyx'].includes(en), description_fa: 'بخشی از ستون مهره‌ها؛ محافظ نخاع و محور بدن.', description_en: 'Spinal column segment; protects the spinal cord.' });
  });
  for (let i = 1; i <= 12; i++) {
    for (const side of ['L', 'R']) {
      const fa = side === 'L' ? 'چپ' : 'راست';
      push({ part_id: `bone_rib_${i}_${side}`, name_fa: `دنده ${i} ${fa}`, name_en: `Rib ${i} ${side === 'L' ? 'left' : 'right'}`, latin: 'Costa ' + i, system: 'skeletal', layer: 'organ', parent_id: 'region_thorax', movable: true, description_fa: 'قفسه سینه؛ محافظ قلب و ریه‌ها.', description_en: 'Rib cage; protects heart and lungs.' });
    }
  }
  push({ part_id: 'bone_sternum', name_fa: 'جناغ سینه', name_en: 'Sternum', latin: 'Sternum', system: 'skeletal', layer: 'organ', parent_id: 'region_thorax', movable: false, description_fa: 'استخوان میانی سینه؛ اتصال دنده‌ها و ترقوه‌ها.', description_en: 'Breastbone; anchors ribs and clavicles.' });

  const limbBones: [string, string, string, string][] = [
    ['Clavicle', 'ترقوه', 'Clavicula', 'region_shoulder'],
    ['Scapula', 'کتف', 'Scapula', 'region_shoulder'],
    ['Humerus', 'بازو', 'Humerus', 'region_arm'],
    ['Radius', 'زند زبرین', 'Radius', 'region_forearm'],
    ['Ulna', 'زند زیرین', 'Ulna', 'region_forearm'],
    ['Femur', 'ران', 'Femur', 'region_thigh'],
    ['Patella', 'کشکک', 'Patella', 'region_knee'],
    ['Tibia', 'درشت‌نی', 'Tibia', 'region_leg'],
    ['Fibula', 'نازک‌نی', 'Fibula', 'region_leg'],
  ];
  for (const [en, fa, latin, region] of limbBones) {
    for (const side of ['L', 'R']) {
      const sfa = side === 'L' ? 'چپ' : 'راست';
      push({ part_id: `bone_${en.toLowerCase()}_${side}`, name_fa: `استخوان ${fa} ${sfa}`, name_en: `${en} (${side === 'L' ? 'left' : 'right'})`, latin, system: 'skeletal', layer: 'organ', parent_id: region, movable: true, description_fa: 'استخوان اندام؛ حرکت و پشتیبانی.', description_en: 'Limb bone; movement and support.' });
    }
  }
  const carpals = ['Scaphoid', 'Lunate', 'Triquetrum', 'Pisiform', 'Trapezium', 'Trapezoid', 'Capitate', 'Hamate'];
  const carpalsFa = ['ناوی', 'هلالی', 'هرمی', 'نخودی', 'ذوزنقه', 'شبه‌ذوزنقه', 'کاپیتیت', 'همیت'];
  carpals.forEach((en, i) => {
    for (const side of ['L', 'R']) {
      push({ part_id: `bone_carpal_${i}_${side}`, name_fa: `استخوان مچ ${carpalsFa[i]} ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `${en} (carpal, ${side})`, latin: 'Ossa carpi', system: 'skeletal', layer: 'organ', parent_id: 'region_hand', movable: true, description_fa: 'استخوان‌های مچ دست؛ ۸ استخوان در دو ردیف.', description_en: 'Wrist bone; 8 carpals in two rows.' });
    }
  });
  for (let i = 1; i <= 5; i++) {
    for (const side of ['L', 'R']) {
      push({ part_id: `bone_metacarpal_${i}_${side}`, name_fa: `کف‌دستی ${i} ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `Metacarpal ${i} (${side})`, latin: 'Ossa metacarpi', system: 'skeletal', layer: 'organ', parent_id: 'region_hand', movable: true, description_fa: 'استخوان کف دست.', description_en: 'Palm bone.' });
    }
  }
  const fingers = ['Thumb', 'Index', 'Middle', 'Ring', 'Little'];
  const fingersFa = ['شست', 'سبابه', 'میانی', 'حلقه', 'کوچک'];
  fingers.forEach((f, fi) => {
    const count = fi === 0 ? 2 : 3;
    for (let p = 1; p <= count; p++) {
      for (const side of ['L', 'R']) {
        push({ part_id: `bone_phalanx_hand_${fi}_${p}_${side}`, name_fa: `بند ${p} انگشت ${fingersFa[fi]} دست ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `${f} phalanx ${p} (hand, ${side})`, latin: 'Phalanges', system: 'skeletal', layer: 'organ', parent_id: 'region_hand', movable: true, description_fa: 'بند انگشت دست؛ ۱۴ بند در هر دست.', description_en: 'Finger bone; 14 phalanges per hand.' });
      }
    }
  });
  const tarsals = ['Talus', 'Calcaneus', 'Navicular', 'Cuboid', 'Cuneiform 1', 'Cuneiform 2', 'Cuneiform 3'];
  const tarsalsFa = ['قاپی', 'پاشنه', 'ناوی پا', 'مکعبی', 'میخی ۱', 'میخی ۲', 'میخی ۳'];
  tarsals.forEach((en, i) => {
    for (const side of ['L', 'R']) {
      push({ part_id: `bone_tarsal_${i}_${side}`, name_fa: `استخوان مچ ${tarsalsFa[i]} پای ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `${en} (tarsal, ${side})`, latin: 'Ossa tarsi', system: 'skeletal', layer: 'organ', parent_id: 'region_foot', movable: true, description_fa: 'استخوان مچ پا؛ ۷ استخوان.', description_en: 'Ankle bone; 7 tarsals.' });
    }
  });
  for (let i = 1; i <= 5; i++) {
    for (const side of ['L', 'R']) {
      push({ part_id: `bone_metatarsal_${i}_${side}`, name_fa: `کف‌پایی ${i} ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `Metatarsal ${i} (${side})`, latin: 'Ossa metatarsi', system: 'skeletal', layer: 'organ', parent_id: 'region_foot', movable: true, description_fa: 'استخوان کف پا.', description_en: 'Foot sole bone.' });
    }
  }
  const toesFa = ['شست پا', 'دوم', 'سوم', 'چهارم', 'پنجم'];
  fingers.forEach((f, fi) => {
    const count = fi === 0 ? 2 : 3;
    for (let p = 1; p <= count; p++) {
      for (const side of ['L', 'R']) {
        push({ part_id: `bone_phalanx_foot_${fi}_${p}_${side}`, name_fa: `بند ${p} انگشت ${toesFa[fi]} پای ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `${f} toe phalanx ${p} (${side})`, latin: 'Phalanges', system: 'skeletal', layer: 'organ', parent_id: 'region_foot', movable: true, description_fa: 'بند انگشت پا.', description_en: 'Toe bone.' });
      }
    }
  });
  for (const side of ['L', 'R']) {
    push({ part_id: `bone_pelvis_${side}`, name_fa: `استخوان لگن ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `Hip bone (${side})`, latin: 'Os coxae', system: 'skeletal', layer: 'organ', parent_id: 'region_pelvis', movable: false, description_fa: 'از سه استخوان تهیگاهی، نشیمنگاهی و شرمگاهی؛ محافظ اندام‌های لگنی.', description_en: 'Ilium + ischium + pubis; protects pelvic organs.' });
  }

  // Muscles (major groups)
  const muscles: [string, string, string, string][] = [
    ['Frontalis', 'پیشانی', 'M. frontalis', 'region_head'],
    ['Masseter', 'جونده', 'M. masseter', 'region_head'],
    ['Sternocleidomastoid', 'جناغی‌ترقوه‌ای‌پستانی', 'M. sternocleidomastoideus', 'region_neck'],
    ['Trapezius', 'ذوزنقه‌ای', 'M. trapezius', 'region_shoulder'],
    ['Deltoid', 'دلتوئید', 'M. deltoideus', 'region_shoulder'],
    ['Pectoralis major', 'سینه‌ای بزرگ', 'M. pectoralis major', 'region_thorax'],
    ['Biceps brachii', 'دوسر بازو', 'M. biceps brachii', 'region_arm'],
    ['Triceps brachii', 'سه‌سر بازو', 'M. triceps brachii', 'region_arm'],
    ['Rectus abdominis', 'راست شکمی', 'M. rectus abdominis', 'region_abdomen'],
    ['External oblique', 'مایل خارجی', 'M. obliquus externus', 'region_abdomen'],
    ['Latissimus dorsi', 'پشتی بزرگ', 'M. latissimus dorsi', 'region_back'],
    ['Gluteus maximus', 'سرینی بزرگ', 'M. gluteus maximus', 'region_pelvis'],
    ['Quadriceps femoris', 'چهارسر ران', 'M. quadriceps femoris', 'region_thigh'],
    ['Hamstrings', 'همسترینگ', 'Mm. ischiocrurales', 'region_thigh'],
    ['Gastrocnemius', 'دوقلو ساق', 'M. gastrocnemius', 'region_leg'],
    ['Soleus', 'نعلی', 'M. soleus', 'region_leg'],
    ['Diaphragm', 'دیافراگم', 'Diaphragma', 'region_thorax'],
    ['Heart (myocardium)', 'قلب (عضله قلبی)', 'Myocardium', 'region_thorax'],
  ];
  for (const [en, fa, latin, region] of muscles) {
    const bilateral = !['Diaphragm', 'Heart (myocardium)', 'Rectus abdominis'].includes(en);
    if (bilateral) {
      for (const side of ['L', 'R']) {
        push({ part_id: `muscle_${en.toLowerCase().replace(/[^a-z]+/g, '_')}_${side}`, name_fa: `عضله ${fa} ${side === 'L' ? 'چپ' : 'راست'}`, name_en: `${en} (${side})`, latin, system: en.includes('Heart') ? 'circulatory' : 'muscular', layer: 'organ', parent_id: region, movable: true, description_fa: 'عضله اسکلتی؛ تولید حرکت ارادی.', description_en: 'Skeletal muscle; voluntary movement.' });
      }
    } else {
      push({ part_id: `muscle_${en.toLowerCase().replace(/[^a-z]+/g, '_')}`, name_fa: `عضله ${fa}`, name_en: en, latin, system: en.includes('Heart') ? 'circulatory' : en === 'Diaphragm' ? 'respiratory' : 'muscular', layer: 'organ', parent_id: region, movable: true, description_fa: en === 'Diaphragm' ? 'عضله اصلی تنفس.' : 'عضله محوری بدن.', description_en: en === 'Diaphragm' ? 'Primary breathing muscle.' : 'Axial muscle.' });
    }
  }

  // Organs & nervous
  const organs: [string, string, string, string, string, string, string][] = [
    ['brain', 'مغز', 'Brain', 'Encephalon', 'nervous', 'region_head', '۱٫۴ کیلوگرم؛ ۸۶ میلیارد نورون؛ مرکز فرماندهی بدن.'],
    ['cerebellum', 'مخچه', 'Cerebellum', 'Cerebellum', 'nervous', 'region_head', 'هماهنگی حرکت و تعادل.'],
    ['brainstem', 'ساقه مغز', 'Brainstem', 'Truncus encephali', 'nervous', 'region_head', 'تنفس، ضربان قلب و هوشیاری.'],
    ['spinal_cord', 'نخاع', 'Spinal cord', 'Medulla spinalis', 'nervous', 'region_spine', '۴۵ سانتی‌متر؛ ۳۱ جفت عصب نخاعی.'],
    ['eye_L', 'چشم چپ', 'Left eye', 'Oculus', 'nervous', 'region_head', '۱۰۷ میلیون سلول گیرنده نور در هر چشم.'],
    ['eye_R', 'چشم راست', 'Right eye', 'Oculus', 'nervous', 'region_head', 'بینایی立体 با همکاری دو چشم.'],
    ['heart', 'قلب', 'Heart', 'Cor', 'circulatory', 'region_thorax', '۳۰۰ گرم؛ ۱۰۰٬۰۰۰ ضربان و ۷۵۰۰ لیتر پمپاژ در روز.'],
    ['aorta', 'آئورت', 'Aorta', 'Aorta', 'circulatory', 'region_thorax', 'بزرگ‌ترین سرخرگ؛ قطر ۲٫۵ سانتی‌متر.'],
    ['lung_L', 'ریه چپ', 'Left lung', 'Pulmo sinister', 'respiratory', 'region_thorax', 'دو لوب؛ ۳۰۰ میلیون آلوئول در مجموع ریه‌ها.'],
    ['lung_R', 'ریه راست', 'Right lung', 'Pulmo dexter', 'respiratory', 'region_thorax', 'سه لوب؛ تبادل اکسیژن و CO₂.'],
    ['trachea', 'نای', 'Trachea', 'Trachea', 'respiratory', 'region_neck', 'لوله ۱۲ سانتی‌متری با حلقه‌های غضروفی.'],
    ['liver', 'کبد', 'Liver', 'Hepar', 'digestive', 'region_abdomen', '۱٫۵ کیلو؛ ۵۰۰ عملکرد؛ تولید صفرا و ذخیره گلیکوژن.'],
    ['stomach', 'معده', 'Stomach', 'Gaster', 'digestive', 'region_abdomen', 'هضم اسیدی؛ ظرفیت ۱٫۵ لیتر.'],
    ['pancreas', 'لوزالمعده', 'Pancreas', 'Pancreas', 'digestive', 'region_abdomen', 'انسولین و آنزیم‌های گوارشی.'],
    ['spleen', 'طحال', 'Spleen', 'Splen', 'immune', 'region_abdomen', 'پالایش خون و ذخیره پلاکت؛ ۱۵۰ گرم.'],
    ['kidney_L', 'کلیه چپ', 'Left kidney', 'Ren', 'urinary', 'region_abdomen', 'یک میلیون نفرون؛ پالایش ۱۸۰ لیتر در روز.'],
    ['kidney_R', 'کلیه راست', 'Right kidney', 'Ren', 'urinary', 'region_abdomen', 'تنظیم فشار خون و الکترولیت‌ها.'],
    ['bladder', 'مثانه', 'Bladder', 'Vesica urinaria', 'urinary', 'region_pelvis', 'ظرفیت ۵۰۰ میلی‌لیتر.'],
    ['thyroid', 'تیروئید', 'Thyroid', 'Glandula thyroidea', 'endocrine', 'region_neck', 'تنظیم متابولیسم با T3 و T4.'],
    ['pituitary', 'هیپوفیز', 'Pituitary', 'Hypophysis', 'endocrine', 'region_head', 'غده فرمانده؛ ۰٫۵ گرم.'],
    ['adrenal_L', 'فوق‌کلیه چپ', 'Left adrenal', 'Glandula suprarenalis', 'endocrine', 'region_abdomen', 'آدرنالین و کورتیزول.'],
    ['adrenal_R', 'فوق‌کلیه راست', 'Right adrenal', 'Glandula suprarenalis', 'endocrine', 'region_abdomen', 'پاسخ جنگ‌یاگریز.'],
    ['skin', 'پوست', 'Skin', 'Cutis', 'integumentary', 'region_body', '۲ مترمربع؛ ۵ کیلوگرم؛ بزرگ‌ترین اندام.'],
    ['intestine_small', 'روده باریک', 'Small intestine', 'Intestinum tenue', 'digestive', 'region_abdomen', '۶ متر؛ جذب مواد غذایی با سطح ۲۵۰ مترمربع.'],
    ['intestine_large', 'روده بزرگ', 'Large intestine', 'Intestinum crassum', 'digestive', 'region_abdomen', '۱٫۵ متر؛ جذب آب و میکروبیوم.'],
  ];
  for (const [id, fa, en, latin, system, region, desc] of organs) {
    push({ part_id: 'organ_' + id, name_fa: fa, name_en: en, latin, system, layer: 'organ', parent_id: region, movable: ['organ_heart', 'organ_lung_L', 'organ_lung_R', 'organ_diaphragm'].includes('organ_' + id), description_fa: desc, description_en: desc });
  }

  // Micro layers
  const cells: [string, string, string][] = [
    ['neuron', 'نورون', '۸۶ میلیارد در مغز؛ انتقال پیام الکتریکی.'],
    ['erythrocyte', 'گلبول قرمز', '۵ میلیون در هر میلی‌مترمکعب خون؛ حمل اکسیژن با هموگلوبین.'],
    ['leukocyte', 'گلبول سفید', 'سربازان ایمنی؛ ۷هزار در هر میلی‌مترمکعب.'],
    ['myocyte', 'سلول عضلانی', 'انقباض با اکتین و میوزین.'],
    ['osteocyte', 'سلول استخوانی', 'نگهداری ماتریکس استخوان.'],
    ['hepatocyte', 'سلول کبدی', '۵۰۰ عملکرد متابولیک.'],
    ['alveolar', 'سلول آلوئولی', 'تبادل گاز در ریه.'],
    ['nephron_cell', 'سلول نفرون', 'پالایش خون در کلیه.'],
  ];
  for (const [id, fa, desc] of cells) {
    push({ part_id: 'cell_' + id, name_fa: fa, name_en: id, latin: 'Cellula', system: 'cellular', layer: 'cell', parent_id: null, movable: false, description_fa: desc, description_en: desc });
  }
  const molecules: [string, string, string][] = [
    ['water', 'آب H₂O', '۶۰٪ وزن بدن.'],
    ['hemoglobin', 'هموگلوبین', '۲۸۰ میلیون مولکول در هر گلبول قرمز.'],
    ['collagen', 'کلاژن', 'فراوان‌ترین پروتئین بدن؛ ۳۰٪ پروتئین‌ها.'],
    ['atp', 'ATP', 'واحد انرژی سلول.'],
    ['dna', 'DNA', '۳ میلیارد جفت‌باز در هر سلول؛ ۲ متر طول.'],
    ['glucose', 'گلوکز', 'سوخت اصلی مغز؛ ۱۲۰ گرم در روز.'],
  ];
  for (const [id, fa, desc] of molecules) {
    push({ part_id: 'mol_' + id, name_fa: fa, name_en: id, latin: 'Molecula', system: 'molecular', layer: 'molecule', parent_id: null, movable: false, description_fa: desc, description_en: desc });
  }
  const atoms: [string, string, string][] = [
    ['oxygen', 'اکسیژن', '۶۵٪ جرم بدن.'],
    ['carbon', 'کربن', '۱۸٪ جرم بدن؛ ستون حیات آلی.'],
    ['hydrogen', 'هیدروژن', '۱۰٪ جرم بدن.'],
    ['nitrogen', 'نیتروژن', '۳٪ جرم بدن.'],
    ['calcium', 'کلسیم', '۱٫۴٪؛ استخوان و پیام‌رسانی.'],
    ['phosphorus', 'فسفر', '۱٫۱٪؛ ATP و DNA.'],
  ];
  for (const [id, fa, desc] of atoms) {
    push({ part_id: 'atom_' + id, name_fa: 'اتم ' + fa, name_en: id + ' atom', latin: 'Atomus', system: 'atomic', layer: 'atom', parent_id: null, movable: false, description_fa: desc, description_en: desc });
  }
  const tissues: [string, string, string][] = [
    ['epithelial', 'بافت پوششی', 'پوشش سطوح و غدد.'],
    ['connective', 'بافت پیوندی', 'استخوان، خون، چربی و تاندون.'],
    ['muscle_tissue', 'بافت عضلانی', 'اسکلتی، قلبی و صاف.'],
    ['nervous_tissue', 'بافت عصبی', 'نورون و گلیا.'],
  ];
  for (const [id, fa, desc] of tissues) {
    push({ part_id: 'tissue_' + id, name_fa: fa, name_en: id, latin: 'Textus', system: 'histology', layer: 'tissue', parent_id: null, movable: false, description_fa: desc, description_en: desc });
  }

  return parts;
}

export const ANATOMY_PARTS: AnatomicalPart[] = buildParts();

export interface JointDef {
  joint_id: string;
  fa: string;
  en: string;
  min: [number, number, number];
  max: [number, number, number];
}

export const JOINTS: JointDef[] = [
  { joint_id: 'neck', fa: 'گردن', en: 'Neck (C1–C7)', min: [-40, -70, -30], max: [40, 70, 30] },
  { joint_id: 'jaw', fa: 'فک', en: 'Jaw (TMJ)', min: [-5, 0, 0], max: [30, 0, 0] },
  { joint_id: 'spine_T', fa: 'ستون سینه‌ای', en: 'Thoracic spine', min: [-25, -30, -20], max: [25, 30, 20] },
  { joint_id: 'spine_L', fa: 'ستون کمری', en: 'Lumbar spine', min: [-20, -20, -15], max: [20, 20, 15] },
  { joint_id: 'shoulder_L', fa: 'شانه چپ', en: 'Shoulder L', min: [-180, -90, -90], max: [180, 90, 90] },
  { joint_id: 'shoulder_R', fa: 'شانه راست', en: 'Shoulder R', min: [-180, -90, -90], max: [180, 90, 90] },
  { joint_id: 'elbow_L', fa: 'آرنج چپ', en: 'Elbow L', min: [-150, 0, -10], max: [0, 0, 10] },
  { joint_id: 'elbow_R', fa: 'آرنج راست', en: 'Elbow R', min: [-150, 0, -10], max: [0, 0, 10] },
  { joint_id: 'wrist_L', fa: 'مچ دست چپ', en: 'Wrist L', min: [-70, -25, -20], max: [80, 25, 20] },
  { joint_id: 'wrist_R', fa: 'مچ دست راست', en: 'Wrist R', min: [-70, -25, -20], max: [80, 25, 20] },
  { joint_id: 'hip_L', fa: 'لگن چپ', en: 'Hip L', min: [-120, -45, -45], max: [30, 45, 45] },
  { joint_id: 'hip_R', fa: 'لگن راست', en: 'Hip R', min: [-120, -45, -45], max: [30, 45, 45] },
  { joint_id: 'knee_L', fa: 'زانو چپ', en: 'Knee L', min: [0, 0, -5], max: [150, 0, 5] },
  { joint_id: 'knee_R', fa: 'زانو راست', en: 'Knee R', min: [0, 0, -5], max: [150, 0, 5] },
  { joint_id: 'ankle_L', fa: 'مچ پا چپ', en: 'Ankle L', min: [-40, -20, -20], max: [30, 20, 20] },
  { joint_id: 'ankle_R', fa: 'مچ پا راست', en: 'Ankle R', min: [-40, -20, -20], max: [30, 20, 20] },
];

export const POSES: Record<string, { fa: string; en: string; joints: Record<string, [number, number, number]> }> = {
  anatomical: { fa: 'وضعیت آناتومیک', en: 'Anatomical position', joints: {} },
  wave: { fa: 'دست تکان دادن', en: 'Waving', joints: { shoulder_R: [0, 0, 150], elbow_R: [-20, 0, 0], wrist_R: [20, 0, 0], neck: [0, -10, 0] } },
  bow: { fa: 'تعظیم', en: 'Bowing', joints: { spine_T: [35, 0, 0], spine_L: [20, 0, 0], neck: [20, 0, 0], shoulder_L: [20, 0, -10], shoulder_R: [20, 0, 10] } },
  tpose: { fa: 'حالت T', en: 'T-pose', joints: { shoulder_L: [0, 0, -90], shoulder_R: [0, 0, 90] } },
  sit: { fa: 'نشستن', en: 'Sitting', joints: { hip_L: [-90, 0, 0], hip_R: [-90, 0, 0], knee_L: [90, 0, 0], knee_R: [90, 0, 0], spine_T: [5, 0, 0] } },
  nod: { fa: 'تأیید با سر', en: 'Nodding yes', joints: { neck: [25, 0, 0] } },
  shake: { fa: 'نه گفتن با سر', en: 'Shaking no', joints: { neck: [0, 35, 0] } },
  arms_up: { fa: 'دست‌ها بالا', en: 'Arms up', joints: { shoulder_L: [170, 0, -20], shoulder_R: [170, 0, 20], elbow_L: [-10, 0, 0], elbow_R: [-10, 0, 0] } },
};
