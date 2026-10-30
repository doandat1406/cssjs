# Hướng dẫn cài đặt – Quản Lý Cuộc Sống

## 1. Mở app bằng đường link (GitHub Pages) – làm 1 lần, mất 1 phút

1. Vào https://github.com/doandat1406/cssjs/settings/pages
2. Mục **Build and deployment → Source** chọn **Deploy from a branch**.
3. Mục **Branch** chọn `master`, thư mục `/ (root)` → bấm **Save**.
4. Đợi 1–2 phút, app sẽ có ở: **https://doandat1406.github.io/cssjs/**

Trên điện thoại: mở link bằng Safari/Chrome → **Chia sẻ → Thêm vào màn hình chính** để dùng như một app.

> Lưu ý: repo đang để công khai nên ai cũng xem được *mã nguồn* app, nhưng **dữ liệu của anh không nằm trên GitHub** –
> dữ liệu chỉ ở trình duyệt của anh và (nếu bật đồng bộ) trong Google Drive của anh.

## 2. Đồng bộ online giữa điện thoại và máy tính (Google Apps Script) – khoảng 5 phút

1. Vào https://script.google.com → **Dự án mới** (New project). Đặt tên: `Quan Ly Cuoc Song`.
2. Xóa hết code mặc định, dán toàn bộ nội dung file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) → bấm 💾 Lưu.
3. Ở thanh trên, chọn hàm **`setup`** → bấm **Chạy (Run)**. Google sẽ hỏi cấp quyền (Drive, chạy tự động, kết nối bên ngoài) → **Cho phép**.
   *(Nếu hiện "Google chưa xác minh ứng dụng này": bấm Nâng cao → Đi tới Quan Ly Cuoc Song – vì đây là script của chính anh.)*
4. Xem **Nhật ký thực thi** bên dưới, chép dòng **MÃ BÍ MẬT**.
5. Bấm **Triển khai (Deploy) → Triển khai mới (New deployment)** → chọn loại **Ứng dụng web (Web app)**:
   - Thực thi dưới dạng (Execute as): **Tôi (Me)**
   - Người có quyền truy cập (Who has access): **Bất kỳ ai (Anyone)**
   → **Triển khai** → chép **URL ứng dụng web** (dạng `https://script.google.com/macros/s/.../exec`).
6. Mở app → cuối trang bấm **☁️ Đồng bộ online** → dán URL và Mã bí mật → **Kết nối & đồng bộ**.
7. Làm bước 6 trên **mọi thiết bị** (điện thoại, máy tính). Dữ liệu tự đồng bộ mỗi phút và mỗi khi mở app.

> Chỉ ai có **cả URL lẫn mã bí mật** mới đọc/ghi được dữ liệu. Không gửi mã bí mật cho người khác.
> Khi sửa code `Code.gs`, phải vào **Triển khai → Quản lý triển khai → ✏️ → Phiên bản mới** thì thay đổi mới có hiệu lực.

## 3. Tự lấy lead từ Pancake (cần làm xong bước 2)

1. Trong Pancake: vào trang Facebook của anh → **Cài đặt → Công cụ (Tools)** → tạo/copy **Page Access Token**.
   Page ID là dãy số của trang (thấy trong đường dẫn Pancake hoặc phần cài đặt trang).
2. Trong Apps Script: ⚙️ **Cài đặt dự án (Project Settings)** → **Thuộc tính tập lệnh (Script Properties)** → thêm:
   - `PANCAKE_PAGE_ID` = Page ID
   - `PANCAKE_TOKEN` = Page Access Token
3. Chọn hàm **`testPancake`** → **Chạy**. Nhật ký sẽ in ra vài khách gần đây và SĐT của họ.
   - Nếu thấy tên + SĐT đúng → chuyển sang bước 4.
   - Nếu báo lỗi hoặc không thấy SĐT → copy phần **"Mẫu dữ liệu"** trong nhật ký gửi em để em chỉnh lại code cho khớp (nhớ **xóa token** trước khi gửi).
4. Chạy lại hàm **`setup`** → script sẽ tự kiểm tra Pancake **mỗi 5 phút**.
   Khách mới có SĐT sẽ vào mục **Khách hàng → Lead mới**, nguồn "Pancake", và **được chia tự động cho sale theo lượt**.
   Số điện thoại đã có sẽ không bị thêm trùng.

Muốn có nhiều trang Facebook? Báo em để em mở rộng thêm.
