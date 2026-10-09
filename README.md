# 未解檔案 CASE 001｜網站部署整理版

執行：`pip install -r requirements.txt`、`python app.py`。

正式部署：參閱 `部署前必讀.txt`。`APP_ENV=production` 必須設定固定 `FLASK_SECRET_KEY`。Railway 使用 `railway.json` / `Procfile` 啟動 Gunicorn。

已知限制：進度使用 Flask cookie、手札使用 localStorage；AI 速率限制僅適用單一程序，不適合無防護的公開高流量網站。離線備援不需要 API Key。
