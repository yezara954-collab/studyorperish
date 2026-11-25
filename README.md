# Study Or Perish. · Stage 1
## GitHub Pages 部署
1. 解压 ZIP，新建一个公开 GitHub 仓库。将本目录的内容上传到仓库根目录，确保 docs/index.html 在此位置。
2. 打开 Settings → Pages，Source 选择 Deploy from a branch。
3. 选择 main 分支和 /docs 文件夹，点击 Save。
4. 部署成功后，点击 Visit site。可直接将该网址分享给读者。

docs 是已经构建好的网站，部署时无需安装 Node.js。书架、词库、例句与发音按钮都在静态页面工作。发音依赖设备英语语音。读者导入的书籍、进度及生词保存在各自浏览器中。

## 修改源码
使用 Node.js 22 或更新版本。执行 npm ci，然后 npm run dev。本地开发完成后运行 npm run build，将源码和更新后的 docs 一起提交。离线缓存需要 HTTPS 或 localhost，首次访问时需要联网。

## 本次更新

已有网站请把压缩包中的 docs/ 完整替换到现有仓库相同位置。保留原先的站点地址和 Pages 发布目录。源码放在 src/，今后改色与排版从 src/tokens.css 开始。src/site.json 配置中英文站名和资源路径，src/i18n.ts 管理界面文案，src/config.ts 管理图标、插画和角色提示语。

### 新增文件

- `docs/assets/index-CIZ3Jiw2.js`
- `docs/assets/index-DkFd6vbL.css`
- `docs/favicon.svg`
- `src/catalog.ts`
- `src/components/Bookshelf.tsx`
- `src/components/Icons.tsx`
- `src/components/TrashBin.tsx`
- `src/components/WordCard.tsx`
- `src/config.ts`
- `src/i18n.ts`
- `src/sigil.json`
- `src/site.json`
- `src/tokens.css`
- `src/useLibrary.ts`
- `src/useReader.ts`

### 修改文件

- `README.md`
- `docs/index.html`
- `docs/sw.js`
- `index.html`
- `src/books.ts`
- `src/main.tsx`
- `src/reader.tsx`
- `src/style.css`
- `vite.config.ts`

### 删除文件

- `docs/assets/index-CC7KYG1s.css`
- `docs/assets/index-DeYpRRbP.js`

## Stage 2 · 笔记与记忆

### 部署

已有站点，把本包里的 `docs/` 完整替换到仓库原来的 `docs/`。在原域名和路径打开新版，可继续读取此前浏览器保存的书籍、阅读进度、设置和单词。源码整理见本包 `src/`。

### 使用

- 阅读模式下，按页阅读时可手指横滑或点翻页按钮。羽毛笔高光模式下，在正文用手指或触控笔划字，可切换按单词或整句。切换回阅读模式可再次滑动翻页。
- 自由手写模式下，在右侧页边写字。笔迹按书、章节和正文字符位置锚定，以归一化坐标保存为矢量路径。工具栏可撤销当前页边最后一笔。
- 哇赛赛笔记本自动收录高光，可按书筛选。点原文可回到对应位置，也可编辑个人批注或删除高光。
- 在单词垃圾桶翻开到期卡片并评分。忘了在 10 分钟后到期，模糊在 1 天后到期，记得从 1 天起逐步延长，上限 365 天。垃圾桶显示每个词的累计复习次数。

### 本地数据接口

`src/memory.ts` 提供 `getReviewProgress()`，返回 `totalReviews`（已完成的评分次数）、`reviewedWords`（至少复习过一次的不同单词数）和 `milestones`（按每 100 次有效评分计算的累计里程碑）。这是 Stage 5 的计数接口。

同文件的 `exportBackupJSON()` 与 `importBackupJSON(json)` 提供版本化 JSON 备份接口。导出包含导入书籍、阅读进度和设置、单词和复习记录、文字高光与矢量笔迹。导入先校验数据，再在一次事务中按 ID 合并，相同 ID 以备份值为准。后续接入界面时，在应用挂载前调用导入，或在导入完成后重新加载应用。

### 相对 Stage 1 的新增文件

- `docs/assets/index-B4GhuIB_.js`
- `docs/assets/index-BvL_CU2I.css`
- `src/components/MarginInk.tsx`
- `src/components/Notebook.tsx`
- `src/components/Review.tsx`
- `src/memory.ts`
- `src/useReadingTools.ts`

### 修改文件

- `README.md`
- `docs/index.html`
- `docs/sw.js`
- `src/books.ts`
- `src/components/TrashBin.tsx`
- `src/config.ts`
- `src/i18n.ts`
- `src/main.tsx`
- `src/reader.tsx`
- `src/style.css`
- `src/tokens.css`
- `src/useLibrary.ts`
- `src/useReader.ts`

### 删除文件

- `docs/assets/index-CIZ3Jiw2.js`
- `docs/assets/index-DkFd6vbL.css`

## Stage 2 · 羽毛笔批注重做

把包里的 `docs/` 完整替换到现有 Pages 仓库的同名目录。使用原站点地址时，旧笔记会按保存的章节和字符范围补全为原文整句。跨句片段会拆成多条，个人批注会随迁移保留。旧页边笔迹以原文锚点为基准迁入正文右侧。

### 阅读页

- 阅读模式保留查词和手势。羽毛笔模式下用 Apple Pencil 或鼠标书写，手指可滑动或翻页。需要用手指写字时，到「设置」开启「允许手指书写」。
- 沿文字行划过可直接高亮连续整句。其他笔画作为墨迹保存。「撤销」撤回本章最近一笔。一次扫过多句时，撤销会移除该笔新增的所有句子。
- 墨迹锚定到正文字符并随布局重算。字号变化时会显示提示，跨换行的自由笔迹可能发生形变。
- 笔记本点原句会跳回并闪烁定位。个人批注、删除、复习与 JSON 备份沿用 Stage 2。

### 替换羽毛笔素材

`src/config.ts` 内的 `quill` 配置集中管理图片路径、桌面光标热点、触屏羽毛笔宽度与热点、左右手倾角、墨迹基准宽度和渐隐时间。替换 `public/assets/quill.svg` 时，可同步替换 `public/assets/quill-cursor.png` 并调整热点。前者用于触屏图层和桌面光标，后者供浏览器回退。墨色、整句高光和定位动画在 `src/tokens.css` 中配置。

### 相对原 Stage 2 的新增文件

- `docs/assets/index-OcoB1nCc.css`
- `docs/assets/index-o8KtJ6WZ.js`
- `docs/assets/quill-cursor.png`
- `docs/assets/quill.svg`
- `public/assets/quill-cursor.png`
- `public/assets/quill.svg`
- `src/quillGeometry.ts`
- `src/sentences.ts`
- `src/useQuill.ts`

### 修改文件

- `README.md`
- `docs/index.html`
- `docs/sw.js`
- `src/config.ts`
- `src/i18n.ts`
- `src/main.tsx`
- `src/memory.ts`
- `src/reader.tsx`
- `src/style.css`
- `src/tokens.css`
- `src/useLibrary.ts`
- `src/useReader.ts`

### 删除文件

- `docs/assets/index-B4GhuIB_.js`
- `docs/assets/index-BvL_CU2I.css`
- `src/components/MarginInk.tsx`
- `src/useReadingTools.ts`

## Stage 2 · 分模式批注与橡皮擦

手动部署时，用本包中的 `docs/` 完整替换现有 Pages 仓库的 `docs/`。

### 阅读、书写和高光

- 「阅读」保留系统文字选择和单击查词。选择「羽毛笔」后，透明画布接管正文输入，屏蔽系统选区、长按和缩放事件。手指默认滑动或翻页，开启「允许手指书写」后可用手指画写。
- 羽毛笔默认进入「手写批注」。横线、波浪线和圈词都作为墨迹保存。选择「高光批注」后，划过的每个句子会连续着色并自动入本。点击已高光的句子可确认移除，也会移除对应的笔记本记录。
- 手写和高光分别支持撤销、重做。手写模式下，一次连续擦除或清除本页手写算一次操作。撤销和重做历史按章节及模式保存在当前阅读会话中。
- 橡皮擦默认局部擦除。可切换整笔擦除和小、中、大三档，大小与擦除方式会记住。局部擦除保留各段笔迹的原文坐标。
- 手写与高光分别存入 IndexedDB 的 `strokes` 和 `highlights`。旧批注会自动迁移。JSON 导出使用版本 2，导入兼容版本 1 和 2。

### 相对上一版的新增文件

- `docs/assets/index-C0FFpF1x.js`
- `docs/assets/index-DG7Capie.css`
- `src/inkEraser.ts`
- `src/useAnnotationHistory.ts`

### 修改文件

- `README.md`
- `docs/index.html`
- `docs/sw.js`
- `src/books.ts`
- `src/config.ts`
- `src/i18n.ts`
- `src/memory.ts`
- `src/quillGeometry.ts`
- `src/reader.tsx`
- `src/style.css`
- `src/useLibrary.ts`
- `src/useQuill.ts`

### 删除文件

- `docs/assets/index-OcoB1nCc.css`
- `docs/assets/index-o8KtJ6WZ.js`

## Stage 3 · 吼叫信与曼德拉草计时器

手动部署时，用本包中的 `docs/` 完整替换现有 Pages 仓库的 `docs/`。

- 阅读页点击「学习计时」选择 15、25、45、60 分钟或自定义 1–1440 分钟。开始后可点击角落图标查看剩余时间、暂停、继续或重置。
- 「现在休息」开启 5 分钟休息，结束后可按原来选定的学习时长继续。「再读 5 分钟」会提高台词与音量强度，最高第 3 级。重置结束当前计时并回到时长选择。
- 计时记录保存于 IndexedDB 的 `state`，键为 `study-or-perish:focus`，并包含在 JSON 备份中。学习与延时的记录包括开始时间、设定时长及完成状态。休息时间单独显示。
- 提醒台词在 `src/i18n.ts`，不同等级的台词池、默认时长和音频路径在 `src/config.ts` 的 `focus` 中。将 `sounds.howl` 与 `sounds.cry` 设为素材链接后即可使用替换音效。界面配色及动画参数在 `src/tokens.css`。
- 网页在后台还能执行时，会在获得授权后尝试显示通知。浏览器暂停页面或设备锁屏时，恢复后会按截止时间补上提醒。设置中的声音与震动开关独立。

### 新增文件

- `docs/assets/index-D22RDiFd.js`
- `docs/assets/index-DDrlnnXj.css`
- `src/components/FocusTimer.tsx`
- `src/focusAudio.ts`
- `src/focusTimer.ts`
- `src/useFocusTimer.ts`

### 修改文件

- `README.md`
- `docs/index.html`
- `docs/sw.js`
- `scripts/cache.mjs`
- `src/config.ts`
- `src/i18n.ts`
- `src/main.tsx`
- `src/memory.ts`
- `src/reader.tsx`
- `src/style.css`
- `src/tokens.css`
- `src/useLibrary.ts`

### 删除文件

- `docs/assets/index-C0FFpF1x.js`
- `docs/assets/index-DG7Capie.css`
