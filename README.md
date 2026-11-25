# The Vesper Archive · Stage 1
## GitHub Pages 部署
1. 解压 ZIP，新建一个公开 GitHub 仓库。将本目录的内容上传到仓库根目录，确保 docs/index.html 在此位置。
2. 打开 Settings → Pages，Source 选择 Deploy from a branch。
3. 选择 main 分支和 /docs 文件夹，点击 Save。
4. 部署成功后，点击 Visit site。可直接将该网址分享给读者。

docs 是已经构建好的网站，部署时无需安装 Node.js。书架、词库、例句与发音按钮都在静态页面工作。发音依赖设备英语语音。读者导入的书籍、进度及生词保存在各自浏览器中。

## 修改源码
使用 Node.js 22 或更新版本。执行 npm ci，然后 npm run dev。本地开发完成后运行 npm run build，将源码和更新后的 docs 一起提交。离线缓存需要 HTTPS 或 localhost，首次访问时需要联网。
