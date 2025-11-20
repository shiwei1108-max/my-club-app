const express = require('express');
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken'); 
const app = express();
const prisma = new PrismaClient();

const SECRET_KEY = "my_secret_club_key"; 

app.use(express.json());
app.use(express.static('public'));

// 1. 登入 API
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user || user.password !== password) return res.status(401).json({ error: '帳號或密碼錯誤' });
    const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET_KEY, { expiresIn: '1h' });
    res.json({ message: '登入成功', token, user });
});
// === 🌟 新增：公開報名 API (不用 Token) ===
app.post('/api/join', async (req, res) => {
    // 為了安全，這裡只接收我們允許的欄位
    const { name, studentId, dept, email, phone, birthday } = req.body;
    
    if (!name || !studentId || !dept) {
        return res.status(400).json({ error: '必填欄位缺漏' });
    }

    try {
        // 建立新成員
        await prisma.user.create({
            data: { 
                name, studentId, dept, email, phone, birthday,
                password: "123" // 雖然他不用登入，但資料庫還是需要密碼欄位，先給預設值
            }
        });
        res.json({ message: '報名成功！' });
    } catch (e) {
        res.status(400).json({ error: '報名失敗 (學號或 Email 可能已存在)' });
    }
});

// 驗證警衛
const checkAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: '請先登入' });
    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: '登入過期' });
        req.user = user;
        next();
    });
};

// 2. 儀表板數據 API (關鍵功能!)
app.get('/api/stats', checkAuth, async (req, res) => {
    try {
        const [userCount, eventCount] = await Promise.all([
            prisma.user.count(),
            prisma.event.count()
        ]);
        res.json({ members: userCount, events: eventCount });
    } catch (e) { res.status(500).json({ error: '數據讀取失敗' }); }
});

// 3. 成員管理 API
app.get('/api/members', checkAuth, async (req, res) => {
    const users = await prisma.user.findMany({ orderBy: { studentId: 'asc' } });
    res.json(users);
});
app.post('/api/members', checkAuth, async (req, res) => {
    try {
        const newUser = await prisma.user.create({ data: { ...req.body, password: "123" } });
        res.json(newUser);
    } catch (e) { res.status(400).json({ error: '新增失敗' }); }
});
app.put('/api/members/:id', checkAuth, async (req, res) => {
    try { await prisma.user.update({ where: { id: parseInt(req.params.id) }, data: req.body }); res.json({ok:true}); } 
    catch (e) { res.status(400).json({ error: '更新失敗' }); }
});
app.delete('/api/members/:id', checkAuth, async (req, res) => {
    try { await prisma.user.delete({ where: { id: parseInt(req.params.id) } }); res.json({ok:true}); } 
    catch (e) { res.status(400).json({ error: '刪除失敗' }); }
});

// 4. 活動管理 API
app.get('/api/events', checkAuth, async (req, res) => {
    const events = await prisma.event.findMany({ orderBy: { date: 'desc' } });
    res.json(events);
});
app.post('/api/events', checkAuth, async (req, res) => {
    try { await prisma.event.create({ data: { title: req.body.title, description: req.body.description, date: new Date(req.body.date) } }); res.json({ok:true}); } 
    catch (e) { res.status(400).json({ error: '新增失敗' }); }
});
app.delete('/api/events/:id', checkAuth, async (req, res) => {
    try { await prisma.event.delete({ where: { id: parseInt(req.params.id) } }); res.json({ok:true}); } 
    catch (e) { res.status(400).json({ error: '刪除失敗' }); }
});

// 使用 Render 給的 Port，如果沒給才用 3000
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`全功能伺服器啟動中: http://localhost:${PORT}`);
});