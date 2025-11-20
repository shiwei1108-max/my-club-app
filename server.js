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

app.listen(3000, () => {
    console.log('全功能伺服器啟動中: http://localhost:3000');
});