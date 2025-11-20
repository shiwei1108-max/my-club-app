const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // 建立一個測試用的管理員
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',    // 帳號
        password: '123',            // 密碼
        name: '超級管理員',
        studentId: 'ADMIN001',      // 必填
        dept: '社團辦公室'           // 必填
      }
    });
    console.log('🎉 管理員帳號建立成功！');
    console.log('帳號: admin@test.com');
    console.log('密碼: 123');
  } catch (e) {
    console.log('⚠️ 建立失敗，可能帳號已經存在了');
  }
}

main();