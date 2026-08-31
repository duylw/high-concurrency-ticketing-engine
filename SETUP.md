# 🚀 Hướng Dẫn Thiết Lập & Kiến Trúc Dự Án Backend
**Stack**: Node.js, Express.js, PostgreSQL, Prisma ORM, JWT, Zod, JavaScript (ES Modules)  
**Mục tiêu**: Xây dựng bộ khung (Boilerplate) Auth + Phân quyền chuẩn MVC / Layered Architecture sẵn sàng mở rộng cho bất kỳ dự án nào.

---

## 🏛️ 1. Kiến Trúc Hệ Thống (Layered MVC Architecture)

Trong REST API, mô hình MVC được triển khai theo dạng **Layered Architecture (Kiến trúc phân tầng)** với luồng dữ liệu 1 chiều nghiêm ngặt:

```
[Client / Frontend]
        │  (HTTP Request)
        ▼
   [Routes] ─────────────▶ Định tuyến URL tới Controller
        │
        ▼
 [Middlewares] ──────────▶ Xác thực Token (Auth), Phân quyền (Role), Validate dữ liệu (Zod)
        │
        ▼
  [Controllers] ─────────▶ Nhận Request (body, params), gọi Service, trả Response JSON
        │
        ▼
   [Services] ───────────▶ Chứa 100% Business Logic, mã hóa, tính toán, gọi DB
        │
        ▼
 [Prisma / Database] ────▶ Tương tác trực tiếp với PostgreSQL
```

---

## 📂 2. Cấu Trúc Thư Mục Chuẩn (Folder Structure)

```text
├── prisma/
│   ├── schema.prisma              # Định nghĩa Model Database & Quan hệ
│   └── migrations/                # Lịch sử đồng bộ cơ sở dữ liệu
├── src/
│   ├── config/                    # Cấu hình môi trường & kết nối DB
│   │   ├── env.js                 # Validate biến môi trường (.env)
│   │   └── prisma.js              # Khởi tạo Singleton Prisma Client
│   ├── constants/                 # Hằng số (HTTP Status Codes, Roles, Token types)
│   │   ├── httpStatus.js
│   │   └── roles.js
│   ├── controllers/               # Điều phối HTTP Request / Response
│   │   ├── auth.controller.js
│   │   └── user.controller.js
│   ├── errors/                    # Custom Error Classes (Xử lý lỗi tập trung)
│   │   └── AppError.js
│   ├── middlewares/               # Các hàm trung gian can thiệp Request
│   │   ├── auth.middleware.js     # Xác thực Access Token
│   │   ├── role.middleware.js     # Phân quyền Role (RBAC)
│   │   ├── validate.middleware.js # Kiểm tra dữ liệu đầu vào với Zod
│   │   └── error.middleware.js    # Global Error Handler
│   ├── routes/                    # Khai báo các API Endpoints
│   │   ├── index.js               # Router tổng hợp
│   │   ├── auth.route.js          # /api/v1/auth
│   │   └── user.route.js          # /api/v1/users
│   ├── services/                  # Business Logic (Không chứa req, res)
│   │   ├── auth.service.js
│   │   └── user.service.js
│   ├── utils/                     # Hàm tiện ích tái sử dụng
│   │   ├── apiResponse.js         # Định dạng JSON trả về chuẩn
│   │   ├── catchAsync.js          # Bọc async function bắt lỗi tự động
│   │   ├── jwt.util.js            # Ký & Giải mã JWT (Access/Refresh Token)
│   │   └── password.util.js       # Hash mật khẩu bằng bcrypt
│   ├── validations/               # Schema kiểm tra dữ liệu đầu vào
│   │   ├── auth.validation.js
│   │   └── user.validation.js
│   ├── app.js                     # Cấu hình Express App, CORS, Middlewares chung
│   └── server.js                  # Entry point (Lắng nghe PORT, Graceful Shutdown)
├── .env.example
├── .env
├── package.json
└── SETUP.md
```

---

## 🧩 3. Các Design Pattern Áp Dụng

1. **Chain of Responsibility (Middleware Pattern)**:  
   Chuỗi kiểm tra tuần tự: `Request -> Cors -> RateLimit -> AuthMiddleware -> RoleMiddleware -> ValidateMiddleware -> Controller`.
2. **Singleton Pattern**:  
   Tạo duy nhất 1 instance `PrismaClient` trong `src/config/prisma.js` để tối ưu Connection Pool.
3. **Factory & Custom Error Pattern**:  
   Dùng các class `BadRequestError (400)`, `UnauthorizedError (401)`, `ForbiddenError (403)`, `NotFoundError (404)` kế thừa từ `AppError` giúp chuẩn hóa mã lỗi.
4. **Wrapper Pattern (`catchAsync`)**:  
   Bọc các hàm bất đồng bộ trong Controller để tự động ném lỗi sang `error.middleware.js`, loại bỏ hoàn toàn khối `try-catch` lặp lại.
5. **Strategy Pattern (RBAC - Role Based Access Control)**:  
   Linh hoạt cấu hình danh sách quyền cho từng route: `authorizeRoles('ADMIN', 'MODERATOR')`.

---

## 📜 4. Quy Tắc Code & Tiêu Chuẩn Phát Triển (Coding Rules)

- **Quy tắc đặt tên file**:
  - Dùng dấu chấm phân cách trách nhiệm: `auth.controller.js`, `auth.service.js`, `auth.route.js`, `auth.validation.js`.
- **Tầng Service độc lập**:
  - Tuyệt đối **KHÔNG** truyền `req` hoặc `res` vào hàm của `Service`. Service chỉ nhận dữ liệu thuần túy (primitive types, objects) và trả về dữ liệu hoặc ném ra `AppError`.
- **Định dạng phản hồi API chuẩn**:
  - **Thành công (2xx)**:
    ```json
    {
      "success": true,
      "message": "Đăng nhập thành công",
      "data": { "user": { ... }, "accessToken": "..." }
    }
    ```
  - **Thất bại (4xx, 5xx)**:
    ```json
    {
      "success": false,
      "message": "Email hoặc mật khẩu không chính xác",
      "errors": []
    }
    ```
- **Bảo mật**:
  - Không bao giờ trả về trường `password` trong response.
  - Sử dụng mã băm `bcrypt` với cost factor tối thiểu là `10` hoặc `12`.
  - Phân tách `AccessToken` (sống ngắn: 15m - 1h) và `RefreshToken` (sống dài: 7d - 30d).

---

## 📋 5. Thứ Tự & Các Bước Thực Hiện Chi Tiết (Roadmap)

### 🔹 Giai đoạn 1: Khởi tạo dự án & Cài đặt thư viện
- [ ] Chạy `npm init -y` và cấu hình `"type": "module"` trong `package.json`.
- [ ] Cài đặt các thư viện sản phẩm (Dependencies):
  ```bash
  npm install express dotenv cors helmet morgan bcryptjs jsonwebtoken zod @prisma/client
  ```
- [ ] Cài đặt các công cụ phát triển (Dev Dependencies):
  ```bash
  npm install -D nodemon prisma
  ```

---

### 🔹 Giai đoạn 2: Cấu hình Cơ sở dữ liệu & Prisma
- [ ] Khởi tạo Prisma: `npx prisma init`.
- [ ] Thiết lập chuỗi kết nối `DATABASE_URL` trong file `.env`.
- [ ] Định nghĩa `schema.prisma`:
  - Model `User` (id, email, password, name, role, refreshToken, createdAt, updatedAt).
  - Enum `Role` (`USER`, `ADMIN`, `MODERATOR`).
- [ ] Chạy migration đầu tiên: `npx prisma migrate dev --name init_auth`.
- [ ] Tạo file Singleton Prisma Client (`src/config/prisma.js`).

---

### 🔹 Giai đoạn 3: Xây dựng tầng Tiện ích & Xử lý Lỗi Cơ bản
- [ ] Tạo Base Error `AppError` và các lớp lỗi con (`BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`).
- [ ] Viết hàm bọc `catchAsync` (`src/utils/catchAsync.js`).
- [ ] Viết hàm chuẩn hóa response `apiResponse` (`src/utils/apiResponse.js`).
- [ ] Viết Global Error Handler Middleware (`src/middlewares/error.middleware.js`).

---

### 🔹 Giai đoạn 4: Xây dựng Module Mã Hóa & JWT
- [ ] Viết hàm băm mật khẩu `hashPassword` và so sánh `comparePassword` với `bcryptjs` (`src/utils/password.util.js`).
- [ ] Viết hàm tạo Access Token & Refresh Token (`src/utils/jwt.util.js`).

---

### 🔹 Giai đoạn 5: Xây dựng Hệ thống Validation (Zod)
- [ ] Viết middleware `validate` nhận Zod Schema (`src/middlewares/validate.middleware.js`).
- [ ] Định nghĩa schema kiểm tra cho Auth (`src/validations/auth.validation.js`):
  - `registerSchema`: Email hợp lệ, mật khẩu tối thiểu 6 ký tự, tên.
  - `loginSchema`: Email, mật khẩu.
  - `refreshTokenSchema`: Refresh token dạng string hợp lệ.

---

### 🔹 Giai đoạn 6: Xây dựng Authentication & Phân Quyền Middlewares
- [ ] Viết `authenticateToken` middleware: Lấy token từ header `Bearer <token>`, verify và gán `req.user`.
- [ ] Viết `authorizeRoles(...roles)` middleware: Kiểm tra `req.user.role` có thuộc danh sách cho phép không.

---

### 🔹 Giai đoạn 7: Xây dựng Auth Service & Auth Controller
- [ ] **`src/services/auth.service.js`**:
  - `register`: Check email trùng -> Hash password -> Tạo user trong DB.
  - `login`: Tìm user -> So khớp password -> Ký cặp Access/Refresh Token -> Lưu Refresh Token vào DB.
  - `refreshToken`: Kiểm tra Refresh Token hợp lệ -> Cấp Access Token mới.
  - `logout`: Xóa Refresh Token của user trong DB.
- [ ] **`src/controllers/auth.controller.js`**:
  - Nhận request, gọi Service tương ứng, trả response về qua `apiResponse`.

---

### 🔹 Giai đoạn 8: Thiết lập Routing & Khởi động Server
- [ ] Gắn Controller và Middleware vào `src/routes/auth.route.js`.
- [ ] Tạo router demo có phân quyền: `src/routes/user.route.js` (Route cho `ADMIN`).
- [ ] Gom router tại `src/routes/index.js`.
- [ ] Cấu hình `src/app.js` (Cors, Helmet, Morgan, Express json, Router, Error Middleware).
- [ ] Viết `src/server.js` lắng nghe cổng `PORT` và bắt các sự kiện tắt server an toàn.

---

### 🔹 Giai đoạn 9: Kiểm thử (Verification)
- [ ] Test API Register (`POST /api/v1/auth/register`).
- [ ] Test API Login (`POST /api/v1/auth/login`).
- [ ] Test API Private với Token (`GET /api/v1/auth/me`).
- [ ] Test API Phân quyền Admin (`GET /api/v1/users` với quyền USER -> kỳ vọng lỗi 403 Forbidden).
- [ ] Test API Cấp lại Token (`POST /api/v1/auth/refresh-token`).
