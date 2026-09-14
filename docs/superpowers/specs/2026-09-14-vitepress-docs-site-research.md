# Research: Bổ sung trang web tài liệu VitePress

> Tài liệu nghiên cứu (research), **chưa phải** kế hoạch triển khai. Mục tiêu: đánh giá tính khả thi, các ràng buộc kỹ thuật và đưa ra khuyến nghị cho việc thêm một site tài liệu VitePress cho `vite-plugin-vue-layouts-next`.

## 1. Bối cảnh & hiện trạng

- Toàn bộ tài liệu người dùng hiện nằm trong hai file README dài:
  - `README.md` (~11 KB, 13 mục cấp 2, ~25 heading)
  - `README.ja.md` (~12 KB, bản dịch tiếng Nhật, đã lệch nhẹ so với bản EN — ví dụ EN có mục `### Layout name normalization` và `### Layout names` mà JA chưa có)
- Repo **chưa có** site tài liệu, chưa có `homepage` trỏ tới docs (`package.json.homepage` đang trỏ về GitHub repo).
- Thư mục `docs/` **đã tồn tại** nhưng đang dùng cho tài liệu nội bộ của quy trình phát triển:
  - `docs/superpowers/plans/*.md`
  - `docs/superpowers/specs/*.md`
- `.github/workflows/` chỉ có `release.yml` (conventional-github-releaser theo tag). **Không có** workflow CI cho lint/test, cũng không có workflow deploy Pages.
- Monorepo pnpm: `pnpm-workspace.yaml` khai báo `packages: ['examples/*']`, dùng `catalog:` cho hầu hết dependency, `catalogMode: prefer`.

## 2. Ràng buộc lớn nhất: xung đột phiên bản Vite

Đây là phát hiện quan trọng nhất của nghiên cứu này.

`pnpm-workspace.yaml` có:

```yaml
overrides:
  vite: 'catalog:'   # catalog: vite ^8.2.2
```

`overrides` áp dụng cho **toàn bộ** dependency graph của workspace, kể cả dependency lồng bên trong VitePress. Do đó:

| Lựa chọn | Vite mà VitePress phụ thuộc | Tương thích với override `vite@^8.2.2`? |
| --- | --- | --- |
| `vitepress@1.6.4` (dist-tag `latest`) | `vite ^5.4.14`, `@vitejs/plugin-vue ^5.2.1` | ❌ Bị ép lên Vite 8 → gần như chắc chắn hỏng runtime/build |
| `vitepress@2.0.0-alpha.20` (dist-tag `next`) | `vite ^8.2.1`, `@vitejs/plugin-vue ^6.0.8`, `vue ^3.5.41` | ✅ Khớp chính xác catalog hiện tại |

**Kết luận:** nếu làm docs site cho repo này thì phải dùng **VitePress 2.x (`next`)**. Dùng VitePress 1.x sẽ buộc phải thêm ngoại lệ cho `overrides`/`resolutions`, làm phức tạp workspace và đi ngược định hướng "Vite 8 first" của package.

**Đánh đổi khi dùng v2 alpha:**
- API cấu hình có thể thay đổi giữa các bản alpha (breaking changes không theo semver).
- Một số theme/plugin cộng đồng chưa hỗ trợ v2.
- Cần thêm `vitepress` vào `minimumReleaseAgeExclude` trong `pnpm-workspace.yaml` (giống cách `vite@8.1.2`, `vitest@5.0.0` đang được xử lý) vì bản alpha mới phát hành sẽ bị chặn bởi `minimumReleaseAge`.
- `trustPolicy: no-downgrade` cần được kiểm tra lại khi cập nhật alpha.

## 3. Vị trí thư mục

Ba phương án:

| Phương án | Ưu | Nhược |
| --- | --- | --- |
| **A. VitePress root = `docs/`**, giữ `docs/superpowers/` và loại nó khỏi build bằng `srcExclude` | Quy ước phổ biến nhất, deploy Pages quen thuộc, đường dẫn ngắn | `docs/` lẫn lộn hai loại tài liệu (người dùng vs nội bộ); dev server watch cả file nội bộ |
| **B. VitePress root = `docs/`**, **di chuyển** `docs/superpowers/` → `.superpowers/` hoặc `notes/` | Tách bạch rõ ràng, không cần `srcExclude` | Phải sửa đường dẫn trong các plan/spec hiện có; là một thay đổi cấu trúc riêng |
| **C. VitePress root = `website/`** (hoặc `site/`) | Không đụng gì tới `docs/` hiện tại | Lệch quy ước, người đóng góp dễ tìm nhầm |

**Khuyến nghị: Phương án B**, hoặc A nếu muốn thay đổi tối thiểu. Cả hai đều cần package riêng để tham gia workspace:

```yaml
# pnpm-workspace.yaml
packages:
  - 'examples/*'
  - 'docs'        # (hoặc 'website')
```

Lưu ý `docs/` hiện **không** phải một package — thêm nó vào `packages` đồng nghĩa phải tạo `docs/package.json` (`private: true`, giống các `examples/*`).

## 4. Kiến trúc thông tin (IA) đề xuất

Bóc tách trực tiếp từ heading của `README.md`:

```
/                         → Home (hero + features, lấy từ phần mở đầu README)
/guide/getting-started    ← Install + Usage + Client Types
/guide/how-it-works       ← How it works
/guide/migration          ← Migration + Layout name normalization
/guide/client-side-layout ← ClientSideLayout
/guide/patterns/          ← Common patterns
    transitions           ← Transitions
    layout-to-page        ← Data from layout to page + Set static data at the page
    page-to-layout        ← Data dynamically from page to layout
/config/                  ← API
    layouts-dirs, extensions, exclude, default-layout,
    layout-names, import-mode, inherit-default-layout
/examples                 ← liên kết tới examples/spa | ssg | client-side | nested-routes
```

Các mục `Maintainer`, `Thanks`, `Contributing`, `License` nên **giữ lại ở README** chứ không đưa lên site.

## 5. i18n

`README.ja.md` cho thấy dự án đã có nhu cầu đa ngôn ngữ. VitePress hỗ trợ i18n sẵn qua `locales`:

```
docs/
  index.md            # en (root locale)
  guide/...
  ja/
    index.md
    guide/...
```

**Khuyến nghị:** giai đoạn 1 chỉ làm tiếng Anh, để sẵn cấu trúc `locales` nhưng chưa bật `ja`. Lý do: bản JA hiện đã lệch nội dung so với EN; port song song sẽ nhân đôi khối lượng dịch và nợ kỹ thuật. Port JA là một giai đoạn riêng.

## 6. Thay đổi cần thiết ở cấp repo

1. `pnpm-workspace.yaml`
   - thêm `docs` vào `packages`
   - thêm `vitepress` vào `catalog` (vì `catalogMode: prefer`)
   - thêm `vitepress@2.0.0-alpha.x` vào `minimumReleaseAgeExclude`
2. `package.json` (root) — thêm scripts theo đúng phong cách hiện có (`npm -C <dir> run <script>`):
   ```json
   "docs:dev": "npm -C docs run dev",
   "docs:build": "npm -C docs run build",
   "docs:preview": "npm -C docs run preview"
   ```
   Có thể cân nhắc cập nhật `homepage` sang URL của site sau khi deploy.
3. `docs/package.json` — `private: true`, deps `vitepress: catalog:`, `vue: catalog:`.
4. `.gitignore` — bổ sung `docs/.vitepress/cache` và `docs/.vitepress/dist`.
5. `tsconfig.json` — hiện `exclude` chỉ có `**/dist`, `**/node_modules`; `pnpm typecheck` sẽ quét cả `docs/.vitepress/config.ts`. Cần kiểm tra lại hoặc thêm exclude.
6. `eslint.config.js` — `antfu()` mặc định lint cả Markdown; ~30 code block trong docs sẽ bị lint. Có thể cần `ignores` cho `docs/**/*.md` hoặc chấp nhận sửa code block cho đạt lint.

## 7. CI/CD

Chưa có workflow Pages. Cần thêm `.github/workflows/docs.yml`:

- trigger: `push` vào `main` (giới hạn `paths: docs/**`), cộng `workflow_dispatch`
- dùng `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`
- permissions: `pages: write`, `id-token: write`
- setup pnpm + Node 22 (khớp `volta.node: 22.18.0`)
- **quan trọng:** phải `pnpm build` (tsdown) trước khi build docs nếu trang docs có demo import trực tiếp từ `dist/`

Nếu docs được host ở `https://<user>.github.io/<repo>/` thì phải đặt `base: '/vite-plugin-vue-layouts-next/'` trong config. Dùng custom domain hoặc Netlify/Vercel/Cloudflare Pages thì không cần.

Cũng nên cân nhắc thêm bước build docs vào CI cho pull request để phát hiện dead link (VitePress fail build khi có dead link nội bộ — đây là một lợi ích phụ đáng kể).

## 8. Lợi ích & chi phí

**Lợi ích**
- README hiện đã quá dài để điều hướng; bảng `Table of Contents` thủ công là dấu hiệu rõ của việc này.
- Có search (local search của VitePress đủ dùng, không cần Algolia).
- Trang riêng cho Migration v2 → v3 (layout name normalization) dễ liên kết từ release notes.
- Kiểm tra dead link tự động khi build.
- Có chỗ đặt tài liệu i18n đúng cách thay vì file README song song.

**Chi phí**
- Phụ thuộc vào VitePress alpha (rủi ro breaking change).
- Phát sinh nguy cơ tài liệu bị lệch: README vs site. Nên **thu gọn README** thành phần giới thiệu + quickstart + link tới site, thay vì duy trì cả hai bản đầy đủ.
- Thêm surface area cho CI và bảo trì.

## 9. Khuyến nghị

Nên làm, theo lộ trình 3 giai đoạn:

1. **Giai đoạn 1 — khung site (EN)**: dựng `docs/` VitePress 2 alpha, port nội dung README sang IA ở mục 4, thu gọn README, thêm workflow Pages. Ước lượng: vừa phải, chủ yếu là công port nội dung chứ không phải code.
2. **Giai đoạn 2 — chất lượng**: local search, dead-link check trong CI, trang Examples liên kết tới `examples/*`, có thể nhúng playground.
3. **Giai đoạn 3 — i18n**: bật locale `ja`, đồng bộ lại nội dung đang lệch giữa EN và JA, xoá `README.ja.md` (thay bằng link).

**Quyết định cần chốt trước khi triển khai:**
- VitePress 2 alpha (khuyến nghị) hay giữ v1 kèm ngoại lệ override Vite?
- Vị trí: `docs/` (di chuyển `superpowers/`) hay `website/`?
- Host: GitHub Pages (cần `base`) hay Netlify/Vercel/Cloudflare?
- README sau khi có site: thu gọn hay giữ nguyên đầy đủ?
