# 推送代码到 GitHub

当本地有未推送的提交时，在**本机终端**执行以下任一方式完成推送（需完成 GitHub 认证）。

## 方式一：直接推送

```bash
cd /Users/lanyangyang/Workspace/code/HKIIQE2
git push origin main
```

## 方式二：使用脚本

```bash
cd /Users/lanyangyang/Workspace/code/HKIIQE2
./scripts/push-to-github.sh
```

## 若提示需要认证

- **HTTPS**：会提示输入 GitHub 用户名和密码；密码需使用 [Personal Access Token](https://github.com/settings/tokens) 而非登录密码。
- **SSH**：若已配置 SSH 密钥，可将远程改为 SSH 后推送：
  ```bash
  git remote set-url origin git@github.com:rantisong/HKIIQE2.git
  git push origin main
  ```

## 查看未推送的提交

```bash
git log origin/main..HEAD --oneline
```
