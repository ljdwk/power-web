# 功率数据查询系统 - 部署指南

## 构建完成 📦

构建文件已生成在 `dist/` 目录中：

```
dist/
├── index.html              # 主页面文件 (472 bytes)
└── assets/
    ├── index-Dk-U3X83.js   # JavaScript文件 (1.2MB，gzip压缩后416KB)
    └── index-Dc3mW1au.css  # 样式文件 (215KB，gzip压缩后57KB)
```

## 快速部署方法

### 方法1: 手动部署

1. **复制文件到Nginx目录**
   ```bash
   sudo cp -r dist/* /var/www/power-web/
   sudo chown -R www-data:www-data /var/www/power-web/
   sudo chmod -R 755 /var/www/power-web/
   ```

2. **配置Nginx**
   ```bash
   sudo cp nginx.conf.example /etc/nginx/sites-available/power-web
   sudo ln -s /etc/nginx/sites-available/power-web /etc/nginx/sites-enabled/
   ```

3. **编辑配置文件**
   ```bash
   sudo nano /etc/nginx/sites-available/power-web
   ```
   修改以下配置：
   - `server_name your-domain.com;` → 改为你的域名或IP
   - `root /path/to/dist;` → 改为 `root /var/www/power-web;`

4. **测试并重载Nginx**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

### 方法2: 使用部署脚本

1. **给脚本添加执行权限**
   ```bash
   chmod +x deploy.sh
   ```

2. **运行部署脚本**
   ```bash
   sudo ./deploy.sh
   ```

3. **按提示编辑Nginx配置文件**

## Nginx配置要点

### 核心配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /var/www/power-web;
        index index.html;
        try_files $uri $uri/ /index.html;  # SPA路由支持
    }

    # API代理
    location /api/ {
        proxy_pass http://192.168.50.100:8080/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 重要特性

- ✅ **SPA路由支持**: 使用`try_files`处理Vue Router
- ✅ **API代理**: `/api/*` 自动代理到后端 `http://192.168.50.100:8080`
- ✅ **静态资源缓存**: JS/CSS文件自动缓存
- ✅ **Gzip压缩**: 显著减少传输大小
- ✅ **跨域处理**: 添加CORS头支持
- ✅ **安全头**: XSS保护、内容类型保护等

## 部署后验证

1. **检查文件访问**
   ```bash
   curl -I http://your-domain.com/
   ```

2. **检查API代理**
   ```bash
   curl -I http://your-domain.com/api/test
   ```

3. **浏览器测试**
   - 访问 `http://your-domain.com`
   - 测试电站选择功能
   - 测试数据查询功能

## 性能优化

### 构建文件大小

- **总大小**: ~1.44MB (压缩前)
- **Gzip压缩后**: ~473KB
- **首次加载**: < 500KB
- **缓存命中**: 仅加载HTML文件 (472 bytes)

### 优化建议

1. **启用Gzip压缩** (已在Nginx配置中)
2. **设置静态资源缓存** (已在Nginx配置中)
3. **考虑CDN加速** (可选)
4. **启用HTTP/2** (可选)

## 故障排除

### 常见问题

1. **404错误**: 检查Nginx配置中的`root`路径
2. **API请求失败**: 确认后端服务正常运行
3. **权限问题**: 确保www-data用户有读取权限
4. **缓存问题**: 清除浏览器缓存或强制刷新

### 日志查看

```bash
# Nginx访问日志
sudo tail -f /var/log/nginx/access.log

# Nginx错误日志
sudo tail -f /var/log/nginx/error.log
```

## HTTPS配置 (可选)

如需HTTPS，请参考配置文件中的注释部分，需要：
1. SSL证书 (可使用Let's Encrypt免费证书)
2. 配置HTTPS虚拟主机
3. 重定向HTTP到HTTPS

## 维护更新

重新部署时：
```bash
# 备份现有文件
sudo cp -r /var/www/power-web /tmp/backup-$(date +%Y%m%d)

# 重新构建
npm run build

# 复制新文件
sudo cp -r dist/* /var/www/power-web/

# 重载Nginx
sudo systemctl reload nginx
```

---

**部署完成后，你的功率数据查询系统将在Nginx中正常运行！** 🚀