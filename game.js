/* ==========================================================================
   GLOBAL ERROR TRAP (แสดงแจ้งเตือนหากมีปัญหา)
   ========================================================================== */
window.onerror = function (msg, url, line) {
  console.error('Game Error:', msg, 'at line', line);
};

/* ==========================================================================
   1. SOUND & BACKGROUND MUSIC ENGINE (Web Audio API Synthesizer)
   ========================================================================== */
const SoundEngine = {
  ctx: null,
  enabled: true,
  bgmInterval: null,
  bgmStep: 0,
  init() {
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.startBGM();
    } catch (e) {
      console.warn('Audio init skipped:', e);
    }
  },
  playTone(freq, type, duration, vol = 0.15, delay = 0) {
    if (!this.enabled) return;
    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + delay);
      gain.gain.setValueAtTime(vol, this.ctx.currentTime + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + delay + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + delay);
      osc.stop(this.ctx.currentTime + delay + duration);
    } catch (e) {}
  },
  startBGM() {
    if (this.bgmInterval) return;
    const notes = [
      261.63, 329.63, 392.00, 329.63,
      293.66, 349.23, 440.00, 349.23,
      329.63, 392.00, 523.25, 493.88,
      392.00, 329.63, 293.66, 392.00
    ];
    this.bgmInterval = setInterval(() => {
      if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return;
      const freq = notes[this.bgmStep % notes.length];
      this.playTone(freq, 'sine', 0.28, 0.03, 0);
      if (this.bgmStep % 2 === 0) {
        this.playTone(freq * 0.5, 'triangle', 0.35, 0.022, 0);
      }
      this.bgmStep++;
    }, 340);
  },
  collect() {
    this.playTone(587.33, 'sine', 0.15, 0.18, 0);
    this.playTone(880.00, 'triangle', 0.25, 0.2, 0.08);
  },
  correct() {
    this.playTone(523.25, 'sine', 0.15, 0.18, 0);
    this.playTone(659.25, 'sine', 0.15, 0.18, 0.09);
    this.playTone(783.99, 'triangle', 0.3, 0.2, 0.18);
  },
  wrong() {
    this.playTone(220, 'sawtooth', 0.22, 0.14, 0);
    this.playTone(175, 'sawtooth', 0.28, 0.14, 0.14);
  },
  jump() {
    this.playTone(320, 'sine', 0.14, 0.1, 0);
    this.playTone(460, 'sine', 0.14, 0.1, 0.05);
  },
  fanfare() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      this.playTone(f, 'triangle', 0.35, 0.2, i * 0.11);
    });
  }
};

function toggleSound() {
  SoundEngine.enabled = !SoundEngine.enabled;
  if (SoundEngine.enabled) SoundEngine.init();
  const btn = document.getElementById('btn-sound');
  if (btn) btn.textContent = SoundEngine.enabled ? '🔊' : '🔇';
  showToast(SoundEngine.enabled ? 'เปิดเสียงและดนตรีคลอแล้ว 🎵' : 'ปิดเสียงประกอบแล้ว');
}

function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.background = isError
    ? 'linear-gradient(135deg, #ef4444, #b91c1c)'
    : 'linear-gradient(135deg, #10b981, #059669)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

/* ==========================================================================
   2. CHARACTER APPEARANCE, HAIRSTYLES, HEADGEAR & VEHICLES
   ========================================================================== */
const APPEARANCE_OPTIONS = {
  vehicles: [
    { id: 'none', icon: '🚶', label: 'เดินเท้าปกติ', desc: 'ความเร็วมาตรฐาน 1.0x', speedMult: 1.0 },
    { id: 'skateboard', icon: '🛹', label: 'สเก็ตบอร์ดสายฟ้า', desc: 'คล่องตัว ความเร็ว 1.45x', speedMult: 1.45 },
    { id: 'scooter', icon: '🛴', label: 'สกู๊ตเตอร์ไฟฟ้า', desc: 'ขับง่าย ความเร็ว 1.6x', speedMult: 1.6 },
    { id: 'hoverboard', icon: '🛸', label: 'โฮเวอร์บอร์ดลอยได้', desc: 'ลอยเหนือพื้น ความเร็ว 1.75x', speedMult: 1.75 },
    { id: 'gokart', icon: '🏎️', label: 'รถโกคาร์ทนักสืบ', desc: 'ซิ่งทั่วโรงเรียน ความเร็ว 1.9x', speedMult: 1.9 }
  ],
  skinTones: [
    { id: 's1', color: '#fde0c3', label: 'ผิวขาวอมชมพู' },
    { id: 's2', color: '#f5cba7', label: 'ผิวขาวเหลือง' },
    { id: 's3', color: '#e0ac69', label: 'ผิวสีน้ำผึ้ง' },
    { id: 's4', color: '#c68642', label: 'ผิวสีแทน' },
    { id: 's5', color: '#8d5524', label: 'ผิวสีเข้ม' }
  ],
  hairStyles: [
    { id: 'short', label: '👦 ทรงนักเรียน' },
    { id: 'bob', label: '👩 ผมบ๊อบสั้น' },
    { id: 'spiky', label: '⚡ ทรงหนามแหลม' },
    { id: 'ponytail', label: '🎀 ผมยาวสลวย' },
    { id: 'afro', label: '🥦 แอฟโฟรฟูฟ่อง' },
    { id: 'pigtails', label: '👧 ผมแกละสองข้าง' },
    { id: 'mohawk', label: '🎸 โมฮอว์กพังก์' },
    { id: 'buns', label: '🥟 ซาลาเปาคู่' },
    { id: 'bowl', label: '🍄 ทรงกะลาครอบ' },
    { id: 'saiyan', label: '🔥 ผมตั้งซูเปอร์ไซย่า' },
    { id: 'odango', label: '🍡 ดังโงะมวยเดี่ยว' },
    { id: 'twintails_long', label: '💫 ทวินเทลลอนยาว' },
    { id: 'choppy_bangs', label: '✂️ หน้าม้าเต่อสุดชิค' },
    { id: 'side_braid', label: '🌸 เปียเดี่ยวข้างไหล่' }
  ],
  hairColors: [
    { id: 'hc1', color: '#1e293b', label: 'ดำธรรมชาติ' },
    { id: 'hc2', color: '#4a2c18', label: 'น้ำตาลเข้ม' },
    { id: 'hc3', color: '#92400e', label: 'น้ำตาลทอง' },
    { id: 'hc4', color: '#facc15', label: 'บลอนด์ทอง' },
    { id: 'hc5', color: '#ef4444', label: 'แดงเพลิง' },
    { id: 'hc6', color: '#38bdf8', label: 'ฟ้าพาสเทล' },
    { id: 'hc7', color: '#ec4899', label: 'ชมพูซากุระ' },
    { id: 'hc8', color: '#a855f7', label: 'ม่วงนีออน' }
  ],
  outfits: [
    { id: 'student_blue', label: '👕 ชุดนักเรียน (กางเกงน้ำเงิน)' },
    { id: 'student_black', label: '👔 ชุดนักเรียน (กางเกงดำ)' },
    { id: 'pe_red', label: '🏃 ชุดพละ รร. (สีแดง)' },
    { id: 'detective_coat', label: '🧥 โค้ทนักสืบเชอร์ล็อก' },
    { id: 'hoodie_cyber', label: '🎧 เสื้อฮู้ดนักไอที' },
    { id: 'dino_suit', label: '🦖 มาสคอตไดโนเสาร์ (ฮาๆ)' },
    { id: 'banana_suit', label: '🍌 ชุดกล้วยหอมยักษ์ (กวนๆ)' },
    { id: 'super_undies', label: '🩲 ซูเปอร์ฮีโร่กางเกงในแดง' }
  ],
  glasses: [
    { id: 'none', label: '❌ ไม่ใส่แว่น' },
    { id: 'round', label: '🤓 แว่นกลมนักสืบ' },
    { id: 'cool', label: '😎 แว่นกันแดดเท่ๆ' }
  ],
  hats: [
    { id: 'none', label: '❌ ไม่ใส่พร็อพ' },
    { id: 'detective', label: '🕵️ หมวกนักสืบ' },
    { id: 'cap_red', label: '🧢 หมวกแก๊ปแดง' },
    { id: 'headset', label: '🎧 หูฟังเกมเมอร์' },
    { id: 'crown', label: '👑 มงกุฎทองคำ' },
    { id: 'cat_ears', label: '🐱 หูแมวเหมียว' },
    { id: 'alien_antenna', label: '🛸 เสาอากาศเอเลี่ยน' }
  ]
};

const DEFAULT_APPEARANCE = {
  vehicle: 'none',
  skin: '#f5cba7',
  hairStyle: 'short',
  hairColor: '#1e293b',
  outfit: 'student_blue',
  glasses: 'none',
  hat: 'detective'
};

/* ==========================================================================
   3. 5W1H CURRICULUM & MISSIONS DATA
   ========================================================================== */
const MISSIONS = [
  {
    id: 1,
    badge: 'ภารกิจที่ 1 • ห้องเรียน ม.2/1',
    title: 'ปริศนาโทรศัพท์หาย',
    icon: '📱',
    locationName: 'อาคารเรียน (ห้อง ม.2/1)',
    shortDesc: 'โทรศัพท์ของ "ต้นกล้า" หายไปช่วงพักกลางวัน สำรวจห้องเรียนและสอบปากคำเพื่อนเพื่อหาความจริง',
    spawnPos: { x: -24, z: 10 },
    evidences: [
      {
        id: 'm1_e1',
        title: 'คำให้การของ "ต้นกล้า" (ผู้เสียหาย)',
        icon: '👦',
        pos: { x: -26, y: 1.2, z: 14 },
        summary: 'ต้นกล้าวางโทรศัพท์สีฟ้าไว้บนโต๊ะเรียนแถวกลางตอนเวลา 12:05 น. ก่อนเดินลงไปกินข้าวที่โรงอาหาร พอกลับขึ้นมาตอน 12:45 น. ก็ไม่พบแล้ว',
        detail: '“ผมวางโทรศัพท์ iPhone เคสสีฟ้าไว้บนโต๊ะเรียนของผมในห้อง ม.2/1 ตอน 12:05 น. ก่อนลงไปกินข้าว พอกลับขึ้นมาตอน 12:45 น. โทรศัพท์ก็หายไปแล้วครับ!”'
      },
      {
        id: 'm1_e2',
        title: 'ตารางเรียนและบันทึกเวรประจำวัน',
        icon: '📋',
        pos: { x: -33, y: 1.5, z: 18 },
        summary: 'ช่วงเวลา 12:00 - 13:00 น. เป็นเวลาพักกลางวัน ห้องเรียนไม่มีการล็อกประตูและไม่มีครูเฝ้าเวร',
        detail: 'ตารางเรียนวันอังคาร: คาบ 4 (11:10-12:00) วิชาวิทยาศาสตร์ | พักกลางวัน (12:00-13:00) | หมายเหตุ: ประตูห้องเรียนไม่ได้ล็อกในช่วงพักกลางวัน'
      },
      {
        id: 'm1_e3',
        title: 'คำให้การของ "ใบเตย" (หัวหน้าห้อง)',
        icon: '👧',
        pos: { x: -21, y: 1.2, z: 22 },
        summary: 'ใบเตยเห็นเพื่อนต่างห้อง 2 คนเดินเข้ามาในห้อง ม.2/1 ตอน 12:25 น. อ้างว่ามาขอยืมไม้บรรทัด',
        detail: '“ตอน 12:25 น. หนูเดินผ่านหน้าห้อง เห็นนักเรียนชายต่างห้อง 2 คนเดินออกมาจากโต๊ะแถวกลาง พอถามก็บอกว่ามาขอยืมไม้บรรทัดค่ะ”'
      },
      {
        id: 'm1_e4',
        title: 'กล้องวงจรปิดหน้าอาคารเรียน',
        icon: '📹',
        pos: { x: -31, y: 1.2, z: 11 },
        summary: 'บันทึกภาพเวลา 12:26 น. พบนักเรียนสวมเสื้อพละวิ่งลงบันไดพร้อมถือวัตถุคล้ายโทรศัพท์เคสสีฟ้า',
        detail: 'ภาพจากกล้องวงจรปิดบริเวณโถงทางเดินชั้น 2 เวลา 12:26 น. บันทึกภาพนักเรียน 2 คนรีบวิ่งลงบันได โดยคนหนึ่งถือวัตถุสี่เหลี่ยมสีฟ้าอยู่ในมือ'
      }
    ],
    questions: [
      {
        w: 'WHO',
        tag: 'WHO (ใครเกี่ยวข้องกับปัญหา)',
        q: 'จากหลักฐานที่รวบรวมได้ บุคคลใดเกี่ยวข้องกับเหตุการณ์โทรศัพท์หายในฐานะ "ผู้เสียหาย" และ "ผู้ต้องสงสัย"?',
        options: [
          'ต้นกล้า (เจ้าของโทรศัพท์) และนักเรียนชายต่างห้อง 2 คน',
          'ครูประจำชั้นและแม่บ้านทำความสะอาด',
          'ใบเตย (หัวหน้าห้อง) และภารโรง',
          'นักเรียนชั้น ม.1 ที่เล่นฟุตบอลอยู่สนามกีฬา'
        ],
        correct: 0,
        explanation: 'คำถาม Who ใช้ระบุผู้ที่เกี่ยวข้องกับปัญหา ซึ่งได้แก่ ต้นกล้า (ผู้เสียหาย) และนักเรียนต่างห้อง 2 คนที่เข้ามาในห้องเรียนช่วงพักกลางวัน'
      },
      {
        w: 'WHAT',
        tag: 'WHAT (ปัญหาที่เกิดขึ้นคืออะไร)',
        q: 'ปัญหาหลักที่เกิดขึ้นในสถานการณ์นี้คืออะไร?',
        options: [
          'นักเรียนมาเข้าเรียนคาบบ่ายสาย',
          'โทรศัพท์มือถือเคสสีฟ้าของต้นกล้าสูญหายไปจากโต๊ะเรียน',
          'กล้องวงจรปิดหน้าอาคารเรียนเสียใช้งานไม่ได้',
          'ไม้บรรทัดของหัวหน้าห้องหายไป'
        ],
        correct: 1,
        explanation: 'คำถาม What ใช้ระบุประเด็นปัญหาที่เกิดขึ้นจริง นั่นคือ โทรศัพท์มือถือของต้นกล้าหายไปจากโต๊ะเรียน'
      },
      {
        w: 'WHEN',
        tag: 'WHEN (ปัญหาเกิดขึ้นเมื่อใด)',
        q: 'ช่วงเวลาใดที่คาดว่าโทรศัพท์มือถือถูกหยิบออกไปจากห้องเรียน?',
        options: [
          'ช่วงเช้าก่อนเข้าแถวเคารพธงชาติ (07:30 น.)',
          'ช่วงเรียนวิชาวิทยาศาสตร์ คาบที่ 4 (11:30 น.)',
          'ช่วงพักกลางวัน ระหว่างเวลา 12:05 - 12:45 น. (พบเบาะแสสำคัญตอน 12:25 น.)',
          'ช่วงเลิกเรียนตอนเย็น (16:30 น.)'
        ],
        correct: 2,
        explanation: 'คำถาม When ช่วยระบุกรอบเวลาเกิดเหตุ จากหลักฐานพบว่าต้นกล้าวางไว้ตอน 12:05 น. และกล้องจับภาพผู้ต้องสงสัยได้ตอน 12:26 น.'
      },
      {
        w: 'WHERE',
        tag: 'WHERE (ปัญหาเกิดขึ้นที่ไหน)',
        q: 'สถานที่เกิดเหตุที่โทรศัพท์วางอยู่ก่อนหายไปคือบริเวณใด?',
        options: [
          'บนโต๊ะอาหารภายในโรงอาหารโรงเรียน',
          'บนโต๊ะเรียนแถวกลาง ภายในห้องเรียน ม.2/1',
          'บริเวณอัฒจันทร์ข้างสนามกีฬา',
          'โต๊ะอ่านหนังสือภายในห้องสมุด'
        ],
        correct: 1,
        explanation: 'คำถาม Where ใช้ระบุตำแหน่งที่เกิดปัญหาอย่างเจาะจง คือ บนโต๊ะเรียนแถวกลาง ห้องเรียน ม.2/1'
      },
      {
        w: 'WHY',
        tag: 'WHY (เพราะเหตุใดจึงเกิดปัญหา)',
        q: 'สาเหตุสำคัญที่เปิดโอกาสให้เกิดปัญหาของหายในห้องเรียนคือข้อใด?',
        options: [
          'โรงเรียนมีนักเรียนจำนวนมากเกินไป',
          'วางของมีค่าทิ้งไว้บนโต๊ะโดยไม่มีคนเฝ้า และไม่ได้ล็อกประตูห้องเรียนช่วงพักกลางวัน',
          'โทรศัพท์มีสีฟ้าสะดุดตาเกินไป',
          'เพื่อนในห้องไม่ยอมนั่งเฝ้าห้องให้'
        ],
        correct: 1,
        explanation: 'คำถาม Why ช่วยวิเคราะห์รากเหง้าของปัญหา ซึ่งเกิดจากการวางทรัพย์สินมีค่าไว้ในที่ลับตาและประตูห้องเรียนไม่ได้ล็อกในช่วงพัก'
      },
      {
        w: 'HOW',
        tag: 'HOW (ปัญหาเกิดขึ้นอย่างไร / แนวทางแก้ไข)',
        q: 'เหตุการณ์นี้เกิดขึ้นได้อย่างไร และควรรวบรวมข้อมูลหรือป้องกันปัญหานี้อย่างไร?',
        options: [
          'สั่งห้ามนักเรียนทุกคนพกโทรศัพท์มาโรงเรียนตลอดไป',
          'ผู้ต้องสงสัยอาศัยจังหวะปลอดคนเข้ามาหยิบไป ควรนำภาพกล้องวงจรปิดแจ้งครู และสร้างข้อตกลงล็อกห้องช่วงพักกลางวัน',
          'ซื้อโทรศัพท์เครื่องใหม่ให้ต้นกล้าทันทีโดยไม่ต้องสืบหา',
          'ปิดห้องเรียนไม่ให้นักเรียนเข้าจนกว่าจะถึงเวลาเรียน'
        ],
        correct: 1,
        explanation: 'คำถาม How อธิบายลักษณะการเกิดปัญหาและแนวทางรวบรวมข้อมูล/แก้ไขอย่างเป็นระบบ โดยใช้หลักฐานจากกล้องวงจรปิดแจ้งครูและกำหนดมาตรการล็อกห้อง'
      }
    ]
  },
  {
    id: 2,
    badge: 'ภารกิจที่ 2 • โรงอาหารโรงเรียน',
    title: 'ปัญหาขยะล้นโรงอาหาร',
    icon: '🗑️',
    locationName: 'โรงอาหาร (Canteen)',
    shortDesc: 'หลังพักกลางวันมีขยะพลาสติกและเศษอาหารล้นถังส่งกลิ่นเหม็น ไปสำรวจโรงอาหารเพื่อหาสาเหตุที่แท้จริง',
    spawnPos: { x: 24, z: 10 },
    evidences: [
      {
        id: 'm2_e1',
        title: 'จุดถังขยะโซนทางออกโรงอาหาร',
        icon: '🚮',
        pos: { x: 22, y: 1.2, z: 16 },
        summary: 'พบถังขยะเพียง 2 ใบตั้งรวมกัน ขยะล้นออกมาบนพื้น ส่วนใหญ่เป็นแก้วพลาสติกและกล่องโฟมที่ไม่ได้แยกประเภท',
        detail: 'สภาพพื้นที่จริง: ถังขยะขนาดกลาง 2 ใบเต็มล้นจนขยะหกเกลื่อนพื้น พบขวดน้ำพลาสติก แก้วน้ำ และเศษอาหารปะปนกันทั้งหมด'
      },
      {
        id: 'm2_e2',
        title: 'คำให้การของ "ป้าศรี" (แม่บ้านโรงอาหาร)',
        icon: '👩‍🍳',
        pos: { x: 31, y: 1.2, z: 14 },
        summary: 'ป้าศรีบอกว่าช่วง 12:30 - 13:00 น. นักเรียนรีบขึ้นเรียน จึงเทรวมทุกอย่างลงถังเดียว และถังขยะมีไม่พอรองรับนักเรียน 600 คน',
        detail: '“ช่วง 12:30 น. เด็กๆ จะรีบไปเข้าเรียนคาบบ่าย เลยเททั้งน้ำ ทั้งเศษอาหาร และแก้วพลาสติกรวมกันในถัง 2 ใบนี้จนเต็มล้นทุกวันเลยลูก”'
      },
      {
        id: 'm2_e3',
        title: 'ป้ายสัญลักษณ์และจุดแยกขยะ',
        icon: '🪧',
        pos: { x: 33, y: 1.4, z: 22 },
        summary: 'ไม่พบป้ายบอกประเภทขยะและไม่มีจุดเทน้ำแข็ง/เศษอาหารแยกต่างหาก ทำให้ถังขยะเต็มเร็วผิดปกติ',
        detail: 'ผลการสำรวจอุปกรณ์: ไม่มีจุดเทน้ำและเศษอาหารแยกต่างหาก ทำให้แก้วน้ำที่มีน้ำแข็งเต็มใบถูกทิ้งลงถังขยะจนกินพื้นที่ถึง 60%'
      },
      {
        id: 'm2_e4',
        title: 'สถิติปริมาณขยะรายวันของโรงเรียน',
        icon: '📊',
        pos: { x: 25, y: 1.2, z: 23 },
        summary: 'ปริมาณขยะในโรงอาหารเพิ่มขึ้น 45% ในช่วง 1 เดือนที่ผ่านมา เนื่องจากร้านค้าใช้บรรจุภัณฑ์แบบใช้ครั้งเดียวทิ้ง',
        detail: 'บันทึกข้อมูลสิ่งแวดล้อม: โรงอาหารผลิตขยะเฉลี่ยวันละ 85 กิโลกรัม โดยกว่า 70% เป็นบรรจุภัณฑ์พลาสติกแบบใช้ครั้งเดียวทิ้ง'
      }
    ],
    questions: [
      {
        w: 'WHO',
        tag: 'WHO (ใครเกี่ยวข้องกับปัญหา)',
        q: 'กลุ่มบุคคลใดบ้างที่มีส่วนเกี่ยวข้องโดยตรงกับปัญหาขยะในโรงอาหาร?',
        options: [
          'นักเรียนที่มาใช้บริการโรงอาหาร ร้านค้า และแม่บ้านทำความสะอาด',
          'นักกีฬาฟุตบอลและครูพละศึกษา',
          'บรรณารักษ์ห้องสมุดและนักเรียนชมรมดนตรี',
          'ผู้ปกครองที่มารับนักเรียนหน้าโรงเรียน'
        ],
        correct: 0,
        explanation: 'Who ในปัญหานี้คือผู้มีส่วนได้ส่วนเสียทั้งหมดในโรงอาหาร ได้แก่ นักเรียน (ผู้ทิ้ง), ร้านค้า (ผู้แจกบรรจุภัณฑ์) และแม่บ้าน (ผู้จัดเก็บ)'
      },
      {
        w: 'WHAT',
        tag: 'WHAT (ปัญหาที่เกิดขึ้นคืออะไร)',
        q: 'ปัญหาสำคัญที่พบจากการสำรวจโรงอาหารคืออะไร?',
        options: [
          'อาหารในโรงอาหารมีราคาแพงเกินไป',
          'ขยะพลาสติกและเศษอาหารล้นถังกระจายบนพื้น ไม่มีการคัดแยกขยะ',
          'โต๊ะและเก้าอี้ในโรงอาหารชำรุดทั้งหมด',
          'น้ำดื่มในโรงอาหารไม่เพียงพอ'
        ],
        correct: 1,
        explanation: 'What คือสภาพปัญหาที่ปรากฏชัดเจน คือ ปริมาณขยะล้นถังและไม่มีการคัดแยกประเภทขยะ'
      },
      {
        w: 'WHEN',
        tag: 'WHEN (ปัญหาเกิดขึ้นเมื่อใด)',
        q: 'ช่วงเวลาใดที่ปัญหาขยะล้นถังเกิดขึ้นรุนแรงที่สุด?',
        options: [
          'ช่วงเช้าเวลา 07:00 น. ก่อนเปิดเรียน',
          'ช่วงพักกลางวันตอนท้าย เวลา 12:30 - 13:00 น.',
          'ช่วงเย็นเวลา 17:30 น. หลังโรงเรียนปิด',
          'วันเสาร์และวันอาทิตย์'
        ],
        correct: 1,
        explanation: 'When ระบุช่วงเวลาวิกฤตของปัญหา คือ ช่วงท้ายพักกลางวัน (12:30-13:00 น.) ที่นักเรียนทุกคนทานเสร็จพร้อมกันและรีบขึ้นเรียน'
      },
      {
        w: 'WHERE',
        tag: 'WHERE (ปัญหาเกิดขึ้นที่ไหน)',
        q: 'บริเวณใดในโรงเรียนที่พบการสะสมของขยะมากที่สุด?',
        options: [
          'บริเวณหน้าห้องสมุดและลานเสาธง',
          'บริเวณจุดวางถังขยะโซนทางออกโรงอาหาร',
          'บริเวณหน้าห้องพักครูชั้น 2',
          'บริเวณสนามบาสเกตบอล'
        ],
        correct: 1,
        explanation: 'Where ระบุจุดเกิดเหตุ คือ โซนวางถังขยะบริเวณทางออกของโรงอาหาร'
      },
      {
        w: 'WHY',
        tag: 'WHY (เพราะเหตุใดจึงเกิดปัญหา)',
        q: 'สาเหตุหลักที่ทำให้ถังขยะในโรงอาหารเต็มล้นอย่างรวดเร็วคืออะไร?',
        options: [
          'ถังขยะมีจำนวนน้อย ไม่มีการแยกเทน้ำ/เศษอาหาร และใช้พลาสติกแบบใช้ครั้งเดียวทิ้งจำนวนมาก',
          'แม่บ้านไม่ยอมมาทำงานในช่วงกลางวัน',
          'นักเรียนไม่ชอบเดินไปทิ้งขยะ',
          'โรงอาหารไม่มีหลังคากันฝน'
        ],
        correct: 0,
        explanation: 'Why วิเคราะห์สาเหตุเชิงระบบ: จำนวนถังไม่สัมพันธ์กับนักเรียน 600 คน และไม่มีจุดเทของเหลวทำให้ขยะกินพื้นที่ถัง'
      },
      {
        w: 'HOW',
        tag: 'HOW (จะรวบรวมข้อมูลหรือแก้ไขปัญหาอย่างไร)',
        q: 'แนวทางการแก้ไขปัญหาขยะในโรงอาหารตามกระบวนการออกแบบและเทคโนโลยีข้อใดเหมาะสมที่สุด?',
        options: [
          'สั่งปิดโรงอาหารไม่ให้นักเรียนเข้ามารับประทานอาหาร',
          'เพิ่มจุดคัดแยกขยะ 4 ประเภทพร้อมถังเทน้ำ/เศษอาหาร ติดป้ายชัดเจน และรณรงค์ใช้ภาชนะส่วนตัว',
          'นำถังขยะทั้งหมดไปซ่อนไว้หลังโรงเรียน',
          'ลงโทษหักคะแนนนักเรียนทุกคนที่เดินเข้าโรงอาหาร'
        ],
        correct: 1,
        explanation: 'How คือการออกแบบวิธีการแก้ปัญหาให้ตรงจุด ทั้งการเพิ่มจุดเทน้ำ แยกประเภทขยะ และลดขยะตั้งแต่ต้นทาง'
      }
    ]
  },
  {
    id: 3,
    badge: 'ภารกิจที่ 3 • สนามกีฬาโรงเรียน',
    title: 'ปริศนาน้ำท่วมขังสนามกีฬา',
    icon: '🌊',
    locationName: 'สนามกีฬา (Sports Field)',
    shortDesc: 'ทุกครั้งที่ฝนตก สนามกีฬามักมีน้ำท่วมขังจนเรียนพลศึกษาไม่ได้ ลงพื้นที่สำรวจท่อระบายน้ำและสัมภาษณ์ครูพละ',
    spawnPos: { x: 0, z: -18 },
    evidences: [
      {
        id: 'm3_e1',
        title: 'แอ่งน้ำท่วมขังกลางสนามกีฬา',
        icon: '💧',
        pos: { x: -4, y: 1.2, z: -28 },
        summary: 'พบแอ่งน้ำขังกว้างบริเวณฝั่งทิศตะวันตกของสนาม ลึกประมาณ 10 ซม. พื้นสนามเป็นแอ่งต่ำกว่าขอบทางเดิน',
        detail: 'การสำรวจพื้นที่: บริเวณฝั่งตะวันตกของสนามกีฬาเป็นแอ่งต่ำกว่าขอบปูนทางเดิน ทำให้น้ำฝนไหลมารวมตัวกันเป็นแอ่งใหญ่'
      },
      {
        id: 'm3_e2',
        title: 'ตะแกรงท่อระบายน้ำข้างสนาม',
        icon: '🕳️',
        pos: { x: 10, y: 1.2, z: -26 },
        summary: 'ท่อระบายน้ำอุดตันไปด้วยใบไม้แห้ง ถุงพลาสติก และดินโคลนสะสม ทำให้น้ำไม่สามารถไหลลงท่อได้',
        detail: 'หลักฐานสำคัญ: ตะแกรงเหล็กปิดท่อระบายน้ำมีเศษใบไม้แห้ง ถุงขนม และดินโคลนอัดแน่นจนน้ำแทบไม่สามารถไหลผ่านลงท่อได้'
      },
      {
        id: 'm3_e3',
        title: 'คำให้การของ "ครูเอก" (ครูวิชาพลศึกษา)',
        icon: '🏃',
        pos: { x: -10, y: 1.2, z: -24 },
        summary: 'ครูเอกให้ข้อมูลว่าช่วงฤดูฝน (เดือน ก.ค.-ก.ย.) หลังฝนตกหนัก 30 นาที น้ำจะท่วมขังนานกว่า 4 ชั่วโมงจนงดสอนภาคปฏิบัติ',
        detail: '“ช่วงบ่ายในฤดูฝน พอฝนตกหนักแค่ 30 นาที น้ำก็ท่วมสนามขังอยู่นาน 4-5 ชั่วโมง ทำให้เด็กๆ ม.2 เรียนวิชาพลศึกษาไม่ได้เลยครับ”'
      },
      {
        id: 'm3_e4',
        title: 'แผนผังระบบระบายน้ำโรงเรียน',
        icon: '🗺️',
        pos: { x: 7, y: 1.4, z: -34 },
        summary: 'ท่อระบายน้ำฝั่งสนามกีฬามีขนาดเล็กและไม่ได้รับการลอกท่อประจำปี รวมถึงไม่มีรางระบายน้ำรอบขอบสนาม',
        detail: 'ข้อมูลทางวิศวกรรมอาคาร: ท่อระบายน้ำหลักฝั่งสนามกีฬาเส้นผ่านศูนย์กลางเล็ก และขาดการขุดลอกตะกอนก่อนเข้าสู่ฤดูฝน'
      }
    ],
    questions: [
      {
        w: 'WHO',
        tag: 'WHO (ใครเกี่ยวข้องกับปัญหา)',
        q: 'ใครบ้างที่ได้รับผลกระทบและมีส่วนเกี่ยวข้องกับปัญหาน้ำท่วมขังสนามกีฬา?',
        options: [
          'นักเรียนที่เรียนวิชาพลศึกษา ครูพลศึกษา และฝ่ายอาคารสถานที่ของโรงเรียน',
          'แม่ค้าขายอาหารในโรงอาหารและนักเรียนอนุบาล',
          'เจ้าหน้าที่ห้องพยาบาลและครูภาษาอังกฤษ',
          'คนขับรถรับส่งนักเรียนหน้าโรงเรียน'
        ],
        correct: 0,
        explanation: 'Who คือผู้ได้รับผลกระทบ (นักเรียนและครูพละ) และผู้รับผิดชอบดูแลระบบระบายน้ำ (ฝ่ายอาคารสถานที่)'
      },
      {
        w: 'WHAT',
        tag: 'WHAT (ปัญหาที่เกิดขึ้นคืออะไร)',
        q: 'ปัญหาหลักที่เกิดขึ้นบริเวณสนามกีฬาคืออะไร?',
        options: [
          'เส้นตีกรอบสนามฟุตบอลเลือนหายไป',
          'เกิดน้ำท่วมขังบนสนามกีฬาเป็นเวลานานหลังฝนตก จนไม่สามารถใช้เรียนและทำกิจกรรมได้',
          'หญ้าในสนามกีฬายาวเกินไป',
          'ลูกฟุตบอลของโรงเรียนมีไม่เพียงพอ'
        ],
        correct: 1,
        explanation: 'What คือสภาพปัญหาที่เกิดขึ้นจริง คือ น้ำท่วมขังบนพื้นสนามเป็นเวลานานจนใช้งานไม่ได้'
      },
      {
        w: 'WHEN',
        tag: 'WHEN (ปัญหาเกิดขึ้นเมื่อใด)',
        q: 'ปัญหาน้ำท่วมขังสนามกีฬาเกิดขึ้นในช่วงเวลาใด?',
        options: [
          'ช่วงฤดูร้อนตอนเช้าตรู่',
          'ในช่วงฤดูฝน ทันทีหลังจากมีฝนตกหนัก และขังนาน 4-5 ชั่วโมง',
          'เฉพาะช่วงปิดภาคเรียนเท่านั้น',
          'ช่วงเวลากลางคืนหลังเที่ยงคืน'
        ],
        correct: 1,
        explanation: 'When ระบุเงื่อนไขเวลาเกิดเหตุ คือ ช่วงฤดูฝนหลังฝนตกหนัก 30 นาที และท่วมขังต่อเนื่อง 4-5 ชั่วโมง'
      },
      {
        w: 'WHERE',
        tag: 'WHERE (ปัญหาเกิดขึ้นที่ไหน)',
        q: 'ตำแหน่งใดที่เกิดน้ำท่วมขังและพบจุดอุดตันของระบบระบายน้ำ?',
        options: [
          'บริเวณโถงทางเดินชั้น 1 อาคารเรียน',
          'บริเวณสนามกีฬาฝั่งทิศตะวันตก และท่อระบายน้ำข้างสนาม',
          'บริเวณหน้าห้องสมุดโรงเรียน',
          'บริเวณโรงจอดรถจักรยาน'
        ],
        correct: 1,
        explanation: 'Where ระบุพิกัดปัญหา คือ พื้นที่แอ่งต่ำฝั่งตะวันตกของสนามกีฬาและแนวท่อระบายน้ำข้างสนาม'
      },
      {
        w: 'WHY',
        tag: 'WHY (เพราะเหตุใดจึงเกิดปัญหา)',
        q: 'สาเหตุสำคัญที่ทำให้น้ำระบายออกจากสนามกีฬาไม่ทันคือข้อใด?',
        options: [
          'พื้นสนามเป็นแอ่งต่ำ และท่อระบายน้ำอุดตันจากใบไม้ ขยะ และดินโคลนสะสม',
          'นักเรียนวิ่งเล่นในสนามกีฬาพร้อมกันหลายคน',
          'โรงเรียนปลูกต้นไม้รอบสนามน้อยเกินไป',
          'แสงแดดส่องไม่ถึงสนามกีฬา'
        ],
        correct: 0,
        explanation: 'Why คือการวิเคราะห์สาเหตุเชิงกายภาพ ได้แก่ ลักษณะพื้นสนามที่เป็นแอ่งต่ำร่วมกับการอุดตันของท่อระบายน้ำ'
      },
      {
        w: 'HOW',
        tag: 'HOW (จะรวบรวมข้อมูลหรือแก้ไขปัญหาอย่างไร)',
        q: 'วิธีการแก้ไขปัญหาน้ำท่วมขังสนามกีฬาอย่างยั่งยืนตามหลักการออกแบบและเทคโนโลยีคือข้อใด?',
        options: [
          'ใช้ผ้าเช็ดพื้นซับน้ำออกจากสนามหลังฝนหยุดตกทุกครั้ง',
          'ขุดลอกท่อระบายน้ำ ติดตั้งตะแกรงดักขยะ/ใบไม้ และปรับระดับพื้นสนามพร้อมทำรางระบายน้ำรอบขอบ',
          'ย้ายไปเรียนวิชาพลศึกษาในห้องสมุดแทน',
          'เทปูนซีเมนต์ทับสนามหญ้าทั้งหมด'
        ],
        correct: 1,
        explanation: 'How คือการวางแผนแก้ปัญหาที่ต้นเหตุ ทั้งการลอกท่อ ติดตั้งตะแกรงดักขยะ และปรับปรุงทางระบายน้ำรอบสนาม'
      }
    ]
  }
];

/* ==========================================================================
   4. PLAYER STATE, SHARED SERVER SYNC & LEADERBOARD
   ========================================================================== */
const STORAGE_KEY = '5w1h_detective_save_v6';
const SERVER_CHANNEL_NAME = '5w1h_school_shared_server_v4';

let gameState = {
  player: {
    id: 'det_' + Math.random().toString(36).substring(2, 9),
    name: '',
    no: '',
    appearance: { ...DEFAULT_APPEARANCE },
    unlockedMission: 1,
    scores: { 1: 0, 2: 0, 3: 0 },
    stars: { 1: 0, 2: 0, 3: 0 }
  },
  currentMissionId: 1,
  collectedEvidences: [],
  quizState: {
    step: 0,
    score: 0,
    speedBonusTotal: 0,
    questionStartTime: 0,
    timerInterval: null,
    answered: false
  },
  lastScreenBeforeModal: 'screen-home'
};

let onlinePlayers = {};
let serverChannel = null;
let currentEmote = { type: 'none', endTime: 0 };

function loadSaveData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.player) {
        gameState.player = {
          ...gameState.player,
          ...parsed.player,
          appearance: { ...DEFAULT_APPEARANCE, ...(parsed.player.appearance || {}) }
        };
      }
    }
  } catch (e) {
    console.warn('Could not load save data', e);
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ player: gameState.player }));
    broadcastPlayerState();
    rebuildWorldPodium();
  } catch (e) {
    console.warn('Could not save data', e);
  }
}

function getTotalScore(p = gameState.player) {
  return (p.scores[1] || 0) + (p.scores[2] || 0) + (p.scores[3] || 0);
}

function getRankedPlayersList() {
  const entries = [];
  Object.values(onlinePlayers).forEach(p => {
    entries.push({
      id: p.id,
      name: p.name,
      no: p.no,
      appearance: p.appearance || DEFAULT_APPEARANCE,
      s1: p.scores[1] || 0,
      s2: p.scores[2] || 0,
      s3: p.scores[3] || 0,
      isSelf: false
    });
  });

  if (gameState.player.name) {
    entries.push({
      id: gameState.player.id,
      name: gameState.player.name,
      no: gameState.player.no,
      appearance: gameState.player.appearance,
      s1: gameState.player.scores[1] || 0,
      s2: gameState.player.scores[2] || 0,
      s3: gameState.player.scores[3] || 0,
      isSelf: true
    });
  }

  entries.forEach(e => { e.total = e.s1 + e.s2 + e.s3; });
  entries.sort((a, b) => b.total - a.total);
  return entries;
}

/* ==========================================================================
   5. REAL-TIME MULTIPLAYER SERVER ENGINE
   ========================================================================== */
const CLASSMATE_BOTS = [
  {
    id: 'bot_1',
    name: 'ด.ญ. พลอยใส',
    no: 'เลขที่ 4 ม.2/1',
    appearance: { vehicle: 'skateboard', skin: '#fde0c3', hairStyle: 'pigtails', hairColor: '#ec4899', outfit: 'student_blue', glasses: 'round', hat: 'cat_ears' },
    scores: { 1: 620, 2: 515, 3: 410 },
    x: -12, y: 0, z: 6, rotY: 0.5,
    waypoints: [{ x: -12, z: 6 }, { x: -24, z: 12 }, { x: -18, z: 18 }, { x: -5, z: 8 }],
    wpIdx: 0, chat: 'ทรงผมแกละสองข้างน่ารักมาก!'
  },
  {
    id: 'bot_2',
    name: 'ด.ช. ภูผา',
    no: 'เลขที่ 9 ม.2/1',
    appearance: { vehicle: 'gokart', skin: '#e0ac69', hairStyle: 'spiky', hairColor: '#ef4444', outfit: 'pe_red', glasses: 'cool', hat: 'crown' },
    scores: { 1: 510, 2: 625, 3: 320 },
    x: 15, y: 0, z: 8, rotY: -0.8,
    waypoints: [{ x: 15, z: 8 }, { x: 24, z: 15 }, { x: 28, z: 20 }, { x: 12, z: 12 }],
    wpIdx: 0, chat: 'รถโกคาร์ทซิ่งสุดๆ ไปเลย!'
  },
  {
    id: 'bot_3',
    name: 'ด.ญ. น้ำหวาน',
    no: 'เลขที่ 18 ม.2/1',
    appearance: { vehicle: 'scooter', skin: '#f5cba7', hairStyle: 'odango', hairColor: '#38bdf8', outfit: 'dino_suit', glasses: 'none', hat: 'alien_antenna' },
    scores: { 1: 415, 2: 420, 3: 615 },
    x: 2, y: 0, z: -15, rotY: 3.1,
    waypoints: [{ x: 2, z: -15 }, { x: -4, z: -26 }, { x: 8, z: -26 }, { x: 0, z: -12 }],
    wpIdx: 0, chat: 'มาดูท่อระบายน้ำสนามกีฬาเร็ว!'
  }
];

function initMultiplayerServer() {
  CLASSMATE_BOTS.forEach(bot => {
    onlinePlayers[bot.id] = {
      ...bot,
      isBot: true,
      emote: 'none',
      lastSeen: Date.now()
    };
  });

  if ('BroadcastChannel' in window) {
    serverChannel = new BroadcastChannel(SERVER_CHANNEL_NAME);
    serverChannel.onmessage = (event) => {
      const msg = event.data;
      if (!msg || !msg.player || msg.player.id === gameState.player.id) return;
      if (msg.type === 'SYNC_PLAYER') {
        const existing = onlinePlayers[msg.player.id];
        onlinePlayers[msg.player.id] = {
          ...msg.player,
          isBot: false,
          lastSeen: Date.now(),
          chat: msg.chat || (existing ? existing.chat : ''),
          emote: msg.emote || 'none'
        };
        if (msg.scoreUpdated) rebuildWorldPodium();
      }
    };
  }

  setInterval(() => {
    if (!gameState.player.name) return;
    broadcastPlayerState();
    cleanupDisconnectedPlayers();
  }, 150);
}

let pendingChatMsg = '';
let selfChatTimer = 0;
let selfChatText = '';

function broadcastPlayerState(scoreUpdated = false) {
  if (!serverChannel || !gameState.player.name) return;
  serverChannel.postMessage({
    type: 'SYNC_PLAYER',
    scoreUpdated,
    player: {
      id: gameState.player.id,
      name: gameState.player.name,
      no: gameState.player.no,
      appearance: gameState.player.appearance,
      scores: gameState.player.scores,
      x: playerGroup ? playerGroup.position.x : 0,
      y: playerGroup ? playerGroup.position.y : 0,
      z: playerGroup ? playerGroup.position.z : 10,
      rotY: playerGroup ? playerGroup.rotation.y : 0
    },
    chat: pendingChatMsg,
    emote: currentEmote.type
  });
  pendingChatMsg = '';
}

function cleanupDisconnectedPlayers() {
  const now = Date.now();
  let count = 1;
  Object.keys(onlinePlayers).forEach(id => {
    const p = onlinePlayers[id];
    if (!p.isBot && now - p.lastSeen > 4000) {
      delete onlinePlayers[id];
      removeRemotePlayerMesh(id);
      rebuildWorldPodium();
    } else {
      count++;
    }
  });
  const el = document.getElementById('hud-online-count');
  if (el) el.textContent = `${count} คนออนไลน์`;
}

function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return;
  pendingChatMsg = text;
  selfChatTimer = 240;
  selfChatText = text;
  input.value = '';
  broadcastPlayerState();
  toggleOnlineModal();
  showToast('ส่งข้อความแชทแล้ว 💬');
}

/* ==========================================================================
   6. THREE.JS 3D CHARACTER, VEHICLES, HAIRSTYLES & HEADGEAR BUILDER
   ========================================================================== */
function buildDetectiveCharacterMesh(appearance) {
  const app = { ...DEFAULT_APPEARANCE, ...(appearance || {}) };
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const skinMat = new THREE.MeshStandardMaterial({ color: app.skin, roughness: 0.65 });
  const hairMat = new THREE.MeshStandardMaterial({ color: app.hairColor, roughness: 0.7 });

  // Vehicle Mesh under feet
  let rideHeight = 0;
  if (app.vehicle === 'skateboard') {
    rideHeight = 0.18;
    const deck = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.08, 1.65),
      new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 })
    );
    deck.position.y = 0.12;
    deck.castShadow = true;
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    [[-0.28, 0.55], [0.28, 0.55], [-0.28, -0.55], [0.28, -0.55]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.1, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.08, wz);
      root.add(w);
    });
    root.add(deck);
  } else if (app.vehicle === 'scooter') {
    rideHeight = 0.18;
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.08, 1.55),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.4 })
    );
    board.position.y = 0.12;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.45, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6 })
    );
    stem.position.set(0, 0.85, 0.65);
    const handlebar = new THREE.Mesh(
      new THREE.BoxGeometry(0.75, 0.07, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x0f172a })
    );
    handlebar.position.set(0, 1.55, 0.65);
    root.add(board, stem, handlebar);
  } else if (app.vehicle === 'hoverboard') {
    rideHeight = 0.28;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.65, 0.14, 18),
      new THREE.MeshStandardMaterial({ color: 0x8b5cf6, metalness: 0.5, roughness: 0.2 })
    );
    disc.position.y = 0.2;
    const glowRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.04, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    glowRing.rotation.x = Math.PI / 2;
    glowRing.position.y = 0.16;
    root.add(disc, glowRing);
  } else if (app.vehicle === 'gokart') {
    rideHeight = 0.25;
    const chassis = new THREE.Mesh(
      new THREE.BoxGeometry(1.15, 0.32, 1.9),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 })
    );
    chassis.position.y = 0.26;
    chassis.castShadow = true;
    const bumper = new THREE.Mesh(
      new THREE.BoxGeometry(1.22, 0.16, 0.25),
      new THREE.MeshStandardMaterial({ color: 0xfacc15 })
    );
    bumper.position.set(0, 0.22, 0.95);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    [[-0.62, 0.6], [0.62, 0.6], [-0.62, -0.6], [0.62, -0.6]].forEach(([wx, wz]) => {
      const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.18, 12), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.22, wz);
      root.add(w);
    });
    root.add(chassis, bumper);
  }

  bodyGroup.position.y = rideHeight;

  // Outfit Palette & Special Costumes
  let shirtColor = 0xffffff;
  let pantsColor = 0x1d4ed8;
  let accentColor = 0xf59e0b;
  let hasCoat = false;

  if (app.outfit === 'student_black') {
    shirtColor = 0xffffff; pantsColor = 0x1e293b; accentColor = 0x38bdf8;
  } else if (app.outfit === 'pe_red') {
    shirtColor = 0xdc2626; pantsColor = 0x991b1b; accentColor = 0xffffff;
  } else if (app.outfit === 'detective_coat') {
    shirtColor = 0xd97706; pantsColor = 0x78350f; accentColor = 0xfef3c7; hasCoat = true;
  } else if (app.outfit === 'hoodie_cyber') {
    shirtColor = 0x6d28d9; pantsColor = 0x0f172a; accentColor = 0x38bdf8;
  } else if (app.outfit === 'dino_suit') {
    shirtColor = 0x22c55e; pantsColor = 0x16a34a; accentColor = 0xfacc15;
  } else if (app.outfit === 'banana_suit') {
    shirtColor = 0xfacc15; pantsColor = 0x1e293b; accentColor = 0x854d0e;
  } else if (app.outfit === 'super_undies') {
    shirtColor = 0x0284c7; pantsColor = 0x0284c7; accentColor = 0xef4444;
  }

  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.6 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: pantsColor, roughness: 0.7 });
  const accentMat = new THREE.MeshStandardMaterial({ color: accentColor, roughness: 0.5 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });

  // Legs
  const legGeo = new THREE.BoxGeometry(0.32, 0.75, 0.32);
  const leftLeg = new THREE.Mesh(legGeo, pantsMat);
  leftLeg.position.set(-0.22, 0.38, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, pantsMat);
  rightLeg.position.set(0.22, 0.38, 0);
  rightLeg.castShadow = true;

  // Shoes
  const shoeGeo = new THREE.BoxGeometry(0.35, 0.18, 0.44);
  const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
  leftShoe.position.set(0, -0.32, 0.05);
  leftLeg.add(leftShoe);
  const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
  rightShoe.position.set(0, -0.32, 0.05);
  rightLeg.add(rightShoe);

  bodyGroup.add(leftLeg, rightLeg);

  // Torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.96, 0.52), shirtMat);
  torso.position.y = 1.22;
  torso.castShadow = true;
  bodyGroup.add(torso);

  // Outfit Specific Details
  if (app.outfit === 'pe_red') {
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.14, 0.55), accentMat);
    collar.position.set(0, 1.66, 0);
    const stripeL = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.12), accentMat);
    stripeL.position.set(-0.39, 0.38, 0);
    leftLeg.add(stripeL);
    const stripeR = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.75, 0.12), accentMat);
    stripeR.position.set(0.39, 0.38, 0);
    rightLeg.add(stripeR);
    bodyGroup.add(collar);
  } else if (hasCoat) {
    const coatSkirt = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.5, 0.58), shirtMat);
    coatSkirt.position.y = 0.78;
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.18, 0.58), accentMat);
    scarf.position.y = 1.66;
    bodyGroup.add(coatSkirt, scarf);
  } else if (app.outfit === 'dino_suit') {
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.76, 0.08), accentMat);
    belly.position.set(0, 1.2, 0.26);
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.9, 6), shirtMat);
    tail.rotation.x = -Math.PI / 2.4;
    tail.position.set(0, 0.85, -0.55);
    bodyGroup.add(belly, tail);
    for (let i = 0; i < 3; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.24, 4), new THREE.MeshStandardMaterial({ color: 0xf97316 }));
      spike.rotation.x = -Math.PI / 2;
      spike.position.set(0, 1.55 - i * 0.25, -0.34);
      bodyGroup.add(spike);
    }
  } else if (app.outfit === 'banana_suit') {
    const bananaBody = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 1.85, 10), shirtMat);
    bananaBody.position.set(0, 1.5, -0.02);
    bananaBody.rotation.x = 0.08;
    const bananaTip = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.32, 6), accentMat);
    bananaTip.position.set(0, 2.52, 0.06);
    bananaTip.rotation.x = 0.15;
    bodyGroup.add(bananaBody, bananaTip);
  } else if (app.outfit === 'super_undies') {
    const undies = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.34, 0.56), accentMat);
    undies.position.set(0, 0.86, 0);
    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.1, 0.58), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    belt.position.set(0, 1.03, 0);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.18), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    emblem.scale.set(1, 1, 0.3);
    emblem.position.set(0, 1.38, 0.27);
    const cape = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.15, 0.06), accentMat);
    cape.position.set(0, 1.12, -0.32);
    cape.rotation.x = 0.18;
    bodyGroup.add(undies, belt, emblem, cape);
  } else {
    const tie = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.05), accentMat);
    tie.position.set(0, 1.35, 0.27);
    bodyGroup.add(tie);
  }

  // Arms
  const armGeo = new THREE.BoxGeometry(0.24, 0.78, 0.24);
  const leftArm = new THREE.Mesh(armGeo, shirtMat);
  leftArm.position.set(-0.58, 1.24, 0);
  const rightArm = new THREE.Mesh(armGeo, shirtMat);
  rightArm.position.set(0.58, 1.24, 0);

  const handGeo = new THREE.SphereGeometry(0.13, 8, 8);
  const leftHand = new THREE.Mesh(handGeo, skinMat);
  leftHand.position.y = -0.4;
  leftArm.add(leftHand);
  const rightHand = new THREE.Mesh(handGeo, skinMat);
  rightHand.position.y = -0.4;
  rightArm.add(rightHand);

  bodyGroup.add(leftArm, rightArm);

  // Head Group
  const headGroup = new THREE.Group();
  headGroup.position.y = 2.08;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.76, 0.76), skinMat);
  head.castShadow = true;
  headGroup.add(head);

  // Eyes
  const eyeGeo = new THREE.SphereGeometry(0.065, 8, 8);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });
  const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
  leftEye.position.set(-0.17, 0.06, 0.38);
  const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
  rightEye.position.set(0.17, 0.06, 0.38);
  headGroup.add(leftEye, rightEye);

  // Hairstyles (14 Stylish Options + Fixed Cute Pigtails)
  const hairGroup = new THREE.Group();
  const topHair = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.24, 0.82), hairMat);
  topHair.position.y = 0.36;
  const backHair = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.56, 0.22), hairMat);
  backHair.position.set(0, 0.12, -0.34);
  hairGroup.add(topHair, backHair);

  if (app.hairStyle === 'bob') {
    const leftSide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.78), hairMat);
    leftSide.position.set(-0.38, 0.05, -0.02);
    const rightSide = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.65, 0.78), hairMat);
    rightSide.position.set(0.38, 0.05, -0.02);
    hairGroup.add(leftSide, rightSide);
  } else if (app.hairStyle === 'spiky') {
    for (let i = -1; i <= 1; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.42, 5), hairMat);
      spike.position.set(i * 0.22, 0.56, 0.05);
      spike.rotation.z = -i * 0.25;
      hairGroup.add(spike);
    }
  } else if (app.hairStyle === 'ponytail') {
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 0.85, 8), hairMat);
    tail.position.set(0, -0.05, -0.5);
    tail.rotation.x = 0.25;
    hairGroup.add(tail);
  } else if (app.hairStyle === 'afro') {
    const afroMain = new THREE.Mesh(new THREE.SphereGeometry(0.58, 12, 12), hairMat);
    afroMain.position.set(0, 0.32, -0.06);
    hairGroup.add(afroMain);
  } else if (app.hairStyle === 'pigtails') {
    const frontBangs = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.15, 0.12), hairMat);
    frontBangs.position.set(0, 0.28, 0.38);
    hairGroup.add(frontBangs);

    const tieMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, roughness: 0.4 });
    [-1, 1].forEach(side => {
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.045, 8, 14), tieMat);
      tie.position.set(side * 0.44, 0.22, -0.05);
      tie.rotation.y = Math.PI / 2;

      const puffTop = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 12), hairMat);
      puffTop.position.set(side * 0.56, 0.14, -0.08);

      const puffBottom = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), hairMat);
      puffBottom.position.set(side * 0.64, -0.1, -0.1);

      hairGroup.add(tie, puffTop, puffBottom);
    });
  } else if (app.hairStyle === 'mohawk') {
    for (let z = -0.25; z <= 0.25; z += 0.16) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.44, 0.14), hairMat);
      fin.position.set(0, 0.56, z);
      hairGroup.add(fin);
    }
  } else if (app.hairStyle === 'buns') {
    const bunL = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), hairMat);
    bunL.position.set(-0.38, 0.48, -0.05);
    const bunR = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 10), hairMat);
    bunR.position.set(0.38, 0.48, -0.05);
    hairGroup.add(bunL, bunR);
  } else if (app.hairStyle === 'bowl') {
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.48, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
    dome.position.set(0, 0.05, 0);
    hairGroup.add(dome);
  } else if (app.hairStyle === 'saiyan') {
    for (let i = 0; i < 6; i++) {
      const ang = (i / 6) * Math.PI * 2;
      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.65, 5), hairMat);
      flame.position.set(Math.cos(ang) * 0.18, 0.68, Math.sin(ang) * 0.18);
      flame.rotation.z = -Math.cos(ang) * 0.35;
      flame.rotation.x = Math.sin(ang) * 0.35;
      hairGroup.add(flame);
    }
  } else if (app.hairStyle === 'odango') {
    const topBun = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12), hairMat);
    topBun.position.set(0, 0.58, -0.08);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), new THREE.MeshStandardMaterial({ color: 0xfacc15 }));
    pin.rotation.z = Math.PI / 2.3;
    pin.position.set(0, 0.58, -0.08);
    hairGroup.add(topBun, pin);
  } else if (app.hairStyle === 'twintails_long') {
    [-0.5, 0.5].forEach((tx, idx) => {
      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.24, 1.15, 8), hairMat);
      tail.position.set(tx, -0.18, -0.12);
      tail.rotation.z = idx === 0 ? 0.18 : -0.18;
      hairGroup.add(tail);
    });
  } else if (app.hairStyle === 'choppy_bangs') {
    const bangs = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.18, 0.12), hairMat);
    bangs.position.set(0, 0.25, 0.39);
    const sideL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.65), hairMat);
    sideL.position.set(-0.39, 0.12, 0.02);
    const sideR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.45, 0.65), hairMat);
    sideR.position.set(0.39, 0.12, 0.02);
    hairGroup.add(bangs, sideL, sideR);
  } else if (app.hairStyle === 'side_braid') {
    for (let b = 0; b < 4; b++) {
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.13 - b * 0.015, 8, 8), hairMat);
      bead.position.set(0.42, 0.15 - b * 0.22, 0.15 + b * 0.04);
      hairGroup.add(bead);
    }
  }
  headGroup.add(hairGroup);

  // Glasses
  if (app.glasses !== 'none') {
    const frameMat = new THREE.MeshStandardMaterial({ color: app.glasses === 'cool' ? 0x0f172a : 0x78350f });
    const lensMat = new THREE.MeshBasicMaterial({ color: app.glasses === 'cool' ? 0x020617 : 0xbae6fd, transparent: true, opacity: app.glasses === 'cool' ? 0.9 : 0.45 });
    [-0.18, 0.18].forEach(gx => {
      const rim = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.06), frameMat);
      rim.position.set(gx, 0.06, 0.4);
      const lens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.12, 0.07), lensMat);
      lens.position.set(gx, 0.06, 0.4);
      headGroup.add(rim, lens);
    });
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.04, 0.06), frameMat);
    bridge.position.set(0, 0.08, 0.4);
    headGroup.add(bridge);
  }

  // Hats & Head Props (7 Options)
  if (app.hat === 'detective') {
    const hatMat = new THREE.MeshStandardMaterial({ color: 0x78350f });
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.64, 0.07, 16), hatMat);
    brim.position.y = 0.46;
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.34, 16), hatMat);
    crown.position.y = 0.64;
    const ribbon = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xf59e0b }));
    ribbon.position.y = 0.51;
    headGroup.add(brim, crown, ribbon);
  } else if (app.hat === 'cap_red') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xef4444 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.44, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), capMat);
    dome.position.y = 0.36;
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.36), capMat);
    visor.position.set(0, 0.42, 0.44);
    headGroup.add(dome, visor);
  } else if (app.hat === 'headset') {
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8 });
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 8, 18, Math.PI), bandMat);
    band.position.y = 0.32;
    const earL = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), bandMat);
    earL.rotation.z = Math.PI / 2;
    earL.position.set(-0.44, 0.08, 0);
    const earR = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 12), bandMat);
    earR.rotation.z = Math.PI / 2;
    earR.position.set(0.44, 0.08, 0);
    headGroup.add(band, earL, earR);
  } else if (app.hat === 'crown') {
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.5, roughness: 0.25 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.28, 0.16, 12), goldMat);
    base.position.y = 0.54;
    headGroup.add(base);
    for (let i = 0; i < 5; i++) {
      const ang = (i / 5) * Math.PI * 2;
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.22, 4), goldMat);
      point.position.set(Math.cos(ang) * 0.24, 0.68, Math.sin(ang) * 0.24);
      headGroup.add(point);
    }
  } else if (app.hat === 'cat_ears') {
    const earMat = new THREE.MeshStandardMaterial({ color: 0x1e293b });
    const innerMat = new THREE.MeshStandardMaterial({ color: 0xf472b6 });
    [-0.26, 0.26].forEach((ex, idx) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.32, 4), earMat);
      ear.position.set(ex, 0.58, 0.05);
      ear.rotation.z = idx === 0 ? 0.2 : -0.2;
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.2, 4), innerMat);
      inner.position.set(ex, 0.56, 0.09);
      inner.rotation.z = idx === 0 ? 0.2 : -0.2;
      headGroup.add(ear, inner);
    });
  } else if (app.hat === 'alien_antenna') {
    const stalkMat = new THREE.MeshStandardMaterial({ color: 0x22c55e });
    const orbMat = new THREE.MeshBasicMaterial({ color: 0xa3e635 });
    [-0.18, 0.18].forEach((ax, idx) => {
      const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.42, 6), stalkMat);
      stalk.position.set(ax, 0.62, 0);
      stalk.rotation.z = idx === 0 ? 0.25 : -0.25;
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), orbMat);
      orb.position.set(ax * 1.4, 0.82, 0);
      headGroup.add(stalk, orb);
    });
  }

  bodyGroup.add(headGroup);

  root.userData = { bodyGroup, leftLeg, rightLeg, leftArm, rightArm, headGroup, rideHeight };
  return root;
}

/* ==========================================================================
   7. DRESSING ROOM & DEDICATED VEHICLE GARAGE MODAL
   ========================================================================== */
let previewScene, previewCamera, previewRenderer, previewCharMesh;
let isPreviewDragging = false, prevPreviewX = 0, previewRotY = 0.3;

function initPreview3D() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas || previewRenderer) return;

  previewScene = new THREE.Scene();
  previewCamera = new THREE.PerspectiveCamera(40, 240 / 290, 0.1, 50);
  previewCamera.position.set(0, 1.65, 4.6);
  previewCamera.lookAt(0, 1.35, 0);

  previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  previewRenderer.setSize(240, 290);
  previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const amb = new THREE.AmbientLight(0xffffff, 0.85);
  const dir = new THREE.DirectionalLight(0xfffbeb, 0.9);
  dir.position.set(3, 6, 4);
  previewScene.add(amb, dir);

  const ped = new THREE.Mesh(
    new THREE.CylinderGeometry(1.15, 1.3, 0.2, 24),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.4 })
  );
  ped.position.y = -0.1;
  previewScene.add(ped);

  canvas.addEventListener('pointerdown', e => {
    isPreviewDragging = true;
    prevPreviewX = e.clientX;
  });
  window.addEventListener('pointermove', e => {
    if (!isPreviewDragging) return;
    previewRotY += (e.clientX - prevPreviewX) * 0.015;
    prevPreviewX = e.clientX;
  });
  window.addEventListener('pointerup', () => { isPreviewDragging = false; });

  function animatePreview() {
    requestAnimationFrame(animatePreview);
    if (!document.getElementById('screen-wardrobe').classList.contains('hidden')) {
      if (!isPreviewDragging) previewRotY += 0.008;
      if (previewCharMesh) previewCharMesh.rotation.y = previewRotY;
      previewRenderer.render(previewScene, previewCamera);
    }
  }
  animatePreview();
}

function updatePreviewCharacter() {
  if (!previewScene) initPreview3D();
  if (previewCharMesh) previewScene.remove(previewCharMesh);
  previewCharMesh = buildDetectiveCharacterMesh(gameState.player.appearance);
  previewCharMesh.rotation.y = previewRotY;
  previewScene.add(previewCharMesh);
}

function renderWardrobeUI() {
  const app = gameState.player.appearance;

  document.getElementById('opt-vehicle').innerHTML = APPEARANCE_OPTIONS.vehicles.map(v => `
    <div class="opt-chip ${app.vehicle === v.id ? 'active' : ''}" onclick="setAppearanceProp('vehicle','${v.id}')">${v.icon} ${v.label}</div>
  `).join('');

  document.getElementById('opt-skin').innerHTML = APPEARANCE_OPTIONS.skinTones.map(s => `
    <div class="color-swatch ${app.skin === s.color ? 'active' : ''}" style="background:${s.color}" title="${s.label}" onclick="setAppearanceProp('skin','${s.color}')"></div>
  `).join('');

  document.getElementById('opt-hair').innerHTML = APPEARANCE_OPTIONS.hairStyles.map(h => `
    <div class="opt-chip ${app.hairStyle === h.id ? 'active' : ''}" onclick="setAppearanceProp('hairStyle','${h.id}')">${h.label}</div>
  `).join('');

  document.getElementById('opt-haircolor').innerHTML = APPEARANCE_OPTIONS.hairColors.map(c => `
    <div class="color-swatch ${app.hairColor === c.color ? 'active' : ''}" style="background:${c.color}" title="${c.label}" onclick="setAppearanceProp('hairColor','${c.color}')"></div>
  `).join('');

  document.getElementById('opt-outfit').innerHTML = APPEARANCE_OPTIONS.outfits.map(o => `
    <div class="opt-chip ${app.outfit === o.id ? 'active' : ''}" onclick="setAppearanceProp('outfit','${o.id}')">${o.label}</div>
  `).join('');

  document.getElementById('opt-glasses').innerHTML = APPEARANCE_OPTIONS.glasses.map(g => `
    <div class="opt-chip ${app.glasses === g.id ? 'active' : ''}" onclick="setAppearanceProp('glasses','${g.id}')">${g.label}</div>
  `).join('');

  document.getElementById('opt-hat').innerHTML = APPEARANCE_OPTIONS.hats.map(h => `
    <div class="opt-chip ${app.hat === h.id ? 'active' : ''}" onclick="setAppearanceProp('hat','${h.id}')">${h.label}</div>
  `).join('');

  updatePreviewCharacter();
}

function setAppearanceProp(key, val) {
  gameState.player.appearance[key] = val;
  SoundEngine.playTone(620, 'sine', 0.08, 0.1);
  renderWardrobeUI();
  updateVehicleButtonUI();
}

function randomizeAppearance() {
  const rand = arr => arr[Math.floor(Math.random() * arr.length)];
  gameState.player.appearance = {
    vehicle: rand(APPEARANCE_OPTIONS.vehicles).id,
    skin: rand(APPEARANCE_OPTIONS.skinTones).color,
    hairStyle: rand(APPEARANCE_OPTIONS.hairStyles).id,
    hairColor: rand(APPEARANCE_OPTIONS.hairColors).color,
    outfit: rand(APPEARANCE_OPTIONS.outfits).id,
    glasses: rand(APPEARANCE_OPTIONS.glasses).id,
    hat: rand(APPEARANCE_OPTIONS.hats).id
  };
  SoundEngine.collect();
  renderWardrobeUI();
  updateVehicleButtonUI();
}

/* Dedicated Vehicle Garage Modal Functions */
let returnScreenFromVehicle = 'screen-home';

function openVehicleModal() {
  SoundEngine.init();
  const active = document.querySelector('.screen-overlay:not(.hidden)');
  returnScreenFromVehicle = active ? active.id : 'HUD';
  renderVehicleGarageUI();
  showScreen('screen-vehicle');
}

function renderVehicleGarageUI() {
  const currentV = gameState.player.appearance.vehicle;
  const grid = document.getElementById('vehicle-garage-grid');
  grid.innerHTML = APPEARANCE_OPTIONS.vehicles.map(v => `
    <div class="vehicle-card ${currentV === v.id ? 'selected' : ''}" onclick="selectVehicleFromGarage('${v.id}')">
      <div style="font-size: 42px; margin-bottom: 6px;">${v.icon}</div>
      <div style="font-size: 15px; font-weight: 700; color: #f8fafc; margin-bottom: 4px;">${v.label}</div>
      <div style="font-size: 12.5px; color: #34d399; font-weight: 600;">${v.desc}</div>
      ${currentV === v.id ? '<div style="margin-top:8px; font-size:12px; color:#fbbf24; font-weight:700;">✅ กำลังใช้งาน</div>' : ''}
    </div>
  `).join('');
}

function selectVehicleFromGarage(vehicleId) {
  gameState.player.appearance.vehicle = vehicleId;
  saveProgress();
  rebuildSelfPlayerMesh();
  updateVehicleButtonUI();
  renderVehicleGarageUI();
  SoundEngine.collect();
  const v = APPEARANCE_OPTIONS.vehicles.find(item => item.id === vehicleId);
  showToast(`เลือกยานพาหนะ: ${v.icon} ${v.label}`);
}

function closeVehicleModal() {
  if (returnScreenFromVehicle === 'HUD') {
    hideAllScreens();
    document.getElementById('hud').style.display = 'block';
  } else {
    showScreen(returnScreenFromVehicle);
  }
}

function updateVehicleButtonUI() {
  const v = APPEARANCE_OPTIONS.vehicles.find(item => item.id === gameState.player.appearance.vehicle) || APPEARANCE_OPTIONS.vehicles[0];
  const btn = document.getElementById('btn-vehicle');
  if (btn) btn.textContent = `${v.icon} ${v.label}`;
}

let returnScreenFromWardrobe = 'screen-home';
function openDressingRoom() {
  SoundEngine.init();
  const active = document.querySelector('.screen-overlay:not(.hidden)');
  returnScreenFromWardrobe = active ? active.id : 'HUD';
  showScreen('screen-wardrobe');
  setTimeout(() => {
    initPreview3D();
    renderWardrobeUI();
  }, 50);
}

function closeDressingRoom() {
  if (returnScreenFromWardrobe === 'HUD') {
    hideAllScreens();
    document.getElementById('hud').style.display = 'block';
  } else {
    showScreen(returnScreenFromWardrobe);
  }
}

function saveAppearanceAndClose() {
  saveProgress();
  rebuildSelfPlayerMesh();
  updateVehicleButtonUI();
  showToast('บันทึกชุดนักสืบและยานพาหนะเรียบร้อย! 👕🛹');
  closeDressingRoom();
}

/* ==========================================================================
   8. 3D VICTORY PODIUM SHOWCASE MODAL (ANYONE CAN OPEN ANYTIME)
   ========================================================================== */
let podiumScene, podiumCamera, podiumRenderer, podiumGroup;
let returnScreenFromPodium = 'screen-home';

function initPodiumModal3D() {
  const canvas = document.getElementById('podium-canvas');
  if (!canvas || podiumRenderer) return;

  podiumScene = new THREE.Scene();
  podiumCamera = new THREE.PerspectiveCamera(42, (canvas.clientWidth || 700) / 250, 0.1, 60);
  podiumCamera.position.set(0, 3.2, 8.6);
  podiumCamera.lookAt(0, 1.9, 0);

  podiumRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  podiumRenderer.setSize(canvas.clientWidth || 700, 250);
  podiumRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const amb = new THREE.AmbientLight(0xffffff, 0.85);
  const spot = new THREE.DirectionalLight(0xfef08a, 1.1);
  spot.position.set(4, 9, 6);
  podiumScene.add(amb, spot);

  podiumGroup = new THREE.Group();
  podiumScene.add(podiumGroup);

  function animatePodiumModal() {
    requestAnimationFrame(animatePodiumModal);
    if (!document.getElementById('screen-podium').classList.contains('hidden')) {
      const t = performance.now() * 0.004;
      podiumGroup.children.forEach(child => {
        if (child.userData.isChamp) {
          child.position.y = child.userData.baseY + Math.abs(Math.sin(t + child.userData.phase)) * 0.22;
          child.rotation.y = Math.sin(t * 0.7 + child.userData.phase) * 0.35;
        }
      });
      podiumRenderer.render(podiumScene, podiumCamera);
    }
  }
  animatePodiumModal();
}

function renderPodiumModalStage(ranked) {
  initPodiumModal3D();
  while (podiumGroup.children.length > 0) {
    podiumGroup.remove(podiumGroup.children[0]);
  }

  const slots = [
    { rank: 1, x: 0, h: 1.7, color: 0xfacc15 },
    { rank: 2, x: -2.4, h: 1.2, color: 0xe2e8f0 },
    { rank: 3, x: 2.4, h: 0.85, color: 0xd97706 }
  ];

  slots.forEach(s => {
    const block = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, s.h, 1.8),
      new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.35, metalness: 0.3 })
    );
    block.position.set(s.x, s.h / 2, 0);
    podiumGroup.add(block);

    const player = ranked[s.rank - 1];
    if (player) {
      const charMesh = buildDetectiveCharacterMesh({ ...player.appearance, vehicle: 'none' });
      charMesh.scale.set(0.78, 0.78, 0.78);
      charMesh.position.set(s.x, s.h, 0);
      charMesh.userData = { isChamp: true, baseY: s.h, phase: s.rank };
      podiumGroup.add(charMesh);
    }
  });

  const cardsEl = document.getElementById('podium-top3-cards');
  cardsEl.innerHTML = [2, 1, 3].map(r => {
    const p = ranked[r - 1];
    const medal = r === 1 ? '🥇 อันดับ 1' : r === 2 ? '🥈 อันดับ 2' : '🥉 อันดับ 3';
    return `
      <div class="podium-rank-card rank-${r}">
        <div style="font-size:13px; font-weight:700; color:#fbbf24;">${medal}</div>
        <div style="font-size:14px; font-weight:700; color:#fff; margin:2px 0;">${p ? p.name : 'ว่าง'}</div>
        <div style="font-size:12px; color:#34d399; font-weight:600;">${p ? `⭐ ${p.total} คะแนน` : '-'}</div>
      </div>
    `;
  }).join('');
}

function openPodiumShowcase() {
  SoundEngine.init();
  const active = document.querySelector('.screen-overlay:not(.hidden)');
  returnScreenFromPodium = active ? active.id : 'HUD';

  const ranked = getRankedPlayersList();
  showScreen('screen-podium');

  setTimeout(() => {
    renderPodiumModalStage(ranked);
  }, 50);

  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = ranked.map((e, idx) => `
    <tr class="${e.isSelf ? 'current-player' : ''}">
      <td>${idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}</td>
      <td style="text-align:left;">${e.name} ${e.isSelf ? '(คุณ)' : ''}</td>
      <td>${e.no}</td>
      <td>${e.s1}</td>
      <td>${e.s2}</td>
      <td>${e.s3}</td>
      <td style="color:#fbbf24; font-weight:700;">${e.total}</td>
    </tr>
  `).join('');
}

function closePodiumShowcase() {
  if (returnScreenFromPodium === 'HUD') {
    hideAllScreens();
  } else {
    showScreen(returnScreenFromPodium);
  }
}

/* ==========================================================================
   9. THREE.JS 3D SCHOOL WORLD, WORLD PODIUM & MULTIPLAYER SCENE
   ========================================================================== */
let scene, camera, renderer, playerGroup, worldPodiumGroup;
let colliders = [];
let worldLabels = [];
let evidenceMeshes = [];
let remotePlayerMeshes = {};
let activeEvidenceTarget = null;

const playerState = {
  velY: 0,
  onGround: true,
  baseSpeed: 13.0,
  jumpForce: 11.5,
  gravity: -28,
  walkCycle: 0
};

let camYaw = 0;
let camPitch = 0.36;
const camDist = 11.5;

const keys = {};
let joyVec = { x: 0, y: 0 };

function init3DWorld() {
  if (typeof THREE === 'undefined') {
    showToast('ไม่สามารถโหลดไลบรารี 3D ได้ กรุณาตรวจสอบอินเทอร์เน็ต', true);
    return;
  }
  const canvas = document.getElementById('game-canvas');
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x7dd3fc);
  scene.fog = new THREE.FogExp2(0xbae6fd, 0.0085);

  camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 250);

  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x4ade80, 0.78);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xfffbeb, 0.95);
  dirLight.position.set(35, 55, 30);
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;
  dirLight.shadow.camera.near = 5;
  dirLight.shadow.camera.far = 140;
  const d = 55;
  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;
  scene.add(dirLight);

  buildSchoolEnvironment();
  rebuildWorldPodium();
  rebuildSelfPlayerMesh();
  setupControls();
  animateWorld();
}

function addCollider(minX, maxX, minZ, maxZ) {
  colliders.push({ minX, maxX, minZ, maxZ });
}

function createBox(w, h, d, color, x, y, z, castShadow = true, receiveShadow = true) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.05 });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

function registerWorldLabel(text, x, y, z) {
  const el = document.createElement('div');
  el.className = 'world-label';
  el.textContent = text;
  document.getElementById('world-labels').appendChild(el);
  worldLabels.push({ el, pos: new THREE.Vector3(x, y, z) });
}

function buildSchoolEnvironment() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160, 160),
    new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.85 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  createBox(26, 0.08, 26, 0xe2e8f0, 0, 0.04, 14, false, true);
  createBox(58, 0.08, 6, 0xcbd5e1, 0, 0.04, 14, false, true);
  createBox(6, 0.08, 46, 0xcbd5e1, 0, 0.04, -5, false, true);

  createBox(2.8, 0.5, 2.8, 0x94a3b8, 0, 0.25, 14);
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.14, 11, 12),
    new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.6, roughness: 0.2 })
  );
  pole.position.set(0, 5.5, 14);
  pole.castShadow = true;
  scene.add(pole);

  createBox(1.8, 0.2, 0.08, 0xef4444, 0.95, 10.3, 14);
  createBox(1.8, 0.2, 0.08, 0xffffff, 0.95, 10.1, 14);
  createBox(1.8, 0.4, 0.08, 0x1e3a8a, 0.95, 9.8, 14);
  createBox(1.8, 0.2, 0.08, 0xffffff, 0.95, 9.5, 14);
  createBox(1.8, 0.2, 0.08, 0xef4444, 0.95, 9.3, 14);

  registerWorldLabel('🏆 แท่นรางวัลนักเรียนดีเด่น 5W1H', 0, 5.2, 6);

  // Academic Building
  createBox(16, 0.2, 16, 0xfef3c7, -28, 0.1, 16, false, true);
  createBox(16, 5.5, 0.6, 0xfbbf24, -28, 2.75, 23.7);
  createBox(0.6, 5.5, 16, 0xfbbf24, -35.7, 2.75, 16);
  createBox(0.6, 5.5, 6, 0xfbbf24, -20.3, 2.75, 21);
  createBox(17.5, 0.8, 17.5, 0xea580c, -28, 5.9, 16);
  addCollider(-36.2, -35.2, 8, 24);
  addCollider(-36, -20, 23.2, 24.2);

  createBox(6.5, 2.2, 0.2, 0x065f46, -28, 2.8, 23.3);
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 3; col++) {
      const dx = -31.5 + col * 3.5;
      const dz = 13 + row * 4.2;
      createBox(1.8, 0.9, 1.1, 0xd97706, dx, 0.45, dz);
      addCollider(dx - 0.9, dx + 0.9, dz - 0.55, dz + 0.55);
    }
  }
  registerWorldLabel('🏫 อาคารเรียน • ห้อง ม.2/1', -28, 7.2, 16);

  // Canteen
  createBox(16, 0.2, 16, 0xf1f5f9, 28, 0.1, 16, false, true);
  createBox(17.5, 0.7, 17.5, 0x0284c7, 28, 5.6, 16);
  [21, 35].forEach(px => {
    [9, 23].forEach(pz => {
      createBox(0.7, 5.4, 0.7, 0xf8fafc, px, 2.7, pz);
      addCollider(px - 0.4, px + 0.4, pz - 0.4, pz + 0.4);
    });
  });
  createBox(11, 1.2, 1.8, 0xf97316, 28, 0.6, 22);
  addCollider(22.5, 33.5, 21, 23);
  for (let i = 0; i < 2; i++) {
    const tx = 25 + i * 5.5;
    createBox(2.6, 0.85, 1.3, 0x38bdf8, tx, 0.42, 14);
    addCollider(tx - 1.3, tx + 1.3, 13.3, 14.7);
  }
  createBox(0.9, 1.1, 0.9, 0x16a34a, 22, 0.55, 17);
  createBox(0.9, 1.1, 0.9, 0x2563eb, 23.2, 0.55, 17);
  registerWorldLabel('🍜 โรงอาหาร (Canteen)', 28, 7.0, 16);

  // Sports Field
  createBox(32, 0.1, 22, 0x16a34a, 0, 0.05, -28, false, true);
  createBox(32, 0.12, 0.3, 0xffffff, 0, 0.06, -17.2, false, false);
  createBox(32, 0.12, 0.3, 0xffffff, 0, 0.06, -38.8, false, false);
  createBox(0.3, 0.12, 22, 0xffffff, -15.8, 0.06, -28, false, false);
  createBox(0.3, 0.12, 22, 0xffffff, 15.8, 0.06, -28, false, false);
  createBox(0.3, 0.12, 22, 0xffffff, 0, 0.06, -28, false, false);

  [-15.5, 15.5].forEach(gx => {
    createBox(0.25, 2.6, 0.25, 0xffffff, gx, 1.3, -30.5);
    createBox(0.25, 2.6, 0.25, 0xffffff, gx, 1.3, -25.5);
    createBox(0.25, 0.25, 5.2, 0xffffff, gx, 2.6, -28);
  });

  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 24),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 })
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.position.set(-4, 0.13, -28);
  scene.add(puddle);
  createBox(1.6, 0.18, 1.6, 0x475569, 10, 0.09, -26);
  registerWorldLabel('⚽ สนามกีฬา (Sports Field)', 0, 5.5, -28);

  // Library
  createBox(18, 5.5, 12, 0xa855f7, 0, 2.75, 36);
  createBox(19.5, 0.8, 13.5, 0x6b21a8, 0, 5.8, 36);
  createBox(3.2, 3.2, 0.3, 0xfef08a, 0, 1.6, 29.9);
  addCollider(-9.2, 9.2, 29.8, 42.2);
  registerWorldLabel('📚 ห้องสมุดโรงเรียน (Library)', 0, 7.2, 36);

  // Trees
  const treePositions = [
    [-14, 4], [14, 4], [-14, 26], [14, 26],
    [-22, -14], [22, -14], [-22, -36], [22, -36]
  ];
  treePositions.forEach(([tx, tz]) => {
    createBox(0.8, 2.4, 0.8, 0x78350f, tx, 1.2, tz);
    const leaves = new THREE.Mesh(
      new THREE.DodecahedronGeometry(2.1),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.7 })
    );
    leaves.position.set(tx, 3.5, tz);
    leaves.castShadow = true;
    scene.add(leaves);
    addCollider(tx - 0.6, tx + 0.6, tz - 0.6, tz + 0.6);
  });

  createWorldNPC(0xef4444, -22, 13, 0);
  createWorldNPC(0x10b981, 31, 13, -1.5);
  createWorldNPC(0x2563eb, -10, -23, 0.8);
}

function rebuildWorldPodium() {
  if (!scene) return;
  if (worldPodiumGroup) scene.remove(worldPodiumGroup);
  worldPodiumGroup = new THREE.Group();
  worldPodiumGroup.position.set(0, 0.08, 6);

  const ranked = getRankedPlayersList();
  const slots = [
    { rank: 1, x: 0, h: 1.5, color: 0xfacc15 },
    { rank: 2, x: -2.2, h: 1.05, color: 0xe2e8f0 },
    { rank: 3, x: 2.2, h: 0.75, color: 0xd97706 }
  ];

  slots.forEach(s => {
    const step = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, s.h, 1.8),
      new THREE.MeshStandardMaterial({ color: s.color, roughness: 0.35, metalness: 0.25 })
    );
    step.position.set(s.x, s.h / 2, 0);
    step.castShadow = true;
    step.receiveShadow = true;
    worldPodiumGroup.add(step);

    const p = ranked[s.rank - 1];
    if (p) {
      const statue = buildDetectiveCharacterMesh({ ...p.appearance, vehicle: 'none' });
      statue.scale.set(0.85, 0.85, 0.85);
      statue.position.set(s.x, s.h, 0);
      statue.userData.isPodiumChamp = true;
      statue.userData.baseY = s.h;
      statue.userData.rank = s.rank;
      worldPodiumGroup.add(statue);
    }
  });

  scene.add(worldPodiumGroup);
}

function createWorldNPC(shirtColor, x, z, rotY) {
  const npc = buildDetectiveCharacterMesh({
    vehicle: 'none',
    skin: '#f5cba7',
    hairStyle: 'bob',
    hairColor: '#1e293b',
    outfit: shirtColor === 0x2563eb ? 'pe_red' : 'student_black',
    glasses: 'round',
    hat: 'none'
  });
  npc.position.set(x, 0, z);
  npc.rotation.y = rotY;
  scene.add(npc);
}

function rebuildSelfPlayerMesh() {
  if (!scene) return;
  const oldPos = playerGroup ? playerGroup.position.clone() : new THREE.Vector3(0, 0, 11);
  const oldRot = playerGroup ? playerGroup.rotation.y : Math.PI;
  if (playerGroup) scene.remove(playerGroup);

  playerGroup = buildDetectiveCharacterMesh(gameState.player.appearance);
  playerGroup.position.copy(oldPos);
  playerGroup.rotation.y = oldRot;
  scene.add(playerGroup);
}

/* ==========================================================================
   10. EMOTES SYSTEM
   ========================================================================== */
function triggerEmote(type) {
  SoundEngine.init();
  currentEmote = { type, endTime: performance.now() + 4500 };
  SoundEngine.playTone(540, 'sine', 0.12, 0.14);
  broadcastPlayerState();

  document.querySelectorAll('.emote-btn').forEach(btn => {
    btn.classList.toggle('active-emote', btn.dataset.emote === type);
  });

  const labels = {
    dance: '💃 กำลังเต้นฉลองสุดเหวี่ยง!',
    wave: '👋 โบกมือทักทายเพื่อนๆ',
    think: '🤔 กำลังครุ่นคิดวิเคราะห์เบาะแส',
    spin: '🌀 หมุนตัวโชว์ความเท่!',
    faint: '🤣 ล้มตัวนอนแผ่สุดฮา!'
  };
  showToast(labels[type] || 'แสดงท่าทาง!');
}

function clearEmoteUI() {
  document.querySelectorAll('.emote-btn').forEach(btn => btn.classList.remove('active-emote'));
}

function applyEmoteAnimation(charMesh, emoteType, time) {
  const { bodyGroup, leftArm, rightArm, leftLeg, rightLeg, headGroup, rideHeight } = charMesh.userData;
  if (!bodyGroup) return;

  bodyGroup.rotation.set(0, 0, 0);
  bodyGroup.position.y = rideHeight || 0;
  leftArm.rotation.set(0, 0, 0);
  rightArm.rotation.set(0, 0, 0);
  leftLeg.rotation.set(0, 0, 0);
  rightLeg.rotation.set(0, 0, 0);
  if (headGroup) headGroup.rotation.set(0, 0, 0);

  if (emoteType === 'dance') {
    bodyGroup.position.y += Math.abs(Math.sin(time * 9)) * 0.32;
    bodyGroup.rotation.y = Math.sin(time * 5) * 0.55;
    leftArm.rotation.z = Math.sin(time * 9) * 0.9 + 1.4;
    rightArm.rotation.z = -Math.sin(time * 9) * 0.9 - 1.4;
    leftLeg.rotation.x = Math.sin(time * 9) * 0.4;
    rightLeg.rotation.x = -Math.sin(time * 9) * 0.4;
  } else if (emoteType === 'wave') {
    rightArm.rotation.z = 2.7 + Math.sin(time * 12) * 0.45;
    leftArm.rotation.z = 0.15;
    if (headGroup) headGroup.rotation.z = Math.sin(time * 6) * 0.12;
  } else if (emoteType === 'think') {
    rightArm.rotation.x = -2.1;
    rightArm.rotation.z = -0.45;
    leftArm.rotation.x = -0.4;
    bodyGroup.rotation.x = 0.12;
    if (headGroup) headGroup.rotation.y = Math.sin(time * 2.5) * 0.25;
  } else if (emoteType === 'spin') {
    bodyGroup.rotation.y = time * 8;
    bodyGroup.position.y += 0.18 + Math.sin(time * 6) * 0.08;
    leftArm.rotation.z = 1.3;
    rightArm.rotation.z = -1.3;
  } else if (emoteType === 'faint') {
    bodyGroup.rotation.x = -Math.PI / 2;
    bodyGroup.position.y = (rideHeight || 0) + 0.42;
    leftArm.rotation.z = 0.7;
    rightArm.rotation.z = -0.7;
    leftLeg.rotation.z = 0.25;
    rightLeg.rotation.z = -0.25;
  }
}

/* ==========================================================================
   11. MISSION SPAWNING & EVIDENCE INTERACTION
   ========================================================================== */
function loadMissionInWorld(missionId) {
  gameState.currentMissionId = missionId;
  gameState.collectedEvidences = [];
  const mission = MISSIONS.find(m => m.id === missionId);

  evidenceMeshes.forEach(item => scene.remove(item.group));
  evidenceMeshes = [];

  if (playerGroup) {
    playerGroup.position.set(mission.spawnPos.x, 0, mission.spawnPos.z);
    playerState.velY = 0;
  }

  mission.evidences.forEach(ev => {
    const group = new THREE.Group();
    group.position.set(ev.pos.x, ev.pos.y, ev.pos.z);

    const orb = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.55, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfbbf24,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.7,
        roughness: 0.2
      })
    );
    orb.castShadow = true;
    group.add(orb);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.75, 1.05, 24),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -ev.pos.y + 0.14;
    group.add(ring);

    scene.add(group);
    evidenceMeshes.push({ data: ev, group, orb, collected: false });
  });

  updateHUD();
}

function updateHUD() {
  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  const count = gameState.collectedEvidences.length;
  const total = mission.evidences.length;

  document.getElementById('hud-mission-badge').textContent = mission.badge;
  document.getElementById('hud-mission-title').textContent = mission.title;
  document.getElementById('hud-progress-fill').style.width = `${(count / total) * 100}%`;
  document.getElementById('hud-progress-text').textContent = `${count}/${total}`;
  document.getElementById('hud-player-name').textContent = gameState.player.name || 'นักสืบ';
  document.getElementById('hud-score').textContent = `${getTotalScore()} คะแนน`;

  const remaining = evidenceMeshes.filter(e => !e.collected);
  if (remaining.length > 0 && playerGroup) {
    let nearest = remaining[0];
    let minD = Infinity;
    remaining.forEach(item => {
      const d = playerGroup.position.distanceTo(item.group.position);
      if (d < minD) { minD = d; nearest = item; }
    });
    document.getElementById('hud-compass-text').textContent = `เป้าหมายถัดไป: ${nearest.data.title} (${Math.round(minD)} ม.)`;
  } else {
    document.getElementById('hud-compass-text').textContent = 'รวบรวมหลักฐานครบแล้ว! กำลังเปิดวิเคราะห์ 5W1H';
  }

  const pillsContainer = document.getElementById('hud-evidence-pills');
  pillsContainer.innerHTML = gameState.collectedEvidences.map(ev =>
    `<div class="evidence-pill"><span>✅</span> <span>${ev.title}</span></div>`
  ).join('');
}

function triggerInteract() {
  if (!activeEvidenceTarget || activeEvidenceTarget.collected) return;

  activeEvidenceTarget.collected = true;
  activeEvidenceTarget.group.visible = false;
  gameState.collectedEvidences.push(activeEvidenceTarget.data);
  SoundEngine.collect();
  updateHUD();

  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  const count = gameState.collectedEvidences.length;
  const total = mission.evidences.length;

  document.getElementById('ev-modal-icon').textContent = activeEvidenceTarget.data.icon;
  document.getElementById('ev-modal-tag').textContent = `เบาะแสที่ ${count}/${total}`;
  document.getElementById('ev-modal-title').textContent = activeEvidenceTarget.data.title;
  document.getElementById('ev-modal-desc').textContent = activeEvidenceTarget.data.detail;
  document.getElementById('ev-modal-counter').textContent = count === total
    ? '🎉 รวบรวมหลักฐานครบทั้ง 4 ชิ้นแล้ว! เตรียมวิเคราะห์ 5W1H'
    : `รวบรวมหลักฐานแล้ว ${count} / ${total} ชิ้น`;

  document.getElementById('interact-prompt').style.display = 'none';
  activeEvidenceTarget = null;
  showScreen('screen-evidence');
}

function closeEvidenceModal() {
  hideAllScreens();
  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  if (gameState.collectedEvidences.length >= mission.evidences.length) {
    start5W1HQuiz();
  }
}

/* ==========================================================================
   12. 5W1H ANALYSIS QUIZ SYSTEM WITH +5 SPEED BONUS
   ========================================================================== */
function start5W1HQuiz() {
  if (gameState.quizState.timerInterval) clearInterval(gameState.quizState.timerInterval);
  gameState.quizState = {
    step: 0,
    score: 0,
    speedBonusTotal: 0,
    questionStartTime: 0,
    timerInterval: null,
    answered: false
  };
  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  document.getElementById('quiz-mission-name').textContent = `วิเคราะห์คดี: ${mission.title}`;

  const evList = document.getElementById('quiz-evidence-list');
  evList.innerHTML = gameState.collectedEvidences.map(e => `<li><strong>${e.title}:</strong> ${e.summary}</li>`).join('');
  document.getElementById('quiz-evidence-drawer').classList.add('hidden');

  renderQuizQuestion();
  showScreen('screen-quiz');
}

function startSpeedBonusTimer() {
  if (gameState.quizState.timerInterval) clearInterval(gameState.quizState.timerInterval);
  gameState.quizState.questionStartTime = performance.now();
  const badge = document.getElementById('quiz-speed-badge');
  badge.classList.remove('expired');

  gameState.quizState.timerInterval = setInterval(() => {
    if (gameState.quizState.answered) {
      clearInterval(gameState.quizState.timerInterval);
      return;
    }
    const elapsed = (performance.now() - gameState.quizState.questionStartTime) / 1000;
    const rem = Math.max(0, 10 - elapsed);
    if (rem > 0) {
      badge.textContent = `⚡ โบนัสตอบไว +5 (${rem.toFixed(1)}s)`;
    } else {
      badge.textContent = '⏱️ หมดเวลาโบนัสตอบไว';
      badge.classList.add('expired');
      clearInterval(gameState.quizState.timerInterval);
    }
  }, 100);
}

function renderQuizQuestion() {
  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  const step = gameState.quizState.step;
  const qObj = mission.questions[step];

  document.getElementById('quiz-step-num').textContent = step + 1;
  document.getElementById('quiz-current-score').textContent = gameState.quizState.score;
  document.getElementById('quiz-w1h-tag').textContent = qObj.tag;
  document.getElementById('quiz-question-text').textContent = qObj.q;

  const tabsEl = document.getElementById('quiz-w1h-tabs');
  tabsEl.innerHTML = mission.questions.map((item, idx) => {
    let cls = 'w1h-tab';
    if (idx === step) cls += ' active';
    else if (idx < step) cls += ' done';
    return `<div class="${cls}">${item.w}</div>`;
  }).join('');

  const optsEl = document.getElementById('quiz-options-container');
  const letters = ['ก.', 'ข.', 'ค.', 'ง.'];
  optsEl.innerHTML = qObj.options.map((optText, idx) => `
    <button type="button" class="option-btn" onclick="selectQuizOption(${idx})">
      <strong style="color:#38bdf8">${letters[idx]}</strong> <span>${optText}</span>
    </button>
  `).join('');

  document.getElementById('quiz-explanation-box').classList.add('hidden');
  document.getElementById('quiz-next-btn').classList.add('hidden');
  gameState.quizState.answered = false;
  startSpeedBonusTimer();
}

function selectQuizOption(selectedIndex) {
  if (gameState.quizState.answered) return;
  gameState.quizState.answered = true;
  if (gameState.quizState.timerInterval) clearInterval(gameState.quizState.timerInterval);

  const elapsedSec = (performance.now() - gameState.quizState.questionStartTime) / 1000;
  const gotSpeedBonus = elapsedSec <= 10.0;

  const mission = MISSIONS.find(m => m.id === gameState.currentMissionId);
  const qObj = mission.questions[gameState.quizState.step];
  const buttons = document.querySelectorAll('#quiz-options-container .option-btn');

  buttons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === qObj.correct) btn.classList.add('correct');
    else if (idx === selectedIndex) btn.classList.add('wrong');
  });

  const feedbackTitle = document.getElementById('quiz-feedback-title');
  if (selectedIndex === qObj.correct) {
    const bonus = gotSpeedBonus ? 5 : 0;
    gameState.quizState.score += (100 + bonus);
    gameState.quizState.speedBonusTotal += bonus;
    SoundEngine.correct();
    feedbackTitle.textContent = gotSpeedBonus
      ? `✅ ถูกต้อง! (+100 คะแนน ⚡ โบนัสตอบไว +5 คะแนน!)`
      : `✅ ถูกต้อง! (+100 คะแนน)`;
    feedbackTitle.style.color = '#34d399';
  } else {
    SoundEngine.wrong();
    feedbackTitle.textContent = '❌ ยังไม่ถูกต้อง มาดูคำอธิบายกัน:';
    feedbackTitle.style.color = '#f87171';
  }

  document.getElementById('quiz-current-score').textContent = gameState.quizState.score;
  document.getElementById('quiz-explanation-text').textContent = qObj.explanation;
  document.getElementById('quiz-explanation-box').classList.remove('hidden');

  const nextBtn = document.getElementById('quiz-next-btn');
  nextBtn.textContent = gameState.quizState.step < 5 ? 'ข้อถัดไป ➡️' : 'ดูสรุปผลการสืบสวน 🏆';
  nextBtn.classList.remove('hidden');
}

function nextQuizQuestion() {
  if (gameState.quizState.step < 5) {
    gameState.quizState.step++;
    renderQuizQuestion();
  } else {
    finishMission();
  }
}

function toggleEvidenceReview() {
  document.getElementById('quiz-evidence-drawer').classList.toggle('hidden');
}

function finishMission() {
  const mId = gameState.currentMissionId;
  const earned = gameState.quizState.score;
  const speedTotal = gameState.quizState.speedBonusTotal;
  const stars = earned >= 500 ? 3 : earned >= 300 ? 2 : 1;

  if (earned > (gameState.player.scores[mId] || 0)) {
    gameState.player.scores[mId] = earned;
  }
  if (stars > (gameState.player.stars[mId] || 0)) {
    gameState.player.stars[mId] = stars;
  }
  if (mId >= gameState.player.unlockedMission && mId < 3) {
    gameState.player.unlockedMission = mId + 1;
  }

  saveProgress();
  broadcastPlayerState(true);
  updateHUD();
  SoundEngine.fanfare();

  const mission = MISSIONS.find(m => m.id === mId);
  document.getElementById('sum-badge').textContent = `ปิดคดีสำเร็จ • ${mission.badge}`;
  document.getElementById('sum-title').textContent = mission.title;
  document.getElementById('sum-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('sum-score-text').textContent = `ได้รับ ${earned} คะแนน`;
  document.getElementById('sum-speed-text').textContent = speedTotal > 0
    ? `⚡ รวมโบนัสตอบไว +${speedTotal} คะแนน!`
    : '💡 ตอบถูกภายใน 10 วินาทีแรกจะได้รับโบนัส +5 คะแนน';

  const msgs = {
    3: 'สุดยอดนักสืบระดับปรมาจารย์! ตัวละครของคุณพร้อมขึ้นแท่นรับรางวัลแล้ว!',
    2: 'เก่งมากนักสืบ! คุณรวบรวมข้อมูลและระบุสาเหตุของปัญหาได้เป็นอย่างดี',
    1: 'ภารกิจสำเร็จ! ลองทบทวนหลักฐานแต่ละชิ้นแล้วเล่นซ้ำเพื่อเก็บ 3 ดาวเต็มนะ'
  };
  document.getElementById('sum-encouragement').textContent = msgs[stars];

  const nextBtn = document.getElementById('sum-next-mission-btn');
  if (mId < 3) {
    nextBtn.textContent = `ไปภารกิจที่ ${mId + 1} ➡️`;
    nextBtn.onclick = () => startMission(mId + 1);
  } else {
    nextBtn.textContent = '📋 กลับหน้าเลือกภารกิจ';
    nextBtn.onclick = () => openMissionSelect();
  }

  showScreen('screen-summary');
}

/* ==========================================================================
   13. SCREEN NAVIGATION & ONLINE MODAL
   ========================================================================== */
function hideAllScreens() {
  document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('hud').style.display = 'block';
}

function showScreen(id) {
  document.querySelectorAll('.screen-overlay').forEach(el => el.classList.add('hidden'));
  document.getElementById('hud').style.display = 'none';
  const target = document.getElementById(id);
  if (target) target.classList.remove('hidden');
}

function goToRegister() {
  SoundEngine.init();
  if (gameState.player.name) {
    openMissionSelect();
  } else {
    showScreen('screen-register');
  }
}

function submitRegistration() {
  SoundEngine.init();
  const name = document.getElementById('input-name').value.trim();
  const no = document.getElementById('input-no').value.trim();
  if (!name) {
    showToast('กรุณากรอกชื่อนักสืบก่อนเริ่มเกม!', true);
    return;
  }
  gameState.player.name = name;
  gameState.player.no = no || '-';
  saveProgress();
  SoundEngine.collect();
  openMissionSelect();
}

function openMissionSelect() {
  document.getElementById('select-player-label').textContent = `${gameState.player.name || 'นักสืบ'} (${gameState.player.no || '-'})`;
  document.getElementById('select-total-score').textContent = `${getTotalScore()} คะแนน`;

  const container = document.getElementById('mission-cards-container');
  container.innerHTML = MISSIONS.map(m => {
    const unlocked = m.id <= gameState.player.unlockedMission;
    const score = gameState.player.scores[m.id] || 0;
    const stars = gameState.player.stars[m.id] || 0;
    const starStr = stars > 0 ? '⭐'.repeat(stars) : '☆☆☆';

    return `
      <div class="mission-card ${unlocked ? 'unlocked' : 'locked'}">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="mission-card-icon">${m.icon}</span>
            <span style="font-size:16px;">${unlocked ? starStr : '🔒'}</span>
          </div>
          <div class="mission-badge">${m.badge}</div>
          <h3>${m.title}</h3>
          <p>${m.shortDesc}</p>
        </div>
        <div>
          <div style="font-size:13px; color:#34d399; font-weight:600; margin-bottom:10px;">
            คะแนนสูงสุด: ${score} / 630
          </div>
          ${unlocked
            ? `<button type="button" class="btn btn-primary btn-sm" style="width:100%;" onclick="startMission(${m.id})">${score > 0 ? '🔄 เล่นอีกครั้ง' : '🚀 เริ่มภารกิจ'}</button>`
            : `<button type="button" class="btn btn-secondary btn-sm" style="width:100%;" disabled>🔒 ผ่านภารกิจก่อนหน้าเพื่อปลดล็อก</button>`
          }
        </div>
      </div>
    `;
  }).join('');

  showScreen('screen-missions');
}

function startMission(missionId) {
  SoundEngine.init();
  hideAllScreens();
  loadMissionInWorld(missionId);
  showToast(`เริ่มภารกิจที่ ${missionId}: เดินหาเบาะแสเรืองแสงสีทอง!`);
}

function replayCurrentMission() {
  startMission(gameState.currentMissionId);
}

function goNextMission() {
  if (gameState.currentMissionId < 3) startMission(gameState.currentMissionId + 1);
  else openMissionSelect();
}

function toggleOnlineModal() {
  const modal = document.getElementById('screen-online');
  if (!modal.classList.contains('hidden')) {
    hideAllScreens();
    return;
  }

  const listEl = document.getElementById('online-players-list');
  const all = [
    { name: `${gameState.player.name || 'นักสืบ'} (คุณ)`, no: gameState.player.no || '-', score: getTotalScore() },
    ...Object.values(onlinePlayers).map(p => ({
      name: p.name,
      no: p.no,
      score: getTotalScore(p)
    }))
  ];

  listEl.innerHTML = all.map(item => `
    <div class="online-player-row">
      <div>
        <strong style="color:#f8fafc;">🟢 ${item.name}</strong>
        <span style="color:#94a3b8; font-size:12px;"> (${item.no})</span>
      </div>
      <div style="color:#fbbf24; font-weight:600;">⭐ ${item.score} คะแนน</div>
    </div>
  `).join('');

  showScreen('screen-online');
}

function resetLocalPlayer() {
  localStorage.removeItem(STORAGE_KEY);
  gameState.player = {
    id: 'det_' + Math.random().toString(36).substring(2, 9),
    name: '',
    no: '',
    appearance: { ...DEFAULT_APPEARANCE },
    unlockedMission: 1,
    scores: { 1: 0, 2: 0, 3: 0 },
    stars: { 1: 0, 2: 0, 3: 0 }
  };
  document.getElementById('input-name').value = '';
  document.getElementById('input-no').value = '';
  rebuildSelfPlayerMesh();
  rebuildWorldPodium();
  updateVehicleButtonUI();
  showToast('รีเซ็ตข้อมูลนักสืบเรียบร้อย');
  showScreen('screen-home');
}

/* ==========================================================================
   14. CONTROLS (KEYBOARD, MOUSE CAMERA & MOBILE VIRTUAL JOYSTICK)
   ========================================================================== */
function setupControls() {
  window.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (!isPlayingInWorld()) return;
    if (e.code === 'Space') jumpPlayer();
    if (e.code === 'KeyE') triggerInteract();
    if (e.code === 'KeyV') openVehicleModal();
    if (e.code === 'Digit1') triggerEmote('dance');
    if (e.code === 'Digit2') triggerEmote('wave');
    if (e.code === 'Digit3') triggerEmote('think');
    if (e.code === 'Digit4') triggerEmote('spin');
    if (e.code === 'Digit5') triggerEmote('faint');
  });
  window.addEventListener('keyup', e => { keys[e.code] = false; });

  let isDraggingCam = false;
  let prevX = 0, prevY = 0;
  const canvas = document.getElementById('game-canvas');

  canvas.addEventListener('mousedown', e => {
    SoundEngine.init();
    isDraggingCam = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener('mousemove', e => {
    if (!isDraggingCam || !isPlayingInWorld()) return;
    camYaw -= (e.clientX - prevX) * 0.0065;
    camPitch = Math.max(0.15, Math.min(1.15, camPitch + (e.clientY - prevY) * 0.005));
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDraggingCam = false; });

  canvas.addEventListener('touchstart', e => {
    SoundEngine.init();
    if (e.touches.length > 0) {
      const t = e.touches[e.touches.length - 1];
      if (t.clientX > window.innerWidth * 0.35) {
        isDraggingCam = true;
        prevX = t.clientX;
        prevY = t.clientY;
      }
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (!isDraggingCam || !isPlayingInWorld()) return;
    const t = e.touches[e.touches.length - 1];
    camYaw -= (t.clientX - prevX) * 0.0075;
    camPitch = Math.max(0.15, Math.min(1.15, camPitch + (t.clientY - prevY) * 0.006));
    prevX = t.clientX;
    prevY = t.clientY;
  }, { passive: true });
  canvas.addEventListener('touchend', () => { isDraggingCam = false; });

  const joyZone = document.getElementById('joystick-zone');
  const joyStick = document.getElementById('joystick-stick');
  const maxRadius = 36;

  function handleJoyMove(clientX, clientY) {
    const rect = joyZone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    let dx = clientX - centerX;
    let dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);
    if (dist > maxRadius) {
      dx = (dx / dist) * maxRadius;
      dy = (dy / dist) * maxRadius;
    }
    joyStick.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    joyVec.x = dx / maxRadius;
    joyVec.y = dy / maxRadius;
  }

  joyZone.addEventListener('touchstart', e => {
    e.preventDefault();
    handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  joyZone.addEventListener('touchmove', e => {
    e.preventDefault();
    handleJoyMove(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  joyZone.addEventListener('touchend', () => {
    joyStick.style.transform = 'translate(-50%, -50%)';
    joyVec = { x: 0, y: 0 };
  });

  document.getElementById('mob-jump-btn').addEventListener('touchstart', e => {
    e.preventDefault();
    if (isPlayingInWorld()) jumpPlayer();
  }, { passive: false });
  document.getElementById('mob-jump-btn').addEventListener('click', () => {
    if (isPlayingInWorld()) jumpPlayer();
  });

  window.addEventListener('resize', () => {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

function isPlayingInWorld() {
  const overlays = document.querySelectorAll('.screen-overlay:not(.hidden)');
  return overlays.length === 0;
}

function jumpPlayer() {
  if (playerState.onGround) {
    playerState.velY = playerState.jumpForce;
    playerState.onGround = false;
    SoundEngine.jump();
  }
}

function checkCollision(nx, nz) {
  const r = 0.55;
  if (nx < -46 || nx > 46 || nz < -46 || nz > 46) return true;
  for (const c of colliders) {
    if (nx + r > c.minX && nx - r < c.maxX && nz + r > c.minZ && nz - r < c.maxZ) {
      return true;
    }
  }
  return false;
}

/* ==========================================================================
   15. REMOTE PLAYERS & NAMEPLATES RENDERER
   ========================================================================== */
let selfNameplateEl = null;

function ensureSelfNameplate() {
  if (!selfNameplateEl) {
    selfNameplateEl = document.createElement('div');
    selfNameplateEl.className = 'player-nameplate';
    document.getElementById('world-labels').appendChild(selfNameplateEl);
  }
}

function removeRemotePlayerMesh(id) {
  const item = remotePlayerMeshes[id];
  if (item) {
    scene.remove(item.mesh);
    if (item.labelEl) item.labelEl.remove();
    delete remotePlayerMeshes[id];
  }
}

function updateRemotePlayersAndBots(dt, time) {
  Object.values(onlinePlayers).forEach(p => {
    if (p.isBot && p.waypoints) {
      const target = p.waypoints[p.wpIdx];
      const dx = target.x - p.x;
      const dz = target.z - p.z;
      const dist = Math.hypot(dx, dz);
      if (dist < 0.8) {
        p.wpIdx = (p.wpIdx + 1) % p.waypoints.length;
      } else {
        const speed = 4.2;
        p.x += (dx / dist) * speed * dt;
        p.z += (dz / dist) * speed * dt;
        p.rotY = Math.atan2(dx, dz);
      }
    }

    let entry = remotePlayerMeshes[p.id];
    const appSig = JSON.stringify(p.appearance);
    if (!entry || entry.appSig !== appSig) {
      if (entry) {
        scene.remove(entry.mesh);
        entry.labelEl.remove();
      }
      const mesh = buildDetectiveCharacterMesh(p.appearance);
      mesh.position.set(p.x, p.y || 0, p.z);
      scene.add(mesh);

      const labelEl = document.createElement('div');
      labelEl.className = 'player-nameplate';
      document.getElementById('world-labels').appendChild(labelEl);

      entry = { mesh, labelEl, appSig, walkPhase: Math.random() * 6 };
      remotePlayerMeshes[p.id] = entry;
    }

    entry.mesh.position.x += (p.x - entry.mesh.position.x) * 0.25;
    entry.mesh.position.y += ((p.y || 0) - entry.mesh.position.y) * 0.25;
    entry.mesh.position.z += (p.z - entry.mesh.position.z) * 0.25;
    entry.mesh.rotation.y = p.rotY || 0;

    if (p.emote && p.emote !== 'none') {
      applyEmoteAnimation(entry.mesh, p.emote, time);
    } else {
      entry.walkPhase += dt * 8;
      const { bodyGroup, leftLeg, rightLeg, leftArm, rightArm } = entry.mesh.userData;
      bodyGroup.rotation.set(0, 0, 0);
      bodyGroup.position.y = entry.mesh.userData.rideHeight || 0;
      if (p.appearance.vehicle === 'none') {
        leftLeg.rotation.x = Math.sin(entry.walkPhase) * 0.45;
        rightLeg.rotation.x = -Math.sin(entry.walkPhase) * 0.45;
        leftArm.rotation.x = -Math.sin(entry.walkPhase) * 0.35;
        rightArm.rotation.x = Math.sin(entry.walkPhase) * 0.35;
      } else {
        leftLeg.rotation.x = 0; rightLeg.rotation.x = 0;
      }
    }

    const headPos = entry.mesh.position.clone().add(new THREE.Vector3(0, 3.05, 0));
    headPos.project(camera);
    if (headPos.z < 1) {
      const sx = (headPos.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-headPos.y * 0.5 + 0.5) * window.innerHeight;
      entry.labelEl.style.left = `${sx}px`;
      entry.labelEl.style.top = `${sy}px`;
      entry.labelEl.style.display = 'flex';
      const chatHtml = p.chat ? `<div class="chat-bubble-3d">${p.chat}</div>` : '';
      entry.labelEl.innerHTML = `${chatHtml}<div class="name-tag-3d">${p.name} • ⭐${getTotalScore(p)}</div>`;
    } else {
      entry.labelEl.style.display = 'none';
    }
  });
}

/* ==========================================================================
   16. MAIN ANIMATION LOOP
   ========================================================================== */
const clock = new THREE.Clock();

function animateWorld() {
  requestAnimationFrame(animateWorld);
  const dt = Math.min(clock.getDelta(), 0.05);
  const time = clock.getElapsedTime();

  evidenceMeshes.forEach((item, idx) => {
    if (!item.collected) {
      item.orb.rotation.y += dt * 2.2;
      item.orb.position.y = Math.sin(time * 3 + idx) * 0.22;
    }
  });

  if (worldPodiumGroup) {
    worldPodiumGroup.children.forEach(child => {
      if (child.userData.isPodiumChamp) {
        child.position.y = child.userData.baseY + Math.abs(Math.sin(time * 4 + child.userData.rank)) * 0.16;
        child.rotation.y = Math.sin(time * 2 + child.userData.rank) * 0.35;
      }
    });
  }

  updateRemotePlayersAndBots(dt, time);

  if (playerGroup && isPlayingInWorld()) {
    let moveForward = 0;
    let moveRight = 0;

    if (keys['KeyW'] || keys['ArrowUp']) moveForward += 1;
    if (keys['KeyS'] || keys['ArrowDown']) moveForward -= 1;
    if (keys['KeyD'] || keys['ArrowRight']) moveRight += 1;
    if (keys['KeyA'] || keys['ArrowLeft']) moveRight -= 1;

    if (Math.abs(joyVec.x) > 0.08 || Math.abs(joyVec.y) > 0.08) {
      moveRight += joyVec.x;
      moveForward -= joyVec.y;
    }

    const vObj = APPEARANCE_OPTIONS.vehicles.find(v => v.id === gameState.player.appearance.vehicle) || APPEARANCE_OPTIONS.vehicles[0];
    const currentSpeed = playerState.baseSpeed * vObj.speedMult;

    const len = Math.hypot(moveForward, moveRight);
    if (len > 0.01) {
      if (currentEmote.type !== 'none') {
        currentEmote = { type: 'none', endTime: 0 };
        clearEmoteUI();
      }
      moveForward /= Math.max(1, len);
      moveRight /= Math.max(1, len);

      const sinY = Math.sin(camYaw);
      const cosY = Math.cos(camYaw);
      const worldX = moveRight * cosY - moveForward * sinY;
      const worldZ = -moveRight * sinY - moveForward * cosY;

      const stepX = worldX * currentSpeed * dt;
      const stepZ = worldZ * currentSpeed * dt;

      if (!checkCollision(playerGroup.position.x + stepX, playerGroup.position.z)) {
        playerGroup.position.x += stepX;
      }
      if (!checkCollision(playerGroup.position.x, playerGroup.position.z + stepZ)) {
        playerGroup.position.z += stepZ;
      }

      const targetAngle = Math.atan2(worldX, worldZ);
      let diff = targetAngle - playerGroup.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      playerGroup.rotation.y += diff * 0.22;

      const { bodyGroup, leftLeg, rightLeg, leftArm, rightArm, headGroup, rideHeight } = playerGroup.userData;
      bodyGroup.rotation.set(0, 0, 0);
      bodyGroup.position.y = rideHeight || 0;
      leftArm.rotation.z = 0;
      rightArm.rotation.z = 0;
      if (headGroup) headGroup.rotation.set(0, 0, 0);

      if (gameState.player.appearance.vehicle === 'none') {
        playerState.walkCycle += dt * 12;
        leftLeg.rotation.x = Math.sin(playerState.walkCycle) * 0.6;
        rightLeg.rotation.x = -Math.sin(playerState.walkCycle) * 0.6;
        leftArm.rotation.x = -Math.sin(playerState.walkCycle) * 0.5;
        rightArm.rotation.x = Math.sin(playerState.walkCycle) * 0.5;
      } else {
        leftLeg.rotation.x = 0.15;
        rightLeg.rotation.x = -0.15;
        leftArm.rotation.z = 0.25;
        rightArm.rotation.z = -0.25;
        bodyGroup.position.y = (rideHeight || 0) + Math.sin(time * 8) * 0.04;
      }
    } else if (currentEmote.type !== 'none' && performance.now() < currentEmote.endTime) {
      applyEmoteAnimation(playerGroup, currentEmote.type, time);
    } else {
      if (currentEmote.type !== 'none') {
        currentEmote = { type: 'none', endTime: 0 };
        clearEmoteUI();
      }
      const { bodyGroup, leftLeg, rightLeg, leftArm, rightArm, headGroup, rideHeight } = playerGroup.userData;
      bodyGroup.rotation.set(0, 0, 0);
      bodyGroup.position.y = rideHeight || 0;
      if (headGroup) headGroup.rotation.set(0, 0, 0);
      leftLeg.rotation.x *= 0.8;
      rightLeg.rotation.x *= 0.8;
      leftArm.rotation.x *= 0.8;
      rightArm.rotation.x *= 0.8;
      leftArm.rotation.z *= 0.8;
      rightArm.rotation.z *= 0.8;
    }

    playerState.velY += playerState.gravity * dt;
    playerGroup.position.y += playerState.velY * dt;
    if (playerGroup.position.y <= 0) {
      playerGroup.position.y = 0;
      playerState.velY = 0;
      playerState.onGround = true;
    }

    let closest = null;
    let closestDist = 3.4;
    evidenceMeshes.forEach(item => {
      if (!item.collected) {
        const d = playerGroup.position.distanceTo(item.group.position);
        if (d < closestDist) {
          closestDist = d;
          closest = item;
        }
      }
    });

    const promptEl = document.getElementById('interact-prompt');
    if (closest) {
      activeEvidenceTarget = closest;
      document.getElementById('interact-label').textContent = `สำรวจ: ${closest.data.title}`;
      promptEl.style.display = 'flex';
    } else {
      activeEvidenceTarget = null;
      promptEl.style.display = 'none';
    }

    updateHUD();
  }

  // Self Nameplate
  if (playerGroup && gameState.player.name) {
    ensureSelfNameplate();
    if (selfChatTimer > 0) {
      selfChatTimer--;
      if (selfChatTimer === 0) selfChatText = '';
    }
    const selfHead = playerGroup.position.clone().add(new THREE.Vector3(0, 3.1, 0));
    selfHead.project(camera);
    if (selfHead.z < 1 && isPlayingInWorld()) {
      const sx = (selfHead.x * 0.5 + 0.5) * window.innerWidth;
      const sy = (-selfHead.y * 0.5 + 0.5) * window.innerHeight;
      selfNameplateEl.style.left = `${sx}px`;
      selfNameplateEl.style.top = `${sy}px`;
      selfNameplateEl.style.display = 'flex';
      const chatHtml = selfChatText ? `<div class="chat-bubble-3d">${selfChatText}</div>` : '';
      selfNameplateEl.innerHTML = `${chatHtml}<div class="name-tag-3d self">🕵️ ${gameState.player.name}</div>`;
    } else {
      selfNameplateEl.style.display = 'none';
    }
  }

  // Third-Person Camera Follow
  if (playerGroup) {
    const targetPos = playerGroup.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    const camX = targetPos.x + camDist * Math.sin(camYaw) * Math.cos(camPitch);
    const camY = targetPos.y + camDist * Math.sin(camPitch);
    const camZ = targetPos.z + camDist * Math.cos(camYaw) * Math.cos(camPitch);

    camera.position.lerp(new THREE.Vector3(camX, Math.max(1.2, camY), camZ), 0.16);
    camera.lookAt(targetPos);
  }

  // Update 3D Building Labels
  worldLabels.forEach(item => {
    const projected = item.pos.clone().project(camera);
    if (projected.z < 1) {
      const x = (projected.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-projected.y * 0.5 + 0.5) * window.innerHeight;
      item.el.style.left = `${x}px`;
      item.el.style.top = `${y}px`;
      item.el.style.opacity = '1';
    } else {
      item.el.style.opacity = '0';
    }
  });

  renderer.render(scene, camera);
}

/* ==========================================================================
   17. BOOTSTRAP ON PAGE LOAD
   ========================================================================== */
window.addEventListener('DOMContentLoaded', () => {
  loadSaveData();
  if (gameState.player.name) {
    document.getElementById('input-name').value = gameState.player.name;
    document.getElementById('input-no').value = gameState.player.no;
  }
  updateVehicleButtonUI();
  initMultiplayerServer();
  init3DWorld();
  loadMissionInWorld(1);
});
