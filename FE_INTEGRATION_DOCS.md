  # Tài Liệu Tích Hợp Frontend (FE Integration Docs)

  Tài liệu này tổng hợp các thay đổi mới nhất từ phía Backend (BE) để team Frontend (FE) tiến hành cập nhật giao diện, bao gồm:
  1. Tính năng **Cập nhật Profile** (Upload Avatar, tuỳ chọn Ngôn ngữ).
  2. Hỗ trợ **Đa ngôn ngữ (Anh / Việt)** cho danh sách Activity Packages & Templates.

  ---

  ## 1. Cập nhật Profile (User Settings)

  ### 1.1. Cập nhật Model / Interface User
  Trong store (Redux/Zustand) hoặc interface, `User` payload trả về từ API `GET /users/me` đã được bổ sung 2 trường mới:
  ```typescript
  interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    avatarUrl?: string | null;  // [NEW] Link ảnh đại diện lưu trên S3 (có thể null)
    language: 'vi' | 'en';      // [NEW] Ngôn ngữ hiển thị mặc định của user 
  }
  ```

  ### 1.2. Upload Avatar (POST `/users/me/avatar`)
  - **Mục đích:** Khi người dùng đổi ảnh đại diện.
  - **Content-Type:** `multipart/form-data`
  - **Body Payload:**
    - `file`: Đối tượng File ảnh lấy từ thẻ `<input type="file" />`
  - **Response:** Trả về object User mới đã được update `avatarUrl`.
  - **FE Handle:** Lưu URL S3 này vào store và hiển thị trên Avatar component.

  ### 1.3. Cập nhật Tên và Ngôn ngữ (PUT `/users/me`)
  - **Mục đích:** Lưu cài đặt cá nhân của người dùng.
  - **Content-Type:** `application/json`
  - **Body Payload (Các trường đều là Optional):**
    ```json
    {
      "name": "Tên Hiển Thị Mới",
      "language": "en"  // chỉ chấp nhận 'vi' hoặc 'en'
    }
    ```
  - **FE Handle:**
    - Nếu call API thành công, FE cần cập nhật store `user.language`.
    - Phía FE nên móc nối giá trị này với thư viện i18n (`react-i18next`, `vue-i18n`...) để đổi ngôn ngữ toàn App ngay lập tức (VD: `i18n.changeLanguage(res.data.language)`).

  ---

  ## 2. API Activity Packages & Templates (Đa Ngôn Ngữ)

  Tất cả các API lấy danh sách Package (như `GET /activity-packages` hoặc `GET /activity-packages/team/:id`) hiện tại đã đính kèm thêm các trường phiên bản **Tiếng Việt (Vi)** bên cạnh các trường Tiếng Anh mặc định.

  ### 2.1. Cập nhật DTO / Interfaces cho Activity

  **Activity Package:**
  ```typescript
  interface ActivityPackageResponseDto {
    id: string;
    displayName: string;         // Tên Tiếng Anh mặc định
    displayNameVi?: string;      // [NEW] Tên Tiếng Việt
    description?: string;        // Mô tả Tiếng Anh
    descriptionVi?: string;      // [NEW] Mô tả Tiếng Việt
    imageKey?: string;
    imageUrl?: string;
    isActive: boolean;
    activityTemplates: ActivityTemplateResponseDto[];
    // ...các trường cũ giữ nguyên
  }
  ```

  **Activity Template:**
  ```typescript
  interface ActivityTemplateResponseDto {
    id: string;
    name: string;                // Tên Tiếng Anh
    nameVi?: string;             // [NEW] Tên Tiếng Việt
    description?: string;        // Mô tả Tiếng Anh
    descriptionVi?: string;      // [NEW] Mô tả Tiếng Việt
    keyword: string;
    arguments: ArgumentResponseDto[];
    returnValue?: ReturnValueResponseDto;
    // ...các trường cũ giữ nguyên
  }
  ```

  **Argument (Tham số truyền vào):**
  ```typescript
  interface ArgumentResponseDto {
    id: string;
    name: string;
    description?: string;        // Mô tả Tiếng Anh
    descriptionVi?: string;      // [NEW] Mô tả Tiếng Việt
    type: string;
    isRequired: boolean;
    defaultValue?: any;
  }
  ```

  **Return Value (Kết quả trả về):**
  ```typescript
  interface ReturnValueResponseDto {
    id: string;
    type: string;
    displayName?: string;        // Tên hiển thị Tiếng Anh
    displayNameVi?: string;      // [NEW] Tên hiển thị Tiếng Việt
    description?: string;        // Mô tả Tiếng Anh
    descriptionVi?: string;      // [NEW] Mô tả Tiếng Việt
  }
  ```

  ### 2.2. Hướng dẫn FE Render (Fallback Logic)
  Khi render một Package hoặc Template Box ra màn hình, FE cần **kiểm tra biến ngôn ngữ hiện tại** đang thiết lập trong App (`i18n.language` hoặc `currentUser.language`).

  **Xây dựng hàm Helper:**
  Tạo một helper function để lấy text dựa theo ngôn ngữ, với Fallback an toàn (nếu Tiếng Việt không có data/null, sẽ tự trả về Tiếng Anh).

  *Ví dụ React / JS:*
  ```javascript
  // Helper
  const getDisplayText = (item, fieldName, currentLang) => {
    if (currentLang === 'vi') {
      const viField = `${fieldName}Vi`;
      // Ưu tiên trả về bản Vi, nếu null thì fallback về mặc định (Eng)
      return item[viField] || item[fieldName];
    }
    return item[fieldName];
  };

  // Áp dụng trong Component:
  const currentLang = user.language; // 'vi' hoặc 'en'

  // Hiển thị tên Package:
  <div>{getDisplayText(pkg, 'displayName', currentLang)}</div>

  // Hiển thị mô tả Template:
  <p>{getDisplayText(template, 'description', currentLang)}</p>
  ```

  **Nguyên tắc hiển thị:** Luôn ưu tiên hiển thị `*Vi` khi người dùng đang ở giao diện Tiếng Việt. Nếu `*Vi` rỗng (do Admin chưa buồn nhập bản dịch trong tương lai), thì dùng string ở cột tiếng gốc tránh hụt nội dung.

  ---
  *Tài liệu này có thể được chia sẻ trực tiếp cho các bạn đảm nhiệm phần Frontend.*
