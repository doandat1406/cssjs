/**
 * Máy chủ đồng bộ cho app "Quản Lý Cuộc Sống" – chạy trên Google Apps Script.
 * - Lưu toàn bộ dữ liệu app vào 1 file JSON trong Google Drive của anh.
 * - (Tùy chọn) Mỗi 5 phút tự lấy khách để lại SĐT trên Pancake và thêm vào mục Lead mới.
 * Hướng dẫn cài đặt: xem file HUONG-DAN.md
 */
const PROPS = PropertiesService.getScriptProperties();
const DATA_FILE_NAME = 'quan-ly-cuoc-song-data.json';
const PANCAKE_API = 'https://pages.fm/api/public_api/v1';
const CAR_MODELS = ['VF 3', 'VF 5', 'VF 6', 'VF 7', 'VF 8', 'VF 9', 'VF e34', 'Limo Green', 'Minio Green', 'Herio Green', 'Nerio Green'];

// Chạy hàm này 1 lần sau khi dán code (và mỗi khi đổi cấu hình Pancake)
function setup() {
  if (!PROPS.getProperty('SECRET')) PROPS.setProperty('SECRET', Utilities.getUuid().replace(/-/g, '').slice(0, 20));
  dataFile_();
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'pullPancake')
    .forEach(t => ScriptApp.deleteTrigger(t));
  if (PROPS.getProperty('PANCAKE_PAGE_ID') && PROPS.getProperty('PANCAKE_TOKEN')) {
    ScriptApp.newTrigger('pullPancake').timeBased().everyMinutes(5).create();
    Logger.log('✅ Đã bật tự động lấy lead từ Pancake mỗi 5 phút.');
  } else {
    Logger.log('ℹ️ Chưa có PANCAKE_PAGE_ID / PANCAKE_TOKEN – tạm bỏ qua phần Pancake.');
  }
  Logger.log('🔑 MÃ BÍ MẬT (dán vào app): ' + PROPS.getProperty('SECRET'));
}

// ===== Đồng bộ dữ liệu =====
function doGet(e) {
  if (!authorized_(e.parameter.key)) return json_({ ok: false, error: 'Sai mã bí mật' });
  const store = read_();
  return json_({ ok: true, version: store.version, data: store.data });
}

function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'Dữ liệu gửi lên không hợp lệ' }); }
  if (!authorized_(body.key)) return json_({ ok: false, error: 'Sai mã bí mật' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const store = read_();
    // Máy khác (hoặc Pancake) vừa ghi dữ liệu mới hơn – trả về để app gộp rồi gửi lại
    if (body.baseVersion !== store.version) return json_({ ok: false, conflict: true, version: store.version, data: store.data });
    store.version++;
    store.data = body.data;
    write_(store);
    return json_({ ok: true, version: store.version });
  } finally {
    lock.releaseLock();
  }
}

function dataFile_() {
  const id = PROPS.getProperty('DATA_FILE_ID');
  if (id) {
    try { return DriveApp.getFileById(id); } catch (e) { /* file bị xóa – tạo lại */ }
  }
  const f = DriveApp.createFile(DATA_FILE_NAME, JSON.stringify({ version: 0, data: null }), 'application/json');
  PROPS.setProperty('DATA_FILE_ID', f.getId());
  return f;
}
const read_ = () => JSON.parse(dataFile_().getBlob().getDataAsString('UTF-8'));
const write_ = store => dataFile_().setContent(JSON.stringify(store));
const json_ = obj => ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
function authorized_(key) {
  const s = PROPS.getProperty('SECRET');
  return !!s && key === s;
}

// ===== Pancake =====
function pullPancake() {
  const pageId = PROPS.getProperty('PANCAKE_PAGE_ID'), token = PROPS.getProperty('PANCAKE_TOKEN');
  if (!pageId || !token) return;
  const now = Math.floor(Date.now() / 1000);
  const since = Number(PROPS.getProperty('PANCAKE_SINCE')) || now - 24 * 3600;
  const convs = fetchConversations_(pageId, token, since, now);
  if (convs === null) return; // lỗi API – lần sau thử lại từ mốc cũ

  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const store = read_();
    const S = store.data || {};
    S.customers = S.customers || [];
    S.staff = S.staff || [];
    const known = new Set(S.customers.map(c => normPhone_(c.phone)).filter(Boolean));
    const active = S.staff.filter(s => s.active !== false);
    let added = 0;
    convs.forEach(c => {
      phonesOf_(c).forEach(phone => {
        if (known.has(phone)) return;
        known.add(phone);
        let saleId = '';
        if (active.length) {
          const i = (S.rrIndex || 0) % active.length;
          saleId = active[i].id;
          S.rrIndex = (i + 1) % active.length;
          S.rrU = Date.now();
        }
        S.customers.push({
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
          name: nameOf_(c) || 'Khách ' + phone.slice(-4), phone,
          model: modelOf_(c.snippet), source: 'Pancake', status: 'moi', saleId,
          nextFollow: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd'),
          deposit: 0, deliveryDate: '', note: String(c.snippet || '').slice(0, 200),
          createdAt: Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', "yyyy-MM-dd'T'HH:mm:ss"),
          _u: Date.now()
        });
        added++;
      });
    });
    if (added) {
      store.version++;
      store.data = S;
      write_(store);
    }
    PROPS.setProperty('PANCAKE_SINCE', String(now - 60));
    Logger.log('Pancake: ' + convs.length + ' hội thoại, thêm ' + added + ' lead mới');
  } finally {
    lock.releaseLock();
  }
}

// Trả về danh sách hội thoại, hoặc null nếu API báo lỗi
function fetchConversations_(pageId, token, since, until) {
  const out = [];
  let firstPrev = null;
  for (let page = 1; page <= 10; page++) {
    const url = PANCAKE_API + '/pages/' + encodeURIComponent(pageId) + '/conversations'
      + '?page_access_token=' + encodeURIComponent(token)
      + '&since=' + since + '&until=' + until + '&page_number=' + page;
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      Logger.log('❌ Pancake lỗi ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 300));
      return page === 1 ? null : out;
    }
    const body = JSON.parse(res.getContentText());
    const list = body.conversations || body.data || [];
    // Dừng khi hết dữ liệu hoặc API trả lại đúng trang trước đó
    if (!list.length || (list[0] && list[0].id === firstPrev)) break;
    firstPrev = list[0].id;
    out.push.apply(out, list);
  }
  return out;
}

function phonesOf_(c) {
  const found = [];
  (c.recent_phone_numbers || []).forEach(p => {
    found.push(typeof p === 'string' ? p : (p.phone_number || p.captured || p.phone || ''));
  });
  String(c.snippet || '').replace(/(\+?84|0)[\d .\-]{8,12}/g, m => { found.push(m); return m; });
  return [...new Set(found.map(normPhone_).filter(p => /^0\d{9,10}$/.test(p)))];
}
function nameOf_(c) {
  const cust = (c.customers || [])[0] || c.page_customer || c.from || {};
  return cust.name || '';
}
function modelOf_(text) {
  const t = String(text || '').toLowerCase().replace(/\s+/g, '');
  return CAR_MODELS.find(m => t.includes(m.toLowerCase().replace(/\s+/g, ''))) || 'Chưa rõ';
}
function normPhone_(p) {
  let d = String(p || '').replace(/\D/g, '');
  if (d.startsWith('84') && d.length >= 11) d = '0' + d.slice(2);
  return d;
}

// Chạy thử để kiểm tra kết nối Pancake (không ghi dữ liệu)
function testPancake() {
  const pageId = PROPS.getProperty('PANCAKE_PAGE_ID'), token = PROPS.getProperty('PANCAKE_TOKEN');
  if (!pageId || !token) return Logger.log('Chưa nhập PANCAKE_PAGE_ID và PANCAKE_TOKEN trong Script Properties');
  const now = Math.floor(Date.now() / 1000);
  const convs = fetchConversations_(pageId, token, now - 3 * 24 * 3600, now);
  if (!convs) return;
  Logger.log('Lấy được ' + convs.length + ' hội thoại trong 3 ngày qua.');
  convs.slice(0, 5).forEach(c => Logger.log('- ' + (nameOf_(c) || '(không tên)') + ': ' + (phonesOf_(c).join(', ') || 'chưa có SĐT')));
  if (convs[0]) Logger.log('Mẫu dữ liệu: ' + JSON.stringify(convs[0]).slice(0, 1500));
}
